/**
 * @file get-pom-context.js
 * @description 
 * 이 파일은 Maven 프로젝트의 pom.xml 파일을 파싱하여 프로젝트 정보를 추출하는 기능을 담당합니다.
 * 주요 기능:
 * 1. pom.xml 파일에서 artifactId(모듈명) 추출
 * 2. pom.xml이 없는 경우 프로젝트 경로에서 모듈명 추출
 */

import path from 'path';
import { readFile } from 'fs/promises';
import { XMLParser } from "fast-xml-parser";

/**
 * pom.xml 파일을 파싱하여 프로젝트 정보를 추출하는 함수
 * 
 * @param {string} pomPath - pom.xml 파일의 상대 경로
 * @param {string} projectPath - 프로젝트의 경로 (pom.xml이 없을 경우 모듈명 추출에 사용)
 * @returns {Promise<{artifactId: string}>} - 추출된 artifactId(모듈명)를 포함한 객체
 * 
 * @example
 * // pom.xml이 있는 경우
 * const result = await getPomContext('pom.xml', '/path/to/project');
 * // result = { artifactId: 'my-module' }
 * 
 * // pom.xml이 없는 경우
 * const result = await getPomContext('not-exist.xml', '/path/to/my-module');
 * // result = { artifactId: 'my-module' }
 */
export default async (pomPath, projectPath) => {

    try {
        // 현재 작업 디렉토리에서 pom.xml의 전체 경로를 생성
        const projectRoot = process.cwd();
        const pomFullPath = path.join(projectRoot, pomPath);
        
        // pom.xml 파일을 UTF-8 인코딩으로 읽어옴
        const pomContent = await readFile(pomFullPath, "utf8");
        
        // XML 파서를 사용하여 pom.xml 내용을 JavaScript 객체로 변환
        const pom = new XMLParser().parse(pomContent);

        // pom.xml에서 artifactId(모듈명) 추출
        // XML 구조: <project><artifactId>모듈명</artifactId></project>
        const artifactId = pom.project.artifactId;

        return {
            artifactId
        }
    } catch (error) {
        // pom.xml 파일을 읽거나 파싱하는데 실패한 경우
        // 프로젝트 경로의 마지막 부분을 모듈명으로 사용
        // 예: /path/to/my-module -> my-module
        return {
            artifactId: projectPath.split("/").pop()
        }
    }
}
