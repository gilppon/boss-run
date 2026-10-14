# Poki 제출 안내

> Poki 최초 신청부터 CrazyGames 등록까지의 한국어 단계별 안내: [PORTAL_SUBMISSION_STEPS_KO.md](./PORTAL_SUBMISSION_STEPS_KO.md)

## 준비된 에셋

- 썸네일: poki-thumbnail-v3-1254x1254.png (1254×1254, 문구 없음)
- 애니메이션 미리보기 후보: poki-animated-preview-v3-1080x1080.mp4 (1080×1080, 50fps, 5초, 무음). 샘플 프레임에 실제 B1 전투가 있지만 최신 `BossScene.ts`보다 수정 시각이 약 7시간 이르므로 최신 ZIP의 영상으로 간주하지 말고 재캡처하세요.
- 실제 게임플레이 스크린샷: **미제공**. Poki 제출 양식에는 실제 플레이 화면 3장이 필요합니다. 캡처 후 `submission-media/poki-gameplay/`에 `poki-gameplay-01`~`03`으로 저장하세요. PNG/JPEG/WebP, 장당 5 MiB 이하·25 MP 이하로 맞추고 커버 이미지를 대신 올리지 마세요.

첫 스테이지의 던전 수습생과 붉은 악마 보스를 반영했습니다. 영상의 시작 커버와 일부 전투 프레임은 확인했지만, 전체 클립이 최신 ZIP에서 나온 것인지와 새 보스 파동 회피를 담았는지는 아직 확인되지 않았습니다.

## 제출 전

1. 최신 게임 ZIP을 Poki 테스트 빌드에 올리고 Event Checker를 실행합니다.
2. Inspector에서 SDK, 시작·일시정지, 광고 성공·실패·보상 경로를 확인합니다.
3. 실제 데스크톱·모바일에서 화면 배치, 조작, 오디오를 확인합니다.
4. 최신 ZIP을 기준으로 포털 영상과 게임플레이 스크린샷 3장을 준비합니다.
5. 포털에서 썸네일·영상·스크린샷을 등록하고 잘림과 재생 상태를 확인합니다.

로컬 아티팩트는 `rtk python scripts/verify_portal_submission.py`로 검사할 수 있습니다. 검증기는 스크린샷의 파일 크기와 이미지 메타데이터를 확인하지만, 실제 게임 장면이나 포털 이벤트 수신은 사람이 확인해야 합니다. 포털 업로드 및 Inspector/Event Checker 검증은 아직 수행하지 않았습니다.

공식 안내: [제출 양식](https://developers.poki.com/guide/share), [게임 썸네일](https://developers.poki.com/guide/game-thumbnail), [게임 페이지와 애니메이션 썸네일](https://developers.poki.com/guide/your-game-page), [품질 및 QA 요구사항](https://developers.poki.com/guide/requirements-quality).
