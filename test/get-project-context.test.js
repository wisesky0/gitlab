import test from "ava";
import getProjectContext from "../lib/get-project-context.js";

test("Parse project path with https URL", (t) => {
  t.is(
    getProjectContext({ env: {} }, "http://git.nucube.lguplus.co.kr", "https://api.gitlab.com", "http://git.nucube.lguplus.co.kr/owner/repo.git")
      .projectPath,
    "owner/repo"
  );
  t.is(
    getProjectContext({ env: {} }, "http://git.nucube.lguplus.co.kr", "https://api.gitlab.com", "http://git.nucube.lguplus.co.kr/owner/repo")
      .projectPath,
    "owner/repo"
  );
});

test("Parse project path with git URL", (t) => {
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr",
      "https://api.gitlab.com",
      "git+ssh://git@gitlab.com/owner/repo.git"
    ).projectPath,
    "owner/repo"
  );
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr",
      "https://api.gitlab.com",
      "git+ssh://git@gitlab.com/owner/repo"
    ).projectPath,
    "owner/repo"
  );
});

test("Parse project path with context in repo URL", (t) => {
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr/context",
      "https://api.gitlab.com",
      "http://git.nucube.lguplus.co.kr/context/owner/repo.git"
    ).projectPath,
    "owner/repo"
  );
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr/context",
      "https://api.gitlab.com",
      "git+ssh://git@gitlab.com/context/owner/repo.git"
    ).projectPath,
    "owner/repo"
  );
});

test("Parse project path with context not in repo URL", (t) => {
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr/context",
      "https://api.gitlab.com",
      "http://git.nucube.lguplus.co.kr/owner/repo.git"
    ).projectPath,
    "owner/repo"
  );
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr/context",
      "https://api.gitlab.com",
      "git+ssh://git@gitlab.com/owner/repo.git"
    ).projectPath,
    "owner/repo"
  );
});

test("Parse project path with organization and subgroup", (t) => {
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr/context",
      "https://api.gitlab.com",
      "http://git.nucube.lguplus.co.kr/orga/subgroup/owner/repo.git"
    ).projectPath,
    "orga/subgroup/owner/repo"
  );
  t.is(
    getProjectContext(
      { env: {} },
      "http://git.nucube.lguplus.co.kr/context",
      "https://api.gitlab.com",
      "git+ssh://git@gitlab.com/orga/subgroup/owner/repo.git"
    ).projectPath,
    "orga/subgroup/owner/repo"
  );
});

test("Get project path from GitLab CI", (t) => {
  t.is(
    getProjectContext(
      { envCi: { service: "gitlab" }, env: { CI_PROJECT_PATH: "other-owner/other-repo" } },
      "http://git.nucube.lguplus.co.kr",
      "https://api.gitlab.com",
      "http://git.nucube.lguplus.co.kr/owner/repo.git"
    ).projectPath,
    "other-owner/other-repo"
  );
});

test("Ignore CI_PROJECT_PATH if not on GitLab CI", (t) => {
  t.is(
    getProjectContext(
      { envCi: { service: "travis" }, env: { CI_PROJECT_PATH: "other-owner/other-repo" } },
      "http://git.nucube.lguplus.co.kr",
      "https://api.gitlab.com",
      "http://git.nucube.lguplus.co.kr/owner/repo.git"
    ).projectPath,
    "owner/repo"
  );
});

test("Uses project API URL with project path", (t) => {
  t.is(
    getProjectContext(
      { envCi: { service: "gitlab" }, env: { CI_PROJECT_PATH: "other-owner/other-repo" } },
      "http://git.nucube.lguplus.co.kr",
      "https://api.gitlab.com",
      "http://git.nucube.lguplus.co.kr/owner/repo.git"
    ).projectApiUrl,
    "https://api.gitlab.com/projects/other-owner%2Fother-repo"
  );
});

test("Uses project API URL with project ID", (t) => {
  t.is(
    getProjectContext(
      { envCi: { service: "gitlab" }, env: { CI_PROJECT_ID: "42" } },
      "http://git.nucube.lguplus.co.kr",
      "https://api.gitlab.com",
      "http://git.nucube.lguplus.co.kr/owner/repo.git"
    ).projectApiUrl,
    "https://api.gitlab.com/projects/42"
  );
});
