import urlJoin from "url-join";

export default (gitlabApiUrl, parentProjectPath) => {
  const projectPath = parentProjectPath;
  const encodedProjectPath = encodeURIComponent(projectPath);
  const projectApiUrl = urlJoin(gitlabApiUrl, `/projects/${encodedProjectPath}`);
  return {
    projectPath,
    encodedProjectPath,
    projectApiUrl,
  };
};
