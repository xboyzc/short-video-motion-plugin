#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def require_text(path: Path, *tokens: str) -> str:
    if not path.is_file():
        raise AssertionError(f"missing Windows compatibility file: {path}")
    content = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in content:
            raise AssertionError(f"{path.name} is missing {token!r}")
    return content


def main() -> None:
    start_cmd = require_text(
        PROJECT_ROOT / "start-windows.cmd",
        "%~dp0",
        "start-local.ps1",
        "ExecutionPolicy Bypass",
    )
    stop_cmd = require_text(
        PROJECT_ROOT / "stop-windows.cmd",
        "%~dp0",
        "stop-local.ps1",
        "ExecutionPolicy Bypass",
    )
    start_ps1 = require_text(
        PROJECT_ROOT / "scripts/start-local.ps1",
        "4173..4183",
        "py.exe",
        "python.exe",
        "Start-Process $serverUrl",
        "[switch]$NoBrowser",
        "motion-playground-export-server",
    )
    stop_ps1 = require_text(
        PROJECT_ROOT / "scripts/stop-local.ps1",
        "Get-CimInstance Win32_Process",
        "local_server.py",
        "Stop-Process",
    )
    server = require_text(
        PROJECT_ROOT / "scripts/local_server.py",
        "os.name == \"nt\"",
        "WinGet/Links/ffmpeg.exe",
        "chocolatey/bin/ffmpeg.exe",
        "scoop/shims/ffmpeg.exe",
    )

    public_runtime_files = "\n".join((start_cmd, stop_cmd, start_ps1, stop_ps1, server))
    for forbidden in (
        "/Users/" + "a001",
        "\\Users\\" + "a001",
        "Documents/" + "短视频动效软件",
    ):
        if forbidden in public_runtime_files:
            raise AssertionError(f"public runtime contains a private machine path: {forbidden}")

    server_path = PROJECT_ROOT / "scripts/local_server.py"
    compile(server_path.read_text(encoding="utf-8"), str(server_path), "exec")
    print("Windows compatibility package checks passed.")


if __name__ == "__main__":
    main()
