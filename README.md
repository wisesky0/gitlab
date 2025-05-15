# wafful-release/gitlab-module

[**semantic-release**](https://github.com/semantic-release/semantic-release) 플러그인으로 [GitLab 릴리스](https://docs.gitlab.com/ee/user/project/releases/)를 게시합니다.

[![Build Status](https://github.com/wafful-release/gitlab-module/workflows/Test/badge.svg)](https://github.com/wafful-release/gitlab-module/actions?query=workflow%3ATest+branch%3Amaster) [![npm latest version](https://img.shields.io/npm/v/wafful-release/gitlab-module/latest.svg)](https://www.npmjs.com/package/wafful-release/gitlab-module)
[![npm next version](https://img.shields.io/npm/v/wafful-release/gitlab-module/next.svg)](https://www.npmjs.com/package/wafful-release/gitlab-module)

| 단계               | 설명                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verifyConditions` | 인증의 존재와 유효성을 확인합니다 ([환경 변수](#environment-variables)를 통해 설정).                               |
| `publish`          | [GitLab 릴리스](https://docs.gitlab.com/ee/user/project/releases/)를 게시합니다.                                                                      |
| `success`          | 릴리스로 해결된 각 GitLab 이슈 또는 병합 요청에 댓글을 추가합니다.                                                                        |
| `fail`             | 릴리스 실패를 일으킨 오류에 대한 정보와 함께 [GitLab 이슈](https://docs.gitlab.com/ee/user/project/issues/)를 생성하거나 업데이트합니다. |

## 설치

```bash
$ npm install wafful-release/gitlab-module -D
```

## 사용법

이 플러그인은 [**semantic-release** 설정 파일](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration)에서 구성할 수 있습니다:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "wafful-release/gitlab-module",
      {
        "gitlabUrl": "https://custom.gitlab.com",
        "assets": [
          { "path": "dist/asset.min.css", "label": "CSS 배포" },
          { "path": "dist/asset.min.js", "label": "JS 배포", "target": "generic_package" },
          { "path": "dist/asset.min.js", "label": "v${nextRelease.version}.js" },
          { "url": "https://gitlab.com/gitlab-org/gitlab/-/blob/master/README.md", "label": "README.md" }
        ]
      }
    ]
  ]
}
```

이 예제를 사용하면 [GitLab 릴리스](https://docs.gitlab.com/ee/user/project/releases/)가 `https://custom.gitlab.com` 인스턴스에 게시됩니다.

## 설정

### GitLab 인증

GitLab 인증 설정은 **필수**이며 [환경 변수](#environment-variables)를 통해 설정할 수 있습니다.

_Developer_ 역할(또는 그 이상)과 `api` 범위가 있는 [프로젝트 액세스 토큰](https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html), [그룹 액세스 토큰](https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html) 또는 [개인 액세스 토큰](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html)을 생성하고 CI 환경에서 `GL_TOKEN` 환경 변수를 통해 사용할 수 있도록 합니다. [원격 Git 저장소 인증](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/ci-configuration.md#authentication)으로 `GL_TOKEN`을 사용하는 경우 `write_repository` 범위도 있어야 합니다.

**참고**: [`dryRun`](https://semantic-release.gitbook.io/semantic-release/usage/configuration#dryrun)으로 실행할 때는 `read_repository` 범위만 필요합니다.

### 환경 변수

| 변수                       | 설명                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `GL_TOKEN` 또는 `GITLAB_TOKEN`   | **필수.** GitLab 인증에 사용되는 토큰.                                  |
| `GL_URL` 또는 `GITLAB_URL`       | GitLab 엔드포인트.                                                                       |
| `GL_PREFIX` 또는 `GITLAB_PREFIX` | GitLab API 접두사.                                                                     |
| `HTTP_PROXY` 또는 `HTTPS_PROXY`  | 사용할 HTTP 또는 HTTPS 프록시.                                                                |
| `NO_PROXY`                     | 프록시를 무시해야 하는 패턴. [아래 세부 정보](#proxy-configuration) 참조. |

#### 프록시 설정

이 플러그인은 프록시 서버를 통해 요청을 전달하는 것을 지원합니다.

`HTTPS_PROXY` 환경 변수를 통해 프록시 서버를 구성할 수 있습니다: `HTTPS_PROXY=http://proxyurl.com:8080`

프록시 서버에 인증이 필요한 경우 URL에 사용자 이름과 비밀번호를 포함시킵니다: `HTTPS_PROXY=http://user:pwd@proxyurl.com:8080`

GitLab 인스턴스가 일반 HTTP로 노출된 경우(권장되지 않음!) `HTTP_PROXY`를 대신 사용하세요.

일부 호스트에 대해 프록시를 우회해야 하는 경우 `NO_PROXY` 환경 변수를 구성하세요: `NO_PROXY=*.host.com, host.com`

### 옵션

| 옵션                    | 설명                                                                                                                                                                                                                                                                                                                | 기본값                                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gitlabUrl`               | GitLab 엔드포인트.                                                                                                                                                                                                                                                                                                       | `GL_URL` 또는 `GITLAB_URL` 환경 변수 또는 [GitLab CI/CD](https://docs.gitlab.com/ee/ci)에서 실행 중인 경우 CI 제공 환경 변수 또는 `https://gitlab.com`. |
| `gitlabApiPathPrefix`     | GitLab API 접두사.                                                                                                                                                                                                                                                                                                     | `GL_PREFIX` 또는 `GITLAB_PREFIX` 환경 변수 또는 [GitLab CI/CD](https://docs.gitlab.com/ee/ci)에서 실행 중인 경우 CI 제공 환경 변수 또는 `/api/v4`.      |
| `assets`                  | 릴리스에 업로드할 파일 배열. [assets](#assets) 참조.                                                                                                                                                                                                                                                         | -                                                                                                                                                                       |
| `milestones`              | 릴리스와 연결할 마일스톤 제목 배열. [GitLab 릴리스 API](https://docs.gitlab.com/ee/api/releases/#create-a-release) 참조.                                                                                                                                                                             | -                                                                                                                                                                       |
| `successComment`          | 릴리스로 해결된 각 이슈와 병합 요청에 추가할 댓글. [successComment](#successComment) 참조.                                                                                                                                                                                                         | :tada: 이 이슈는 버전 ${nextRelease.version}에서 해결되었습니다 :tada:

릴리스는 [GitLab 릴리스](gitlab_release_url)에서 사용할 수 있습니다                        |
| `successCommentCondition` | 이슈나 병합 요청에 언제 댓글을 달지 결정하는 조건. [successCommentCondition](#successCommentCondition) 참조.                                                                                                                                                                                               | -                                                                                                                                                                       |
| `failComment`             | 릴리스가 실패할 때 생성되는 이슈의 내용. [failComment](#failcomment) 참조.                                                                                                                                                                                                                                    | **semantic-release** 문서와 지원 링크가 포함된 친절한 메시지와 릴리스 실패를 일으킨 오류 목록.                                 |
| `failTitle`               | 릴리스가 실패할 때 생성되는 이슈의 제목.                                                                                                                                                                                                                                                                       | `자동화된 릴리스가 실패했습니다 🚨`                                                                                                                                   |
| `failCommentCondition`    | 실패 시 이슈에 댓글을 달거나 생성할 때 사용할 조건. [failCommentCondition](#failCommentCondition) 참조.                                                                                                                                                                                      | -                                                                                                                                                                       |
| `labels`                  | 릴리스가 실패할 때 생성되는 이슈에 추가할 [레이블](https://docs.gitlab.com/ee/user/project/labels.html#labels). 레이블을 추가하지 않으려면 `false`로 설정하세요. 레이블은 [공식 문서](https://docs.gitlab.com/ee/api/issues.html#new-issue)에 설명된 대로 쉼표로 구분해야 합니다(예: `"semantic-release,bot"`). | `semantic-release`                                                                                                                                                      |
| `assignee`                | 릴리스가 실패할 때 생성되는 이슈에 추가할 [담당자](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#assignee).                                                                                                                                                                             | -                                                                                                                                                                       |
| `retryLimit`              | 실패한 HTTP 요청에 대한 최대 재시도 횟수.                                                                                                                                                                                                                                                                   | `3`                                                                                                                                                                     |

#### assets

[glob](https://github.com/isaacs/node-glob#glob-primer) 또는 다음 속성을 가진 `Object`의 `Array`일 수 있습니다:

| 속성   | 설명                                                                                                                                                                                                                                                                                                                        | 기본값                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `path`     | `url`이 설정되지 않은 경우 **필수**. 업로드할 파일을 식별하는 [glob](https://github.com/isaacs/node-glob#glob-primer). [Lodash 템플릿](https://lodash.com/docs#template)을 지원합니다.                                                                                                                                      | -                                    |
| `url`      | `path` 설정 대신 릴리스에 링크를 추가하는 기능을 제공합니다(예: 컨테이너 이미지 URL). [Lodash 템플릿](https://lodash.com/docs#template)을 지원합니다.                                                                                                                                                   | -                                    |
| `label`    | GitLab 릴리스에 표시되는 파일에 대한 간단한 설명. `path`가 둘 이상의 파일과 일치하면 무시됩니다. [Lodash 템플릿](https://lodash.com/docs#template)을 지원합니다.                                                                                                                                                       | `path`에서 추출한 파일 이름. |
| `type`     | GitLab 릴리스에 표시되는 에셋 유형. `runbook`, `package`, `image` 및 `other`일 수 있습니다([릴리스 에셋](https://docs.gitlab.com/ee/user/project/releases/#release-assets)에 대한 공식 문서 참조). [Lodash 템플릿](https://lodash.com/docs#template)을 지원합니다.                                                       | `other`                              |
| `filepath` | 에셋을 가리키는 영구 링크를 생성하기 위한 파일 경로(GitLab 12.9+ 필요, [영구 링크](https://docs.gitlab.com/ee/user/project/releases/#permanent-links-to-release-assets)에 대한 공식 문서 참조). `path`가 둘 이상의 파일과 일치하면 무시됩니다. [Lodash 템플릿](https://lodash.com/docs#template)을 지원합니다. | -                                    |
| `target`   | 파일이 업로드되는 위치를 제어합니다. 파일을 [프로젝트 업로드](https://docs.gitlab.com/ee/api/projects.html#upload-a-file)로 저장하려면 `project_upload`로 설정하거나 파일을 [일반 패키지](https://docs.gitlab.com/ee/user/packages/generic_packages/)로 저장하려면 `generic_package`로 설정할 수 있습니다.                            | `project_upload`                     |
| `status`   | `target`이 `generic_package`로 설정된 경우에만 적용됩니다. 일반 패키지 상태. `default` 및 `hidden`일 수 있습니다([일반 패키지](https://docs.gitlab.com/ee/user/packages/generic_packages/)에 대한 공식 문서 참조).                                                                                               | `default`                            |

`assets` `Array`의 각 항목은 개별적으로 glob됩니다. [glob](https://github.com/isaacs/node-glob#glob-primer)은 `String`(`"dist/**/*.js"` 또는 `"dist/mylib.js"`) 또는 함께 glob될 `String`의 `Array`(`["dist/**", "!**/*.css"]`)일 수 있습니다.

디렉토리가 구성된 경우 이 디렉토리와 그 하위 디렉토리 아래의 모든 파일이 포함됩니다.

**참고**: 파일이 `assets`에 일치하는 항목이 있으면 `.gitignore`에도 일치하는 항목이 있어도 포함됩니다.

##### assets 예시

`'dist/*.js'`: `dist` 디렉토리의 모든 `js` 파일을 포함하지만 하위 디렉토리는 포함하지 않습니다.

`[['dist', '!**/*.css']]`: `css` 파일을 제외하고 `dist` 디렉토리와 그 하위 디렉토리의 모든 파일을 포함합니다.

`[{path: 'dist/MyLibrary.js', label: 'MyLibrary JS 배포'}, {path: 'dist/MyLibrary.css', label: 'MyLibrary CSS 배포'}]`: `dist/MyLibrary.js` 및 `dist/MyLibrary.css` 파일을 포함하고 GitLab 릴리스에서 `MyLibrary JS 배포` 및 `MyLibrary CSS 배포`로 레이블을 지정합니다.

`[['dist/**/*.{js,css}', '!**/*.min.*'], {path: 'build/MyLibrary.zip', label: 'MyLibrary'}]`: `dist` 디렉토리와 그 하위 디렉토리의 모든 `js` 및 `css` 파일을 포함하고 최소화된 버전을 제외하고, `build/MyLibrary.zip` 파일을 추가하고 GitLab 릴리스에서 `MyLibrary`로 레이블을 지정합니다.

#### successComment

이슈 댓글의 메시지는 [Lodash 템플릿](https://lodash.com/docs#template)으로 생성됩니다. 다음 변수를 사용할 수 있습니다:

| 매개변수      | 설명                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `branch`       | 릴리스가 수행되는 브랜치의 `name`, `type`, `channel`, `range` 및 `prerelease` 속성이 있는 `Object`.                                              |
| `lastRelease`  | 마지막 릴리스의 `version`, `channel`, `gitTag` 및 `gitHead`가 있는 `Object`.                                                                                         |
| `nextRelease`  | 수행 중인 릴리스의 `version`, `channel`, `gitTag`, `gitHead` 및 `notes`가 있는 `Object`.                                                                          |
| `commits`      | `hash`, `subject`, `body` `message` 및 `author`가 있는 커밋 `Object`의 `Array`.                                                                                      |
| `releases`     | 각 릴리스에 대한 `name` 및 `url`과 같은 선택적 릴리스 데이터가 있는 릴리스 `Object`의 `Array`.                                                       |
| `issue`        | 댓글이 게시될 [GitLab API 이슈 객체](https://docs.gitlab.com/ee/api/issues.html#single-issue) 또는 병합 요청에 댓글을 달 때 `false`.          |
| `mergeRequest` | 댓글이 게시될 [GitLab API 병합 요청 객체](https://docs.gitlab.com/ee/api/merge_requests.html#get-single-mr) 또는 이슈에 댓글을 달 때 `false`. |

#### successCommentCondition

성공 댓글 조건은 [Lodash 템플릿](https://lodash.com/docs#template)으로 생성됩니다. 다음 변수를 사용할 수 있습니다:

| 매개변수      | 설명                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `branch`       | 릴리스가 수행되는 브랜치의 `name`, `type`, `channel`, `range` 및 `prerelease` 속성이 있는 `Object`.           |
| `lastRelease`  | 마지막 릴리스의 `version`, `channel`, `gitTag` 및 `gitHead`가 있는 `Object`.                                                      |
| `nextRelease`  | 수행 중인 릴리스의 `version`, `channel`, `gitTag`, `gitHead` 및 `notes`가 있는 `Object`.                                       |
| `commits`      | `hash`, `subject`, `body` `message` 및 `author`가 있는 커밋 `Object`의 `Array`.                                                   |
| `releases`     | 각 릴리스에 대한 `name` 및 `url`과 같은 선택적 릴리스 데이터가 있는 릴리스 `Object`의 `Array`.                    |
| `issue`        | 댓글이 게시될 [GitLab API 이슈 객체](https://docs.gitlab.com/ee/api/issues.html#single-issue).                  |
| `mergeRequest` | 댓글이 게시될 [GitLab API 병합 요청 객체](https://docs.gitlab.com/ee/api/merge_requests.html#get-single-mr). |

##### successCommentCondition 예시

- 댓글을 전혀 생성하지 않음: `false`로 설정하거나 템플릿: `"<% return false; %>"`
- 이슈에만 댓글 달기: `"<% return issue %>"`
- 병합 요청에만 댓글 달기: `"<% return mergeRequest %>"`
- 레이블을 사용하여 이슈 필터링: `"<% return issue.labels?.includes('semantic-release-relevant') %>"`

> 필터에 사용할 수 있는 속성은 [GitLab API 병합 요청 객체](https://docs.gitlab.com/ee/api/merge_requests.html#get-single-mr) 또는 [GitLab API 이슈 객체](https://docs.gitlab.com/ee/api/issues.html#single-issue)를 확인하세요

#### failComment

이슈 내용의 메시지는 [Lodash 템플릿](https://lodash.com/docs#template)으로 생성됩니다. 다음 변수를 사용할 수 있습니다:

| 매개변수 | 설명                                                                                                                                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `branch`  | 릴리스가 실패한 브랜치.                                                                                                                                                                                                                                                                          |
| `errors`  | [SemanticReleaseError](https://github.com/semantic-release/error)의 `Array`. 각 오류에는 `message`, `code`, `pluginName` 및 `details` 속성이 있습니다.<br>`pluginName`에는 오류를 발생시킨 플러그인의 패키지 이름이 포함됩니다.<br>`details`에는 마크다운으로 형식화된 오류에 대한 정보가 포함됩니다. |

##### failComment 예시

`failComment` `이 브랜치 ${branch.name}의 릴리스가 다음 오류로 인해 실패했습니다:\n- ${errors.map(err => err.message).join('\\n- ')}`는 다음 댓글을 생성합니다:

> 이 브랜치 master의 릴리스가 다음 오류로 인해 실패했습니다:
>
> - 오류 메시지 1
> - 오류 메시지 2

#### failCommentCondition

실패 댓글 조건은 [Lodash 템플릿](https://lodash.com/docs#template)으로 생성됩니다. 다음 변수를 사용할 수 있습니다:

| 매개변수     | 설명                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `branch`      | 릴리스가 수행되는 브랜치의 `name`, `type`, `channel`, `range` 및 `prerelease` 속성이 있는 `Object`.                                   |
| `lastRelease` | 마지막 릴리스의 `version`, `channel`, `gitTag` 및 `gitHead`가 있는 `Object`.                                                                              |
| `nextRelease` | 수행 중인 릴리스의 `version`, `channel`, `gitTag`, `gitHead` 및 `notes`가 있는 `Object`.                                                               |
| `commits`     | `hash`, `subject`, `body` `message` 및 `author`가 있는 커밋 `Object`의 `Array`.                                                                           |
| `releases`    | 각 릴리스에 대한 `name` 및 `url`과 같은 선택적 릴리스 데이터가 있는 릴리스 `Object`의 `Array`.                                            |
| `issue`       | 댓글이 게시될 [GitLab API 이슈 객체](https://docs.gitlab.com/ee/api/issues.html#single-issue) - 열린 이슈가 있는 경우에만 사용 가능. |

##### failCommentCondition 예시

- 댓글을 전혀 생성하지 않음: `false`로 설정하거나 템플릿: `"<% return false; %>"`
- 메인 브랜치에만 댓글 달기: `"<% return branch.name === 'main' %>"`
- 레이블을 사용하여 이슈 필터링, 예를 들어 이슈가 `wip`로 레이블이 지정된 경우 댓글을 달지 않음: `"<% return !issue.labels?.includes('wip') %>"`

> 필터에 사용할 수 있는 속성은 [GitLab API 이슈 객체](https://docs.gitlab.com/ee/api/issues.html#single-issue)를 확인하세요

## 호환성

이 플러그인의 최신 버전은 GitLab의 모든 현재 지원 버전([현재 메이저 버전과 이전 두 메이저 버전](https://about.gitlab.com/support/statement-of-support.html#version-support))과 호환됩니다. 이 플러그인은 지원되지 않는 GitLab 버전에서 작동하는 것이 보장되지 않습니다.

### 14.0의 주요 변경 사항

GitLab.com을 사용하거나 GitLab 인스턴스를 14.0으로 업그레이드한 경우 이 플러그인의 `>=6.0.7` 버전을 사용하세요.

#### 이유?

GitLab 14.0에서는 [태그 API](https://docs.gitlab.com/ee/api/tags.html)를 사용하여 릴리스를 생성하는 기능이 제거되었습니다([<span>#</span>290311](https://gitlab.com/gitlab-org/gitlab/-/issues/290311) 참조). 이 플러그인은 https://github.com/semantic-release/gitlab/pull/184에서 [릴리스 API](https://docs.gitlab.com/ee/api/releases/#create-a-release)를 대신 사용하도록 업데이트되었으며, 이는 `6.0.7` 버전 이상에서 사용할 수 있습니다.