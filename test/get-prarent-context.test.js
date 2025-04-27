import test from "ava";
import getParentContext from "../lib/get-parent-context.js";

test("Parse parent project path with http URL", (t) => {
  t.is(getParentContext({ env: {} }, "http://git.nucube.lguplus.co.kr/api/v4").parentPath, undefined);
  t.is(getParentContext({ env: {} }, "http://git.nucube.lguplus.co.kr/api/v4").encodedParentPath, undefined);
  t.is(getParentContext({ env: {} }, "http://git.nucube.lguplus.co.kr/api/v4").parentApiUrl, undefined);

  t.is(
    getParentContext(
      { env: { CI_PARENT_PATH: "/eswa/wafful-for-msa/wafful-parent" } },
      "http://git.nucube.lguplus.co.kr/api/v4").parentPath,
    "/eswa/wafful-for-msa/wafful-parent"
  );

  t.is(
    getParentContext({ env: {} }, "http://git.nucube.lguplus.co.kr/api/v4", "/eswa/wafful-for-msa/wafful-parent").parentPath,
    "/eswa/wafful-for-msa/wafful-parent"
  );

  t.is(
    getParentContext({ env: {} }, "http://git.nucube.lguplus.co.kr/api/v4", "/eswa/wafful-for-msa/wafful-parent").encodedParentPath,
    "%2Feswa%2Fwafful-for-msa%2Fwafful-parent"
  );

  t.is(
    getParentContext({ env: {} }, "http://git.nucube.lguplus.co.kr/api/v4", "/eswa/wafful-for-msa/wafful-parent").parentApiUrl,
    "http://git.nucube.lguplus.co.kr/api/v4/projects/%2Feswa%2Fwafful-for-msa%2Fwafful-parent"
  );
});