#!/usr/bin/env python3
"""Remove incomplete yt-dlp artifacts (.part, .ytdl, .temp) from a downloads folder."""
from __future__ import annotations

import argparse
from pathlib import Path

TRASH_SUFFIXES = {".part", ".ytdl", ".temp", ".aria2"}


def iter_trash(root: Path):
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in TRASH_SUFFIXES:
            yield path


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean up incomplete downloads produced by yt-dlp")
    parser.add_argument("--path", type=Path, default=Path.cwd() / "downloads", help="Folder to scan")
    parser.add_argument("--dry-run", action="store_true", help="List files without deleting")
    args = parser.parse_args()

    folder = args.path
    if not folder.exists():
        print(f"Folder {folder} does not exist; nothing to clean.")
        return

    trash = list(iter_trash(folder))
    if not trash:
        print("No partial files found.")
        return

    for path in trash:
        if args.dry_run:
            print(f"Would delete: {path}")
        else:
            path.unlink(missing_ok=True)
            print(f"Deleted: {path}")

    verb = "would remove" if args.dry_run else "removed"
    print(f"\n{verb.title()} {len(trash)} file(s).")


if __name__ == "__main__":
    main()
