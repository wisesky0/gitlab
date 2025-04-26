import urlJoin from "url-join";
import { PARENT_PROJECT_PATH } from "./definitions/constants";

export default (gitlabApiUrl, parentProjectPath) => {
  const projectPath = parentProjectPath || PARENT_PROJECT_PATH;
  const encodedProjectPath = encodeURIComponent(projectPath);
  const projectApiUrl = urlJoin(gitlabApiUrl, `/projects/${encodedProjectPath}`);
  return {
    projectPath,
    encodedProjectPath,
    projectApiUrl,
  };
};
