#!/usr/bin/env python3

from __future__ import annotations

import hashlib
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = REPOSITORY_ROOT / "motion-playground"
PRIVATE_PARTS = {
    ".git",
    ".local-runtime",
    "node_modules",
    "exports",
    "__pycache__",
}
PRIVATE_SUFFIXES = {
    ".srt",
    ".mp4",
    ".mov",
    ".m4v",
    ".webm",
}
FORBIDDEN_TEXT = (
    "/Users/" + "a001",
    "\\Users\\" + "a001",
    "/var/" + "folders/",
    "Documents/" + "短视频动效软件",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    required = [
        APP_ROOT / "dist/index.html",
        APP_ROOT / "start-windows.cmd",
        APP_ROOT / "stop-windows.cmd",
        APP_ROOT / "scripts/start-local.ps1",
        APP_ROOT / "scripts/start-local.command",
        REPOSITORY_ROOT / "effect-generation/SKILL.md",
        REPOSITORY_ROOT / ".github/workflows/ci.yml",
    ]
    missing = [str(path.relative_to(REPOSITORY_ROOT)) for path in required if not path.is_file()]
    if missing:
        raise AssertionError(f"missing release files: {missing}")

    problems: list[str] = []
    for path in REPOSITORY_ROOT.rglob("*"):
        relative = path.relative_to(REPOSITORY_ROOT)
        if any(part in PRIVATE_PARTS for part in relative.parts):
            continue
        if not path.is_file():
            continue
        if path.suffix.lower() in PRIVATE_SUFFIXES:
            problems.append(f"private media/subtitle file: {relative}")
        if path.stat().st_size > 5 * 1024 * 1024:
            problems.append(f"unexpected file larger than 5 MiB: {relative}")
        if path.suffix.lower() in {
            ".md", ".txt", ".json", ".yaml", ".yml", ".py", ".ts", ".tsx",
            ".mjs", ".js", ".css", ".html", ".cmd", ".ps1", ".command",
        }:
            text = path.read_text(encoding="utf-8", errors="replace")
            for token in FORBIDDEN_TEXT:
                if token in text:
                    problems.append(f"private machine path {token!r}: {relative}")

    root_skill = REPOSITORY_ROOT / "effect-generation/references/effect-catalog.json"
    app_skill = APP_ROOT / "skills/effect-generation/references/effect-catalog.json"
    if sha256(root_skill) != sha256(app_skill):
        problems.append("root and app effect catalogs are not identical")

    if problems:
        raise AssertionError("\n".join(problems))
    print("Public release package checks passed.")


if __name__ == "__main__":
    main()
