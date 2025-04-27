// Lodash, url-join, got, and debug 모듈을 가져옵니다.
import { uniqWith, isEqual, template } from "lodash-es";
import urlJoin from "url-join";
import got from "got";
import _debug from "debug";
const debug = _debug("wafful-node-package:gitlab");
// 내부 모듈을 가져옵니다.
import resolveConfig from "./resolve-config.js";
import getProjectContext from "./get-project-context.js";
import getParentContext from "./get-parent-context.js";
import getSuccessComment from "./get-success-comment.js";

// 성공적인 릴리스 후 관련 이슈와 병합 요청에 댓글을 다는 메인 함수
export default async (pluginConfig, context) => {
  const {
    options: { repositoryUrl },
    nextRelease,
    logger,
    commits,
    releases,
    parentPath
  } = context;
  // GitLab API와 관련된 설정을 가져옵니다.
  const { gitlabToken, gitlabUrl, gitlabApiUrl, successComment, successCommentCondition, proxy, retryLimit } =
    resolveConfig(pluginConfig, context);
  const { projectApiUrl } = getProjectContext(context, gitlabUrl, gitlabApiUrl, repositoryUrl);
  const { parentApiUrl: parentProjectApiUrl } = getParentContext(context, gitlabApiUrl, parentPath);
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
      // 이슈에 댓글을 다는 함수
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

      // 병합 요청에 댓글을 다는 함수
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

      // 커밋 해시로 관련된 병합 요청을 가져오는 함수
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

      // 병합 요청으로 관련된 이슈를 가져오는 함수
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

      // =============== Start of Parent에 이슈 생성 ==================
      const postIssueToParent = async (release) => {
        const issueTitle = `released: module=${context.options.repositoryUrl.split('/').pop().replace('.git', '')} version=${release.nextRelease} commit=${release.commitHash}`;
       
        // 릴리스 노트가 존재할 경우 그 내용을 사용하고, 그렇지 않을 경우 '변경 사항이 없습니다.'라는 기본 메시지를 사용
        const changelogContent = release.notes || '변경 사항이 없습니다.';
        const issueDescription = `## 릴리스 정보

[${release.name}](${release.url})

## 변경 사항

${changelogContent}
`;

        console.log(issueTitle, '\n\n', issueDescription);

        const issueEndpoint = urlJoin(parentProjectApiUrl, 'issues');
        debug("Creating issue at %s", issueEndpoint);

        try {
          await got.post(issueEndpoint, {
            ...apiOptions,
            ...proxy,
            json: {
              title: issueTitle,
              description: issueDescription,
            },
          });
          logger.log("Created issue for release %s", release.name);
        } catch (error) {
          logger.error("Failed to create issue for release %s:\n%O", release.name, error);
        }
      } ;

      // parentPath가 존재할 경우 releaseInfos를 사용하여 Parent에 이슈 생성
      if (parentProjectApiUrl) {  
        await Promise.all(releaseInfos.map(release => postIssueToParent(release)));
      }
      // =============== End of Parent에 이슈 생성 ==================

    } catch (error) {
      logger.error("An error occurred while posting comments to related issues and merge requests:\n%O", error);
      throw error;
    }
  }
};
