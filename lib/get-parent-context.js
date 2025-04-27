import urlJoin from "url-join";

export default (
  { envCi: { service } = {}, env: { CI_PARENT_PATH } },
  gitlabApiUrl,
  parentPath
) => {
  parentPath = parentPath || (CI_PARENT_PATH ? CI_PARENT_PATH : undefined);
  if (!parentPath) {
    return {
      parentPath: undefined,
      encodedParentPath: undefined,
      parentApiUrl: undefined
    };
  }
  const encodedParentPath= encodeURIComponent(parentPath);
  const parentApiUrl = urlJoin(gitlabApiUrl, `/projects/${encodedParentPath}`);
  return {
    parentPath,
    encodedParentPath: encodedParentPath,
    parentApiUrl : parentApiUrl
  };
};
