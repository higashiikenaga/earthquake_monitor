#!/usr/bin/env python3
"""
OBS capture helper for earthquake alert sounds.

Run this app locally, then enable "OBS向け専用音声アプリを使う" in index.html.
The browser sends alert tone patterns to http://127.0.0.1:18765/play, and this
process plays only those tones. OBS can capture this process instead of the
browser, avoiding unrelated YouTube/browser audio.
"""

from __future__ import annotations

import argparse
import json
import queue
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import winsound
except ImportError:  # pragma: no cover - Windows is the intended target.
    winsound = None


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 18765
MAX_PATTERN_LENGTH = 16
TONE_MS = 145
GAP_MS = 35


def clamp_frequency(value: object) -> int | None:
    try:
        freq = int(float(value))
    except (TypeError, ValueError):
        return None
    if 120 <= freq <= 2400:
        return freq
    return None


def sanitize_pattern(pattern: object) -> list[int]:
    if not isinstance(pattern, list):
        return []
    result: list[int] = []
    for value in pattern[:MAX_PATTERN_LENGTH]:
        freq = clamp_frequency(value)
        if freq is not None:
            result.append(freq)
    return result


def fallback_pattern(event: dict) -> list[int]:
    kind = event.get("kind")
    if kind == "eew":
        level = event.get("eewLevel")
        if level == "warning":
            return [1040, 1040, 1040, 740, 740, 740]
        if level == "forecast":
            return [880, 1040, 880, 1040]
        return [760, 760, 620]
    if kind == "tsunami":
        return [520, 740, 920, 920, 740, 520]
    if isinstance(event.get("raw"), dict) and event["raw"].get("kmoniDetection"):
        return [700, 900, 1100]
    return [660, 520]


def play_pattern(pattern: list[int]) -> None:
    if not pattern:
        return
    for freq in pattern:
        if winsound is not None:
            winsound.Beep(freq, TONE_MS)
        else:
            print(f"[tone] {freq}Hz")
            time.sleep(TONE_MS / 1000)
        time.sleep(GAP_MS / 1000)


class SoundWorker(threading.Thread):
    def __init__(self) -> None:
        super().__init__(daemon=True)
        self.events: queue.Queue[list[int]] = queue.Queue()

    def enqueue(self, pattern: list[int]) -> None:
        self.events.put(pattern)

    def run(self) -> None:
        while True:
            pattern = self.events.get()
            try:
                play_pattern(pattern)
            finally:
                self.events.task_done()


class AlertSoundHandler(BaseHTTPRequestHandler):
    worker: SoundWorker

    def log_message(self, fmt: str, *args: object) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_json(204, {})

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(200, {"ok": True, "app": "earthquake-alert-sound"})
        else:
            self.send_json(404, {"ok": False, "error": "not found"})

    def do_POST(self) -> None:
        if self.path != "/play":
            self.send_json(404, {"ok": False, "error": "not found"})
            return

        length = min(int(self.headers.get("Content-Length", "0") or 0), 8192)
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_json(400, {"ok": False, "error": "invalid json"})
            return

        event = payload.get("event") if isinstance(payload.get("event"), dict) else {}
        pattern = sanitize_pattern(payload.get("pattern")) or fallback_pattern(event)
        self.worker.enqueue(pattern)
        self.send_json(200, {"ok": True, "queued": len(pattern)})


def main() -> None:
    parser = argparse.ArgumentParser(description="Earthquake alert sound app for OBS capture.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    worker = SoundWorker()
    worker.start()
    AlertSoundHandler.worker = worker
    server = ThreadingHTTPServer((args.host, args.port), AlertSoundHandler)
    print(f"Earthquake alert sound app listening on http://{args.host}:{args.port}")
    print("OBSではこの Python プロセスの音声だけをアプリケーション音声キャプチャしてください。")
    server.serve_forever()


if __name__ == "__main__":
    main()
