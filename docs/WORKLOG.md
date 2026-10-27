# 작업 기록과 인수인계

각 작업은 아래 항목을 기록합니다. 완료되지 않은 검증과 다음 담당자가 먼저 확인할 사항을 분명히 씁니다.

## 기록 템플릿

### YYYY-MM-DD — 작업 제목

- 상태:
- 담당:
- 브랜치:
- 변경 파일:
- 검증:
- 다음 단계:
- 인수인계:

## 2026-10-27 — 공통 협업 문서 초안

- 상태: 문서 전용 커밋을 원격 브랜치에 push함. draft PR 생성은 GitHub 연동에서 `403 Resource not accessible by integration`으로 거부되어 열리지 않음. `main` 병합 및 배포는 하지 않음.
- 담당: Codex가 문서 작성·검증, 사용자가 사실 확인 및 이후 게시·병합·배포 결정.
- 브랜치: `docs/shared-work-hub`
- 변경 파일: `AGENTS.md`, `.cursor/rules/shared-hub.mdc`, `docs/PROJECT-MAP.md`, `docs/PROJECT-PLAN.md`, `docs/WORKLOG.md`, `docs/CURSOR-START-KO.md`.
- 검증: 원격 `main` 기준 별도 체크아웃과 clean 시작 상태를 확인함. 여섯 문서의 UTF-8 디코딩에서 대체 문자가 없고 상대 Markdown 링크가 모두 존재함. `git diff --cached --check` 통과. `.nojekyll`, `CNAME`, `index.html`, `orvantro-analytics.js`는 `HEAD`와 동일함. 문서 전용 변경이라 사이트 기능 검사는 실행하지 않음.
- 다음 단계: GitHub 연동에 PR 생성 권한이 있거나 별도의 승인된 생성 경로가 제공되면 draft PR 생성을 요청함. 그 전에는 거부된 PR 생성 요청을 재시도하지 않음. 실제 소스 경로와 활성 배포 설정도 담당자가 확인해야 함. 병합과 배포는 별도 승인 전까지 하지 않음.
- 인수인계: 이어받는 작업자는 먼저 `AGENTS.md`, 프로젝트 지도·기획·작업 기록을 읽고, 대상 저장소의 자체 규칙과 `git status`를 확인함. 담당·브랜치·파일 범위를 작업 기록에 갱신한 다음 시작함.
