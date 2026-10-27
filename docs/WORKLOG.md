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

## 2026-10-27 — Cursor가 shared-work-hub 인수·상태 확인

- 상태: `judanvy8-netizen/orvantro`의 `docs/shared-work-hub`를 열어 `AGENTS.md`, `docs/PROJECT-MAP.md`, `docs/PROJECT-PLAN.md`, `docs/WORKLOG.md`를 읽었음. 기존 문서 커밋(`f1756bb`, `dc7e5ad`)과 배포 산출물은 수정하지 않고 보존함. `main` 병합·배포·draft PR 재시도는 하지 않음.
- 담당: Cursor(상태 확인·작업 기록), 사용자(범위·소스 위치·게시/병합/배포 승인).
- 브랜치: `docs/shared-work-hub` (`github/docs/shared-work-hub` 추적, tip `dc7e5ad`).
- 변경 파일: `docs/WORKLOG.md` (본 항목만).
- 검증:
  - `git status --short --branch`: clean, `docs/shared-work-hub...github/docs/shared-work-hub`.
  - `github/main..HEAD` 문서 전용 2커밋만 존재. `index.html`, `orvantro-analytics.js`, `CNAME`, `.nojekyll`은 `github/main`과 byte-identical.
  - Markdown 상대 링크 존재 확인(5개 md, missing none). UTF-8 대체 문자 없음. `git diff --check` 통과.
  - `gh pr list --head docs/shared-work-hub`: 열린 PR 없음(이전 403 기록과 일치, 재시도 안 함).
  - 추가 확인(사실): GitHub Pages API상 Orvantro Pages는 `built`, source=`main` `/`, `cname=orvantro.com`, `html_url=http://orvantro.com/`. 다른 다섯 저장소의 게시 설정·실제 소스 경로는 아직 미확인.
  - 사이트 기능 검사·다른 제품 저장소 수정은 실행하지 않음.
- 다음 단계:
  1. `docs/PROJECT-MAP.md`의 Orvantro 배포 설정을 위 Pages 확인 내용으로 갱신할지 사용자 확인 후 반영.
  2. 여섯 제품의 실제 소스 저장소/Cursor 작업 경로와 나머지 게시 URL을 담당자가 확정.
  3. PR 생성 권한이 생기거나 사용자가 승인·경로를 주면 그때 draft PR 요청. 그 전 403 재시도 금지.
  4. `main` 병합과 배포는 별도 승인 전까지 하지 않음.
- 인수인계: 이어받는 쪽은 `AGENTS.md`와 지도·기획·본 기록을 다시 읽고 `git status`를 확인한 뒤, 담당·브랜치·파일 범위를 새 항목으로 남기고 시작함. 배포 산출물(`index.html` 등)은 문서 작업 이유로 옮기거나 합치지 않음.

## 2026-10-27 — 공통 협업 문서 초안

- 상태: 문서 전용 커밋을 원격 브랜치에 push함. draft PR 생성은 GitHub 연동에서 `403 Resource not accessible by integration`으로 거부되어 열리지 않음. `main` 병합 및 배포는 하지 않음.
- 담당: Codex가 문서 작성·검증, 사용자가 사실 확인 및 이후 게시·병합·배포 결정.
- 브랜치: `docs/shared-work-hub`
- 변경 파일: `AGENTS.md`, `.cursor/rules/shared-hub.mdc`, `docs/PROJECT-MAP.md`, `docs/PROJECT-PLAN.md`, `docs/WORKLOG.md`, `docs/CURSOR-START-KO.md`.
- 검증: 원격 `main` 기준 별도 체크아웃과 clean 시작 상태를 확인함. 여섯 문서의 UTF-8 디코딩에서 대체 문자가 없고 상대 Markdown 링크가 모두 존재함. `git diff --cached --check` 통과. `.nojekyll`, `CNAME`, `index.html`, `orvantro-analytics.js`는 `HEAD`와 동일함. 문서 전용 변경이라 사이트 기능 검사는 실행하지 않음.
- 다음 단계: GitHub 연동에 PR 생성 권한이 있거나 별도의 승인된 생성 경로가 제공되면 draft PR 생성을 요청함. 그 전에는 거부된 PR 생성 요청을 재시도하지 않음. 실제 소스 경로와 활성 배포 설정도 담당자가 확인해야 함. 병합과 배포는 별도 승인 전까지 하지 않음.
- 인수인계: 이어받는 작업자는 먼저 `AGENTS.md`, 프로젝트 지도·기획·작업 기록을 읽고, 대상 저장소의 자체 규칙과 `git status`를 확인함. 담당·브랜치·파일 범위를 작업 기록에 갱신한 다음 시작함.
