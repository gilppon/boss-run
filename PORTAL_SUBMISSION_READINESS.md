# Poki / CrazyGames 제출 준비 리포트

- 점검일: 2026-10-13 (첫 실행 튜토리얼 Skip 추가 및 최신 ZIP 재검증)
- 판정: **제출 보류.** 이번 작업공간 권한 재빌드에서 타입 검사·production build·제출 산출물 정적 검증이 통과했습니다. 첫 방문 포털 자동 진입은 기존 코드에서 확인했고, 첫 함정 튜토리얼을 건너뛰는 버튼과 별도 저장·계측 경로를 추가했습니다. 이번 Skip UI 브라우저 상호작용 검증은 로컬 브라우저 연결 제한과 기존 저장 데이터 보호 때문에 완료하지 못했습니다. Poki 스크린샷 3장, 로그인 없는 플레이 링크, 최신 빌드 영상, CrazyGames 세로 1080p 영상, 포털 QA와 실기기 검증이 남았습니다. 기존 내부 점수 6.2/10은 Skip 변경 전 추정이며 이번 변경 후 재산정하지 않았습니다.**
- 재검증: `rtk npm run typecheck` 통과. 기본 샌드박스에서는 두 번의 빌드 시도가 `EPERM: operation not permitted, realpath index.html`로 실패했고 첫 시도가 지운 `dist`는 후보 ZIP에서 복구했습니다. 이후 작업공간 권한으로 `rtk npm run build`를 성공시켰습니다(Vite 7.3.2, 62 modules, `dist/index.html` 1,648,266 bytes / gzip 457.61 kB). 제출 verifier에서 현재 ZIP과 재빌드 산출물의 파일 구성 및 SHA-256도 다시 일치했습니다.
- 최신 제출 후보: `boss-reverse-runner.zip` — 28 files, 8,864,593 expanded bytes / 7,673,464 ZIP bytes, SHA-256 `45e9f905918108990040ec6b8a973e83d0e0fc42c7008e33349015537e7f4311`.
- 최신 빌드: `dist/index.html` 1,648,266 bytes / gzip 457.61 kB. Skip UI는 코드에 반영됐으나 브라우저에서 직접 누르는 동작은 미확인입니다. 사용자의 기존 `127.0.0.1:4173` 탭은 건드리거나 저장 데이터를 초기화하지 않았습니다.
- 참고: 저장소 검토만으로 Poki 또는 CrazyGames의 실제 심사 승인을 보장할 수 없습니다.
- 언어 기준: UI는 영어 전용입니다. CrazyGames는 영어 지원을 요구하고, SDK 로케일 선택은 번역이 추가된 경우의 조건입니다. 현재는 불완전한 부분 번역을 추가하지 않는 것이 정확한 기준 대응입니다. [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)

## 이번 수정

- `index.html`의 CrazyGames SDK 정적 삽입을 제거했습니다. 포털 도메인/리퍼러를 먼저 확인하고 인식된 포털 하나의 공식 SDK만 동적으로 초기화합니다. 알 수 없는 운영 호스트를 CrazyGames로 추정하지 않습니다.
- 쿼리 포털 강제 선택과 모의 보상은 개발 환경에만 허용합니다. SDK 또는 실제 광고가 없는 운영 환경에서는 보상이 지급되지 않습니다.
- CrazyGames 기본 출시 단계에서는 광고 요청과 보상 버튼을 숨깁니다. 전체 출시용 광고를 활성화할 때만 `VITE_CRAZYGAMES_LAUNCH=full`을 지정해야 합니다.
- SDK 로딩 완료는 초기 배경/스프라이트와 포털 초기화가 끝난 뒤, 게임 시작은 Phaser 씬이 준비된 뒤 전달합니다. CrazyGames에는 포커스 이탈로 `gameplayStop`을 보내지 않습니다.
- Poki 상업 광고는 사용자가 실제 일시정지 화면에서 재개할 때만 요청합니다. CrazyGames 광고는 일시정지·설정 화면에서 요청하지 않습니다.
- Poki `rewardedBreak` 시작 콜백을 공식 API 형식인 함수 인자로 전달합니다. 광고 중복 요청은 진행 중인 요청 잠금으로만 막고, 광고 노출 간격은 Poki SDK에 맡깁니다. CrazyGames SDK의 초기 `muteAudio` 값과 설정 변경 리스너도 게임 오디오에 반영해 포털 음소거가 게임 내 토글보다 우선하도록 했습니다.
- 플레이 중 Space/위·아래 화살표와 게임 화면 위의 휠 기본 스크롤을 차단해 호스트 페이지 점프를 막습니다. 버튼과 오디오 입력 컨트롤은 키보드/휠 동작을 유지합니다.
- 결과 화면에서 기본 Retry/Next와 보상 광고 CTA의 크기·글꼴·색을 동일하게 맞췄습니다. 한 결과에는 보상 광고를 하나만 제시하고, 부활은 세션당 한 번으로 제한합니다. 광고 실패에는 보상을 주지 않고 기본 진행 버튼은 계속 사용할 수 있습니다.
- 기존 프로젝트에 없던 `import.meta.env` 타입 선언을 `src/vite-env.d.ts`에 추가했습니다. 루트 설정이나 의존성은 변경하지 않았습니다.
- 메뉴의 역할 설명, 고정 Deploy 버튼, 첫 함정 안내와 결과별 재도전 문구를 다듬었습니다. 390×844·844×390·1280×720에서 시작 버튼이 첫 화면에 보이는지 확인했습니다.
- 결과 공유 URL은 Poki의 비동기 공유 링크가 아직 없더라도 도전 파라미터가 있는 로컬 fallback을 즉시 사용하도록 고쳤습니다. 최신 source verifier가 이 회귀를 방지합니다.

## Poki 제출물

| 항목 | 현재 상태 |
|---|---|
| 정적 정사각 썸네일 | [poki-thumbnail-v3-1254x1254.png](./poki-thumbnail-v3-1254x1254.png), 실제 1,254×1,254 PNG. 최소 628×628 및 정사각형 치수는 충족합니다. |
| 기존 아이콘 | `poki-icon-512x512.jpg`는 512×512라 정적 썸네일 규격에 못 미칩니다. |
| 기존 와이드 커버 | `poki-cover-1280x720.jpg`는 16:9라 정사각 썸네일을 대체하지 않습니다. |
| 애니메이션 썸네일 | [poki-animated-preview-v3-1080x1080.mp4](./poki-animated-preview-v3-1080x1080.mp4), 1080×1080, 50fps, 5초, 무음. 샘플 프레임에 실제 전투가 있지만 파일 수정 시각이 현재 `BossScene.ts`보다 약 7시간 빨라 최신 빌드 캡처로 취급할 수 없습니다. |
| 게임플레이 스크린샷 | **미제공**. Poki 제출에는 실제 게임플레이 화면 3장이 필요합니다. 요구 형식은 PNG/JPEG/WebP, 장당 5 MiB·25 MP 이하입니다. 캡처 후 `submission-media/poki-gameplay/`에 넣으면 verifier가 형식별 이미지 메타데이터와 크기를 검사합니다. |
| 최신 게임 ZIP | [boss-reverse-runner-submission-2026-10-13-boss-wave.zip](./boss-reverse-runner-submission-2026-10-13-boss-wave.zip), 28개 파일, expanded 8,864,593 bytes / ZIP 7,673,464 bytes. SHA-256 `45e9f905918108990040ec6b8a973e83d0e0fc42c7008e33349015537e7f4311`. 9개 애니메이션 시트를 포함하고 `dist/`와 모든 파일이 일치합니다. |
| 호환 이름 | `boss-reverse-runner.zip`은 최신 날짜형 ZIP과 동일하며 SHA-256은 `45e9f905918108990040ec6b8a973e83d0e0fc42c7008e33349015537e7f4311`입니다. |

새 Poki 썸네일은 실제 게임의 `public/sprites/boss_demon.webp`를 캐릭터 참조로 사용했습니다. MP4 샘플에서 시작 커버와 실제 B1 전투를 확인했습니다. 다만 v3 영상은 2026-10-13 11:29에 수정됐고 최신 `BossScene.ts`는 18:47, 결과 화면 소스는 20:10, 최신 ZIP은 20:11 KST에 수정돼 영상은 최신 코드보다 8시간 이상 앞섭니다. 현재 ZIP용으로 재촬영하고 새 파동/회피를 보여주는지 확인해야 합니다. 포털 미리보기와 실제 노출은 미검증입니다.

## CrazyGames 제출물

- 기본 출시 단계에서는 광고가 비활성화됩니다. 현재 코드 기본값은 이 단계에 맞춰 보상 광고 버튼도 숨깁니다.
- 이 ZIP은 Full 플래그가 없는 CrazyGames Basic Launch/Poki 공용 후보입니다. Full Launch 빌드는 `VITE_CRAZYGAMES_LAUNCH=full`로 따로 만들어야 합니다. 그 빌드에서는 SDK와 에셋 준비 후 저장된 해금 층으로 바로 진입하게 코드 경로를 보완했습니다.
- 새 ZIP은 28개 파일, expanded 8.85 MB로 CrazyGames의 1,500개 파일·250 MB 총량·50 MB 초기 다운로드 및 모바일 홈 20 MB 기준보다 낮습니다. 현재 선택한 v2 가로·세로 MP4는 실제 게임플레이 표본이 확인되지만 둘 다 최신 `BossScene.ts`보다 먼저 수정됐습니다. 최신 ZIP 기준으로 재캡처하고 포털 QA를 해야 합니다.
- CrazyGames 커버 3종: [landscape 1920×1080](./crazygames-cover-landscape-1920x1080.png), [portrait 800×1200](./crazygames-cover-portrait-800x1200.png), [square 800×800](./crazygames-cover-square-800x800.png). 세 커버에 `REVERSE BOSS RUNNER` 제목만 같은 스타일로 넣었습니다.
- Preview 영상 후보: [landscape v2 1920×1080](./crazygames-preview-landscape-v2-1920x1080.mp4) 16.80초 / 17,081,363 bytes, [portrait v2 720×1080](./crazygames-preview-portrait-v2-720x1080.mp4) 16.77초 / 3,475,253 bytes. 메타데이터상 무음이고 표본에서 시작 커버와 실제 플레이를 확인했지만 최신 코드 이전 파일입니다.
- 세로 v2 preview는 흐린 커버 아트를 배경으로 사용하고 16:9 게임플레이를 가운데 배치합니다. 실제 게임 화면이 세로 캔버스 높이의 약 38%라 UI가 작습니다. 영상 구도는 포털 프리뷰에서 가독성/수용 여부 확인이 필요하고, 최신 ZIP에서 실제 플레이를 재캡처해야 합니다.
- CrazyGames Full Launch는 첫 화면부터 플레이 가능한 상태로 진입해야 합니다. Full 빌드에서는 SDK/에셋 로드 뒤 저장된 해금 층을 자동 시작하도록 보완했지만, 이번 ZIP은 Full 플래그를 뺀 Basic Launch/Poki 공용 후보라 이 동작을 포함하지 않습니다.
- 코드가 SDK 생명주기와 광고 API를 연결하지만, CrazyGames SDK 프리뷰, Basic Launch 환경, 광고 미충전·차단 상황은 실제 포털에서 검증하지 않았습니다. Full 플래그 전용 자동 시작 경로도 포털에서 직접 확인하지 않았습니다.

## 검증 결과와 차단

- `rtk npm run typecheck`: SDK 수정 후 통과.
- 포털 선택·운영 모의 보상 차단·게임 준비 이벤트·광고 CTA 순서에 대한 집중 정적 가드: 통과.
- `rtk git diff --check`: 통과.
- 재실행 검증 스크립트 `rtk python scripts/verify_portal_submission.py`: 로컬 산출물 통과. 개발 모의 광고 제거, 포털 분기와 callback guard, 영어 UI/외부 링크/전체화면, 보스 패배 결과 안내 회귀 가드, ZIP/`dist/` 전수 해시, 커버 치수, 영상 규격·무음·크기 제한을 확인하고 스크린샷·미디어 최신성·포털 QA를 별도 `PENDING`으로 출력합니다.
- 최신 확인: `rtk npm run typecheck`, `rtk npm run build`, `rtk python scripts/verify_portal_submission.py`, `rtk git diff --check` 통과. Vite 7.3.2, 62 modules, `dist/index.html` 1,648,266 bytes / gzip 457.61 kB.
- 최신 boss-wave ZIP 내부 28개 파일의 해시를 빌드 산출물과 대조해 일치했고, 루트 `index.html`, 추가/누락 파일 여부도 확인했습니다. 최신 ZIP은 8,864,593 expanded bytes / 7,673,464 compressed bytes이며 SHA-256은 `45e9f905918108990040ec6b8a973e83d0e0fc42c7008e33349015537e7f4311`입니다.
- 최신 CrazyGames 공식 영상 요구를 확인했습니다. 세로 프리뷰는 2:3 1080p가 기준이며, 현재 720×1080 파일은 이를 충족한다고 볼 수 없어 제출 후보에서 제외합니다. 1080×1620은 해당 규격의 실무 목표 해석이며, 포털 화면의 구체 입력 규격이 우선입니다.
- CrazyGames 커버 3종을 실제로 열어 확인했습니다. 제목과 주인공/보스 구성이 세 비율 모두 선명하고, 금지 CTA·앱/포털 아이콘·테두리가 보이지 않습니다. 게임 소재의 권리 여부는 별도 확인 대상입니다.
- 기존 MP4의 시작 커버와 일부 게임플레이 프레임을 확인했습니다. 파일 수정 시각은 현재 코드보다 8시간 이상 이르며 신규 보스 파동/웅크리기 동작도 표본에서 확인되지 않았습니다. 최신 ZIP과의 동일성을 주장하지 않으며 최신 빌드 기준 재캡처가 남았습니다. 결과 문구는 아래 최신 runtime 검사에서 별도 검증했습니다.
- 소스 정적 검색에서 외부 SDK 주소는 공식 CrazyGames/Poki SDK 두 개뿐이며, 호스트 선택 후 해당 포털의 SDK만 불러옵니다. UI 문구는 영어이고 외부 이동/홍보 링크나 사용자 정의 전체화면 호출은 발견하지 못했습니다. 저장소 읽기·쓰기·삭제는 `try/catch` 처리되어 저장소 차단 때 기본 저장값으로 이어지고, 친구 도전 공유는 브라우저 공유/복사 기능을 사용합니다. 이는 소스 점검이며 실제 Inspector 네트워크 검사는 아닙니다.
- Poki 제출 스크린샷 3장, Poki Event Checker/실제 SDK 콜백, CrazyGames 프리뷰/QA, 모바일 기기 플레이는 아직 실행하지 않았습니다.

## 추가 산출물 확인

- 프로덕션 `dist/index.html`에서 개발용 `AD · POKI SDK MOCK` 문구가 없는 것을 확인했고, 소스의 모의 광고 등록·호출은 `import.meta.env.DEV` 조건에 묶여 있습니다.
- 최신 boss-wave ZIP 내부 28개 파일의 해시를 빌드 산출물과 대조해 일치했고, `boss-reverse-runner.zip` 별칭도 날짜형 ZIP과 동일한 SHA-256 `45e9f905918108990040ec6b8a973e83d0e0fc42c7008e33349015537e7f4311`을 가집니다.

## 제출 전 남은 작업

1. 현재 ZIP과 Poki MP4를 Poki 테스트 빌드에 올려 Event Checker 및 실제 미리보기 결과를 확인합니다.
2. CrazyGames Developer Portal에서 현재 ZIP과 두 preview 영상을 올려 Quality Assurance Tool을 실행하고 Basic Launch 기준을 확인합니다.
3. 두 포털에서 SDK 로딩/게임 시작/일시정지/광고 실패/보상 미지급, responsive viewport와 모바일 조작을 검수합니다.
4. CrazyGames Full Launch로 선정된 경우에만 `VITE_CRAZYGAMES_LAUNCH=full` 별도 ZIP을 만들고 자동 플레이 진입 및 광고 실패 경로를 다시 확인합니다.

## 공식 기준

- [Poki 게임 썸네일](https://developers.poki.com/guide/game-thumbnail)
- [Poki 게임 페이지 및 애니메이션 썸네일 규격](https://developers.poki.com/guide/your-game-page)
- [Poki 요구사항 및 QA 기준](https://developers.poki.com/guide/requirements-quality)
- [Poki SDK 가이드](https://developers.poki.com/guide/sdk-html5)
- [Poki 외부 리소스 정책](https://developers.poki.com/guide/external-resources-policy)
- [CrazyGames SDK 게임 설정 및 muteAudio](https://docs.crazygames.com/sdk/game/)
- [CrazyGames SDK 광고 콜백](https://docs.crazygames.com/sdk/video-ads/)
- [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- [CrazyGames 광고 요건](https://docs.crazygames.com/requirements/ads/)
- [CrazyGames Basic / Full 출시 단계](https://docs.crazygames.com/requirements/intro/)
- [CrazyGames 기술 요건](https://docs.crazygames.com/requirements/technical/)
- [CrazyGames 커버 이미지와 preview video](https://docs.crazygames.com/requirements/game-covers/)

## 브라우저 QA 추가 확인 (2026-10-13)

- Playwright CLI와 Playwright 패키지는 프로젝트 및 전역 설치에 없었다. Node 자동화 세션에서도 패키지를 찾지 못했다. `npx --no-install`은 응답 없이 대기해 중단했다.
- 기존 `dist/index.html`을 Vite preview로 제공하려 했으나, 셸의 `127.0.0.1:4173` 연결이 `Bad access`로 차단됐다. Codex 브라우저도 같은 주소에 연결할 수 없었다.
- 브라우저가 `file://` 프로토콜 접근을 보안 정책으로 거부했다. 정책에 따라 다른 브라우저나 우회 경로로 재시도하지 않았다. preview 프로세스는 종료했다.
- 이번 확인으로 발견한 앱 결함은 없다. 다만 현재 실행 환경에서 프로덕션 화면의 데스크톱·모바일 렌더링은 검증하지 못했다. 제출 준비 판정은 그대로이며, 실제 렌더링 QA와 Poki/CrazyGames 포털 QA는 미완료다.
- 다음 확인에는 사용자가 직접 캡처한 데스크톱(1280×720) 및 모바일(390×844) 화면이 필요하다. 포털 QA는 각 포털의 Inspector/Event Checker와 CrazyGames Quality Assurance Tool에서 별도로 확인해야 한다.


## 등록용 비주얼 고도화 (2026-10-13)

- 첫 스테이지의 던전 수습생과 붉은 악마 보스를 반영한 키아트 세트를 제작했습니다. Poki 썸네일은 문구 없이, CrazyGames 커버 3종은 REVERSE BOSS RUNNER 제목과 성곽·화염 색조를 사용합니다.
- 신규 이미지: poki-thumbnail-v3-1254x1254.png, crazygames-cover-landscape-v2-1920x1080.png, crazygames-cover-portrait-v2-800x1200.png, crazygames-cover-square-v2-800x800.png. 이전 파일은 보존했습니다.
- 신규 무음 H.264 미리보기: Poki 1080×1080/50fps/5.00초/1,686,153 bytes, CrazyGames 가로 1920×1080/30fps/16.80초/17,081,363 bytes, 세로 720×1080/30fps/16.77초/3,475,253 bytes.
- 영상은 신규 표지로 시작하고, Poki 정사각 및 CrazyGames 세로 영상의 게임플레이 주변 배경도 새 키아트 팔레트로 다시 구성했습니다.
- scripts/verify_portal_submission.py에서 기존 및 신규 이미지·영상의 크기, fps, 길이, 무음 여부를 검사합니다.
- 로컬 프레임 확인과 아티팩트 검증은 통과했습니다. 포털 업로드, 플랫폼 QA, 실제 브라우저·모바일 렌더링은 미실행이며 심사 통과 여부는 확인되지 않았습니다.


## 신규 이용자 온보딩 및 제출본 갱신 (2026-10-13)

- 첫 방문 포털 플레이어는 메뉴를 건너뛰고 기본 첫 스테이지로 진입합니다. CrazyGames Full Launch는 재방문도 직접 게임으로 진입하며, CrazyGames Basic/Poki는 첫 함정 배치 전까지 첫 방문 안내를 유지합니다.
- 게임 안 첫 임무는 초록 구역에 선택 함정을 한 번 배치하는 동작만 안내합니다. 실제 배치 완료 때 튜토리얼 완료를 저장하고, 세로 화면에서 가로로 회전하면 자동 재개합니다.
- 당시 프로덕션 ZIP: boss-reverse-runner-submission-2026-10-13.zip 및 boss-reverse-runner.zip. 19개 파일, 압축 해제 2,805,373 bytes, 압축 1,629,542 bytes, SHA-256 ff94a792e150548a7b870561a0d39461b8cce90f498c6664c72fb425487fd6fa. 이 기록은 같은 날 뒤이어 생성된 애니메이션·boss-wave ZIP으로 대체됐으며, 현재 제출 후보는 문서 상단의 최신 ZIP 표를 따릅니다.
- 확인: typecheck, production build, 신규 아트/영상·ZIP 검사, 온보딩 소스 회귀 조건, diff 공백 검사를 통과했습니다. 빌드는 기본 샌드박스에서 Windows Node realpath가 막혀 권한 검토 후 성공적으로 다시 실행했습니다.
- 미완료: 실제 Poki Inspector/Event Checker, CrazyGames QA Tool, 포털 등록 화면, 실기 모바일 테스트. 세로 모바일에서는 현재 가로 회전이 여전히 필요합니다.


## 캐릭터 애니메이션 패키지 갱신 (2026-10-13)

- 5종 영웅과 4종 보스의 12포즈 프레임 시트를 게임 상태에 연결했습니다. 영웅 공격 준비/공격, 보스의 달리기·점프·낙하·웅크리기·피격·포효·함정 설치가 각 포즈를 선택합니다. 입력과 충돌 판정은 유지했습니다.
- 애니메이션 프레임 시트 9개는 6,038,186 bytes입니다. 전체 production ZIP은 28개 파일, 압축 해제 8,862,290 bytes, ZIP 7,673,080 bytes입니다. 최신 ZIP `boss-reverse-runner-submission-2026-10-13-boss-wave.zip`과 `boss-reverse-runner.zip`이 SHA-256 `ffb67af106707251a0ffe2bbedee38cb47736db3c5a3b5255a74c2ff2d145a48`로 일치합니다.
- 전체 압축 해제 크기를 초기 다운로드의 보수적 상한으로 보아도 CrazyGames 모바일 홈 기준 20MB와 기본 초기 다운로드 50MB 아래입니다. CrazyGames 기술 문서는 총 250MB·1,500파일, 초기 50MB(모바일 홈 20MB)를 명시합니다. [CrazyGames 기술 요건](https://docs.crazygames.com/requirements/technical/)
- Poki는 정량 ZIP 한도 대신 UX·게임 루프, 빠른 로딩, 안정 프레임, 작은 파일 크기, 모바일·데스크톱 최적화를 심사 기준으로 듭니다. 현재 패키지 크기는 작지만 새 포즈의 실제 기기 프레임 안정성은 아직 캡처로 확인하지 못했습니다. [Poki 게임 품질 기준](https://developers.poki.com/guide/what-we-look-for)
- 검증: 타입 검사, 62-module 프로덕션 빌드, 9개 시트 로딩/등록 검사, 제출 ZIP과 `dist/`의 모든 바이트 대조, 커버 및 영상 규격, 모바일 20MB 상한, `git diff --check` 통과.
- 실제 화면 QA: 최신 production bundle의 1280×720 데스크톱 화면에서 캐릭터와 `LOW SHOT! JUMP!` / `HERO WILL JUMP` 예고, 점프·웅크리기 버튼을 확인했습니다. 390×844 메뉴에서 발견한 가로 잘림을 수정해 카드 폭 348px·페이지 가로 스크롤 390px을 확인했습니다. 세로 회전 안내와 844×390 전환 후 자동 재개·회피 버튼도 확인했습니다.
- 남은 확인: 선택된 세 포털 MP4는 최신 `BossScene.ts`보다 약 7시간 먼저 수정돼 현행 ZIP에서 재캡처해야 합니다. Poki 게임플레이 스크린샷 3장, Poki Inspector/Event Checker, CrazyGames QA Tool은 아직 미완료라 포털 심사 결과는 미확정입니다.
- 보스 파동 후속 (2026-10-13): 기존 ROAR가 낮은 파동·높은 파동을 연달아 발사합니다. 영웅은 첫 공격을 점프하고, 착지 후 두 번째 공격을 웅크려 회피하도록 구현했습니다. 저공 파동의 점프는 로컬 프로덕션 화면에서 확인했고, 해당 런의 Hero HP 90/90 및 Hero Damage 0%를 확인했습니다. 웅크리기 포즈 자체의 별도 캡처는 확보하지 못했습니다.
- 최신 ZIP은 28개 파일, 8,862,290 expanded bytes / 7,673,080 ZIP bytes, SHA-256 `ffb67af106707251a0ffe2bbedee38cb47736db3c5a3b5255a74c2ff2d145a48`입니다. 타입 검사, 프로덕션 빌드, ZIP/`dist/` 파일 해시·크기·미디어 검사, `git diff --check` 통과.
- 브라우저 console error/warning은 0건입니다. 인앱 진단 평가가 `requestAnimationFrame`/`performance`를 제공하지 않아 숫자 FPS는 기록하지 못했습니다. 저사양 기기에서의 프레임 안정성은 실제 포털 QA에 남아 있습니다.

## 첫 참여와 재도전 감정 개선 (2026-10-13)

- 메뉴는 영웅 대 악마의 역할을 간단히 설명하고, 고정 Deploy 버튼은 모바일 안전 영역과 데스크톱 중앙 정렬에 맞춥니다. 버튼 위치를 390×844에서 top 768px, 844×390에서 top 302px, 1280×720에서 top 632px으로 확인했습니다.
- 첫 함정 안내·성공 피드백과 승패/전투 통계 기반 결과 문구를 개선했습니다. 패배 결과의 안내 문구를 브라우저에서 확인했고, 승리 분기는 소스 및 production build 기준으로 확인했습니다.
- `rtk npm run typecheck`, production build, `rtk proxy python scripts/verify_portal_submission.py`, `rtk git diff --check` 통과. 제출 검증 스크립트의 튜토리얼 기대 문구도 최신 카피와 일치시켰습니다.
- 첫 함정 안내는 저장된 브라우저 프로필이 완료 상태라 실제 HUD에서 다시 표시하지 못했습니다. 전환율·재도전율 데이터도 아직 없어 상업적 효과는 미측정입니다. 실제 포털 QA 전에 미리보기 영상 재촬영이 필요합니다.

## 플레이어 반응 계측 및 최신 빌드 확인 — 2026-10-13

- Poki 공식 `measure()`를 연결해 캠페인 층별 시작/승패, 첫 함정 튜토리얼, 결과 화면의 재도전·다음 층·친구 도전·보상 CTA 노출과 선택을 기록하도록 했습니다. 외부 분석 SDK는 추가하지 않았습니다. 연습 도전은 캠페인 층 진행 이벤트에서 제외합니다.
- CrazyGames는 SDK 생명주기와 포털 대시보드/QA 흐름을 사용합니다. 실제 포털에서의 이벤트 수신과 플레이어 반응 데이터는 아직 확인하지 않았습니다.
- 포털 어댑터의 CrazyGames/Poki SDK 전역은 사용 메서드만 포함한 명시적 타입으로 정리해 `any` 억제를 제거했습니다.
- 타입 검사, Vite 프로덕션 빌드(62 modules, `dist/index.html` 1,645,963 bytes / gzip 457.20 kB), 제출 verifier가 통과했습니다. ZIP은 28개 파일, 8,862,290 expanded bytes, 7,673,080 compressed bytes이며 SHA-256 `ffb67af106707251a0ffe2bbedee38cb47736db3c5a3b5255a74c2ff2d145a48`입니다.
- 구버전 제출 ZIP 네 개는 `archive/legacy-submissions/`에 보존 이동했습니다. 저장소 루트에는 위 날짜형 ZIP과 동일 해시의 `boss-reverse-runner.zip`만 남겼습니다.
- 최신 share fallback production ZIP은 28 files, 8,862,290 expanded bytes / 7,673,080 ZIP bytes, SHA-256 `ffb67af106707251a0ffe2bbedee38cb47736db3c5a3b5255a74c2ff2d145a48`입니다. 이전 ZIP은 archive에 보존했습니다.
- 남은 제출 전 게이트: 최신 ZIP에서 미리보기 3종 재촬영, Poki 제출용 실제 게임플레이 스크린샷 3장, Poki Inspector/Event Log, CrazyGames QA, 실제 모바일/저사양 기기 검증. verifier는 Poki 스크린샷 크기/메타데이터를 검사하지만 실제 장면을 사람 대신 판정하지 않습니다. 현재 내부 준비도는 6.2/10이며 실제 이용자 반응과 심사 결과는 미확정입니다.

## 최신 결과 원인 안내 수정 — 2026-10-13

- 수정 전 B1의 1280×720 결과 화면에서 영웅 HP 90/90, 보스 HP 0/100인 패배 런을 확인했습니다. 기존 공통 문구는 “영웅이 방어선을 뚫었다”고 안내해 실제 종료 원인인 `boss-defeated`와 맞지 않았습니다.
- `ResultModal`에 `boss-defeated` 원인별 문구를 추가해 영웅의 공격으로 보스가 쓰러진 경우와 영웅이 출구에 도달한 경우를 구분했습니다. 제출 verifier에 해당 카피의 회귀 가드를 추가했습니다.
- 최신 production bundle을 B2 무보상 연습 도전으로 재실행해 `He struck you down before your traps landed...` 문구와 `PRACTICE CHALLENGE · NO GEMS OR PROGRESS`를 확인했습니다. 이 연습은 캠페인 보상·진행을 저장하지 않습니다.
- 최신 `dist/index.html`은 1,646,308 bytes / gzip 457.28 kB입니다. 제출 ZIP은 28 files, 8,862,635 expanded bytes / 7,673,163 compressed bytes, SHA-256 `14096fb37cf67d794570581ea66adacce2bb72196b6d4e91d854db32fb56d0cb`입니다. 이전 해시 ZIP은 `archive/legacy-submissions/boss-reverse-runner-submission-2026-10-13-share-fallback-pre-result-narrative.zip`에 보존했습니다.
- Poki 스크린샷 3장, 최신 ZIP에서 Poki/CrazyGames preview 세 편 재촬영 및 전체 재생 확인, Poki Inspector/Event Checker, CrazyGames QA, 실제 모바일·저사양 기기 검증은 여전히 `PENDING`입니다.
