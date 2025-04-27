import { castArray, isNil } from "lodash-es";
import urlJoin from "url-join";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";

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
    parentProjectPath,
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
      PARENT_PROJECT_PATH,
    },
  }
) => {
  const DEFAULT_RETRY_LIMIT = 3;
  const userGitlabApiPathPrefix = isNil(gitlabApiPathPrefix)
    ? isNil(GL_PREFIX)
      ? GITLAB_PREFIX
      : GL_PREFIX
    : gitlabApiPathPrefix;
  const userGitlabUrl = gitlabUrl || GL_URL || GITLAB_URL;
  const defaultedGitlabUrl =
    userGitlabUrl ||
    (service === "gitlab" && CI_PROJECT_URL && CI_PROJECT_PATH
      ? CI_PROJECT_URL.replace(new RegExp(`/${CI_PROJECT_PATH}$`), "")
      : "https://gitlab.com");
  return {
    gitlabToken: GL_TOKEN || GITLAB_TOKEN,
    gitlabUrl: defaultedGitlabUrl,
    gitlabApiUrl:
      userGitlabUrl && userGitlabApiPathPrefix
        ? urlJoin(userGitlabUrl, userGitlabApiPathPrefix)
        : service === "gitlab" && CI_API_V4_URL
          ? CI_API_V4_URL
          : urlJoin(defaultedGitlabUrl, isNil(userGitlabApiPathPrefix) ? "/api/v4" : userGitlabApiPathPrefix),
    assets: assets ? castArray(assets) : assets,
    milestones: milestones ? castArray(milestones) : milestones,
    successComment,
    successCommentCondition,
    proxy: getProxyConfiguration(defaultedGitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY),
    failTitle: isNil(failTitle) ? "The automated release is failing 🚨" : failTitle,
    failComment,
    failCommentCondition,
    labels: isNil(labels) ? "semantic-release" : labels === false ? false : labels,
    assignee,
    retryLimit: retryLimit ?? DEFAULT_RETRY_LIMIT,
    parentProjectPath: parentProjectPath || PARENT_PROJECT_PATH,
  };
};

function shouldProxy(gitlabUrl, NO_PROXY) {
  const DEFAULT_PORTS = {
    ftp: 21,
    gopher: 70,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443,
  };
  const parsedUrl =
    typeof gitlabUrl === "string" && (gitlabUrl.startsWith("http://") || gitlabUrl.startsWith("https://"))
      ? new URL(gitlabUrl)
      : gitlabUrl || {};
  let proto = parsedUrl.protocol;
  let hostname = parsedUrl.host;
  let { port } = parsedUrl;
  if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
    return "";
  }

  proto = proto.split(":", 1)[0];
  hostname = hostname.replace(/:\d*$/, "");
  port = Number.parseInt(port, 10) || DEFAULT_PORTS[proto] || 0;

  if (!NO_PROXY) {
    return true;
  }

  if (NO_PROXY === "*") {
    return false;
  }

  return NO_PROXY.split(/[,\s]/).every((proxy) => {
    if (!proxy) {
      return true;
    }

    const parsedProxy = proxy.match(/^(.+):(\d+)$/);
    let parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
    const parsedProxyPort = parsedProxy ? Number.parseInt(parsedProxy[2], 10) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true;
    }

    if (!/^[.*]/.test(parsedProxyHostname)) {
      return hostname !== parsedProxyHostname;
    }

    if (parsedProxyHostname.charAt(0) === "*") {
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }

    return !hostname.endsWith(parsedProxyHostname);
  });
}

function getProxyConfiguration(gitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY) {
  const sharedParameters = {
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 256,
    maxFreeSockets: 256,
    scheduling: "lifo",
  };

  if (shouldProxy(gitlabUrl, NO_PROXY)) {
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

  return {};
}
