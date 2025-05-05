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
import yaml from "yaml";
import { XMLParser, XMLBuilder, XMLValidator} from "fast-xml-parser";

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

        // 현재 디렉토리의 pom.xml 을 파싱하여 pom 객체를 생성한다.
        const pomContent = await got.get(urlJoin(process.cwd(), "pom.xml"), {
          ...apiOptions,
          ...proxy,
        }).text();
        const pom = new XMLParser().parse(pomContent);

        // parent repository 의 open, submodule_released label 이슈를 추출 한다. 만약 없다면 생성한다.
        const parentIssueEndpoint = urlJoin(parentProjectApiUrl, "issue?labels=submodule_released&status=open")
        const parentIssues = await got.get(parentIssueEndpoint, {
          ...apiOptions,
          ...proxy,
        }).json();

        let parentIssueId = null;

        if(parentIssues.length === 1) {
          const parentIssue = parentIssues.get(0);
          const issueDescriptionYaml = yaml.parse(parentIssue.description);
          issueDescriptionYaml[pom.project.artifactId] = pom.project.version;
          const issueDescription = yaml.stringify(issueDescriptionYaml);
          logger.log(`Updating Parent Version Release Request with Submodule ${pom.project.groupId}:${pom.project.artifactId}:${pom.project.version}`);

          // update issue
          await got.put(urlJoin(parentProjectApiUrl, `issues/${parentIssue.id}`), {
            ...apiOptions,
            ...proxy,
            json: {
              description: issueDescription,
            },
          });

          parentIssueId = parentIssue.id;
        } else if(parentIssues.length === 0) {

          const issueTitle = `Poject Realese Reqeust By Submodule Release`
          const issueDescription = yaml.stringify({
            "${pom.project.artifactId}": "${pom.project.version}"
          }, {indent: 2});
          logger.log(`Creating Parent Version Release Request with Submodule ${pom.project.groupId}:${pom.project.artifactId}:${pom.project.version}`);

          // create issue
          const parentIssue = await got.post(urlJoin(parentProjectApiUrl, 'issues'), {
            ...apiOptions,
            ...proxy,
            json: {
              title: issueTitle,
              description: issueDescription,
              labels: ["submodule_released"],
            },
          }).json();

          parentIssueId = parentIssue.id;
        } else if(parentIssues.length > 1) {
          throw new Error("More than one submodule released issue found");
        }

        if(parentIssueId) {
          // create note of parent issue with release info
          await got.post(urlJoin(parentProjectApiUrl, `issues/${parentIssueId}/notes`), {
            ...apiOptions,
            ...proxy,
            json: {
              body: yaml.stringify(releaseInfos, {indent: 2}),
            },
          });
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
