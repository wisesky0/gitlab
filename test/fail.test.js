import test from "ava";
import nock from "nock";
import { stub } from "sinon";
import fail from "../lib/fail.js";
import authenticate from "./helpers/mock-gitlab.js";

/* eslint camelcase: ["error", {properties: "never"}] */

test.beforeEach((t) => {
  // Mock logger
  t.context.log = stub();
  t.context.error = stub();
  t.context.logger = { log: t.context.log, error: t.context.error };
});

test.afterEach.always(() => {
  // Clear nock
  nock.cleanAll();
});

test.serial("Post new issue if none exists yet", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {};
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedProjectPath}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user/test_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/${encodedProjectPath}/issues`, {
      id: "test_user%2Ftest_repo",
      description: `## :rotating_light: \`main\` 브랜치에서의 자동 릴리스가 실패했습니다. :rotating_light:

이 문제를 높은 우선순위로 처리하는 것을 권장합니다. 그래야 다른 패키지들이 당신의 버그 수정과 새로운 기능을 다시 사용할 수 있습니다.

아래는 **semantic-release**에 의해 보고된 오류 목록입니다. 이들 각각은 자동으로 패키지를 게시하기 위해 해결되어야 합니다. 당신은 이 문제를 해결할 수 있을 것입니다 💪.

오류는 보통 잘못된 설정이나 인증 문제로 인해 발생합니다. 아래에 보고된 각 오류와 함께 이를 해결하기 위한 설명과 지침이 제공됩니다.

모든 오류가 해결되면, **semantic-release**는 \`main\` 브랜치에 커밋을 푸시할 때 다음 번에 패키지를 릴리스할 것입니다. 또한 실패한 CI 작업을 수동으로 다시 시작할 수도 있습니다.

해결 방법을 잘 모르겠다면, 다음 링크들이 도움이 될 수 있습니다:
- [사용 설명서](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab/blob/master/docs/usage/README.md)
- [자주 묻는 질문](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab/blob/master/docs/support/FAQ.md)
- [지원 채널](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab#get-help)

이들이 도움이 되지 않거나, 이 문제가 잘못된 것이라고 생각되면, 언제든지 **[semantic-release](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab/issues/new)** 뒤에 있는 사람들에게 문의할 수 있습니다.

---

### An error occured

 안타깝게도 이 오류에 대한 추가 정보가 없습니다.

---

프로젝트에 행운을 빕니다 ✨

당신의 **[semantic-release](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab)** bot :package: :rocket:`,
      labels: "semantic-release",
      title: "The automated release is failing 🚨",
    })
    .reply(200, { id: 3, web_url: "http://git.nucube.lguplus.co.kr/test_user/test_repo/-/issues/3" });

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    "Created issue #%d: %s.",
    3,
    "http://git.nucube.lguplus.co.kr/test_user/test_repo/-/issues/3",
  ]);
});

test.serial("Post comments to existing issue", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {};
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedProjectPath}/issues?state=opened&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 1,
        iid: 1,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user%2Ftest_repo/issues/1",
        title: "The automated release is failing 🚨",
      },
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user%2Ftest_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/1/issues/1/notes`, {
      body: `## :rotating_light: \`main\` 브랜치에서의 자동 릴리스가 실패했습니다. :rotating_light:

이 문제를 높은 우선순위로 처리하는 것을 권장합니다. 그래야 다른 패키지들이 당신의 버그 수정과 새로운 기능을 다시 사용할 수 있습니다.

아래는 **semantic-release**에 의해 보고된 오류 목록입니다. 이들 각각은 자동으로 패키지를 게시하기 위해 해결되어야 합니다. 당신은 이 문제를 해결할 수 있을 것입니다 💪.

오류는 보통 잘못된 설정이나 인증 문제로 인해 발생합니다. 아래에 보고된 각 오류와 함께 이를 해결하기 위한 설명과 지침이 제공됩니다.

모든 오류가 해결되면, **semantic-release**는 \`main\` 브랜치에 커밋을 푸시할 때 다음 번에 패키지를 릴리스할 것입니다. 또한 실패한 CI 작업을 수동으로 다시 시작할 수도 있습니다.

해결 방법을 잘 모르겠다면, 다음 링크들이 도움이 될 수 있습니다:
- [사용 설명서](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab/blob/master/docs/usage/README.md)
- [자주 묻는 질문](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab/blob/master/docs/support/FAQ.md)
- [지원 채널](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab#get-help)

이들이 도움이 되지 않거나, 이 문제가 잘못된 것이라고 생각되면, 언제든지 **[semantic-release](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab/issues/new)** 뒤에 있는 사람들에게 문의할 수 있습니다.

---

### An error occured

 안타깝게도 이 오류에 대한 추가 정보가 없습니다.

---

프로젝트에 행운을 빕니다 ✨

당신의 **[semantic-release](http://gitlab.nucube.lguplus.co.kr/eswa/wafful-for-msa/wafful-node-package/gitlab)** bot :package: :rocket:`,
    })
    .reply(200);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Post comments to existing issue with custom template", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: `Error: Release for branch \${branch.name} failed with error: \${errors.map(error => error.message).join(';')}`,
    failTitle: "Semantic Release Failure",
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("Semantic Release Failure");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedProjectPath}/issues?state=opened&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 1,
        iid: 1,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user%2Ftest_repo/issues/1",
        title: "Semantic Release Failure",
      },
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user%2Ftest_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/1/issues/1/notes`, {
      body: `Error: Release for branch main failed with error: An error occured`,
    })
    .reply(200);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failTitle and failComment are both set to false", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: false,
    failTitle: false,
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const gitlab = authenticate(env);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failTitle is set to false", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: `Error: Release for branch \${branch.name} failed with error: \${errors.map(error => error.message).join(';')}`,
    failTitle: false,
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const gitlab = authenticate(env);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failComment is set to false", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: false,
    failTitle: "Semantic Release Failure",
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const gitlab = authenticate(env);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failCommentCondition disables it", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { failCommentCondition: "<% return false; %>" };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedProjectPath}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user/test_repo/issues/2",
        title: "API should implemented authentication",
      },
    ]);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments on existing issues when failCommentCondition disables this", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { failCommentCondition: "<% return !issue; %>" };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedProjectPath}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 1,
        iid: 1,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user%2Ftest_repo/issues/1",
        title: "The automated release is failing 🚨",
      },
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user%2Ftest_repo/issues/2",
        title: "API should implemented authentication",
      },
    ]);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Post new issue if none exists yet with disabled comment on existing issues", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: `Error: Release for branch \${branch.name} failed with error: \${errors.map(error => error.message).join(';')}`,
    failCommentCondition: "<% return !issue; %>",
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedProjectPath}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "http://git.nucube.lguplus.co.kr/test_user/test_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/${encodedProjectPath}/issues`, {
      id: "test_user%2Ftest_repo",
      description: `Error: Release for branch main failed with error: An error occured`,
      labels: "semantic-release",
      title: "The automated release is failing 🚨",
    })
    .reply(200, { id: 3, web_url: "http://git.nucube.lguplus.co.kr/test_user/test_repo/-/issues/3" });

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    "Created issue #%d: %s.",
    3,
    "http://git.nucube.lguplus.co.kr/test_user/test_repo/-/issues/3",
  ]);
});

test.serial("Does not post comments when failCommentCondition is set to false", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { failCommentCondition: false };
  const branch = { name: "main" };
  const options = { repositoryUrl: `http://git.nucube.lguplus.co.kr/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const gitlab = authenticate(env);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});
