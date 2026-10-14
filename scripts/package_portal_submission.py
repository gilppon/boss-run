"""Package the current production build into the two canonical portal archives."""

from __future__ import annotations

import hashlib
import shutil
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ARCHIVE = ROOT / "boss-reverse-runner-submission-2026-10-13-boss-wave.zip"
ALIAS = ROOT / "boss-reverse-runner.zip"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    if not DIST.is_dir() or not (DIST / "index.html").is_file():
        raise SystemExit("Missing dist/index.html; run the production build first")

    files = sorted(path for path in DIST.rglob("*") if path.is_file())
    if not files:
        raise SystemExit("No production files found in dist/")

    archive_tmp = ARCHIVE.with_name(f"{ARCHIVE.stem}.tmp{ARCHIVE.suffix}")
    alias_tmp = ALIAS.with_name(f"{ALIAS.stem}.tmp{ALIAS.suffix}")
    for target in (ARCHIVE, ALIAS, archive_tmp, alias_tmp):
        if target.parent.resolve() != ROOT.resolve():
            raise SystemExit(f"Refusing to write outside the repository root: {target}")

    try:
        with zipfile.ZipFile(archive_tmp, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in files:
                archive.write(path, path.relative_to(DIST).as_posix())
        shutil.copyfile(archive_tmp, alias_tmp)
        if sha256(archive_tmp) != sha256(alias_tmp):
            raise SystemExit("The generic alias copy did not match the dated archive")

        archive_tmp.replace(ARCHIVE)
        alias_tmp.replace(ALIAS)
    finally:
        for temporary in (archive_tmp, alias_tmp):
            if temporary.exists() and temporary.parent.resolve() == ROOT.resolve():
                temporary.unlink()

    expanded_bytes = sum(path.stat().st_size for path in files)
    print(f"Packaged {len(files)} files; {expanded_bytes:,} expanded bytes")
    print(f"{ARCHIVE.name}: {ARCHIVE.stat().st_size:,} bytes, SHA-256 {sha256(ARCHIVE)}")
    print(f"{ALIAS.name}: identical SHA-256")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
