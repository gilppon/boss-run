"""Verify the current Poki and CrazyGames release artifacts.

Run from the repository root with:
    python scripts/verify_portal_submission.py

Requires ffprobe on PATH for video metadata checks.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import struct
import subprocess
import sys
import zipfile
from fractions import Fraction
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ARCHIVES = (
    ROOT / "boss-reverse-runner-submission-2026-10-13-boss-wave.zip",
    ROOT / "boss-reverse-runner.zip",
)
MAX_CRAZYGAMES_FILES = 1_500
MAX_CRAZYGAMES_ARCHIVE_BYTES = 250_000_000
MAX_CRAZYGAMES_INITIAL_DOWNLOAD_BYTES = 50_000_000
MAX_CRAZYGAMES_MOBILE_INITIAL_DOWNLOAD_BYTES = 20_000_000
MAX_POKI_SCREENSHOT_BYTES = 5 * 1024 * 1024
MAX_POKI_SCREENSHOT_PIXELS = 25_000_000
POKI_SCREENSHOT_DIR = ROOT / "submission-media" / "poki-gameplay"
POKI_SCREENSHOT_STEMS = ("poki-gameplay-01", "poki-gameplay-02", "poki-gameplay-03")
POKI_SCREENSHOT_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
SELECTED_PREVIEW_VIDEOS = (
    "poki-animated-preview-v3-1080x1080.mp4",
    "crazygames-preview-landscape-v2-1920x1080.mp4",
    "crazygames-preview-portrait-v2-720x1080.mp4",
)
ANIMATION_FILES = (
    "hero_apprentice_anim.webp",
    "hero_scout_anim.webp",
    "hero_warden_anim.webp",
    "hero_breaker_anim.webp",
    "hero_duelist_anim.webp",
    "boss_demon_anim.webp",
    "boss_hell_king_anim.webp",
    "boss_abyss_lord_anim.webp",
    "boss_last_emperor_anim.webp",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def png_dimensions(path: Path) -> tuple[int, int]:
    header = path.read_bytes()[:24]
    require(header[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {path.name}")
    return struct.unpack(">II", header[16:24])


def still_image_dimensions(path: Path) -> tuple[int, int]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    streams = json.loads(result.stdout)["streams"]
    require(len(streams) == 1, f"Expected one image stream in {path.name}")
    return int(streams[0]["width"]), int(streams[0]["height"])


def video_metadata(path: Path) -> tuple[int, int, float, float, bool]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,width,height,r_frame_rate",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    metadata = json.loads(result.stdout)
    videos = [stream for stream in metadata["streams"] if stream["codec_type"] == "video"]
    audios = [stream for stream in metadata["streams"] if stream["codec_type"] == "audio"]
    require(len(videos) == 1, f"Expected one video stream in {path.name}")
    video = videos[0]
    return (
        int(video["width"]),
        int(video["height"]),
        float(Fraction(video["r_frame_rate"])),
        float(metadata["format"]["duration"]),
        bool(audios),
    )


def check_video(
    filename: str,
    expected_size: tuple[int, int],
    minimum_fps: float,
    minimum_seconds: float,
    maximum_seconds: float,
    maximum_bytes: int,
) -> None:
    path = ROOT / filename
    require(path.is_file(), f"Missing video: {filename}")
    require(path.stat().st_size <= maximum_bytes, f"Video exceeds size limit: {filename}")
    width, height, fps, duration, has_audio = video_metadata(path)
    require((width, height) == expected_size, f"Unexpected resolution for {filename}: {width}x{height}")
    require(fps >= minimum_fps, f"Frame rate is too low for {filename}: {fps}")
    require(minimum_seconds <= duration <= maximum_seconds, f"Unexpected duration for {filename}: {duration:.3f}s")
    require(not has_audio, f"Expected silent video: {filename}")
    print(f"PASS video {filename}: {width}x{height}, {fps:g}fps, {duration:.2f}s, silent")


def verify_sources_and_build() -> None:
    index = DIST / "index.html"
    require(index.is_file(), "Missing dist/index.html; build the production bundle first")
    bundle = "\n".join(
        path.read_text(encoding="utf-8")
        for path in DIST.rglob("*")
        if path.is_file() and path.suffix in {".html", ".js"}
    )
    require("AD · POKI SDK MOCK" not in bundle, "Development mock-ad UI leaked into production bundle")

    app_source = (ROOT / "src/App.tsx").read_text(encoding="utf-8")
    portal_source = (ROOT / "src/game/portalAd.ts").read_text(encoding="utf-8")
    audio_source = (ROOT / "src/game/sfx.ts").read_text(encoding="utf-8")
    play_source = (ROOT / "src/components/PlayScreen.tsx").read_text(encoding="utf-8")
    canvas_source = (ROOT / "src/components/GameCanvas.tsx").read_text(encoding="utf-8")
    hud_source = (ROOT / "src/components/Hud.tsx").read_text(encoding="utf-8")
    result_source = (ROOT / "src/components/ResultModal.tsx").read_text(encoding="utf-8")
    share_source = (ROOT / "src/game/share.ts").read_text(encoding="utf-8")
    require("if (import.meta.env.DEV)" in app_source, "Development ad UI registration is not guarded by DEV")
    require("import.meta.env.DEV && ad && <AdOverlay" in app_source, "Development ad overlay is not guarded by DEV")
    require("import.meta.env.DEV && portalTarget === null ? adUI : null" in portal_source, "Mock reward path is not development-only")
    require("CrazyGames?: any" not in portal_source and "PokiSDK?: any" not in portal_source, "Portal SDK globals are missing explicit API types")
    require("const rewardedBreak = sdk?.rewardedBreak;" in portal_source and "rewardedBreak.call(sdk, () =>" in portal_source, "Poki rewarded callback does not match the documented function signature")
    require("REWARDED_COOLDOWN_MS" not in portal_source, "Internal rewarded-ad frequency timer remains")
    require("addSettingsChangeListener" in portal_source and "setSdkMuted" in audio_source, "CrazyGames muteAudio integration is missing")
    require(
        all(token in play_source for token in (
            'e.code === "Space"', '"ArrowUp"', '"ArrowDown"',
            'e.preventDefault();',
            'document.addEventListener("wheel", onWheel, { passive: false })',
        )),
        "Gameplay page-scroll guards are missing",
    )
    require("PortalAd.shouldStartDirectlyInGameplay || firstRunOnPortal" in app_source and "PortalAd.isReal && !currentSave.seenTutorial && !currentSave.tutorialSkipped" in app_source, "First-time portal onboarding still has a start-menu barrier")
    require("if (placed >= 1 && !didRef.current)" in hud_source and "onTutorialStepComplete();" in hud_source, "First-trap completion is not persisted after the action")
    require("manualShareText" in result_source and 'aria-label="Challenge message to copy"' in result_source, "Sharing has no visible fallback when native share and clipboard are unavailable")
    require("export function createBossShareUrlFallback" in share_source and "shareUrl || createBossShareUrlFallback" in result_source, "Challenge share can lose its run parameters before the portal share URL resolves")
    require('result.reason === "boss-defeated"' in result_source and "He struck you down before your traps landed." in result_source, "Boss-defeat results do not explain that the hero defeated the player")
    require("Place your first trap in the green zone to start the chase and defend your dungeon." in hud_source, "The first-trap tutorial prompt is missing")
    require("Trap set! Let's see if the hero can outsmart you." in hud_source, "The first-trap success feedback is missing")
    require("provider === \"poki\" && !pokiFirstGameplayInputSeen" in portal_source and "notePlayerInput()" in portal_source, "Poki gameplayStart is not gated on first player input")
    require("if (!portalAutoStart) PortalAd.notePlayerInput();" in app_source and "PortalAd.notePlayerInput();" in app_source, "Player-start input is not forwarded to portal lifecycle")
    require("PortalAd.loadingFinished();" in app_source and "loadingFinishedRequested = true;" in portal_source, "Loading completion is not deferred until the playable scene is ready")
    require('window.PokiSDK.measure(category, what, action)' in portal_source and 'provider !== "poki"' in portal_source, "Game event measurement is not isolated to Poki's built-in analytics")
    require('PortalAd.measure("level", floor, "start")' in app_source and 'r.won ? "complete" : "fail"' in app_source, "Campaign progress events do not record level starts and outcomes")
    require('PortalAd.measure("tutorial", "first-trap", "complete")' in app_source and 'PortalAd.measure("hint", "first-trap", "visible")' in app_source and 'PortalAd.measure("hint", "first-trap", "interact")' in app_source, "First-trap tutorial exposure and completion are not measured")
    require('PortalAd.measure("button", "retry", "visible")' in result_source and 'PortalAd.measure("button", "retry", "interact")' in result_source, "Result-screen retry exposure and interaction are not measured")
    require("loadSprites(config.floor.heroId, config.boss.def.name)" in canvas_source, "The scene loads an unrelated all-character sprite set")
    scene_source = (ROOT / "src/game/BossScene.ts").read_text(encoding="utf-8")
    require("const shouldShowTutorial = !s.seenTutorial && !s.tutorialSkipped;" in app_source and "cfg.tutorialHold = shouldShowTutorial;" in app_source and "this.tutorialHold = data.config.tutorialHold === true;" in scene_source, "The first-trap tutorial does not hold the opening until player action")
    require("const dt = this.tutorialHold ? 0 :" in scene_source and "this.tutorialHold = false;" in scene_source, "The first trap does not release the opening hold")
    require("this.tutorialHold ? 0.2 : 0.06" in scene_source, "The first-run placement zone is not highlighted")
    require('aria-label="Skip first-trap tutorial"' in hud_source and 'bus.emit("tutorial-skip")' in app_source and 'bus.on("tutorial-skip"' in scene_source, "The in-game first-trap tutorial cannot be skipped")
    require('PortalAd.measure("tutorial", "first-trap", "skip")' in app_source and "currentSave.tutorialSkipped" in app_source, "Tutorial skip is not separately recorded from successful completion")
    close_help = app_source.split("const closeHelp = useCallback(() => {", 1)[1].split("}, []);", 1)[0]
    require("setHelp(false);" in close_help and "setSave(" not in close_help, "Closing Help incorrectly completes the first-trap tutorial")
    require("orientationPauseRef.current = true" in play_source and 'void applyPause(false, "focus")' in play_source, "Returning to landscape does not auto-resume")
    require("https://game-cdn.poki.com/scripts/v2/poki-sdk.js" in bundle, "Poki SDK URL is missing")
    require("https://sdk.crazygames.com/crazygames-sdk-v3.js" in bundle, "CrazyGames SDK URL is missing")
    print(f"PASS production artifact static checks: {index.stat().st_size:,} bytes; development mock label absent; portal guards present")


def verify_content_and_navigation() -> None:
    source_files = [* (ROOT / "src").rglob("*.ts"), * (ROOT / "src").rglob("*.tsx")]
    source = "\n".join(path.read_text(encoding="utf-8") for path in source_files)
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    source = re.sub(r"(?m)^\s*//.*$", "", source)
    require(re.search(r"[가-힣]", source) is None, "Korean UI text found; CrazyGames requires English localization")
    urls = set(re.findall(r"https?://[^\s\"'`]+", source))
    allowed_urls = {
        "https://game-cdn.poki.com/scripts/v2/poki-sdk.js",
        "https://sdk.crazygames.com/crazygames-sdk-v3.js",
    }
    require(urls <= allowed_urls, f"Unexpected external URL in game source: {sorted(urls - allowed_urls)}")
    require("window.open(" not in source and 'target="_blank"' not in source, "External navigation link found")
    require("requestFullscreen(" not in source, "Custom fullscreen call conflicts with CrazyGames host controls")
    print("PASS content/navigation: English UI strings; only official SDK URLs; no outgoing links or custom fullscreen")


def verify_animation_assets() -> None:
    assets_source = (ROOT / "src/game/assets.ts").read_text(encoding="utf-8")
    scene_source = (ROOT / "src/game/BossScene.ts").read_text(encoding="utf-8")
    missing = [name for name in ANIMATION_FILES if not (DIST / "sprites" / name).is_file()]
    require(not missing, f"Missing production animation sheets: {missing}")
    animation_stems = [name.removesuffix("_anim.webp") for name in ANIMATION_FILES]
    require(all(stem in assets_source for stem in animation_stems), "A character animation sheet is missing from the selection map")
    require('loadSpriteImage(`${hero.fileStem}_anim.webp`)' in assets_source and 'loadSpriteImage(`${boss.fileStem}_anim.webp`)' in assets_source, "Selected character animation sheets are not loaded")
    require("registerFrameGrid" in scene_source, "Animation frame grids are not registered by the game scene")
    total_bytes = sum((DIST / "sprites" / name).stat().st_size for name in ANIMATION_FILES)
    print(f"PASS character animation sheets: {len(ANIMATION_FILES)} available, {total_bytes:,} compressed bytes; runtime selects by floor and boss")
    initial_files = [
        "hero_apprentice.webp",
        "hero_apprentice_anim.webp",
        "boss_demon.webp",
        "boss_demon_anim.webp",
        "minion_imp.webp",
        "tile_ground.webp",
        "pillars_hd.webp",
    ]
    initial_bytes = sum((DIST / "sprites" / name).stat().st_size for name in initial_files)
    all_sprite_bytes = sum(path.stat().st_size for path in (DIST / "sprites").glob("*.webp"))
    saved_bytes = all_sprite_bytes - initial_bytes
    require(initial_bytes < all_sprite_bytes, "First-run sprite selection did not reduce the sprite payload")
    print(f"PASS first-run sprite selection: {len(initial_files)} files, {initial_bytes:,} bytes; {saved_bytes:,} bytes deferred")


def verify_archives() -> None:
    require(all(path.is_file() for path in ARCHIVES), "Missing one or more submission ZIP files")
    dist_files = {path.relative_to(DIST).as_posix(): path for path in DIST.rglob("*") if path.is_file()}
    archive_contents: list[dict[str, bytes]] = []
    archive_hashes: list[str] = []

    for archive_path in ARCHIVES:
        with zipfile.ZipFile(archive_path) as archive:
            infos = [info for info in archive.infolist() if not info.is_dir()]
            names = [info.filename for info in infos]
            require(len(names) == len(set(names)), f"Duplicate ZIP entries in {archive_path.name}")
            for name in names:
                posix = PurePosixPath(name)
                require(not posix.is_absolute() and ".." not in posix.parts and "\\" not in name, f"Unsafe ZIP path: {name}")
            require(set(names) == set(dist_files), f"ZIP entries do not match dist/ in {archive_path.name}")
            require("index.html" in names, f"index.html is not at ZIP root in {archive_path.name}")
            content = {name: archive.read(name) for name in names}
            for name, path in dist_files.items():
                require(sha256_bytes(content[name]) == sha256_bytes(path.read_bytes()), f"ZIP content differs from dist/: {name}")
            expanded = sum(info.file_size for info in infos)
            require(len(infos) <= MAX_CRAZYGAMES_FILES, "Archive exceeds CrazyGames file-count limit")
            require(expanded <= MAX_CRAZYGAMES_ARCHIVE_BYTES, "Archive exceeds CrazyGames total-size limit")
            require(expanded <= MAX_CRAZYGAMES_INITIAL_DOWNLOAD_BYTES, "Expanded package exceeds the conservative 50 MB initial-download ceiling")
            require(expanded <= MAX_CRAZYGAMES_MOBILE_INITIAL_DOWNLOAD_BYTES, "Expanded package exceeds the 20 MB mobile-homepage initial-download ceiling")
            archive_contents.append(content)
            archive_hashes.append(sha256_bytes(archive_path.read_bytes()))

    require(archive_contents[0] == archive_contents[1], "Dated and generic submission ZIPs differ")
    require(archive_hashes[0] == archive_hashes[1], "Dated and generic submission ZIP hashes differ")
    with zipfile.ZipFile(ARCHIVES[0]) as archive:
        expanded = sum(info.file_size for info in archive.infolist() if not info.is_dir())
        count = sum(not info.is_dir() for info in archive.infolist())
    print(f"PASS ZIPs: {count} files, {expanded:,} expanded bytes, {ARCHIVES[0].stat().st_size:,} bytes compressed")
    print(f"PASS ZIP aliases: SHA-256 {archive_hashes[0]}")


def verify_images() -> None:
    expected = {
        "poki-thumbnail-v2-1254x1254.png": (1254, 1254),
        "poki-thumbnail-v3-1254x1254.png": (1254, 1254),
        "crazygames-cover-landscape-1920x1080.png": (1920, 1080),
        "crazygames-cover-landscape-v2-1920x1080.png": (1920, 1080),
        "crazygames-cover-portrait-800x1200.png": (800, 1200),
        "crazygames-cover-portrait-v2-800x1200.png": (800, 1200),
        "crazygames-cover-square-800x800.png": (800, 800),
        "crazygames-cover-square-v2-800x800.png": (800, 800),
    }
    for filename, size in expected.items():
        path = ROOT / filename
        require(path.is_file(), f"Missing cover image: {filename}")
        actual = png_dimensions(path)
        require(actual == size, f"Unexpected cover dimensions for {filename}: {actual}")
        print(f"PASS image {filename}: {actual[0]}x{actual[1]}")


def check_poki_gameplay_screenshots() -> None:
    missing: list[str] = []
    for stem in POKI_SCREENSHOT_STEMS:
        matches = sorted(
            path
            for path in POKI_SCREENSHOT_DIR.glob(f"{stem}.*")
            if path.suffix.lower() in POKI_SCREENSHOT_EXTENSIONS
        )
        require(len(matches) <= 1, f"Multiple screenshot files found for {stem}")
        if not matches:
            missing.append(stem)
            continue
        path = matches[0]
        require(path.stat().st_size <= MAX_POKI_SCREENSHOT_BYTES, f"Screenshot exceeds 5 MiB: {path.name}")
        width, height = still_image_dimensions(path)
        require(width * height <= MAX_POKI_SCREENSHOT_PIXELS, f"Screenshot exceeds 25 MP: {path.name}")
        print(f"PASS Poki screenshot metadata {path.relative_to(ROOT)}: {width}x{height}, {path.stat().st_size:,} bytes")

    if missing:
        print(
            "PENDING Poki screenshots: add 3 actual gameplay images under "
            f"{POKI_SCREENSHOT_DIR.relative_to(ROOT)} as {', '.join(missing)} (PNG/JPEG/WebP)"
        )
    print("PENDING Poki screenshot content: confirm all 3 images show real gameplay from the current build")


def report_unverified_submission_gates() -> None:
    source_path = ROOT / "src" / "game" / "BossScene.ts"
    source_mtime = source_path.stat().st_mtime
    older_previews = [
        name
        for name in SELECTED_PREVIEW_VIDEOS
        if (ROOT / name).stat().st_mtime < source_mtime
    ]
    if older_previews:
        print(
            "PENDING media freshness: selected preview timestamps predate the current BossScene.ts; "
            f"recapture from the current ZIP: {', '.join(older_previews)}"
        )
    else:
        print("PENDING media provenance: timestamps cannot prove previews were captured from the current ZIP")
    print("PENDING visual review: inspect gameplay framing and featured mechanics in the portal preview")
    print(
        "PENDING CrazyGames portrait resolution: official guidance requires a 2:3 1080p preview; "
        "the selected 720x1080 file is not confirmed to meet that requirement and should be replaced or checked in the portal"
    )
    print("PENDING portal/device QA: run Poki Inspector, CrazyGames QA, and real mobile/low-memory checks")


def main() -> int:
    require(shutil.which("ffprobe") is not None, "ffprobe is required; install FFmpeg or add ffprobe to PATH")
    verify_sources_and_build()
    verify_content_and_navigation()
    verify_animation_assets()
    verify_archives()
    verify_images()
    check_poki_gameplay_screenshots()
    check_video("poki-animated-preview-1080x1080.mp4", (1080, 1080), 50, 4, 6, 100_000_000)
    check_video("poki-animated-preview-v3-1080x1080.mp4", (1080, 1080), 50, 4, 6, 100_000_000)
    check_video("crazygames-preview-landscape-1920x1080.mp4", (1920, 1080), 30, 15, 20, 50_000_000)
    check_video("crazygames-preview-landscape-v2-1920x1080.mp4", (1920, 1080), 30, 15, 20, 50_000_000)
    check_video("crazygames-preview-portrait-720x1080.mp4", (720, 1080), 30, 15, 20, 50_000_000)
    check_video("crazygames-preview-portrait-v2-720x1080.mp4", (720, 1080), 30, 15, 20, 50_000_000)
    report_unverified_submission_gates()
    print("PASS local artifact checks; submission readiness still requires the pending gates above")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError, KeyError, ValueError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print(f"FAIL portal submission check: {error}", file=sys.stderr)
        raise SystemExit(1)
