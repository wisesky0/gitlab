import urlJoin from "url-join";

export default (
  { env: { CI_PARENT_ID_OR_PATH } },
  gitlabApiUrl,
  parentIdOrPath
) => {
  parentIdOrPath = parentIdOrPath || (CI_PARENT_ID_OR_PATH ? CI_PARENT_ID_OR_PATH : undefined);
  if (!parentIdOrPath) {
    return {
      parentIdOrPath: undefined,
      encodedparentIdOrPath: undefined,
      parentApiUrl: undefined
    };
  }
  const encodedparentIdOrPath= encodeURIComponent(parentIdOrPath);
  const parentProjectApiUrl = urlJoin(gitlabApiUrl, `/projects/${encodedparentIdOrPath}`);
  return {
    parentIdOrPath,
    encodedparentIdOrPath: encodedparentIdOrPath,
    parentProjectApiUrl
  };
};
