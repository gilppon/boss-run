"""Verify the GameMonetize release package and upload folder.

Run from repository root:
    python scripts/verify_gamemonetize_submission.py
"""

from __future__ import annotations

import shutil
import zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = ROOT / "gamemonetize-upload"
ZIP_FILE = ROOT / "boss-reverse-runner-gamemonetize.zip"
ZIP_IN_UPLOAD = UPLOAD_DIR / "boss-reverse-runner-gamemonetize.zip"


def require(condition: bool, msg: str) -> None:
    if not condition:
        raise AssertionError(f"FAIL: {msg}")


def package_zip() -> None:
    """Package gamemonetize-upload folder contents into the canonical zip files."""
    game_files = [
        p for p in UPLOAD_DIR.rglob("*")
        if p.is_file() and not p.name.endswith(".zip") and not p.name.startswith("gamemonetize-")
    ]
    game_files.sort()

    with zipfile.ZipFile(ZIP_FILE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for f in game_files:
            rel = f.relative_to(UPLOAD_DIR).as_posix()
            zf.write(f, rel)

    shutil.copy2(ZIP_FILE, ZIP_IN_UPLOAD)
    print(f"PASS package: created {ZIP_FILE.name} ({ZIP_FILE.stat().st_size:,} bytes, {len(game_files)} files)")


def verify_folder_and_index() -> None:
    require(UPLOAD_DIR.is_dir(), "gamemonetize-upload directory missing")
    index_path = UPLOAD_DIR / "index.html"
    require(index_path.is_file(), "gamemonetize-upload/index.html missing")

    content = index_path.read_text(encoding="utf-8")

    # 1. SDK script and options
    require("api.gamemonetize.com/sdk.js" in content, "GameMonetize SDK URL missing from index.html")
    require("window.SDK_OPTIONS" in content, "SDK_OPTIONS object missing from index.html")
    require("gameId:" in content, "gameId field missing from SDK_OPTIONS")
    require("SDK_GAME_PAUSE" in content, "SDK_GAME_PAUSE event handler missing")
    require("SDK_GAME_START" in content, "SDK_GAME_START event handler missing")
    require("SDK_READY" in content, "SDK_READY event handler missing")
    require("showBanner" in content, "sdk.showBanner call trigger missing")

    # 2. Relative asset paths (no absolute /assets/ leak)
    require('src="./assets/' in content, "Bundled JS is not using relative './assets/' path")
    require('href="./assets/' in content, "Bundled CSS is not using relative './assets/' path")
    require('href="./favicon.svg"' in content, "Favicon is not using relative './favicon.svg' path")
    require('src="/assets/' not in content, "Absolute '/assets/' found in index.html (will break in subpaths)")

    print("PASS index.html: GameMonetize SDK, SDK_OPTIONS, showBanner, and relative asset paths verified")


def verify_zip_archive() -> None:
    require(ZIP_FILE.is_file(), "boss-reverse-runner-gamemonetize.zip missing in root")
    require(ZIP_IN_UPLOAD.is_file(), "boss-reverse-runner-gamemonetize.zip missing in upload folder")

    with zipfile.ZipFile(ZIP_FILE, "r") as zf:
        names = set(zf.namelist())
        require("index.html" in names, "index.html must be located directly at root of ZIP archive")
        require("favicon.svg" in names, "favicon.svg missing from ZIP")
        require("assets/index-BI2-j9w1.js" in names, "Bundle JS missing from ZIP")
        require("assets/index-DFezROZW.css" in names, "Bundle CSS missing from ZIP")
        require(any(n.startswith("sprites/boss_") for n in names), "Boss sprites missing from ZIP")
        require(any(n.startswith("sprites/hero_") for n in names), "Hero sprites missing from ZIP")

        # Check total count
        require(len(names) >= 28, f"Unexpectedly low file count in ZIP: {len(names)}")

    print(f"PASS ZIP archive: verified {len(names)} files, root index.html verified, size {ZIP_FILE.stat().st_size:,} bytes")


def verify_media_assets() -> None:
    media_specs = [
        ("gamemonetize-icon-512x512.png", (512, 512)),
        ("gamemonetize-icon-512x512.jpg", (512, 512)),
        ("gamemonetize-thumbnail-512x384.png", (512, 384)),
        ("gamemonetize-thumbnail-512x384.jpg", (512, 384)),
        ("gamemonetize-thumbnail-512x340.png", (512, 340)),
        ("gamemonetize-thumbnail-512x340.jpg", (512, 340)),
    ]

    for fname, (expected_w, expected_h) in media_specs:
        path = UPLOAD_DIR / fname
        require(path.is_file(), f"Media asset missing in gamemonetize-upload: {fname}")
        im = Image.open(path)
        require(im.size == (expected_w, expected_h), f"Dimensions mismatch for {fname}: got {im.size}, expected {(expected_w, expected_h)}")

    print(f"PASS media assets: all {len(media_specs)} icons and thumbnails verified at official GameMonetize dimensions")


def main() -> int:
    print("--- Verifying & Packaging GameMonetize Submission Artifacts ---")
    verify_folder_and_index()
    package_zip()
    verify_zip_archive()
    verify_media_assets()
    print("ALL GAMEMONETIZE SUBMISSION CHECKS PASSED!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
