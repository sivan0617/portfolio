#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "scripts" / "bilibili_upload_manifest.json"
DEFAULT_STAGE_DIR = Path.home() / "Downloads" / "sivan-bili-stage"


def safe_slug(text: str, fallback: str = "item") -> str:
    chars = []
    for ch in text:
        if ch.isascii() and (ch.isalnum() or ch in "-_"):
            chars.append(ch.lower())
        elif ch in {" ", "/", "(", ")"}:
            chars.append("-")
    slug = "".join(chars).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug[:24] or fallback


def load_manifest(path: Path) -> list[dict]:
    data = json.loads(path.read_text())
    # Full manifest format.
    if isinstance(data.get("items"), list):
        return data["items"]

    if isinstance(data.get("videos"), list):
        return data["videos"]

    # Batch-oriented format.
    videos: list[dict] = []
    sections = [data.get("pilot"), *(data.get("after_pilot", {}).get("oversized_first", []))]
    for item in sections:
        if item:
            videos.append(item)
    for lane in data.get("after_pilot", {}).get("parallel_regular_lanes", []):
        videos.extend(lane.get("videos", []))
    return videos


def link_or_copy(src: Path, dest: Path) -> str:
    try:
        os.link(src, dest)
        return "hardlink"
    except OSError:
        shutil.copy2(src, dest)
        return "copy"


def prepare_stage(
    manifest_path: Path,
    stage_dir: Path,
    exclude: set[str],
    limit: int | None,
) -> tuple[list[str], list[str]]:
    stage_dir.mkdir(parents=True, exist_ok=True)
    for child in stage_dir.iterdir():
        if child.is_file() or child.is_symlink():
            child.unlink()

    rows = []
    created = []
    for index, video in enumerate(load_manifest(manifest_path), start=1):
        local_path = video["local_path"]
        if local_path in exclude:
            continue
        src = ROOT / local_path
        if not src.exists():
            rows.append(f"MISSING\t{local_path}")
            continue
        ext = src.suffix.lower()
        slug = safe_slug(video["project_slug"], "video")
        name = f"sivan-{index:03d}-{slug}{ext}"
        dest = stage_dir / name
        mode = link_or_copy(src, dest)
        created.append(str(dest))
        rows.append(
            "\t".join(
                [
                    str(index),
                    name,
                    mode,
                    video["project_slug"],
                    video["title"],
                    local_path,
                ]
            )
        )
        if limit is not None and len(created) >= limit:
            break

    (stage_dir / "_mapping.tsv").write_text(
        "index\tstage_name\tmode\tproject_slug\ttitle\tlocal_path\n"
        + "\n".join(rows)
        + "\n"
    )
    return created, rows


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create real-file Bilibili upload staging files from the current manifest."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="Path to bilibili_upload_manifest.json",
    )
    parser.add_argument(
        "--stage-dir",
        type=Path,
        default=DEFAULT_STAGE_DIR,
        help="Destination directory for staged upload files",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Manifest local_path entries to skip; can be repeated.",
    )
    parser.add_argument(
        "--exclude-file",
        type=Path,
        help="Text file of manifest local_path entries to skip, one per line.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Only prepare the first N remaining videos.",
    )
    args = parser.parse_args()

    exclude = set(args.exclude)
    if args.exclude_file and args.exclude_file.exists():
        exclude.update(
            line.strip()
            for line in args.exclude_file.read_text().splitlines()
            if line.strip()
        )

    created, rows = prepare_stage(args.manifest, args.stage_dir, exclude, args.limit)
    print(f"stage_dir={args.stage_dir}")
    print(f"created={len(created)}")
    print(f"mapping={args.stage_dir / '_mapping.tsv'}")
    if rows:
        print("preview:")
        for row in rows[:8]:
            print(row)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
