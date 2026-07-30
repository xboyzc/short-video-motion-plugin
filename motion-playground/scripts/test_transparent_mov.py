#!/usr/bin/env python3

from __future__ import annotations

import shutil
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path

from local_server import encode_transparent_mov


def rgba_png(width: int, height: int, pixel: bytes = b"\x00\x00\x00\x00") -> bytes:
    if len(pixel) != 4:
        raise ValueError("pixel must contain exactly four RGBA bytes")
    signature = b"\x89PNG\r\n\x1a\n"

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    scanlines = b"".join(b"\x00" + pixel * width for _ in range(height))
    return signature + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(scanlines)) + chunk(b"IEND", b"")


def transparent_png(width: int, height: int) -> bytes:
    return rgba_png(width, height)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="motion-mov-test-") as temporary_directory:
        target = Path(temporary_directory)
        for index in range(1, 4):
            (target / f"frame_{index:08d}.png").write_bytes(rgba_png(32, 32, b"\x60\xbf\xff\x08"))

        output = encode_transparent_mov(target, frame_count=3, cleanup_frames=True)
        if not output.is_file() or output.stat().st_size <= 0:
            raise AssertionError("MOV was not created")
        if any(target.glob("frame_*.png")):
            raise AssertionError("intermediate frames were not cleaned")

        ffprobe = shutil.which("ffprobe") or str(Path.home() / ".local/bin/ffprobe")
        completed = subprocess.run(
            [ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt", "-of", "default=nw=1", str(output)],
            capture_output=True,
            text=True,
            check=True,
        )
        if "codec_name=prores" not in completed.stdout or "yuva444" not in completed.stdout:
            raise AssertionError(f"Unexpected MOV stream: {completed.stdout.strip()}")

        ffmpeg = shutil.which("ffmpeg") or str(Path.home() / ".local/bin/ffmpeg")
        decoded = subprocess.run(
            [
                ffmpeg,
                "-v", "error",
                "-i", str(output),
                "-frames:v", "1",
                "-f", "rawvideo",
                "-pix_fmt", "rgba",
                "-",
            ],
            capture_output=True,
            check=True,
        ).stdout
        red, green, blue, alpha = decoded[:4]
        if not (5 <= alpha <= 12 and max(red, green, blue) <= alpha + 3):
            raise AssertionError(
                f"Expected low-alpha cyan RGB to be premultiplied, received {red}/{green}/{blue}/{alpha}"
            )
        print(
            "transparent MOV test passed: "
            f"{completed.stdout.strip().replace(chr(10), ', ')}, "
            f"premultiplied RGBA={red}/{green}/{blue}/{alpha}"
        )


if __name__ == "__main__":
    main()
