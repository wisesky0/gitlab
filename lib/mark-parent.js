/**
 * @file mark-parent.js
 * @description 
 * 이 파일은 GitLab 모듈의 릴리즈 정보를 부모 프로젝트에 마킹하는 기능을 담당합니다.
 * 주요 기능:
 * 1. 현재 모듈의 릴리즈 정보를 부모 프로젝트의 이슈에 기록
 * 2. 부모 프로젝트에 서브모듈 릴리즈 이슈가 없으면 새로 생성
 * 3. 기존 이슈가 있으면 업데이트
 * 4. 릴리즈 노트를 부모 이슈의 코멘트로 추가
 */

import urlJoin from "url-join";
import got from "got";
import yaml from "yaml";
import SemanticReleaseError from '@semantic-release/error';

import _debug from "debug";
const debug = _debug("@wafful-release/gitlab-module");

// 내부 모듈을 가져옵니다.
import getPomContext from "./get-pom-context.js";

/**
 * 부모 프로젝트에 릴리즈 정보를 마킹하는 메인 함수
 * @param {*} parentProjectApiUrl 부모프로젝트 레포지토리 API URL
 * @param {*} releases            릴리즈 정보 리스트
 * @param {*} pomPath             pom.xml 경로 
 * @param {*} projectPath         프로젝트 레포지토리 경로 
 * @param {*} apiOptions          api 호출 옵션(token, retryLimit 등)
 * @param {*} logger              로거 
 */
export default async (parentProjectApiUrl, releases, pomPath, projectPath, apiOptions, logger) => {

   // 현재 수행하는 모듈의 이름으로 releases array 필터하여 레코드를 추출한다. 
   const currentPluginName = '@wafful-release/gitlab-module';
   const currentPluginReleases = releases.filter(release => release.pluginName === currentPluginName);
   if (currentPluginReleases.length === 0) {
      logger.log(`No releases to mark to parent`);
      return;
   }
   const release = currentPluginReleases[0];

   // pom.xml에서 모듈 이름과 버전 정보를 가져옵니다
   const { artifactId: moduleName } = await getPomContext(pomPath, projectPath);
   const version = release.version;
   const context = {
      moduleName,
      version
   };

   logger.log(`Mark to Parent: ${moduleName} ${version}`);

   // 부모 프로젝트의 이슈를 가져오거나 생성합니다
   const parentIssue = await getParentIssue(parentProjectApiUrl, apiOptions, context, logger);

   // 릴리즈 노트의 제목에 모듈 이름을 추가합니다
   const notes = release.notes.replace(/^## /, `## ${moduleName} `);

   // 부모 이슈에 릴리즈 노트를 코멘트로 추가합니다
   const ignoreIssueNote = await createParentIssueNote(parentProjectApiUrl, apiOptions, notes, parentIssue.iid, logger);
}

/**
 * 부모 프로젝트의 이슈에 릴리즈 노트를 코멘트로 추가하는 함수
 * @param {string} parentProjectApiUrl 부모 프로젝트 API URL
 * @param {object} apiOptions API 호출 옵션
 * @param {string} notes 릴리즈 노트 내용
 * @param {number} iid 이슈 ID
 * @param {object} logger 로거
 */
async function createParentIssueNote(parentProjectApiUrl, apiOptions, notes, iid, logger) {
   const parentIssueNoteEndpoint = urlJoin(parentProjectApiUrl, "issues", iid.toString(), "notes");   
   logger.log(`Create Submodule Released Issue Note At Parent Repository: ${parentIssueNoteEndpoint}`);

   return await got.post(parentIssueNoteEndpoint, {
      ...apiOptions,
      json: {
         body: notes
      },
   });
}

/**
 * 부모 프로젝트에서 서브모듈 릴리즈 이슈를 찾거나 생성하는 함수
 * @param {string} parentProjectApiUrl 부모 프로젝트 API URL
 * @param {object} apiOptions API 호출 옵션
 * @param {object} context 모듈 이름과 버전 정보
 * @param {object} logger 로거
 */
async function getParentIssue(parentProjectApiUrl, apiOptions, context, logger) {
   // 서브모듈 릴리즈 이슈를 찾기 위한 검색 조건
   const query = {
      labels: "submodule_released",
      state: "opened",
      order_by: "created_at",
      sort: "desc"
   }

   const queryString = getQueryString(query);
   const parentIssueEndpoint = urlJoin(parentProjectApiUrl, "issues", queryString);
   logger.log(`Is exist Submodule Released Issue At Parent Repository: ${parentIssueEndpoint}`);

   const issues = await got.get(parentIssueEndpoint, {
      ...apiOptions,
   }).json();

   logger.log(` > issues: ${issues.length} 건`);

   // 여러 개의 이슈가 존재하면 에러 발생
   if (issues.length > 1) {
      throw new SemanticReleaseError(
         "부모 프로젝트에 한개 이상의 서브모듈 릴리즈 이슈가 존재합니다.",
         "FOUND_MULTIPLE_SUBMODULE_RELEASED_ISSUES",
         `부모 프로젝트(${parentProjectApiUrl})에 ${issues.length} 건의 서브모듈 릴리즈 이슈가 존재합니다. \n 최종 이슈를 남기고 정리 후 다시 시도해주세요.`
      );
   }

   // 이슈가 하나 있으면 업데이트, 없으면 새로 생성
   if (issues.length === 1) {
      const issue = issues[0];
      return await updateParentIssue(parentProjectApiUrl, apiOptions, context, issue, logger);
   }

   return await createParentIssue(parentProjectApiUrl, apiOptions, context, logger);
}

/**
 * 기존 부모 이슈를 업데이트하는 함수
 * @param {string} parentProjectApiUrl 부모 프로젝트 API URL
 * @param {object} apiOptions API 호출 옵션
 * @param {object} context 모듈 이름과 버전 정보
 * @param {object} issue 기존 이슈 정보
 * @param {object} logger 로거
 */
async function updateParentIssue(parentProjectApiUrl, apiOptions, context, issue, logger) {
   const issueEndpoint = urlJoin(parentProjectApiUrl, "issues", issue.iid.toString());
   logger.log(`Update Submodule Released Issue At Parent Repository: ${issueEndpoint}`);

   return await got.put(
      issueEndpoint,
      {
         ...apiOptions,
         json: {
            description: getYamlDescription(context, issue.description),
         },
      }).json();
}

/**
 * 새로운 부모 이슈를 생성하는 함수
 * @param {string} parentProjectApiUrl 부모 프로젝트 API URL
 * @param {object} apiOptions API 호출 옵션
 * @param {object} context 모듈 이름과 버전 정보
 * @param {object} logger 로거
 */
async function createParentIssue(parentProjectApiUrl, apiOptions, context, logger) {
   const parentIssueEndpoint = urlJoin(parentProjectApiUrl, "issues");
   logger.log(`Create Submodule Released Issue At Parent Repository: ${parentIssueEndpoint}`);

   const issue = await got.post(
      parentIssueEndpoint,
      {
         ...apiOptions,
         json: {
            title: "서브모듈 릴리즈로 인한 프로젝트 배포 요청",
            description: getYamlDescription(context),
            labels: ["submodule_released"],
         },
      }).json();

   return issue;
}

/**
 * YAML 형식의 이슈 설명을 생성하는 함수
 * @param {object} context 모듈 이름과 버전 정보
 * @param {string} description 기존 설명 (있는 경우)
 * @returns {string} YAML 형식의 설명
 */
function getYamlDescription(context, description) {
   try {
      const json = description ? yaml.parse(description) : {};
      json[context.moduleName] = context.version;
      return yaml.stringify(json, { indent: 4 });
   } catch (error) {
      return yaml.stringify({ [context.moduleName]: context.version }, { indent: 4 });
   }
}

/**
 * URL 쿼리 문자열을 생성하는 함수
 * @param {object} query 쿼리 파라미터 객체
 * @returns {string} URL 쿼리 문자열
 */
const getQueryString = (query) => {
   return "?" + Object.entries(query).map(([key, value]) => `${key}=${value}`).join("&");
}

// 테스트를 위해 내부 함수들을 export
export {
   getYamlDescription,
   getQueryString,
   getParentIssue,
   createParentIssue,
   updateParentIssue,
   createParentIssueNote,
}; 