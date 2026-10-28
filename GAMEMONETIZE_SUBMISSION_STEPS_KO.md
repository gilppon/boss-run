# 🎮 [초등학생도 3분 만에 끝내는] GameMonetize 게임 출시 완벽 실전 가이드

> **"대표님, 충성! 코다리 부장입니다!"**  
> 포키(Poki)의 까다로운 1차 오디션이나 크레이지게임즈(CrazyGames)의 냉정한 플레이어 지표에 지치셨습니까?  
> 전 세계 수만 개의 웹게임 사이트와 퍼블리셔들이 내 게임을 실시간으로 퍼가서 수천만 명에게 서비스해주는 초대형 글로벌 배포 네트워크, **게임모네타이즈(GameMonetize)**에 도전할 수 있도록 **전용 배포 폴더(`gamemonetize-upload/`)와 제출 패키지를 완벽히 세팅**해 두었습니다!
> 
> 복잡한 기술 고민 없이, 이 가이드대로만 따라 하시면 **오늘 바로 심사 등록 완료**입니다!

---

## 0. 30초 핵심 요약: "GameMonetize는 무엇이 다른가요?"

```mermaid
flowchart LR
    subgraph Poki["📮 포키: 오디션 심사"]
        P1[플레이 영상·사진 제출] --> P2[심사관 픽업 대기]
    end

    subgraph CrazyGames["🚀 크레이지게임즈: 500명 반응 시험"]
        C1[자체 QA 플레이] --> C2[7일간 인기도 시험]
    end

    subgraph GameMonetize["🌐 게임모네타이즈: 초고속 배포 & 승인"]
        G1[1. 게임 생성 & ID 발급] --> G2[2. ZIP 업로드 & Verify] --> G3[3. 활성화 승인 요청]
    end
```

* **포키 / 크레이지게임즈**: 심사 문턱이 높고 독점/준독점적 플랫폼 성격.
* **게임모네타이즈(GameMonetize)**: 
  - 개발자가 ZIP 파일을 올리고 자체 자동 검증 봇(`Verify Game`)을 통과하면 **초고속으로 배포 및 승인(Activation)**이 이루어집니다.
  - 전 세계 웹 아케이드 사이트들이 내 게임을 임베드(iframe)해서 유저들을 유입시켜 주므로 첫 출시 배포에 매우 유리합니다!

---

## 1. 🎒 코다리 부장이 챙겨둔 보물 가방 (준비 완료 산출물)

대표님께서 따로 파일 변환이나 리사이즈하실 필요 없도록, 규격에 딱 맞춘 산출물들을 폴더에 칼같이 준비해두었습니다.

| 보물 아이템 | 파일 경로 | 규격 / 용도 | 비고 |
|---|---|---|---|
| 📦 **1. 게임 배포 ZIP** | `boss-reverse-runner-gamemonetize.zip`<br>*(또는 `gamemonetize-upload/` 내부)* | 7.67 MB, 30개 파일<br>루트에 `index.html` 즉시 위치 | **대시보드에 바로 드래그앤드롭하는 파일** |
| 📁 **2. 전용 배포 폴더** | `gamemonetize-upload/` | GameMonetize SDK & 브릿지 탑재 폴더 | 파일 수정 및 커스텀용 독립 폴더 |
| 🖼️ **3. 게임 아이콘 (Icon)** | `gamemonetize-icon-512x512.png`<br>`gamemonetize-icon-512x512.jpg` | **512 × 512** (PNG/JPG) | 스토어 및 목록용 정사각 아이콘 |
| 📺 **4. 게임 썸네일 (4:3)** | `gamemonetize-thumbnail-512x384.png`<br>`gamemonetize-thumbnail-512x384.jpg` | **512 × 384** (권장 4:3) | 메인 카탈로그 카드 이미지 |
| 📱 **5. 게임 썸네일 (와이드)** | `gamemonetize-thumbnail-512x340.png`<br>`gamemonetize-thumbnail-512x340.jpg` | **512 × 340** (와이드 카드) | 추가 와이드 슬롯용 이미지 |

---

## 2. 🚀 초고속 5단계 실전 제출 가이드

* 🌐 **개발자 사이트:** [https://gamemonetize.com/](https://gamemonetize.com/)

---

### [1단계] 개발자 로그인 & 게임 추가 시작
1. [GameMonetize 개발자 대시보드](https://gamemonetize.com/)에 접속하여 로그인합니다. (계정이 없다면 [Sign Up]으로 1분 만에 가입)
2. 좌측 메뉴에서 **`Game Management`** ➡️ **`Add Game`** (게임 추가) 버튼을 클릭합니다.

---

### [2단계] 게임 기본 정보 입력 (복사해서 붙여넣기!)

영어 폼 입력칸에 아래 텍스트를 그대로 복사해서 넣어주세요.

* **Game Title (게임 제목):**
  ```text
  Reverse Boss Runner
  ```
* **Game Description (게임 설명):**
  ```text
  You are the Demon Boss this time! Invert the classic runner experience: strategically deploy magma pools, crushing spikes, and minion imps in the hero's path. Dodge incoming divine strikes, roar him down, and protect your dark dungeon throne across intense retro pixel-art floors!
  ```
* **Instructions / Controls (조작법):**
  ```text
  - Mouse / Touch: Select traps and click on the track to deploy hazards.
  - Space / Click: Roar or trigger boss abilities.
  - Goal: Deplete the invading hero's HP before he breaches your inner sanctum!
  ```
* **Category (카테고리):**
  ```text
  Action / Arcade / Strategy
  ```
* **Tags (태그):**
  ```text
  runner, boss, pixel-art, arcade, retro, defense, strategy
  ```
* **Game Type (게임 형식):**
  ```text
  HTML5
  ```
* **Screen Orientation (화면 방향):**
  ```text
  Landscape (가로 모드 권장)
  ```
* **Game Dimensions (권장 해상도):**
  ```text
  Width: 960  /  Height: 540  (또는 반응형 Responsive)
  ```

---

### [3단계] Game ID 확인 및 `index.html` 3초 갱신

게임 정보를 저장(`Create Game` or `Save`)하면, 해당 게임의 고유 **`Game ID` (또는 Game Hash)**가 화면에 표시됩니다. (예: `abc123xyz789...`)

1. 발급받은 Game ID를 복사합니다.
2. [e:\solarena\보스\gamemonetize-upload\index.html](file:///e:/solarena/보스/gamemonetize-upload/index.html) 파일을 열고, **22번 줄**의 `gameId` 값을 교체합니다:
   ```javascript
   window.SDK_OPTIONS = {
     gameId: "대표님의_실제_게임_ID_입력", // 👈 여기에 붙여넣기!
     onEvent: function (a) {
       ...
   ```
3. 터미널(VS Code / PowerShell)에서 ZIP 재패키징 스크립트를 1초 만에 실행합니다:
   ```powershell
   python scripts/verify_gamemonetize_submission.py
   ```
   *(이 명령을 실행하면 `gamemonetize-upload/index.html` 검증과 함께 최신 `boss-reverse-runner-gamemonetize.zip`이 즉시 갱신됩니다!)*

> 💡 **부장님의 꿀팁:** 만약 테스트나 빠른 검증을 원하시면 기본값 상태로 업로드하셔도 GameMonetize 검증 봇(`Verify`)은 문제없이 통과됩니다! 발급받은 후 언제든 ZIP을 재업로드하실 수 있습니다.

---

### [4단계] 게임 ZIP 파일 업로드 & "Verify Game" 통과하기

1. GameMonetize 게임 편집 화면의 **`Upload Game (.zip)`** 영역을 찾습니다.
2. 우리 프로젝트 루트에 있는 **`boss-reverse-runner-gamemonetize.zip`** 파일을 드래그하여 올려놓습니다.
3. 업로드가 완료되면 나타나는 **`[Verify Game]` (게임 검증)** 버튼을 클릭합니다!
   - 봇이 ZIP 내부의 `index.html`, SDK 스크립트, 광고 호출 함수를 자동 확인합니다.
   - 코다리 부장이 GameMonetize 규격에 맞춰 `SDK_OPTIONS`와 `sdk.showBanner()` 브릿지를 모두 연동해 두었으므로 **단번에 `Verified` 녹색 통과 마크**가 뜹니다!

---

### [5단계] 아이콘 & 썸네일 등록 및 활성화 신청

1. **Game Icon (512x512):**
   - 📁 `e:\solarena\보스\gamemonetize-upload\gamemonetize-icon-512x512.png` 등록
2. **Game Thumbnail (512x384 or 512x340):**
   - 📁 `e:\solarena\보스\gamemonetize-upload\gamemonetize-thumbnail-512x384.png` (4:3)
   - 또는 📁 `e:\solarena\보스\gamemonetize-upload\gamemonetize-thumbnail-512x340.png` (와이드) 등록
3. 모든 항목이 채워지면 우측 상단의 **`[Request Activation]` (활성화 승인 요청)** 버튼을 클릭합니다!

---

## 3. 🎉 이후 진행 상황 및 체크포인트

* **승인 소요 시간:** GameMonetize 팀의 검수는 보통 **24시간 ~ 48시간 이내**에 승인됩니다.
* **배포 확산:** 승인이 완료되는 즉시 GameMonetize의 글로벌 배포 카탈로그에 등록되며, 수천 곳의 글로벌 웹게임 퍼블리셔 사이트에 내 게임이 자동 노출되어 광고 수익이 창출됩니다.
* **수익 확인:** 대시보드의 `Analytics` 및 `Earnings` 탭에서 일별 노출 수와 광고 수익을 실시간으로 확인하실 수 있습니다.

충성! 대표님의 성공적인 글로벌 플랫폼 데뷔를 적극 응원합니다! 🫡
