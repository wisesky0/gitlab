/**
 * @file success.js
 * @description 
 * 이 파일은 GitLab 모듈의 릴리즈 성공 후 처리 기능을 담당합니다.
 * 주요 기능:
 * 1. 릴리즈 성공 시 관련 이슈와 병합 요청에 댓글 작성
 * 2. 부모 프로젝트에 릴리즈 정보 마킹
 * 3. 커밋 해시를 기반으로 관련된 병합 요청과 이슈 추적
 */

// 외부 모듈을 가져옵니다.
import { uniqWith, isEqual, template } from "lodash-es";
import urlJoin from "url-join";
import got from "got";
import _debug from "debug";
const debug = _debug("@wafful-release/gitlab-module");

// 내부 모듈을 가져옵니다.
import resolveConfig from "./resolve-config.js";
import getProjectContext from "./get-project-context.js";
import getParentContext from "./get-parent-context.js";
import getSuccessComment from "./get-success-comment.js";
import markParent from "./mark-parent.js";

/**
 * 릴리즈 성공 후 처리하는 메인 함수
 * 
 * @param {Object} pluginConfig - 플러그인 설정
 * @param {Object} context - 릴리즈 컨텍스트
 * @param {Object} context.options - 옵션 정보
 * @param {string} context.options.repositoryUrl - 저장소 URL
 * @param {Object} context.nextRelease - 다음 릴리즈 정보
 * @param {Object} context.logger - 로거
 * @param {Array} context.commits - 커밋 목록
 * @param {Array} context.releases - 릴리즈 목록
 */
export default async (pluginConfig, context) => {
    const {
        options: { repositoryUrl },
        nextRelease,
        logger,
        commits,
        releases
    } = context;

    // GitLab API와 관련된 설정을 가져옵니다.
    const { 
        gitlabToken, 
        gitlabUrl, 
        gitlabApiUrl, 
        successComment, 
        successCommentCondition, 
        proxy, 
        retryLimit, 
        parentIdOrPath, 
        pomPath 
    } = resolveConfig(pluginConfig, context);

    // 프로젝트 컨텍스트 정보를 가져옵니다.
    const { projectApiUrl, projectPath } = getProjectContext(context, gitlabUrl, gitlabApiUrl, repositoryUrl);
    
    // 부모 프로젝트 컨텍스트 정보를 가져옵니다.
    const { parentProjectApiUrl } = getParentContext(context, gitlabApiUrl, parentIdOrPath);

    // API 호출 옵션을 설정합니다.
    const apiOptions = {
        headers: { "PRIVATE-TOKEN": gitlabToken },
        retry: { limit: retryLimit },
    };

    // successComment가 false인 경우, 이슈와 PR에 댓글을 달지 않음
    if (successComment === false) {
        logger.log("Skip commenting on issues and pull requests.");
        logger.error(`Issue and pull request comments should be disabled via 'successCommentCondition'.
Using 'false' for 'successComment' is deprecated and will be removed in a future major version.`);
    } else if (successCommentCondition === false) {
        logger.log("Skip commenting on issues and pull requests.");
    } else {
        const releaseInfos = releases.filter((release) => Boolean(release.name));
        try {
            /**
             * 이슈에 댓글을 다는 함수
             * @param {Object} issue - 이슈 정보
             */
            const postCommentToIssue = (issue) => {
                const canCommentOnIssue = successCommentCondition
                    ? template(successCommentCondition)({ ...context, issue, mergeRequest: false })
                    : true;
                if (canCommentOnIssue) {
                    const issueNotesEndpoint = urlJoin(gitlabApiUrl, `/projects/${issue.project_id}/issues/${issue.iid}/notes`);
                    debug("Posting issue note to %s", issueNotesEndpoint);
                    const body = successComment
                        ? template(successComment)({ ...context, issue, mergeRequest: false })
                        : getSuccessComment(issue, releaseInfos, nextRelease);
                    return got.post(issueNotesEndpoint, {
                        ...apiOptions,
                        ...proxy,
                        json: { body },
                    });
                } else {
                    logger.log("Skip commenting on issue #%d.", issue.id);
                }
            };

            /**
             * 병합 요청에 댓글을 다는 함수
             * @param {Object} mergeRequest - 병합 요청 정보
             */
            const postCommentToMergeRequest = (mergeRequest) => {
                const canCommentOnMergeRequest = successCommentCondition
                    ? template(successCommentCondition)({ ...context, issue: false, mergeRequest })
                    : true;
                if (canCommentOnMergeRequest) {
                    const mergeRequestNotesEndpoint = urlJoin(
                        gitlabApiUrl,
                        `/projects/${mergeRequest.project_id}/merge_requests/${mergeRequest.iid}/notes`
                    );
                    debug("Posting MR note to %s", mergeRequestNotesEndpoint);
                    const body = successComment
                        ? template(successComment)({ ...context, issue: false, mergeRequest })
                        : getSuccessComment({ isMergeRequest: true, ...mergeRequest }, releaseInfos, nextRelease);
                    return got.post(mergeRequestNotesEndpoint, {
                        ...apiOptions,
                        ...proxy,
                        json: { body },
                    });
                } else {
                    logger.log("Skip commenting on merge request #%d.", mergeRequest.iid);
                }
            };

            /**
             * 커밋 해시로 관련된 병합 요청을 가져오는 함수
             * @param {string} commitHash - 커밋 해시
             * @returns {Promise<Array>} 병합된 병합 요청 목록
             */
            const getRelatedMergeRequests = async (commitHash) => {
                const relatedMergeRequestsEndpoint = urlJoin(projectApiUrl, `repository/commits/${commitHash}/merge_requests`);
                debug("Getting MRs from %s", relatedMergeRequestsEndpoint);
                const relatedMergeRequests = await got
                    .get(relatedMergeRequestsEndpoint, {
                        ...apiOptions,
                        ...proxy,
                    })
                    .json();

                return relatedMergeRequests.filter((x) => x.state === "merged");
            };

            /**
             * 병합 요청으로 관련된 이슈를 가져오는 함수
             * @param {Object} mergeRequest - 병합 요청 정보
             * @returns {Promise<Array>} 닫힌 이슈 목록
             */
            const getRelatedIssues = async (mergeRequest) => {
                const relatedIssuesEndpoint = urlJoin(
                    gitlabApiUrl,
                    `/projects/${mergeRequest.project_id}/merge_requests/${mergeRequest.iid}/closes_issues`
                );
                debug("Getting related issues from %s", relatedIssuesEndpoint);
                const relatedIssues = await got
                    .get(relatedIssuesEndpoint, {
                        ...apiOptions,
                        ...proxy,
                    })
                    .json();

                return relatedIssues.filter((x) => x.state === "closed");
            };

            // 관련된 병합 요청과 이슈에 댓글을 다는 작업 수행
            const relatedMergeRequests = uniqWith(
                (await Promise.all(commits.map((commit) => getRelatedMergeRequests(commit.hash)))).flat(),
                isEqual
            );
            const relatedIssues = uniqWith(
                (await Promise.all(relatedMergeRequests.map((mergeRequest) => getRelatedIssues(mergeRequest)))).flat(),
                isEqual
            );
            await Promise.all(relatedIssues.map((issues) => postCommentToIssue(issues)));
            await Promise.all(relatedMergeRequests.map((mergeRequest) => postCommentToMergeRequest(mergeRequest)));

            // parentIdOrPath가 존재할 경우 releaseInfos를 사용하여 Parent에 이슈 생성
            if (parentProjectApiUrl) {
                const _apiOptions = {
                    ...apiOptions,
                    ...proxy,
                };
                await markParent(parentProjectApiUrl, releaseInfos, pomPath, projectPath, _apiOptions, logger);
            }

        } catch (error) {
            logger.error("An error occurred while posting comments to related issues and merge requests:\n%O", error);
            throw error;
        }
    }
};
