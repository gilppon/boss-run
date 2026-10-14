# Portal media capture handoff

Capture all replacement assets from the exact production ZIP intended for upload:

`boss-reverse-runner-submission-2026-10-13-boss-wave.zip`  
28 files; 8,864,593 expanded bytes / 7,673,464 compressed bytes  
SHA-256: `45e9f905918108990040ec6b8a973e83d0e0fc42c7008e33349015537e7f4311`

The current selected preview files predate the latest `src/game/BossScene.ts` modification and first-trap tutorial skip update, so do not treat them as current-build evidence. Keep the replacement outputs under their existing selected filenames at the repository root so the verifier can check them.

## Poki

- Preview: `poki-animated-preview-v3-1080x1080.mp4`, square 1080×1080, 50 fps, 4–6 seconds, silent, under 100 MB. Lead with the matching static thumbnail, then show a readable gameplay moment centered for the square crop.
- Screenshots: use `poki-gameplay-01`, `poki-gameplay-02`, and `poki-gameplay-03` in `poki-gameplay/`. Capture the tutorial/trap interaction, low-wave jump, and high-wave crouch from the current build. Accepted formats and file limits are in [the screenshot folder guide](./poki-gameplay/README.md).

## CrazyGames

- Landscape preview: `crazygames-preview-landscape-v2-1920x1080.mp4`, 1920×1080, 15–20 seconds, silent, under 50 MB.
- Portrait preview: `crazygames-preview-portrait-v2-720x1080.mp4`, 720×1080 (2:3), 15–20 seconds, silent, under 50 MB.
- Start each video with its matching static cover and show actual gameplay. Avoid promotional text, a visible mouse cursor, audio, and black bars. The portrait version must remain honest about the game's landscape orientation; check whether the centered game view is legible in the Developer Portal preview before submission.
- A useful current-build sequence is trap placement/hero response, low wave/hero jump, then high wave/hero crouch. Keep telegraphs and character actions large enough to read.

## After capture

1. Replace the selected files only after confirming they came from the ZIP above.
2. Run `rtk python scripts/verify_portal_submission.py` for dimensions, frame rate, duration, file size, silence, screenshot metadata, and source-timestamp warnings.
3. Play every clip from start to finish and inspect all three screenshots. The script cannot prove that media shows authentic gameplay or matches the uploaded build.
4. Confirm Poki Event Checker/Inspector and CrazyGames QA in their respective portals; record those results separately from local verification.

Official references: [Poki submission](https://developers.poki.com/guide/share), [Poki animated thumbnail](https://developers.poki.com/guide/your-game-page), [CrazyGames covers and previews](https://docs.crazygames.com/requirements/game-covers/).
