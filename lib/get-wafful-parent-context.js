import urlJoin from "url-join";

export default (gitlabApiUrl) => {
  const projectPath = WAFFUL_PARENT_PROJECT_PATH;
  const encodedProjectPath = encodeURIComponent(projectPath);
  const projectApiUrl = urlJoin(gitlabApiUrl, `/projects/${encodedProjectPath}`);
  return {
    projectPath,
    encodedProjectPath,
    projectApiUrl,
  };
};
