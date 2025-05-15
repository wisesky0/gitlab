/**
 * @file resolve-config.js
 * @description 
 * 이 파일은 GitLab 모듈의 설정을 해석하고 기본값을 적용하는 기능을 담당합니다.
 * 주요 기능:
 * 1. GitLab API URL 및 인증 토큰 설정
 * 2. 릴리즈 관련 설정 (assets, milestones, labels 등)
 * 3. 프록시 설정
 * 4. 부모 프로젝트 및 pom.xml 경로 설정
 */

import { castArray, isNil } from "lodash-es";
import urlJoin from "url-join";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";

/**
 * GitLab 모듈의 설정을 해석하고 기본값을 적용하는 함수
 * 
 * @param {Object} options - 사용자 정의 설정 옵션
 * @param {string} options.gitlabUrl - GitLab 서버 URL
 * @param {string} options.gitlabApiPathPrefix - GitLab API 경로 접두사
 * @param {string|Array} options.assets - 릴리즈에 포함할 assets
 * @param {string|Array} options.milestones - 릴리즈에 연결할 milestones
 * @param {string} options.successComment - 성공 시 작성할 코멘트
 * @param {string} options.successCommentCondition - 성공 코멘트 작성 조건
 * @param {string} options.failTitle - 실패 시 이슈 제목
 * @param {string} options.failComment - 실패 시 작성할 코멘트
 * @param {string} options.failCommentCondition - 실패 코멘트 작성 조건
 * @param {string|Array|boolean} options.labels - 이슈에 추가할 라벨
 * @param {string} options.assignee - 이슈 담당자
 * @param {number} options.retryLimit - API 호출 재시도 횟수
 * @param {string} options.parentIdOrPath - 부모 프로젝트 ID 또는 경로
 * @param {string} options.pomPath - pom.xml 파일 경로
 * 
 * @param {Object} context - 환경 변수 및 CI 정보
 * @param {Object} context.envCi - CI 서비스 정보
 * @param {Object} context.env - 환경 변수
 * 
 * @returns {Object} 설정된 GitLab 모듈 옵션
 */
export default (
    {
        gitlabUrl,
        gitlabApiPathPrefix,
        assets,
        milestones,
        successComment,
        successCommentCondition,
        failTitle,
        failComment,
        failCommentCondition,
        labels,
        assignee,
        retryLimit,
        parentIdOrPath,
        pomPath,
    },
    {
        envCi: { service } = {},
        env: {
            CI_PROJECT_URL,
            CI_PROJECT_PATH,
            CI_API_V4_URL,
            GL_TOKEN,
            GITLAB_TOKEN,
            GL_URL,
            GITLAB_URL,
            GL_PREFIX,
            GITLAB_PREFIX,
            HTTP_PROXY,
            HTTPS_PROXY,
            NO_PROXY,
            CI_PARENT_ID_OR_PATH,
            CI_POM_PATH,
        },
    }
) => {
    // API 호출 재시도 횟수 기본값
    const DEFAULT_RETRY_LIMIT = 3;

    // GitLab API 경로 접두사 설정
    // 1. 사용자 설정 값
    // 2. GL_PREFIX 환경 변수
    // 3. GITLAB_PREFIX 환경 변수
    const userGitlabApiPathPrefix = isNil(gitlabApiPathPrefix)
        ? isNil(GL_PREFIX)
            ? GITLAB_PREFIX
            : GL_PREFIX
        : gitlabApiPathPrefix;

    // GitLab 서버 URL 설정
    // 1. 사용자 설정 값
    // 2. GL_URL 환경 변수
    // 3. GITLAB_URL 환경 변수
    const userGitlabUrl = gitlabUrl || GL_URL || GITLAB_URL;

    // GitLab 서버 URL 기본값 설정
    // 1. 사용자 설정 값
    // 2. CI 환경에서 자동 감지
    // 3. 기본 URL (http://git.nucube.lguplus.co.kr)
    const defaultedGitlabUrl =
        userGitlabUrl ||
        (service === "gitlab" && CI_PROJECT_URL && CI_PROJECT_PATH
            ? CI_PROJECT_URL.replace(new RegExp(`/${CI_PROJECT_PATH}$`), "")
            : "http://git.nucube.lguplus.co.kr");

    return {
        // GitLab 인증 토큰 (GL_TOKEN 또는 GITLAB_TOKEN)
        gitlabToken: GL_TOKEN || GITLAB_TOKEN,

        // GitLab 서버 URL
        gitlabUrl: defaultedGitlabUrl,

        // GitLab API URL 설정
        // 1. 사용자 설정 URL + API 경로 접두사
        // 2. CI_API_V4_URL (CI 환경)
        // 3. 기본 URL + API 경로 접두사
        gitlabApiUrl:
            userGitlabUrl && userGitlabApiPathPrefix
                ? urlJoin(userGitlabUrl, userGitlabApiPathPrefix)
                : service === "gitlab" && CI_API_V4_URL
                    ? CI_API_V4_URL
                    : urlJoin(defaultedGitlabUrl, isNil(userGitlabApiPathPrefix) ? "/api/v4" : userGitlabApiPathPrefix),

        // 릴리즈 assets 설정 (배열로 변환)
        assets: assets ? castArray(assets) : assets,

        // 릴리즈 milestones 설정 (배열로 변환)
        milestones: milestones ? castArray(milestones) : milestones,

        // 성공 시 코멘트 설정
        successComment,
        successCommentCondition,

        // 프록시 설정
        proxy: getProxyConfiguration(defaultedGitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY),

        // 실패 시 이슈 제목 (기본값: "The automated release is failing 🚨")
        failTitle: isNil(failTitle) ? "The automated release is failing 🚨" : failTitle,
        failComment,
        failCommentCondition,

        // 이슈 라벨 설정
        // 1. 사용자 설정 값
        // 2. 기본값: "semantic-release"
        // 3. false로 설정 시 라벨 미사용
        labels: isNil(labels) ? "semantic-release" : labels === false ? false : labels,

        // 이슈 담당자
        assignee,

        // API 호출 재시도 횟수 (기본값: 3)
        retryLimit: retryLimit ?? DEFAULT_RETRY_LIMIT,

        // 부모 프로젝트 GitLab 레포지토리 ID 또는 경로
        parentIdOrPath: parentIdOrPath || CI_PARENT_ID_OR_PATH,

        // pom.xml 경로 (기본값: "pom.xml")
        pomPath: pomPath || CI_POM_PATH || "pom.xml",
    };
};

/**
 * GitLab URL에 프록시를 적용해야 하는지 확인하는 함수
 * 
 * @param {string} gitlabUrl - GitLab 서버 URL
 * @param {string} NO_PROXY - 프록시를 사용하지 않을 호스트 목록
 * @returns {boolean} 프록시 적용 여부
 */
function shouldProxy(gitlabUrl, NO_PROXY) {
    // 기본 포트 설정
    const DEFAULT_PORTS = {
        ftp: 21,
        gopher: 70,
        http: 80,
        https: 443,
        ws: 80,
        wss: 443,
    };

    // URL 파싱
    const parsedUrl =
        typeof gitlabUrl === "string" && (gitlabUrl.startsWith("http://") || gitlabUrl.startsWith("https://"))
            ? new URL(gitlabUrl)
            : gitlabUrl || {};

    let proto = parsedUrl.protocol;
    let hostname = parsedUrl.host;
    let { port } = parsedUrl;

    // URL이 유효하지 않은 경우
    if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
        return "";
    }

    // 프로토콜, 호스트명, 포트 정규화
    proto = proto.split(":", 1)[0];
    hostname = hostname.replace(/:\d*$/, "");
    port = Number.parseInt(port, 10) || DEFAULT_PORTS[proto] || 0;

    // NO_PROXY가 설정되지 않은 경우 프록시 사용
    if (!NO_PROXY) {
        return true;
    }

    // NO_PROXY가 "*"인 경우 프록시 미사용
    if (NO_PROXY === "*") {
        return false;
    }

    // NO_PROXY 설정에 따라 프록시 사용 여부 결정
    return NO_PROXY.split(/[,\s]/).every((proxy) => {
        if (!proxy) {
            return true;
        }

        // 프록시 호스트명과 포트 파싱
        const parsedProxy = proxy.match(/^(.+):(\d+)$/);
        let parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
        const parsedProxyPort = parsedProxy ? Number.parseInt(parsedProxy[2], 10) : 0;

        // 포트가 다르면 프록시 사용
        if (parsedProxyPort && parsedProxyPort !== port) {
            return true;
        }

        // 와일드카드가 없는 경우 정확한 호스트명 비교
        if (!/^[.*]/.test(parsedProxyHostname)) {
            return hostname !== parsedProxyHostname;
        }

        // 와일드카드 처리
        if (parsedProxyHostname.charAt(0) === "*") {
            parsedProxyHostname = parsedProxyHostname.slice(1);
        }

        // 호스트명이 프록시 호스트명으로 끝나는지 확인
        return !hostname.endsWith(parsedProxyHostname);
    });
}

/**
 * 프록시 설정을 생성하는 함수
 * 
 * @param {string} gitlabUrl - GitLab 서버 URL
 * @param {string} HTTP_PROXY - HTTP 프록시 URL
 * @param {string} HTTPS_PROXY - HTTPS 프록시 URL
 * @param {string} NO_PROXY - 프록시를 사용하지 않을 호스트 목록
 * @returns {Object} 프록시 설정
 */
function getProxyConfiguration(gitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY) {
    // 공통 프록시 설정
    const sharedParameters = {
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: "lifo",
    };

    // 프록시 적용 여부 확인
    if (shouldProxy(gitlabUrl, NO_PROXY)) {
        // HTTP 프록시 설정
        if (HTTP_PROXY && gitlabUrl.startsWith("http://")) {
            return {
                agent: {
                    http: new HttpProxyAgent({
                        ...sharedParameters,
                        proxy: HTTP_PROXY,
                    }),
                },
            };
        }

        // HTTPS 프록시 설정
        if (HTTPS_PROXY && gitlabUrl.startsWith("https://")) {
            return {
                agent: {
                    https: new HttpsProxyAgent({
                        ...sharedParameters,
                        proxy: HTTPS_PROXY,
                    }),
                },
            };
        }
    }

    // 프록시 설정이 없는 경우 빈 객체 반환
    return {};
}
