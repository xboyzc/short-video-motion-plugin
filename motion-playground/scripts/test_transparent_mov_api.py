#!/usr/bin/env python3

from __future__ import annotations

import json
import shutil
import urllib.request
from pathlib import Path

from test_transparent_mov import transparent_png


BASE_URL = "http://127.0.0.1:4173"


def request_json(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> None:
    exports_root = (Path(__file__).resolve().parents[1] / "exports").resolve()
    target: Path | None = None
    try:
        started = request_json("/api/exports/start", {
            "width": 1920,
            "height": 1080,
            "fps": 25,
            "duration": 0.12,
            "totalFrames": 3,
            "overlayJSON": [{"id": "api-test"}],
        })
        export_id = started["exportId"]
        target = (exports_root / export_id).resolve()
        if target.parent != exports_root or not target.name.startswith("overlay_"):
            raise AssertionError("unsafe API test export path")

        frame = transparent_png(32, 32)
        for index in range(1, 4):
            request = urllib.request.Request(
                f"{BASE_URL}/api/exports/{export_id}/frame?index={index}",
                data=frame,
                headers={"Content-Type": "image/png"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=30):
                pass

        encoded = request_json(f"/api/exports/{export_id}/mov", {"frameCount": 3, "cleanupFrames": True})
        output = Path(encoded["path"])
        if encoded.get("codec") != "Apple ProRes 4444" or not output.is_file():
            raise AssertionError(f"Unexpected MOV API result: {encoded}")
        if any(target.glob("frame_*.png")):
            raise AssertionError("MOV API did not clean intermediate frames")
        print(f"transparent MOV API test passed: {encoded['codec']}, {encoded['pixelFormat']}")
    finally:
        if target and target.parent == exports_root and target.name.startswith("overlay_"):
            shutil.rmtree(target, ignore_errors=True)


if __name__ == "__main__":
    main()
