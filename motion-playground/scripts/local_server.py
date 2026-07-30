#!/usr/bin/env python3

"""Static server plus narrow APIs for transparent PNG and ProRes 4444 MOV exports."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qs, unquote, urlparse


EXPORT_ID_PATTERN = re.compile(r"^overlay_\d{8}_\d{6}(?:_\d+)?$")
FRAME_ROUTE_PATTERN = re.compile(r"^/api/exports/([^/]+)/frame$")
FINISH_ROUTE_PATTERN = re.compile(r"^/api/exports/([^/]+)/finish$")
MOV_ROUTE_PATTERN = re.compile(r"^/api/exports/([^/]+)/mov$")
MAX_JSON_BYTES = 2 * 1024 * 1024
MAX_PNG_BYTES = 30 * 1024 * 1024
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class MovEncodingError(RuntimeError):
    pass


def find_ffmpeg() -> Path | None:
    discovered = shutil.which("ffmpeg")
    candidates = [
        Path(discovered) if discovered else None,
        Path.home() / ".local/bin/ffmpeg",
        Path("/opt/homebrew/bin/ffmpeg"),
        Path("/usr/local/bin/ffmpeg"),
    ]
    if os.name == "nt":
        windows_roots = {
            "LOCALAPPDATA": os.environ.get("LOCALAPPDATA"),
            "PROGRAMDATA": os.environ.get("PROGRAMDATA"),
            "PROGRAMFILES": os.environ.get("PROGRAMFILES"),
            "USERPROFILE": os.environ.get("USERPROFILE"),
        }
        candidates.extend([
            Path("C:/ffmpeg/bin/ffmpeg.exe"),
            Path(windows_roots["LOCALAPPDATA"]) / "Microsoft/WinGet/Links/ffmpeg.exe"
            if windows_roots["LOCALAPPDATA"] else None,
            Path(windows_roots["PROGRAMDATA"]) / "chocolatey/bin/ffmpeg.exe"
            if windows_roots["PROGRAMDATA"] else None,
            Path(windows_roots["PROGRAMFILES"]) / "ffmpeg/bin/ffmpeg.exe"
            if windows_roots["PROGRAMFILES"] else None,
            Path(windows_roots["USERPROFILE"]) / "scoop/shims/ffmpeg.exe"
            if windows_roots["USERPROFILE"] else None,
        ])
    for candidate in candidates:
        if candidate and candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    return None


def encode_transparent_mov(
    target: Path,
    *,
    frame_count: int,
    fps: int = 25,
    cleanup_frames: bool = False,
) -> Path:
    if frame_count <= 0 or frame_count > 90000:
        raise MovEncodingError("invalid frame count")
    if fps != 25:
        raise MovEncodingError("unsupported frame rate")
    for index in range(1, frame_count + 1):
        if not (target / f"frame_{index:08d}.png").is_file():
            raise MovEncodingError(f"missing frame {index}")

    ffmpeg_path = find_ffmpeg()
    if ffmpeg_path is None:
        raise MovEncodingError("FFmpeg is not installed")

    output_path = target / "transparent_overlay.mov"
    command = [
        str(ffmpeg_path),
        "-hide_banner",
        "-loglevel", "error",
        "-nostdin",
        "-y",
        "-framerate", str(fps),
        "-start_number", "1",
        "-i", str(target / "frame_%08d.png"),
        "-frames:v", str(frame_count),
        "-vf", "format=rgba,premultiply=inplace=1,format=yuva444p10le",
        "-c:v", "prores_ks",
        "-profile:v", "4",
        "-pix_fmt", "yuva444p10le",
        "-alpha_bits", "16",
        "-an",
        str(output_path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode != 0 or not output_path.is_file() or output_path.stat().st_size <= 0:
        detail = completed.stderr.strip()[-1200:] or "unknown FFmpeg error"
        raise MovEncodingError(f"FFmpeg encoding failed: {detail}")

    if cleanup_frames:
        for index in range(1, frame_count + 1):
            (target / f"frame_{index:08d}.png").unlink(missing_ok=True)
    return output_path


class MotionServer(ThreadingHTTPServer):
    def __init__(self, server_address, handler_class, *, exports_dir: Path):
        super().__init__(server_address, handler_class)
        self.exports_dir = exports_dir.resolve()
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.export_lock = Lock()

    def create_export_directory(self) -> tuple[str, Path]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"overlay_{timestamp}"
        with self.export_lock:
            suffix = 0
            while True:
                export_id = base_name if suffix == 0 else f"{base_name}_{suffix}"
                target = self.exports_dir / export_id
                try:
                    target.mkdir(parents=False, exist_ok=False)
                    return export_id, target
                except FileExistsError:
                    suffix += 1

    def resolve_export_directory(self, export_id: str) -> Path | None:
        if not EXPORT_ID_PATTERN.fullmatch(export_id):
            return None
        target = (self.exports_dir / export_id).resolve()
        if target.parent != self.exports_dir or not target.is_dir():
            return None
        return target


class MotionRequestHandler(SimpleHTTPRequestHandler):
    server_version = "MotionPlayground/1.0"

    @property
    def motion_server(self) -> MotionServer:
        return self.server  # type: ignore[return-value]

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self, maximum: int) -> bytes | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid content length"})
            return None
        if length <= 0 or length > maximum:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "request body is empty or too large"})
            return None
        return self.rfile.read(length)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(HTTPStatus.OK, {
                "service": "motion-playground-export-server",
                "exports": str(self.motion_server.exports_dir),
                "transparentMov": find_ffmpeg() is not None,
            })
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/exports/start":
            self.handle_export_start()
            return

        frame_match = FRAME_ROUTE_PATTERN.fullmatch(parsed.path)
        if frame_match:
            self.handle_export_frame(unquote(frame_match.group(1)), parse_qs(parsed.query))
            return

        mov_match = MOV_ROUTE_PATTERN.fullmatch(parsed.path)
        if mov_match:
            self.handle_export_mov(unquote(mov_match.group(1)))
            return

        finish_match = FINISH_ROUTE_PATTERN.fullmatch(parsed.path)
        if finish_match:
            self.handle_export_finish(unquote(finish_match.group(1)))
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "unknown API route"})

    def handle_export_start(self) -> None:
        if self.headers.get_content_type() != "application/json":
            self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "expected application/json"})
            return
        body = self.read_body(MAX_JSON_BYTES)
        if body is None:
            return
        try:
            request = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON"})
            return

        required = {
            "width": 1920,
            "height": 1080,
            "fps": 25,
        }
        if any(request.get(key) != value for key, value in required.items()):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "unsupported export specification"})
            return
        if not isinstance(request.get("overlayJSON"), list) or not request["overlayJSON"]:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "overlayJSON must contain at least one clip"})
            return
        if not isinstance(request.get("totalFrames"), int) or not 0 < request["totalFrames"] <= 90000:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid total frame count"})
            return

        export_id, target = self.motion_server.create_export_directory()
        self.send_json(HTTPStatus.CREATED, {
            "exportId": export_id,
            "path": str(target),
        })

    def handle_export_frame(self, export_id: str, query: dict[str, list[str]]) -> None:
        target = self.motion_server.resolve_export_directory(export_id)
        if target is None:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "export session not found"})
            return
        try:
            index = int(query.get("index", [""])[0])
        except ValueError:
            index = 0
        if index <= 0 or index > 90000:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid frame index"})
            return
        if self.headers.get_content_type() != "image/png":
            self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "expected image/png"})
            return

        body = self.read_body(MAX_PNG_BYTES)
        if body is None:
            return
        if not body.startswith(PNG_SIGNATURE):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid PNG data"})
            return

        frame_path = target / f"frame_{index:08d}.png"
        with tempfile.NamedTemporaryFile(prefix=".frame_", suffix=".tmp", dir=target, delete=False) as temporary:
            temporary.write(body)
            temporary_path = Path(temporary.name)
        os.replace(temporary_path, frame_path)
        self.send_json(HTTPStatus.CREATED, {"frame": index, "name": frame_path.name})

    def handle_export_finish(self, export_id: str) -> None:
        target = self.motion_server.resolve_export_directory(export_id)
        if target is None:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "export session not found"})
            return
        frame_count = sum(1 for _ in target.glob("frame_*.png"))
        self.send_json(HTTPStatus.OK, {
            "exportId": export_id,
            "frameCount": frame_count,
            "path": str(target),
        })

    def handle_export_mov(self, export_id: str) -> None:
        target = self.motion_server.resolve_export_directory(export_id)
        if target is None:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "export session not found"})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"error": "expected application/json"})
            return
        body = self.read_body(MAX_JSON_BYTES)
        if body is None:
            return
        try:
            request = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON"})
            return
        frame_count = request.get("frameCount")
        cleanup_frames = request.get("cleanupFrames", False)
        if not isinstance(frame_count, int) or isinstance(frame_count, bool):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid frame count"})
            return
        if not isinstance(cleanup_frames, bool):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid cleanupFrames value"})
            return
        try:
            with self.motion_server.export_lock:
                output_path = encode_transparent_mov(
                    target,
                    frame_count=frame_count,
                    fps=25,
                    cleanup_frames=cleanup_frames,
                )
        except MovEncodingError as error:
            status = HTTPStatus.SERVICE_UNAVAILABLE if "not installed" in str(error) else HTTPStatus.INTERNAL_SERVER_ERROR
            self.send_json(status, {"error": str(error)})
            return
        self.send_json(HTTPStatus.OK, {
            "exportId": export_id,
            "frameCount": frame_count,
            "path": str(output_path),
            "fileName": output_path.name,
            "size": output_path.stat().st_size,
            "codec": "Apple ProRes 4444",
            "pixelFormat": "yuva444p12le",
        })

    def log_message(self, format_string: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {format_string % args}", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Motion Playground locally")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--directory", required=True)
    parser.add_argument("--exports", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    static_dir = Path(args.directory).resolve()
    if not (static_dir / "index.html").is_file():
        raise SystemExit(f"Missing built application: {static_dir / 'index.html'}")

    def handler(*handler_args, **handler_kwargs):
        return MotionRequestHandler(*handler_args, directory=str(static_dir), **handler_kwargs)

    server = MotionServer((args.host, args.port), handler, exports_dir=Path(args.exports))
    print(f"Motion Playground: http://{args.host}:{args.port}/", flush=True)
    print(f"Transparent exports: {server.exports_dir}", flush=True)
    print(f"Transparent MOV: {'available' if find_ffmpeg() else 'FFmpeg missing'}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
