import test from "ava";
import mockGitlab from "./helpers/mock-gitlab.js";
import markToParent from "../lib/mark-to-parent.js";
import { getQueryString, getYamlDescription, createParentIssue, updateParentIssue, getParentIssue, createParentIssueNote } from "../lib/mark-to-parent.js";

test.serial('query string 테스트', (t) => {
    const querys = {
        labels: "submodule_released",
        state: "opened",
        order_by: "created_at",
        sort: "desc"
    }

    const queryString = getQueryString(querys);
    t.is(queryString, "?labels=submodule_released&state=opened&order_by=created_at&sort=desc");
});

test.serial('getYamlDescription 테스트', (t) => {

    const context = {
        moduleName: "module3",
        version: "1.0.0"
    };

    const yamlDescription = getYamlDescription(context, "module1: 1.0.0\nmodule2: 2.0.0\n");
    t.is(yamlDescription, "module1: 1.0.0\nmodule2: 2.0.0\nmodule3: 1.0.0\n");

    const context2 = {
        moduleName: "module1",
        version: "2.0.0"
    };

    const yamlDescription2 = getYamlDescription(context2, "module1: 1.0.0\nmodule2: 2.0.0\n");
    t.is(yamlDescription2, "module1: 2.0.0\nmodule2: 2.0.0\n");

    const yamlDescription3 = getYamlDescription(context);
    t.is(yamlDescription3, "module3: 1.0.0\n");
});

test.serial('createParentIssue 테스트', async (t) => {
    const env = { GL_URL: "https://gitlab.com", GITLAB_TOKEN: "1234567890" };
    const gitlab = mockGitlab(env)
        .post("/projects/1/issues", (body) => {
            t.is(body.title, "서브모듈 릴리즈로 인한 프로젝트 배포 요청");
            t.is(body.description, "module3: 1.0.0\n");
            t.deepEqual(body.labels, ["submodule_released"]);
            return true; // 검증 통과
        })
        .reply(200);

    const projectApiUri = "https://gitlab.com/api/v4/projects/1";
    const apiOptions = {
        headers: {
            "PRIVATE-TOKEN": "1234567890"
        },
    };
    const context = {
        moduleName: "module3",
        version: "1.0.0"
    };
    const parentIssue = await createParentIssue(projectApiUri, apiOptions, context, console);

    t.true(gitlab.isDone());
});

test.serial('updateParentIssue 테스트', async (t) => {
    const env = { GL_URL: "https://gitlab.com", GITLAB_TOKEN: "1234567890" };
    const gitlab = mockGitlab(env)
        .put("/projects/1/issues/1", (body) => {
            t.is(body.description, "module3: 1.0.1\n");
            return true;
        })
        .reply(200)
        .put("/projects/1/issues/1", (body) => {
            t.is(body.description, "module2: 1.0.0\nmodule3: 1.0.1\n");
            return true;
        })
        .reply(200)
        .put("/projects/1/issues/1", (body) => {
            t.is(body.description, "module3: 1.0.1\n");
            return true;
        })
        .reply(200)
        ;

    const projectApiUri = "https://gitlab.com/api/v4/projects/1";
    const apiOptions = {
        headers: {
            "PRIVATE-TOKEN": "1234567890"
        },
    };
    const body = {
        iid: 1,
        description: "module3: 1.0.0\n"
    };
    const context = {
        moduleName: "module3",
        version: "1.0.1"
    };

    await updateParentIssue(projectApiUri, apiOptions, context, body, console);

    body.description = "module2: 1.0.0\n";
    await updateParentIssue(projectApiUri, apiOptions, context, body, console);

    body.description = "module31.0.0\n";
    await updateParentIssue(projectApiUri, apiOptions, context, body, console);

    t.true(gitlab.isDone());
});

test.serial('getParentIssue CREATE 테스트', async (t) => {
    const env = { GL_URL: "https://gitlab.com", GITLAB_TOKEN: "1234567890" };
    const gitlab = mockGitlab(env)
        .get("/projects/1/issues?labels=submodule_released&state=opened&order_by=created_at&sort=desc")
        .reply(200, [])
        .post("/projects/1/issues", (body) => {
            t.is(body.title, "서브모듈 릴리즈로 인한 프로젝트 배포 요청");
            t.is(body.description, "module3: 1.0.0\n");
            t.deepEqual(body.labels, ["submodule_released"]);
            return true;
        })
        .reply(200, {
            iid: 1,
            description: "module3: 1.0.0\n"
        });
    ;

    const projectApiUri = "https://gitlab.com/api/v4/projects/1";

    const apiOptions = {
        headers: {
            "PRIVATE-TOKEN": "1234567890"
        },
    };

    const context = {
        moduleName: "module3",
        version: "1.0.0"
    };

    const parentIssue = await getParentIssue(projectApiUri, apiOptions, context, console);

    t.true(gitlab.isDone());
    t.is(parentIssue.iid, 1);
    t.is(parentIssue.description, "module3: 1.0.0\n");
})

test.serial('getParentIssue UPDATE 테스트', async (t) => {
    const env = { GL_URL: "https://gitlab.com", GITLAB_TOKEN: "1234567890" };
    const gitlab = mockGitlab(env)
        .get("/projects/1/issues?labels=submodule_released&state=opened&order_by=created_at&sort=desc")
        .reply(200, [
            {
                iid: 1,
                description: "module3: 1.0.0\n"
            }
        ])
        .put("/projects/1/issues/1", (body) => {
            t.is(body.description, "module3: 1.0.0\n");
            return true;
        })
        .reply(200, {
            iid: 1,
            description: "module3: 1.0.0\n"
        });
    ;

    const projectApiUri = "https://gitlab.com/api/v4/projects/1";
    const apiOptions = {
        headers: {
            "PRIVATE-TOKEN": "1234567890"
        },
    };
    const context = {
        moduleName: "module3",
        version: "1.0.0"
    };

    const parentIssue = await getParentIssue(projectApiUri, apiOptions, context, console);

    t.true(gitlab.isDone());
    t.is(parentIssue.iid, 1);
    t.is(parentIssue.description, "module3: 1.0.0\n");
})

test.serial('createParentIssueNotes 테스트', async (t) => {

    const env = { GL_URL: "https://gitlab.com", GITLAB_TOKEN: "1234567890" };
    const gitlab = mockGitlab(env)
        .post("/projects/1/issues/1/notes", (body) => {
            t.is(body.body, "## module3 3.0.0");
            return true;
        })
        .reply(200);

    const projectApiUri = "https://gitlab.com/api/v4/projects/1";
    const apiOptions = {
        headers: {
            "PRIVATE-TOKEN": "1234567890"
        },
    };
    const notes = "## module3 3.0.0";
    const parentIssue = { iid: 1 };

    await createParentIssueNote(projectApiUri, apiOptions, notes, parentIssue.iid, console);
    t.true(gitlab.isDone());
});

test.serial('markToParent CREATE 테스트', async (t) => {

    const env = { GL_URL: "https://gitlab.com", GITLAB_TOKEN: "1234567890" };
    const gitlab = mockGitlab(env)
        .get("/projects/1/issues?labels=submodule_released&state=opened&order_by=created_at&sort=desc")
        .reply(200, [])
        .post("/projects/1/issues", (body) => {
            t.is(body.title, "서브모듈 릴리즈로 인한 프로젝트 배포 요청");
            t.is(body.description, "h2s-parent: 1.0.0\n");
            return true;
        })
        .reply(200, {
            iid: 1,
            description: "h2s-parent: 1.0.0\n"
        })
        .post("/projects/1/issues/1/notes", (body) => {
            t.is(body.body, "## h2s-parent 1.0.0");
            return true;
        })
        .reply(200);

    const projectApiUri = "https://gitlab.com/api/v4/projects/1";
    const releases = [{
        pluginName: '@wafful-release/gitlab-module',
        version: '1.0.0',
        notes: '## 1.0.0'
    }];
    const pomPath = 'test/fixtures/files/pom.xml';
    const projectPath = 'h2s-parent/h2s-core';
    const apiOptions = {
        headers: {
            "PRIVATE-TOKEN": "1234567890"
        },
    };

    await markToParent(projectApiUri, releases, pomPath, projectPath, apiOptions, console);
    t.true(gitlab.isDone());
});