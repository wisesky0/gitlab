import { HOME_URL } from "./definitions/constants.js";

const FAQ_URL = `${HOME_URL}/blob/master/docs/support/FAQ.md`;
const GET_HELP_URL = `${HOME_URL}#get-help`;
const USAGE_DOC_URL = `${HOME_URL}/blob/master/docs/usage/README.md`;
const NEW_ISSUE_URL = `${HOME_URL}/issues/new`;

const formatError = (error) => `### ${error.message}

${
  error.details ||
  ` 안타깝게도 이 오류에 대한 추가 정보가 없습니다.${
    error.pluginName
      ? ` \`${error.pluginName}\` 플러그인 작성자에게 더 유용한 정보를 추가해달라고 요청해 보세요.`
      : ""
  }`
}`;

export default (branch, errors) => `## :rotating_light: \`${branch.name}\` 브랜치에서의 자동 릴리스가 실패했습니다. :rotating_light:

이 문제를 높은 우선순위로 처리하는 것을 권장합니다. 그래야 다른 패키지들이 당신의 버그 수정과 새로운 기능을 다시 사용할 수 있습니다.

아래는 **semantic-release**에 의해 보고된 오류 목록입니다. 이들 각각은 자동으로 패키지를 게시하기 위해 해결되어야 합니다. 당신은 이 문제를 해결할 수 있을 것입니다 💪.

오류는 보통 잘못된 설정이나 인증 문제로 인해 발생합니다. 아래에 보고된 각 오류와 함께 이를 해결하기 위한 설명과 지침이 제공됩니다.

모든 오류가 해결되면, **semantic-release**는 \`${branch.name}\` 브랜치에 커밋을 푸시할 때 다음 번에 패키지를 릴리스할 것입니다. 또한 실패한 CI 작업을 수동으로 다시 시작할 수도 있습니다.

해결 방법을 잘 모르겠다면, 다음 링크들이 도움이 될 수 있습니다:
- [사용 설명서](${USAGE_DOC_URL})
- [자주 묻는 질문](${FAQ_URL})
- [지원 채널](${GET_HELP_URL})

이들이 도움이 되지 않거나, 이 문제가 잘못된 것이라고 생각되면, 언제든지 **[semantic-release](${NEW_ISSUE_URL})** 뒤에 있는 사람들에게 문의할 수 있습니다.

---

${errors.map((error) => formatError(error)).join("\n\n---\n\n")}

---

프로젝트에 행운을 빕니다 ✨

당신의 **[semantic-release](${HOME_URL})** bot :package: :rocket:`;
