# 캐릭터 고도화 구현 계획

## 목적

영웅, 악마 보스, 함정 미니언이 외형과 애니메이션, 제한적인 전투 방식에서 서로 구별되도록 개선한다. 현재 횡스크롤 함정 게임과 층별 진행 구조를 유지하고, 실제 필요성이 확인되기 전까지 저장 데이터 형식은 변경하지 않는다.

## 현재 프로젝트 기준점

- React가 메뉴와 HUD를 담당하고 Phaser 3가 실시간 게임 장면을 담당한다.
- `src/game/characters.ts`의 Phaser Graphics 기반 영웅 하나를 모든 층에서 공유한다. 달리기, 점프, 피격 깜빡임, 사망 모션은 있지만 층별 외형 차이는 없다.
- `src/game/HeroAIController.ts`가 추격, 점프 계획, 함정 반응, 피해, 분노, 사망을 공통 처리한다.
- `src/game/config.ts`에는 주로 능력치와 설명이 다른 5명의 층별 영웅이 정의돼 있다. 악마 보스 4종은 팔레트, 크기, 날개, 왕관, 오라가 다르다.
- `src/game/types.ts`에 층과 보스 데이터 형식이 있고 `src/game/BossScene.ts`가 게임 장면을 구성한다. `src/components/Hud.tsx`는 영웅 이름과 체력을 보여준다.
- 함정 미니언은 `src/game/textures.ts`에서 정적인 캔버스 텍스처로 그린다.
- 확인한 코드에는 별도 캐릭터 선택 화면이나 도감 흐름이 없다.

## 목표

1. 층별 영웅을 실루엣, 색상, 장비, 짧은 성격 묘사로 구분한다.
2. 달리기, 점프·낙하, 회피, 피격·경직, 저체력·분노, 사망 상태를 플레이 중 알아보기 쉽게 만든다.
3. 시각적 개선 이후 제한된 행동 차이를 추가하되, 함정의 가독성과 난이도 진행을 유지한다.
4. 기존 보스 폼 설정을 재사용해 각 악마의 대기·포효·피격 연출을 강화한다.
5. 새 메뉴를 만들기보다 기존 층 카드와 인게임 HUD에 초상화, 이름, 간단한 특성을 연결한다.
6. 새 렌더링 프레임워크나 대형 에셋 파이프라인 없이 데이터 기반으로 유지보수한다.

## 설계 원칙

### 캐릭터 데이터

- 배열 순서에 외형을 묶지 말고 안정적인 ID를 가진 영웅 정의를 둔다.
- 표현 데이터(색상, 실루엣 요소, 장비, 애니메이션 조정값, 초상화 단서)와 전투 수치(체력, 속도, 점프, 회피, 숙련도, 실수 확률)를 분리한다.
- 층 진행 설정이 영웅 ID와 난이도 수치를 선택하게 한다. 특정 영웅의 행동 차이가 필요할 때만 작은 행동 프로필이나 선택적 설정을 사용한다.
- 보스는 현재 `BossFormDef`를 재사용하고, 실제 폼별 연출 요구가 있을 때만 필드를 추가한다.
- 첫 구현에서는 저장 데이터 마이그레이션을 피한다. 나중에 선택 외형을 저장하게 되면 먼저 저장 버전 정책을 정한다.

### 렌더링과 애니메이션

- `HeroView`가 영웅 정의를 받아 공통 부품을 조립하도록 개선한다. 첫 단계는 기존 Phaser Graphics를 유지하고, 이 방식으로 목표 품질을 달성하기 어렵다는 근거가 생기기 전까지 외부 스프라이트 도구나 본 애니메이션을 도입하지 않는다.
- 여러 불리언을 따로 조합하기보다 명시적인 애니메이션 상태와 전이로 관리한다. 우선 대기, 달리기, 점프, 낙하, 피격, 경직, 분노, 사망을 다룬다. 회피나 공격 모션은 연결할 실제 게임 이벤트가 있을 때 추가한다.
- 장식 부품과 애니메이션 변형이 충돌 판정 크기를 바꾸지 않도록 렌더링과 충돌 영역을 분리한다.
- 무적 시간, 경직, 피해, 사망 상태는 서로 구분하면서 영웅과 함정의 가시성을 가리지 않게 한다.
- 미니언의 절차적 모션은 영웅과 보스 표현이 안정된 뒤 추가한다.

### 전투 행동

- 현재 함정 분석 및 점프 계획을 공통 기준 동작으로 유지한다.
- 영웅별 행동 차이는 함정별 반응 성향, 밟기 선호도, 회복 시간 등 이름과 범위가 분명한 프로필 값으로 추가한다. 영웅별 AI 컨트롤러를 복제하지 않는다.
- 행동 변경을 넣을 때 층 난이도를 묵시적으로 바꾸지 않는다. 층별 클리어율과 접촉까지 걸리는 시간을 비교하고 결정한다.
- 행동 밸런스가 재현하기 어려워지는 경우 시드 지정 또는 주입 가능한 난수원을 검토한다. 시각 개선의 선행 조건은 아니다.

### UI

- 기존 층 카드와 인게임 HUD에 작은 초상화나 아이콘, 이름, 공간이 허용되면 짧은 특성 문구를 표시한다.
- 현재 UI 언어인 영어 문구 체계를 유지하고, 별도 요청이 없는 한 현지화는 후속 과제로 둔다.
- 게임 내 외형과 UI가 서로 다른 이름이나 색을 쓰지 않도록 동일한 프로필 데이터를 재사용한다.

## 단계별 실행 계획

### 0단계 — 기준선 고정 및 로스터 정의

- 현재 층별 수치, 영웅·보스 행동, HUD와 초상화가 연결되는 지점을 기록한다.
- 5명의 층별 영웅과 4종 보스에 대해 실루엣, 색상, 장비, 성격, 대표 애니메이션, 전투 정체성을 간단한 캐릭터 시트로 정의한다.
- 시각적 요소가 충돌 영역 크기를 바꾸지 않는다는 기준을 정한다.
- 산출물: 로스터 명세와 검수 항목.
- 완료 근거: `character_roster.md`에 5명 영웅과 4종 보스의 실루엣·성격·행동 방향을 정리했다.

### 1단계 — 데이터 모델 및 영웅 외형 변형

- 타입이 지정된 영웅 ID·표현 모델을 추가하고 층과 안정적인 영웅 ID를 연결한다.
- 공통 영웅 렌더러를 개선해 먼저 두 가지 차별화된 예시를 만들고, 이후 다섯 층 전체로 확장한다.
- 이 단계에서는 기존 체력·속도·AI 등 게임 동작을 바꾸지 않는다.
- 층 카드와 HUD에 같은 프로필 데이터를 쓰는 초상화 또는 아이콘을 연결한다.
- 산출물: 게임 밸런스 변경 없이 층별 영웅 외형 구분.
- 완료 근거: `HERO_CHARACTERS`의 ID별 렌더 데이터와 초상화가 모든 층 UI에 연결됐다. 기본 체력·속도·점프 등 층 수치는 유지했다.

### 2단계 — 영웅 애니메이션과 피드백

- 현재 게임 이벤트를 명시적인 애니메이션 상태(idle, run, jump, fall, hit, stun, brace, land, rage, death)로 연결한다. `brace`는 기존의 일시 정지 반응을 표현한다.
- 점프 준비와 착지 반응을 추가하고, 피격·경직·저체력·사망 상태의 가독성을 높인다.
- 카메라 스크롤, 무적 깜빡임, 넉백, 사망 처리에서도 모션이 안정적인지 확인한다.
- 산출물: 일반 플레이와 주요 예외 상황에서 읽기 쉬운 영웅 모션.
- 완료 근거: `HeroView`가 명시적인 상태 전이와 이륙·착지 반응을 처리하고, 충돌 상수는 변경하지 않았다.

### 3단계 — 보스와 미니언 개성

- 기존 보스 폼의 팔레트, 날개, 왕관, 오라 설정을 활용해 대기와 대표 포효·피격 반응을 추가한다.
- 공격 시점과 처치 시점을 더 잘 전달하는 경우에만 미니언의 간단한 움직임·공격·사망 모션을 넣는다.
- 메뉴 초상화와 게임 내 보스 외형을 일치시킨다.
- 산출물: 플레이 중 정체성이 보이는 보스와 미니언. 게임 수치는 유지.
- 완료 근거: 보스 대기·달리기·포효·피격 연출과 미니언 bob·밟힘·퇴장 연출을 구현했다.

### 4단계 — 제한된 영웅 행동 차이

- 일부 영웅에 한두 가지 범위가 제한된 행동 차이를 추가하고 프로필 값으로 표현한다.
- 공통 AI 계획 로직을 유지하고 영웅별 컨트롤러 분기는 만들지 않는다.
- 대표 함정 배치에서 층별 난이도를 확인한다. 피할 수 없는 피해나 기존 전략을 무효화하는 변경은 조정하거나 제거한다.
- 산출물: 의도가 문서화된 영웅별 행동 차이와 밸런스 검수 기록.
- 완료 근거: 함정 반응과 미니언 밟기 확률만 캐릭터 프로필로 보정하고 양 끝을 제한했다. 체력·이동 속도·점프·피해 수치는 유지했다. `scripts/simulate-character-balance.mjs`에서 층별 1,200개의 짝지은 함정 배치를 비교했다.

### 5단계 — 통합 및 출시 전 검수

- UI, 게임 장면, 캐릭터 데이터의 ID, 이름, 설명, 색상을 대조한다.
- 그래픽, 트윈, 장면 재시작 시 정리 동작을 확인한다.
- 저효과 모드와 작은 화면에서 HUD 가독성을 확인한다.
- 남은 아트 한계와 외부 스프라이트 시트, 캐릭터 도감 같은 후속 선택지를 기록한다.
- 산출물: 통합된 캐릭터 개선과 검증 근거가 반영된 `state.md`.

## 검증 계획

구현 시 필요에 따라 저장소의 `npm run typecheck`, `npm run build`를 실행한다. 현재 `package.json`에는 별도의 lint 또는 test 스크립트가 없다.

수동 게임 검수 항목:

- 모든 층이 올바른 영웅 ID, HUD 이름, 초상화를 불러온다.
- 달리기, 점프, 낙하, 착지, 피격, 경직, 저체력·분노, 사망, 장면 재시작이 정상 동작한다.
- 시각적 개선 단계에서 영웅 충돌 범위와 함정 판정 결과가 기존 기준과 달라지지 않는다.
- 보스 폼 변경이 메뉴 초상화와 게임 내 외형에 일관되게 반영된다.
- 미니언의 공격·사망 모션이 피해를 줄 수 있는 시점과 밟을 수 있는 상태를 분명하게 전달한다.
- 지원 화면 크기와 저효과 모드에서도 HUD와 실루엣이 읽힌다.
- AI 변경은 대표 함정 배치에서 반복 확인하고 층 난이도 저하 여부를 기록한다.

완료 검증 기록:

- `rtk npm run typecheck`: 통과.
- `rtk npm run build`: 통과.
- `rtk git diff --check`: 통과.
- `rtk node scripts/verify-character-profiles.mjs`: 통과. 다섯 층의 ID·실루엣 연결과 층별 100,000회의 시드 고정 행동 선택률을 확인했다.
- `rtk node scripts/simulate-character-balance.mjs`: 층마다 1,200개의 같은 함정 배치를 기본 행동과 캐릭터 보정 행동으로 각각 실행했다. 영웅 처치율 변화는 최대 +0.2%p였고, B5 영웅의 보스 처치율은 94.3%에서 89.0%로, 첫 접촉 평균은 20.3초에서 21.3초로 바뀌었다.
- 브라우저에서 다섯 층을 직접 실행해 각 영웅의 실루엣·장비·색상과 HUD 이름·칭호를 확인했다. B1에서 보스 포효와 Full/Lean 효과 전환(이후 Full 복구)도 확인했다.
- 격리된 임시 QA 경로에서 미니언 설치와 씬 표시, 영웅 접근 후 접촉 경고를 확인한 뒤 해당 경로를 제거했다.
- 밸런스 시뮬레이터는 프로덕션 `HeroAIController`와 점프 계획을 사용하지만 TrapManager의 발사체·시각 연출 전체를 재현하지 않는 합성 장애물 시뮬레이션이다. 실전 함정 조합의 통계적 밸런스를 완전히 대체하지 않는다.
- 미니언 원거리 공격, 영웅 stomp, defeat 퇴장 전체 사이클은 브라우저에서 끝까지 확인하지 않았다. 이 동작은 시뮬레이션, 타입 확인과 코드 검토로 보완했으며, 모든 함정 조합의 실제 플레이 검증은 후속 범위다.

## 위험과 범위

- 외형 개선이 피격 가독성을 낮출 수 있으므로 충돌 판정을 분리하고 기존 크기와 비교한다.
- 새로운 AI 성격은 난이도와 함정 경제를 바꿀 수 있으므로 시각 작업 이후 층별로 측정한다.
- Graphics로 모든 부품을 계속 늘리면 코드가 복잡해질 수 있다. 공통 렌더러와 데이터 매개변수를 우선하고, 근거가 있을 때만 분리한다.
- 현재 캐릭터는 장르에서 흔히 쓰는 요소를 사용한다. 신규 디자인은 독창적으로 만들고 알려진 캐릭터나 로고를 모방하지 않는다.
- 구체적인 요구 없이 루트 설정, 의존성, 저장 구조, 무관한 게임 시스템을 변경하지 않는다.

## 구현 시 적용할 작업 순서

1. 시각 작업 전 디자인 관점에서 실루엣, 색상, UI 위계를 정한다.
2. 로스터 명세를 기준으로 Phaser 캐릭터 데이터와 애니메이션을 구현한다.
3. 코드 리뷰 관점에서 충돌·렌더링 분리, 객체 정리, 타입, 장면 재시작을 확인한다.
4. 타입 및 빌드 확인과 실제 플레이 근거를 바탕으로 마일스톤마다 `state.md`를 갱신한다.

## 구현 완료 상태

첫 캐릭터 개선 묶음, 실제 다섯 층 외형 확인, 재현 가능한 프로필 검증을 완료했다. 미니언 설치와 접촉 경고까지 확인했으며 원거리 발사·stomp·퇴장 전체 사이클의 수동 검수는 후속 항목이다. 이번 구현에는 새 의존성이나 프로젝트 루트 설정 변경을 추가하지 않았다.

## Super Smash Flash를 참고한 완성도·음악성 개선 (2026-10-04)

### 참조에서 가져올 기준

CrazyGames의 Super Smash Flash 소개는 빠르고 강한 전투, 기술/콤보, 여러 캐릭터·스테이지, 싱글/멀티 모드를 강조한다. 보스 프로젝트는 함정 배치형 러너 장르를 유지하면서 이 원리를 전투 피드백, 연속 함정 콤보, 보스/영웅 개성, 모드별 완성도로 번역한다. 캐릭터·명칭·그래픽·음악은 복제하지 않는다. 참조 소개는 음악 사양을 제공하지 않으므로 음악 설계는 본 게임에 맞는 독립 판단으로 진행한다.

### 작업 시작 시 확인된 기준선 (2026-10-04)

- 캐릭터별 실루엣/행동, 보스 반응, 함정 피격 점수화는 구현돼 있다. B1 실플레이에서 넓은 용암과 연속 함정 4개가 2회 명중해 영웅 HP 53% 피해를 줬지만 게이트 도달로 패배했다.
- `src/game/sfx.ts`에는 D단조 WebAudio BGM이 있으나 140ms 고정 스텝의 단일 루프다. 전투 위험도에 따른 편곡 변화는 없다.
- `stopMusic()` 호출은 크래시 정리뿐이다. 실행 종료/메뉴 전환에서 음악 타이머를 정리하지 않는다. Phaser 장면은 멈추지만 음악 일시정지 상태는 전달하지 않는다.

### 진행 순서

1. **전투 음악 구조와 수명주기:** 현재 어두운 D단조 정체성을 살려 킥/스네어/베이스/짧은 모티프가 있는 규칙적 프레이즈로 편곡한다. 진행도와 영웅-보스 간격으로 긴장 레이어를 서서히 조절한다. Pause, 페이지 숨김, 광고, 종료/메뉴 전환에서 예약을 멈추고 재개 시 이어 붙인다. 효과음이 배경 음악에 묻히지 않게 레벨을 분리한다.
2. **전투 보상감:** 큰 피격, 2회 이상 함정 연속 명중, 포효, 영웅 처치에 짧고 구별되는 음악/시각 피드백을 연결한다. 판정 수치와 저장 형식은 바꾸지 않는다.
3. **모드/진행 품질:** 실제 화면과 정상 플레이로 각 보스·층 및 실패/재시도/승리 흐름을 점검한다. 멀티플레이 같은 장르 밖 기능은 참조 문구만으로 추가하지 않는다.

### 1단계 완료 기준

- 음악이 시작/일시정지/재개/종료/음소거/광고/탭 숨김 수명주기를 일관되게 따른다.
- 기본과 긴장 편곡을 WebAudio 이벤트 및 격리 브라우저 청취·HUD 상태에서 확인하고, 전환 튐·중복 타이머·콘솔 오류가 없다.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과. 저장 데이터, 의존성, 루트 설정 변경은 없다.

### 실제 완료 기록 — 1단계 오디오/메타 정리 (2026-10-04)
- 계획한 4마디 WebAudio 전투 프레이즈와 위험도 레이어를 연결했고, Pause/Resume 및 종료/메뉴 타이머 정리를 추가했다. UI 음소거와 광고 음소거가 별도 상태를 유지하도록 마스터 게인을 보정했다.
- 격리 브라우저 5176에서 B1 시작, 음악 이벤트 계측, Pause/Resume, mute UI를 확인했다. 카운터: 재생 6→일시정지 직후 잔여 이벤트 9→일시정지 유지 9→재개 12. 별도 새 런에서 음소거 이후 1.7초 동안 5로 유지, 아이콘 🔇 확인.
- 광고 SDK 음소거 콜백과 문서 visibility 전환은 실제 브라우저에서 확인하지 않았다. AudioContext 이벤트 카운터는 청취 품질을 측정하지 않으므로 주관적 음악 평가는 남아 있다.
- 무시되는 meta `frame-ancestors` 지시어를 제거하고 SVG 파비콘을 추가했다. 파비콘 응답 200; 새로고침 이후 브라우저에 오류/경고가 새로 나오지 않았다. 기존 누적 콘솔의 CSP 및 favicon 오류는 수정 전 오류다.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과. 프로젝트 루트 설정·패키지·저장 형식은 수정하지 않았다.
- 다음: 전투 보상감(연속 함정 명중, 포효, 피격) 피드백 작업과 플레이 검증. 귀파기는 계속 보류한다.

### 2단계 진행 기록 — 콤보 보상 피드백 (2026-10-04)
- 피해 숫자·흔들림·HUD 콤보에 더해 매 타격마다 Phaser 캔버스 콤보 문구를 띄우던 중복을 제거했다.
- 2/4/6/8연타에만 D단조의 상향 2음 스팅어(D5/F5/A5/D6)를 붙였다. 피해·재화·콤보 시간 판정은 유지했다.
- HUD 단일 콤보 배지를 금색/주황/산호/진홍의 4단계로 올리고 `pop-in` 진입 모션과 음영을 적용했다. 실제 렌더에서 ROAR 경고와 기존 150px 위치의 겹침을 찾아 205px로 이동, tier 8 장면으로 간격을 재검증했다.
- 브라우저에서 합성 HUD 이벤트로 2/4/6/8 tier의 label·접근성 설명·계산된 색/광택을 읽었다. 시각 검증은 성공했지만 자연 플레이의 콤보 발동과 실제 청취 검증은 미완료다. 캡처: `.playwright-cli/combo-badge-tier8.png`.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과; 빌드 1,824.04 kB (gzip 630.47 kB).
- 후속: 정상 플레이에서 콤보 스팅어와 3.5초 창 체감 확인, 이후 광고 음소거/visibility 수명주기 확인.

### 수명주기/콤보 코드 경로 추가 계측 (2026-10-04)
- `BossScene.onHeroDamaged` 구현을 8회 호출해 hit count 1→8과 스팅어 시점의 오실레이터 8개를 확인했다. 함정 배치/실제 충돌을 통해 만든 자연 플레이 연타는 아니다.
- 광고 mute API 계측: 700ms mute 중 오실레이터 카운트 정지(238→238), unmute 뒤 증가(241), 사용자 음소거 뒤 고정. 마스터 게인 target 기록 0→1→0→0.
- Playwright에서 새 `about:blank` 탭을 열어도 기존 Chromium 탭은 `visible`로 남았다. 별도로 `document.hidden` getter를 테스트 경로에서 700ms true로 바꾸자 예약이 정지하고 복구 뒤 재개했다. 실제 운영 브라우저 background-tab 전환은 미확인이다.
- 정상 UI 조작 B1 런은 7.5초에 Hero HP 75/90, 최고 콤보 1로 끝나 연타 목표를 재현하지 못했다. 이 시도는 실패/미검증으로 남긴다.
- 다음: 일반 조작에서 함정 연타와 콤보 표시를 만들어 체감 확인. 숨김 탭 QA는 운영 브라우저 또는 지원 브라우저 시나리오로 보강한다.

### 콤보에 따른 BGM 편곡 압력 연결 (2026-10-04)
- 음악 강도 계산에 `clamp(combo / 8, 0, 1) * 0.82`를 추가했다. 4연타부터 soft upper pulse(>0.28), 8연타에서 강조 accent(>0.68)가 들어오도록 기존 mixer 문턱값을 이용한다. 강도는 현재의 `0.12` 비율 smoothing을 거쳐 부드럽게 바뀐다.
- 타입 검사·빌드·diff 검사 통과(1,824.11 kB gzip 630.49 kB), 브라우저 새로고침에서 새 오류/경고 없음.
- 연타별 편곡의 실제 듣기 비교와 정상 플레이 발동 검증은 아직 남아 있다.

### WebAudio lookahead 박자 예약 (2026-10-04)
- 기존 140ms 메인 스레드 interval 즉시 재생을 25ms scheduler + 80ms lookahead로 바꿨다. 음들은 `AudioContext.currentTime` 기준으로 미리 예약되며, scheduler가 220ms 이상 늦으면 놓친 스텝을 건너뛰어 catch-up 재생을 막는다.
- 브라우저 계측에서 1초 동안 실제 oscillator 시작 시점은 48–69ms 앞에 예약됐다. 450ms 동안 메인 스레드를 막은 뒤 재개해도 신규 음은 59ms 전후의 다음 시점에만 예약되고 밀린 스텝 묶음은 재생되지 않았다.
- Pause/광고 음소거 뒤 120ms 내 이미 예약된 한 음의 노드 시작 이벤트가 추가될 수 있었지만, 다음 380ms 동안 카운트는 더 늘지 않았다. 마스터 게인 12ms ramp가 먼저 적용되고 향후 예약은 중단된다. 해제 후 예약이 다시 증가했다.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과; 빌드 1,824.46 kB (gzip 630.63 kB). 실제 장시간 청취는 여전히 미평가다.

### 전투 음악 화성 두께 보강 (2026-10-04)
- 참고 페이지의 핵심은 여러 캐릭터/레벨과 강한 싱글·멀티 전투 및 콤보이며, 이를 보스 게임의 독창적인 함정 전투·층 진행으로 계속 번역한다. 캐릭터/음악을 복제하지 않는다.
- `src/game/sfx.ts`의 기존 4마디 Dm→Bb→F→C 리듬에 각 마디 첫 박의 낮은 음량 3화음 패드를 추가했다. 기존 베이스/킥/스네어/모티프/위험도 레이어는 유지하고 전투 효과음에 묻히지 않도록 패드 음량을 낮게 잡았다.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과. 번들 dist/index.html 1,824.62 kB (gzip 630.70 kB). 기존 보스 개발 탭을 새로고침해 메인 메뉴 로드까지 확인했다.
- 실제 소리의 주관적 믹스·장시간 반복 피로도는 이 환경에서 청취 확인을 하지 않았다. 자연 플레이 콤보도 미검증이며 별도 후속이다.
- QA 브라우저에서 B1을 두 번 재시도한 기록이 메인 메뉴에 Runs 2, Gems 21로 보인다. 귀파기 세션은 그대로 유지되며 보스 코드는 별도 5176 개발 서버에서 검증한다.

### 층별 전투 배경 아트 (2026-10-04)
- 기존 `loadBackdrop()`은 모든 층에 `bg-castle.jpg` 한 장만 제공했다. B1 성 배경은 유지하고 B2 하수도, B3 용광로, B4 심연, B5 왕의 성당용 독창적 16:9 배경 4장을 생성·연결했다.
- 최종 프로젝트 파일: `src/assets/bg-sewers.jpg` (191,585 B), `bg-ember-gallery.jpg` (198,883 B), `bg-abyssal-halls.jpg` (176,194 B), `bg-kings-cathedral.jpg` (202,445 B). 원본 PNG는 생성물 보존 정책에 따라 `C:\Users\PC\.codex\generated_images\01a1006b-94cc-7061-85e2-365b3e28fca7`에 남겨뒀다. 프로젝트 사본은 1280×720 JPEG 품질 87로 변환해 로딩 크기를 제한했다.
- `loadBackdrop(floorIndex)`가 선택 층의 이미지 하나만 브라우저에서 디코드하고, 실패 시 기존 성 배경으로 돌아가게 했다. 이미지는 Map에 캐시한다. `GameCanvas`가 `config.floorIndex`를 전달한다.
- B1 브라우저 화면에서 회귀 확인: 기존 성 배경, 캐릭터, HUD가 정상 표시됐다. B2~B5는 저장 진행상 잠겨 있어 각 실제 화면은 아직 확인하지 않았다. 타입 검사와 production build에서 64 modules 변환 성공, 누락 import 없음.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과. 새 단일 파일 번들 2,850.41 kB (gzip 1,401.84 kB). 기존보다 총 크기가 증가했으므로 Poki 초기 다운로드 실측과 4개 해금 층의 시각 대비/스크롤 검수는 후속이다.
- 이미지 생성 프롬프트 요약: 같은 어두운 판타지 2D 게임 배경 톤, 16:9 parallax 환경, 중앙 전투 영역 저디테일, 바닥 18% 암부, 캐릭터/UI/글자/로고 없음. 층 테마는 하수도(청록 오염수/배수관), 용광로(주황 쇳물/기계), 심연(남색 부유 석조/룬), 성당(금빛 스테인드글라스/왕좌)이다.

### 층별 BGM 테마 차별화 (2026-10-04)
- 코드 리뷰에서 모든 층이 Dm→Bb→F→C 동일 편곡을 쓰고, 매 음악 스텝마다 코드·멜로디 배열을 다시 만들던 점을 확인했다.
- `src/game/sfx.ts`에 B1 Dm→Bb→F→C, B2 Am→F→C→G, B3 Em→C→G→D, B4 Cm→Ab→Eb→Bb, B5 Gm→Eb→Bb→F의 고정 테마 데이터를 추가했다. 각 테마에 루트·3화음·해당 음계의 모티프를 묶어 스텝당 배열 생성을 제거했다.
- `App.startRun`에서 실제로 선택된 층 인덱스를 광고 대기 전후에 BGM 테마로 전달한다. 기존 B1 진행과 박자, 다이내믹 콤보 압력은 유지한다.
- 프로덕션 `sfx.ts`를 TypeScript transpile 후 AudioContext 모의 객체로 실행해 다섯 인덱스에서 chord pad가 실제 예약되는 것을 확인했다. 출력 루트 화음은 B1 D3/F3/A3, B2 A2/C3/E3, B3 E3/G3/B3, B4 C3/Eb3/G3, B5 G2/Bb2/D3로 구분됐다.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과. 현재 단일 파일 번들 2,851.35 kB (gzip 1,402.14 kB).
- 스피커 청취 평가는 아직 없다. 5176 브라우저에서는 B1 런타임 화면만 확인 가능하고, B2~B5는 저장 진행상 잠겨 실제 장면/실제 스피커 재생 검수는 남는다.

### B1 실제 배치 결과 및 용암 안내 수정 (2026-10-04)
- 5176 보스 개발 탭의 B1을 다시 끝까지 플레이했다. Lava traps placed 4, hits 0, hero damage 0%, Boss HP 100%; 36.0초 생존 후 `exit-reached` 패배. 이 플레이는 함정 연속 명중 또는 층 클리어 근거가 아니다.
- 플레이 결과와 설정을 대조해 기존 도움말의 'Five tiles wide is basically a guaranteed kill'이 시작 자원 설명을 생략한 것을 확인했다. 시작 보스 최대 마나 100, Lava 22/칸이라 즉시 놓을 수 있는 칸은 4개이며, 다음 1개는 10 마나 회복 후 놓을 수 있다.
- `HelpModal`이 `BOSS_FORMS[0].maxMana`와 `TRAP_DEFS.Lava.baseCost`에서 숫자를 계산하도록 수정했다. 실제 브라우저 도움말에 `starting 100 ... 4 ... wait for 10 mana` 문구가 표시됨을 확인했다. 단순 팁 수정으로 피해/경제/저장값은 바꾸지 않았다.
- B1 테스트 결과 후 5176 메뉴 표시값은 Runs 3, Gems 35였다. 별도 귀파기 페이지/파일은 건드리지 않았다.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과. 현 빌드 2,851.48 kB (gzip 1,402.25 kB).
- 후속: B1에서 명중 가능한 Spike/Lava 혼합 패턴을 재현하고 2연타 이상을 실제 콤보로 검증한다. 기존 4칸 Lava가 0 hit였다는 실패 결과를 baseline에 반영한다.

### B1 재시도 — 함정 실제 명중 확인 (2026-10-04)
- 브라우저 최신 종료 화면에서 직접 확인: B1 패배, 생존 36.0초, 함정 4개 설치, `Trap Hits 2`, 영웅 피해 53%, 보스 HP 100%, 보상 후 Gems +19.
- 앞서 적힌 0명중 런은 이전 실행이다. 이번 결과는 함정이 실제 명중할 수 있음을 확인하지만, 종료 화면은 콤보 최고치나 두 명중의 간격을 기록하지 않아 자연 2연타 콤보 성공으로 단정하지 않는다.
- 다음 검증: 함정 두 번이 콤보 창(3.5초) 안에 발생하는지 관측하고, 동시에 실플레이 흐름에서 시작/일시정지/광고 후 복귀가 끊기지 않는지 확인한다. 이 결과를 기준으로 B1 밸런스 판단을 갱신한다.

### 포키 재진입 이벤트 수정 및 브라우저 모의 광고 검증 (2026-10-04)
- 포키 공식 SDK는 시작 후 자연스러운 재진입 때 `commercialBreak()` 기회를 보내고, 순서는 패배/재시작 `gameplayStop → commercialBreak → gameplayStart`, 일시정지 복귀도 같은 순서를 권장한다. 기존 `App.tsx`는 세 번에 한 번만 재시작 광고 기회를 보냈다. 참고: [SDK overview & events](https://developers.poki.com/guide/sdk-overview), [PokiSDK HTML5](https://developers.poki.com/guide/sdk-html5).
- 수정: 첫 런은 기존처럼 광고 없이 시작하고, 그 이후 모든 일반 런/재시작은 광고 기회를 보낸다. 보상 광고 부활은 `rewardedBreak → gameplayStart`가 되도록 `skipCommercialBreak`로 중복 상업 광고를 건너뛴다.
- 5176 브라우저에서 Retry → `AD · POKI SDK MOCK` → 실제 플레이 화면을 확인했다. 일시정지 후 Resume도 모의 광고 화면 → 재개 화면으로 돌아왔다. 따라서 로컬 fallback 경로만 검증됐고 실제 Poki SDK나 Inspector 이벤트 로그는 아직 검증되지 않았다. 보상 광고 부활 경로도 미실행이다.
- `npm run typecheck`, `npm run build`, `git diff --check` 통과. 최신 번들 2,851.50 kB / gzip 1,402.25 kB. 타입/빌드는 실제 포키 SDK 통합 승인 증거가 아니다.
- 후속: Poki Inspector에서 startup, death/retry, pause/resume, rewarded revive 이벤트 순서를 확인한다. 그다음은 플레이 리텐션 개선과 B1 타격 후 보스 피해/콤보 연계의 게임 밸런스다.
- 모의 광고 재시작 검증 중 함정을 놓지 않은 런이 자동으로 종료됐다: 함정 0개, 명중 0회, 보상 +7. 이 결과는 조작 난이도나 타격률의 밸런스 근거로 쓰지 않는다. 개발 브라우저 저장 데이터에는 이 QA 런의 결과/보상이 남아 있다.
- 해석 정정: 플레이어가 조종하는 보스의 체력은 생존 자원이고, 함정은 게이트로 달리는 적 영웅의 체력을 깎는다. 따라서 최신 런의 `Hero Damage 53%`, `Boss HP 100%`는 정상 방향이다. 패배 이유는 보스 피해 부족이 아니라 영웅의 게이트 도달이다. 앞선 구두 업데이트에서 보스 체력 100%를 문제처럼 표현한 해석은 취소한다.

## 목표 정렬 및 다음 구현 순서

이번 목표는 레퍼런스의 캐릭터·브랜드를 복제하는 게 아니라, 선택감·콤보 숙련·스테이지 다양성을 Reverse Boss Runner의 함정 전략으로 독창적으로 풀어내는 것이다. 레퍼런스 소개: [CrazyGames Super Smash Flash](https://www.crazygames.com/kr/game/super-smash-flash).

### 우선순위
1. **광고 생명주기** — Poki 이벤트와 로컬 CrazyGames SDK 데모 흐름은 수정·확인했다. 실제 Poki/CrazyGames 게시 환경과 보상 광고는 미검증이다.
2. **함정 전술 미리보기** — 배치 예측 라벨을 구현했다. 모든 함정·영웅·층 조합에서 예측 정확도는 미검증이다.
3. **층 고유 기믹** — B1 룬 피해 보너스/저공 분출, B2 하수도 급류, B3 낙하 강철, B4 심연 에코, B5 성당 종 공명을 구현했다. B1 룬 적중·B2 대응 밸런스, B4 착지 함정 연계, B5 공명 콤보 밸런스는 미검증이다.
4. **음악 품질** — 층별 조성·리듬·분리 버스·타격 ducking 및 17.92초 A/B 편곡을 구현했다. WebAudio 예약 구조는 계측했으나 사람의 실제 청음·믹스 평가는 남아 있다.
5. **출시 검증** — Poki Inspector, CrazyGames 실제 게시 흐름, 모바일 터치/화면비, 저사양·저FX, 전 층의 성공·패배·재시작·보상 광고 검증을 진행한다.

2026-10-05 갱신: 이 목록은 아래 변경 기록 이후 현재 남은 일만 요약한다. 구현을 출시 완료로 간주하지 않는다.

### 배경 WebP 에셋 진행형 로딩 최적화 (2026-10-05)
- 단일 HTML에 다섯 층 배경을 인라인하던 구조를 같은 게임 폴더의 WebP 자산 참조로 전환했다. 런타임에는 선택 층만 로드하고 실패 시 B1 배경으로 fallback한다. `./bg-*.webp`로 게임 하위경로 배포를 지원한다.
- WebP 다섯 장 합계 578,230 bytes. `npm run build`: `dist/index.html` 1,588,946 bytes / gzip 444.06 kB, 다섯 파일 복사 확인, HTML의 이미지 base64 없음. 로컬 dev server 배경 요청 HTTP 200 및 `image/webp`; `git diff --check` 통과.
- 미검증: 브라우저 런타임 선택층 렌더/Network 기록, Poki Inspector 및 하위경로 패키징, 실제 사용자 초기 다운로드. 다음은 격리 브라우저에서 렌더 확인 후 B5 콤보 연장과 전 층/모바일/오디오/포털 QA다.

- 브라우저 후속 확인: fresh 0-gem QA 탭에서 B1 런을 열고 성 배경이 캔버스에 실제 표시되는 것과 캐릭터/HUD를 확인했다. 기존 브라우저 탭은 유지하고 임시 QA 탭은 종료했다. 무함정 패배는 밸런스 근거가 아니다.
- B2~B5 런타임 장면/실제 선택층 요청은 미확인이고, 브라우저 Network 전송량도 계측하지 않았다. 다음은 B5 지연 재타격 콤보 연장 실증이다.

### 모바일 세로모드 일시정지와 회전 UX (2026-10-05)
- 브라우저 QA에서 390×844 세로 화면은 1280×720 전투 장면을 390×219로 축소해 세로 공간의 약 74%를 버렸다. 플레이가 멈추지 않아 입력 곤란 상태에서도 패배 가능했다.
- 수정: 세로 방향 감지 시 안전 일시정지와 전체 화면 회전 안내, 세로 상태 Resume 차단. 가로 전환 뒤 기존 Resume와 광고 흐름 사용. `PlayScreen`만 수정.
- 새 최신 소스 서버의 브라우저에서 초기 portrait 진입 시 Pause+안내, portrait→landscape 뒤 안내 제거/일시정지 유지, Resume→SDK mock 광고→전투 재개를 확인했다. 별도 저장 프로필/임시 QA 탭을 사용했고 임시 서버 종료 및 viewport reset 완료.
- 검증: `npm run build` 성공(HTML 1,593.75 kB, gzip 445.16 kB), `git diff --check` 성공. 실기기/iOS/Android와 실제 광고 검증은 남아 있다.

- 경합 보강: portrait ref와 resume-generation 무효화로 광고 종료가 세로 상태에서 게임을 재개하지 않게 했다. 격리 브라우저에서 광고 대기 중 세로로 돌려도 Pause/안내가 유지되고 게임시각이 정지하는 것 확인.
- 최종 빌드 1,593.81 kB (gzip 445.17 kB), diff 공백 검사 통과. 실제 기기/광고는 추후 확인한다.

### No Roar Trial 보상 광고 부활 실플로우 확인 (2026-10-05)
- Playwright 격리 프로필의 B1 Trial 패배 화면에서 `NO ROAR TRIAL · FAILED` 및 보상(진행 7 + Trial 2 = 총 9 보석)을 확인했다. 무함정 성적은 밸런스 근거가 아니다.
- 로컬 Poki SDK mock 보상 광고 완료 뒤 플레이가 재개됐고, 영웅 체력 90→45(50%) 및 비활성 `ROAR SEALED · TRIAL +25% REWARDS` 버튼으로 Trial 모드가 유지됨을 확인했다.
- 콘솔 오류/경고 0건. 캡처: `.playwright-cli/page-2026-10-04T20-43-23-627Z.png`. 실제 Poki SDK/광고는 미검증.
- 다음: Trial Retry 광고 후 모드 유지, 승리→Next Floor 브라우저 경로 검증. 그 뒤 실제 포털·전 층·기기/오디오 QA를 진행한다.
### No Roar Trial Retry 및 다음 층 통합 경로 (2026-10-05)
- 격리 프로필에서 B1 Trial 패배→Retry를 수행했다. 로컬 mock 상업 광고 뒤 B1에 재진입했고 HP 90/90, `ROAR SEALED · TRIAL +25% REWARDS` 비활성 상태 확인. 콘솔 오류/경고 0건.
- 승리 결과는 자연 전투가 아닌 production `bus`의 `end` 이벤트 주입으로 통합 경로만 검증했다. ResultModal에 Trial 클리어와 B2 `Sketchy Sewers` 해금 표시, Next Floor 클릭 뒤 B2 Sewer Scout 130/130·하수도 배경·B2 급류 안내·Trial 포효 봉인 확인.
- 캡처: `.playwright-cli/page-2026-10-04T20-51-22-662Z.png`. 실제 자연 승리, 포털 SDK/광고 및 음악 청취는 미검증.
- 다음: 자연 승리 재현은 독립 시나리오로 측정하고, 실제 층별 플레이·음악 청취·Poki/CrazyGames QA를 이어간다.
#### 통합 QA 후 현행 소스 검증 (2026-10-05)
- `npm run build` 성공: TypeScript 검사 포함, 단일 HTML 1,599.48 kB / gzip 446.20 kB.
- `git diff --check` 성공. 출력된 내용은 기존 LF 파일의 CRLF 변환 안내뿐이다.
### 런 종료 후 HUD 시계 누적 결함 수정 (2026-10-05)
- 패배 후 장시간 방치한 B1에서 결과 `Survived 36.0s`와 HUD `73.4s`가 어긋나는 것을 확인했다. 원인은 `BossScene.update()`의 종료 후 `this.t += dt`였다.
- `ended` 이후에도 사망 모션/Phaser 결과 지연은 유지하고 `this.t`만 더하지 않도록 수정했다.
- 새 격리 런에서 결과/HUD가 36.0초로 일치하고, 결과 표시 후 1.8초 동안 HUD 시계가 고정됨을 확인했다. 콘솔 오류/경고 0건.
- 검증: `npm run build` 통과(TypeScript 포함, dist 1,599.50 kB / gzip 446.21 kB), `git diff --check` 통과.
- 기존 비교 시뮬레이터 1,200개 합성 배치/층 실행: B1 영웅 사망 6.0→6.2%, 보스 접촉 승리 0%; B2/B3 보스 승리 0%. 자원 제한·플레이어 전략을 모델링하지 않으므로 난이도 결론에는 쓰지 않는다.
- 다음: 마나·시간 제한을 반영한 B1 함정 배치 시나리오로 자연 승리 가능성을 측정하고, 실제 청음/포털 SDK QA를 이어간다.
### B1 마나 제한 함정 전략 비교 실플레이 (2026-10-05)
- 격리 Trial에서 시작 마나 100으로 Lava 4칸(88) 및 재생 후 Spike 5개를 설치. 결과 설치 9·명중 1·영웅 HP 90→75(17%)·36초 패배.
- 격리 Standard에서 Lava 4칸 후 Space 포효 입력, 14초 쿨다운 확인. 카메라 전진 뒤 옛 world cell 좌표로 추가 설치를 시도해 2칸은 설치되지 않았다. 결과 설치 5·명중 2·영웅 HP 90→42(53%)·36초 패배. 이 런은 성공률 판단용 표본이 아니다.
- 콘솔 오류/경고 0건. 캡처: Trial `.playwright-cli/page-2026-10-04T21-19-25-156Z.png`, Standard `.playwright-cli/page-2026-10-04T21-27-18-225Z.png`.
- 해석: 포효·피해 표시 작동 확인. 자연 처치/클리어율은 아직 불명. 카메라 이동 중 셀 좌표와 HUD 예측 정확도를 반복 가능한 방식으로 검증한다.
- 다음: 화면 카메라/영웅 위치 기준 배치 시나리오를 만들고 실제 설치·마나·명중을 계측한다. 실제 청음 및 포털 SDK QA 계속.
#### 카메라 기준 배치 좌표 검증 및 다음 단계 기준 (2026-10-05)
- HUD 진행도에서 카메라/영웅 월드 좌표를 계산해 셀 32와 46을 화면 기준으로 설치했다. 두 설치 모두 HUD의 함정 수 증가와 마나 차감으로 등록을 확인했다. 고정 월드 셀을 재사용한 이전 시도는 무효 입력이었다.
- 5번째 인접 용암은 마나가 차는 게임 시각 1.273초에 영웅이 공중이라 설치 전 미리보기가 `HERO BUSY · HIT CHANCE UP`으로 표시됐다. 설치/피해/승리는 확인하지 않았다.
- `previewTrap()`은 점프 여부를 예측하며, 안전 착지를 보장하지 않는다. 플레이 화면에서 허위/오해 소지가 재현되기 전까지 이 경로를 수정하지 않는다.
- 다음: 실제 AI 상태와 미리보기 문구를 동시 대조하는 검증을 한 번 수행한다. 이후 함정 좌표 재실험을 반복하지 않고 반복 플레이/전투 체감 개선으로 이동한다. 자연 승리·음악·전 층·실포털 QA는 미완료.

#### 저장형 개별 오디오 믹서 (2026-10-05)
- 메인 메뉴에 음악/효과음 분리 볼륨 슬라이더 추가. 기존 믹스를 보존하는 기본값 100%, 매끄러운 Web Audio gain 전환, 기존 음소거·광고 중 무음 경로 유지.
- 세이브 스키마에 두 볼륨 추가. 구버전 save 기본값 대체 및 0~1 clamp.
- 격리 브라우저에서 35%/80% 설정·reload persistence 확인. 팝오버가 타이틀을 덮던 시각 문제 수정 후 측정상 타이틀과 패널 겹침 없음. 캡처 `보스/.playwright-cli/audio-mixer-layout.png`, 콘솔 오류 0.
- 검증: typecheck/build 통과, 59 modules, 단일 HTML 1,604.41 kB / gzip 447.33 kB, `git diff --check` 통과.
- 다음: 전투 중 Pause에도 오디오 믹서 제공. 이후 실제 청취 밸런스 평가, 반복성 개선, 층별·기기·실제 포털 검증 계속.

#### 전투 중 접근 가능한 오디오 믹서 (2026-10-05)
- 독립 `AudioMixer` 컴포넌트를 만들어 메인 메뉴/일시정지 화면에서 재사용. PAUSED 아래 전용 패널로 표시.
- 실제 격리 B1 전투를 일시정지해 패널 렌더, 음악 50%·효과음 25% 설정 저장을 확인. 제목/패널/Resume 사이 20px 간격. 캡처 `보스/.playwright-cli/pause-audio-mixer.png`, 콘솔 오류 0.
- 시계는 pause 진입 때 28.3→28.4초 관찰 또는 countdown 시점 포착 등으로 분리 검증 실패. 런타임 정지 판정 보류. `BossScene.update()`는 `paused`이면 바로 반환.
- 빌드 통과: 60 modules, 1,605.30 kB / gzip 447.60 kB. `git diff --check` 통과.
- 다음: 실제 청음 기반 층별 음악 품질/믹스 평가 및 개선. 오디오 인터페이스는 전투 중 사용 가능.

#### B1 실출력 기반 음악 개선 (2026-10-05)
- 격리 B1 Web Audio master 19초 녹음. 이전 레벨은 -38.0 LUFS/-19.3 dBTP로 지나치게 낮았다. 음악 gain을 0.55→1.1(+6 dB) 조정; 효과음 및 마스터 mute 경로 유지.
- 후 녹음 -32.1 LUFS/-13.5 dBTP/LRA 1.1. 측정 증감 +5.9 dB, 피크 여유13.5 dB. 콘솔 오류 0. 전후 WebM/12초 MP3 캡처 `.playwright-cli/`에 보존.
- 기존 17.92초 재생 구조를 4 phrase, 35.84초 순환으로 확장. phrase별 코드 진행 bar/리듬/모티프 회전.
- 오디오 입력이 모델에서 지원되지 않아 주관적 청음 합격은 판단하지 않는다. 사용자 확인용 실제 녹음 제공 예정.
- 검증: 빌드(60 modules, 1,605.36 kB / gzip 447.64 kB) 및 diff check 통과.
- 다음: B1~B5 테마별 출력/마스킹/장시간 피로 점검. 전체 게임플레이·모바일·실포털 QA 미완료.

#### B2~B5 실출력 음악 밸런스 확인 (2026-10-05)
- 격리 저장 데이터만 unlock해 UI로 B2/B3/B4/B5 시작, effects 0으로 6초씩 녹음. 층별 4개 음악 테마 연결 확인.
- EBU: B2 -32.7 LUFS/LRA1.2/peak -14.0; B3 -32.1/1.2/-12.8; B4 -32.9/2.1/-14.0; B5 -31.7/1.1/-13.6. 편차 1.2dB, peak headroom≥12.8dB, 표본 clipping 없음.
- 캡처 `.playwright-cli/b2-theme.webm`~`b5-theme.webm`; 콘솔 오류 0. 사용자 세이브 미사용.
- 실제 청감/장시간 피로/전투 중 마스킹은 6초 수치로 증명 불가. 다음: 한 판 동안 intensity 레이어 계측, 그 뒤 실제 전투·기기·포털 검증.

#### B1 전투 음악 강도 반응 실측 (2026-10-05)
- 격리 브라우저에서 B1 25초 무함정 진행을 실제 실행하고 Web Audio 출력을 녹음했다: `.playwright-cli/b1-natural-intensity-after-gain.webm` (24.96초 디코드 가능).
- EBU R128 구간값(0–6초 / 9–15초 / 18–24초): -32.3 / -31.4 / -31.5 LUFS. 초반 대비 중·후반 약 +0.8~0.9 dB, 중반 이후 상승은 거의 없다. 전체 녹음 -31.8 LUFS, LRA 1.5 LU, true peak -13.1 dBFS. 피크 여유는 확인했지만, 구간 간 차이에는 멜로디/리듬 편성 차도 섞이므로 강도 시스템만의 효과로 단정하지 않는다.
- 코드 경로 확인: `BossScene.update()`가 진행도·추격 거리·체력·콤보로 intensity를 계산하고 `scheduleMusicStep()`이 전용 gain stage 및 고강도 응답음에 반영한다. 이전 무함정 캡처에서 구간 변화가 거의 없어 추가한 gain stage 이후에는 초반보다 중·후반 출력이 커졌지만, 자연 추격 강도와 음악 편성 효과를 분리한 A/B는 아직 없다.
- 검증: `npm run typecheck`, `npm run build` (60 modules, `dist/index.html` 1,605.62 kB / gzip 447.69 kB), `git diff --check` 통과. 녹음 후 격리 프로필 종료. QA Vite 서버만 종료했다.
- 다음: 음악 작업은 여기서 충분한 계측을 확보했다. 계속 붙잡지 말고, 다음엔 전체 게임 목표 중 플레이 깊이/반복성 개선으로 이동해 한 가지 핵심 플레이 루프를 설계·구현하고 실제 격리 플레이로 검증한다. 자연 승리·모바일·실제 Poki/CrazyGames QA는 여전히 미완료다.

#### 콤보에 함정 종류 믹스 보상 추가 (2026-10-05)
- 연속 명중(3.5초 콤보) 중 서로 다른 함정 종류를 처음 추가할 때마다 +5 마나를 주고, 한 콤보에 최대 두 번(+10)까지 지급한다. 기존 2/4/6/8 콤보 환급과는 별도로 누적된다. Lava·Spike·Minion 피해원을 함정 종류로 묶고, 콤보가 끊기면 종류 기록도 초기화한다.
- HUD에 `TACTICAL MIX · n/3 TRAP TYPES`를 표시하고 How to Play에 보상 규칙을 설명한다. 세이브 구조는 바꾸지 않았다.
- 격리 브라우저 런타임에서 현재 `BossScene.onHeroDamaged` 경로에 lava→spike 피해를 넣었다: 마나 50→61(기존 2콤보 +6, 종류 변경 +5), combo 2, variety 2. HUD의 `TACTICAL MIX · 2/3` 표시를 확인했다. QA 전용 네트워크 계측 훅이며 제품 코드에는 남기지 않았다. 콘솔 오류/경고 0건.
- 별도 자연 플레이 입력으로 Spike·Lava 두 함정이 설치되고 마나는 차감됐으나 해당 런은 영웅이 모두 회피해 함정 명중 0회였다. 따라서 실제 전략으로 보너스를 자연 발동하는 체감은 아직 미검증이며 승리율 개선을 주장하지 않는다.
- 검증: `npm run typecheck`, `npm run build` (60 modules, `dist/index.html` 1,606.58 kB / gzip 447.95 kB), `git diff --check` 통과. 격리 브라우저 및 포트 5183 QA 서버 종료.
- 다음: 오랫동안 한 점만 파지 않도록 자연 플레이 명중률/함정 예측의 큰 문제를 한 번 더 확인한 뒤, 다른 핵심 목표(전 층 진행·기기·실 Poki/CrazyGames 검증)로 이동한다. 전체 비교 목표는 계속 active.

#### 착지 미리보기 정확도 및 CrazyGames 기준 재대조 (2026-10-05)
- CrazyGames 참고 기준은 여러 캐릭터·스테이지, 싱글/온라인/그룹 모드, 강한 기술과 콤보다. 장르가 다른 현재 게임에는 선택성·콤보·연출 완성도를 이식한다. https://www.crazygames.com/kr/game/super-smash-flash
- AI 점프 계획에 safeLanding 상태를 추가하고 HUD 예측 문구를 CLEAR PATH / RISKY LANDING으로 구분했다. 안전 후보 없음도 기존 점프 동작은 유지해 행동 밸런스는 변경하지 않았다.
- 격리 런타임 확인: 단일 용암→HERO WILL JUMP · CLEAR PATH, 연속 4칸 용암→HERO WILL JUMP · RISKY LANDING. 콘솔 오류/경고 0. typecheck/build/diff check 통과; 빌드 60 modules, 1,606.73 kB/gzip 448.02 kB.
- 다음: 미리보기 안내를 실제 플레이 입력에서 검증하고, 함정 명중/승리 경로와 전 층·기기·포털 QA로 진행. 전체 목표 active.

#### B1 자연 전략 성공 증명과 B2 전환 QA (2026-10-05)
- 실제 클릭으로 B1 연결 4칸 용암을 3번 배치하고 가까워졌을 때 Space 포효 1회 사용. 11개 trap placed·4 hit로 hero HP90→0, boss HP100. 정상 결과 HERO DEFEATED!/17.8s/+72 gems/B2 해금. 전략 자연 클리어 1회 증명; 승률/일반화는 미측정.
- B1 4칸 1회만 설치한 표본은 1 hit, HP90→66, 출구 패배. 반복 배치·포효가 핵심 개선 경로라는 증거. B2 Next Floor 실제 진입 및 130 HP Sewer Scout 확인. 무함정 B2 패배는 밸런스 결론에 쓰지 않는다.
- B2 Tidal Surge runtime state text는 관찰했으나 해당 프레임 visible=false이고 DOM 대기는 실패. 캔버스 공지의 실제 시각 노출은 미검증. Browser console error/warning0, QA browser/port5185 closed.
- 다음: B2 급류를 실제 화면에서 관찰하고 전략 플레이를 계측, 이후 B3~B5, 청음, 기기, 실 Poki/CrazyGames 검증 계속. overall goal active.

### B2~B3 실제 런타임 측정 (2026-10-05)
- B2 Tidal Surge 안내는 실제 캔버스에 노출됨. 급류 중 배치 4 Lava는 명중 0; 40.8초 출구 패배, Hero HP130/Boss HP52.
- 별도 B2 새 판에서 4 Lava 예측 HERO WILL JUMP · CLEAR PATH와 실제 무피해 점프가 일치. 42.2초 출구 패배, Boss HP52. 한 전략의 회피일 뿐 난이도 결함을 증명하지 않음.
- B3 Forge 씬에서 HERO STAGGERED 및 후속 MISSED 결과 문구 관찰. 경고 프레임 캡처 미확보. 무함정 판은 45.6초 출구 패배/Boss HP72%이므로 밸런스 근거에서 제외.
- 다음: B2 급류/ROAR 실제 공략 → B3 경고 캔버스 캡처 → B4/B5 기믹 검수 → 플랫폼·음악·전체 QA.
### 현재 작업 트리 검증 (2026-10-05)
- 타입 검사와 프로덕션 빌드 통과(60 modules, 1,606.73 kB / gzip 448.02 kB). diff --check 통과.
- 이번 턴에는 소스 수정 없이 런타임 QA와 state 기록만 수행.

### B3~B5 통제 캔버스 검수 (2026-10-05)
- 완료: B3 Forge warning/impact/hit 캔버스. on-target stun0.62s. B4 Abyss Echo warning/active. B5 Bell warning/choir resonance. 캡처는 state.md의 .playwright-cli 경로에 저장.
- 제한: 테스트 전용 씬 시계 조정으로 분기를 검증했으므로 자연 시간표가 맞는지는 입증하지 않음. console errors/warnings0.
- 다음: 자연 플레이 이벤트 스케줄 확인 → B2 ROAR 실전 → 포털 SDK/음악/전체 QA.

### Hero HUD 겹침 개선 (2026-10-05)
- Hud.tsx에서 우측 상단 체력·이름 간격을 수정. B3/B4/B5 viewport 1280x720에서 gap 34/40/41px, HP 숫자 nowrap을 DOM 좌표로 확인.
- 화면 캡처 3장 state.md 경로. typecheck/build/diff check 통과, console errors/warnings0, secret-pattern scan no matches.
- 다음 검수 우선순위: 좁은 viewport 반응형 확인 및 조정 → B2 ROAR/전술 실전 → 자연 이벤트 타이밍 → Poki/CrazyGames SDK·오디오·전체 회귀.

#### Responsive HUD follow-up (2026-10-05)
- Updated Hud.tsx and PlayScreen.tsx to preserve readable key HUD text on narrow gameplay viewports. Health/name labels enforce 10px/12px screen minimums; subtitle 8px. Right HUD panel is 460px at uiScale <= 0.625 and 420px otherwise.
- Isolated live B5 viewport captures: 768x432 HUD gap 33px; 960x540 gap 31px; 1280x720 gap 41px. All three fit the viewport without document overflow. Captures: .playwright-cli/hud-final-768.png, hud-final-960.png, hud-final-1280.png. Captured in READY state, before ad overlay.
- Latest typecheck passed; production build passed (Vite 7.3.2, 60 modules, dist/index.html 1,607.08 kB / gzip 448.16 kB); git diff --check passed.
- Browser console could not be rechecked this pass: playwright-cli is unavailable on PATH and the bundled wrapper prerequisite npx was not found. Do not treat earlier zero-console result as current verification. Verified isolated Vite listener on port 5188 and stopped it; user port 5173 was not touched.
- Next: continue B2 strategy/ROAR, natural B3-B5 event timing, platform SDK, audio and broad playability checks. Overall goal remains active.
### B2 real-play input and Tidal Surge counter check (2026-10-05)
- In isolated Playwright session at port 5188, unlocked B2 only in that session storage. The user tab at localhost:5173 was not touched.
- Found that Retry starts the mock commercial ad before gameplay; pointer input during that overlay is intercepted. Discarded those blocked-input observations and waited for the ad to finish before playing.
- One regular input sample registered 3 placed traps and 1 hit, dealing 18% hero damage; it still ended in defeat with boss HP at 52%. This single run does not establish balance or prove the best trap strategy.
- Controlled timing check in the live B2 scene: pressed Space at game time 9.9s; at 10.1s the screenshot showed TIDAL SURGE · HERO RUSHING and ROAR! simultaneously. The hero was visibly shoved back and the ROAR control entered 13.9s cooldown. This verifies the counter path, not a naturally timed clear.
- Screenshot: .playwright-cli/b2-roar-timed.png. Trap attempt screenshot: .playwright-cli/page-2026-10-05T01-31-44-951Z.png. Browser console: 3 total messages, 0 errors, 0 warnings.
- No source code changed in this verification pass. Closed the isolated browser and stopped its Vite server; overall polish/music/platform QA goal remains active.
- Next: run a clean, ad-free B2 strategy comparison with spaced trap placements and properly timed ROAR; then continue broad natural-play, audio, platform SDK, and cross-viewport verification.
### B2 trap strategy samples and coordinate correction (2026-10-05)
- Repeated isolated B2 run with mixed-trap inputs produced 5 traps placed, 2 hits, 23% hero damage, and defeat at the gate with boss HP 76%. The run used 3 Lava and 2 Spike input requests, but their final world-cell coordinates were not captured; treat this only as an exploratory run, not a controlled strategy comparison.
- Another run placed 5 traps and recorded 0 hits / 0% hero damage. A delayed placement reused a screen coordinate after camera follow had moved, so it was not a verified five-cell continuous pit. Do not infer trap balance from that run.
- Source inspection confirmed 48px trap cells and pointer placement maps screen x to world x using camera scroll. Future placement tests must compensate for camera scroll or place all target cells before the camera starts moving.
- Latest browser console: 3 total messages, 0 errors, 0 warnings. Captures: .playwright-cli/b2-mixed-traps.png, .playwright-cli/b2-5cell-drag.png, .playwright-cli/b2-5cell-pit-funded.png.
- No source code changed in this pass. Closed isolated browser and stopped port 5188 server. B2 strategy remains inconclusive; pause repeated attempts and continue the larger quality objective with platform lifecycle/audio reliability next.
### Portal ad fallback guard (2026-10-05)
- Fixed src/game/poki.ts commercialBreak fallback: if a portal host/query is detected but its provider SDK is unavailable, return without showing the local mock ad UI. This mirrors the existing rewardedBreak guard; ordinary localhost development still uses the mock.
- Runtime verification: isolated localhost with ?crazy; deliberately aborted crazygames-sdk-v3.js; after SDK failure, paused and resumed B1. No mock overlay appeared, and gameplay continued at 32.9s with 8% distance remaining. The only console error was the intentionally aborted SDK request; no app console warnings/errors were returned by the filtered console check.
- Regression check: ordinary localhost without ?crazy still displayed AD · POKI SDK MOCK during pause/resume.
- Typecheck passed; production build passed (60 modules, dist/index.html 1,607.09 kB / gzip 448.17 kB); git diff --check passed. Isolated browser and port 5188 server closed.
- CrazyGames' official requirements state that ads for a full launch must use the SDK, while ads are disabled for a basic launch: https://docs.crazygames.com/requirements/technical/. Live CrazyGames preview and Poki SDK event sequence remain unverified.
- Next: continue official portal lifecycle verification, audio quality, gameplay and full device QA. Overall objective remains active.
### Pause/resume ad compliance and save-path audit (2026-10-05)
- Removed the midgame-ad request from PlayScreen pause resume. Resume now synchronously clears the paused state and restores the CrazyGames gameplayStart event; removed obsolete async resume guards that only existed around the ad wait.
- Isolated localhost runtime verified pause -> resume with no mock-ad overlay; gameplay continued at 13.6s and 62% to the gate. Browser console filtered errors/warnings: 0/0.
- CrazyGames ad requirements place midgame ads at natural breaks and explicitly prohibit using them on navigation/settings flows; retry/next-floor breaks remain the natural-transition path. Actual CrazyGames preview is still unverified.
- Save-path audit: the project currently persists progression through localStorage. CrazyGames Automatic Progress Save backs up and syncs HTML5 localStorage across authenticated devices without an implementation change. Do not switch to the Data module unless the submission path requires it; CrazyGames says games using that module must rely fully on its save and migrate existing local data.
- Typecheck and production build passed (Vite 7.3.2, 60 modules, dist/index.html 1,606.70 kB / gzip 448.05 kB); git diff --check passed. Browser and port 5188 server closed.
- Sources: CrazyGames ad requirements https://docs.crazygames.com/requirements/ads/ ; Automatic Progress Save https://docs.crazygames.com/other/aps/ ; Data module https://docs.crazygames.com/sdk/data/
- Next: verify actual audio mix/quality and SDK lifecycle in an isolated CrazyGames-like mock; then continue natural stage and device QA. Overall objective remains active.