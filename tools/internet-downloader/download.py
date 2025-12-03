#!/usr/bin/env python3
"""Interactive YouTube downloader powered by yt-dlp.

Features
--------
- Accepts single or multiple URLs (comma, space, or multi-line input)
- Detects videos, playlists, and channels for smarter folder layouts
- Lets you pick MP4 (1080p cap), MP4 (720p cap), or MP3 (192 kbps)
- Prompts for concurrent workers (1-5) when processing multiple URLs
- Provides progress indicators and end-of-run summaries
- `--list-formats` helper to inspect yt-dlp formats before downloading

Run `python download.py --help` for non-interactive flags.
"""
from __future__ import annotations

import argparse
import concurrent.futures as futures
import shutil
import sys
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, List, Optional

try:
    from colorama import Fore, Style, init as colorama_init
except ImportError:  # pragma: no cover - fallback when colorama missing
    class _Color:
        RESET = ""
        CYAN = ""
        GREEN = ""
        MAGENTA = ""
        RED = ""
        YELLOW = ""

    Fore = Style = type("dummy", (), {"RESET_ALL": "", "BRIGHT": ""})()

    def colorama_init(*_args: object, **_kwargs: object) -> None:
        return
else:
    class _Color:
        RESET = Style.RESET_ALL
        CYAN = Fore.CYAN + Style.BRIGHT
        GREEN = Fore.GREEN + Style.BRIGHT
        MAGENTA = Fore.MAGENTA + Style.BRIGHT
        RED = Fore.RED + Style.BRIGHT
        YELLOW = Fore.YELLOW + Style.BRIGHT

colorama_init()  # type: ignore[call-arg]

from yt_dlp import YoutubeDL  # noqa: E402  (import after optional deps)

DEFAULT_OUTPUT = Path.cwd() / "downloads"
MAX_WORKERS = 5
SUPPORTED_HOSTS = ("youtube.com", "youtu.be")


@dataclass
class JobResult:
    url: str
    kind: str
    status: str
    output: Optional[str] = None
    error: Optional[str] = None


def human_bytes(value: Optional[float]) -> str:
    if not value:
        return "?"
    units = ["B", "KB", "MB", "GB", "TB"]
    idx = 0
    while value >= 1024 and idx < len(units) - 1:
        value /= 1024
        idx += 1
    return f"{value:.1f} {units[idx]}"


def classify_url(url: str) -> str:
    lowered = url.lower()
    if "playlist?list=" in lowered:
        return "playlist"
    if "/@" in lowered or "/channel/" in lowered or "/c/" in lowered or "/user/" in lowered:
        return "channel"
    return "video"


def build_template(kind: str) -> str:
    if kind == "playlist":
        return "%(playlist_title|Playlist)s/%(playlist_index|00)s-%(title)s.%(ext)s"
    if kind == "channel":
        return "%(uploader|Channel)s/%(upload_date|00000000)s-%(title)s.%(ext)s"
    return "%(title)s.%(ext)s"


def resolve_urls(args: argparse.Namespace) -> List[str]:
    if args.urls:
        return clean_urls(args.urls)
    first = input("Enter YouTube URL(s): ").strip()
    if first:
        return clean_urls([first])
    print("\nMulti-line mode activated! Enter one URL per line, blank line to finish.\n")
    collected: List[str] = []
    while True:
        entry = input(f"URL {len(collected)+1}: ").strip()
        if not entry:
            break
        collected.extend(clean_urls([entry]))
    return collected


def clean_urls(seq: Iterable[str]) -> List[str]:
    items: List[str] = []
    for raw in seq:
        tokens = [token.strip() for token in raw.replace("\n", " ").replace(",", " ").split(" ")]
        for token in tokens:
            if token and token.lower().startswith("http"):
                items.append(token)
    unique: List[str] = []
    for url in items:
        if url not in unique:
            unique.append(url)
    return unique


def prompt_output_dir(default: Path) -> Path:
    raw = input(f"Output folder (default: {default}): ").strip()
    path = Path(raw) if raw else default
    path.mkdir(parents=True, exist_ok=True)
    return path


def prompt_format_choice(args: argparse.Namespace) -> str:
    if args.format_choice:
        return args.format_choice
    print("\nChoose format:\n  1. MP4 Video (up to 1080p)\n  2. MP4 Video (up to 720p)\n  3. MP3 Audio only\n")
    while True:
        choice = input("Enter choice (1-3, default=1): ").strip() or "1"
        if choice in {"1", "2", "3"}:
            return {"1": "mp4-1080", "2": "mp4-720", "3": "mp3"}[choice]
        print("Enter 1, 2, or 3.")


def prompt_workers(count: int, args: argparse.Namespace) -> int:
    if count <= 1:
        return 1
    if args.workers:
        return max(1, min(MAX_WORKERS, args.workers))
    while True:
        raw = input("Number of concurrent downloads (1-5, default=3): ").strip()
        if not raw:
            return 3
        if raw.isdigit():
            value = int(raw)
            if 1 <= value <= MAX_WORKERS:
                return value
        print("Pick a number between 1 and 5.")


def ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg"):
        return
    print(_Color.YELLOW + "Warning: FFmpeg not found on PATH. yt-dlp will still run but muxing may fail." + _Color.RESET)


def run_format_listing() -> None:
    url = input("Enter URL to inspect: ").strip()
    if not url:
        print("No URL provided.")
        return
    with YoutubeDL({"quiet": True, "skip_download": True}) as ydl:
        info = ydl.extract_info(url, download=False)
    formats = info.get("formats", [])
    print(f"\nFormats for {info.get('title', 'unknown')}\n{'ID':>6}  {'EXT':<4}  {'RES':<9}  {'FPS':<3}  {'SIZE':>10}")
    print("-" * 40)
    for fmt in formats:
        size = fmt.get("filesize" ) or fmt.get("filesize_approx")
        res = fmt.get("resolution") or f"{fmt.get('height','?')}p"
        print(f"{fmt.get('format_id','?'):>6}  {fmt.get('ext','?'):<4}  {res:<9}  {fmt.get('fps','-'):>3}  {human_bytes(size):>10}")


def build_ydl_options(kind: str, fmt_choice: str, output_dir: Path) -> dict:
    outtmpl = str(output_dir / build_template(kind))
    opts = {
        "outtmpl": outtmpl,
        "ignoreerrors": True,
        "noprogress": True,
        "quiet": True,
        "writesubtitles": False,
        "merge_output_format": "mp4",
    }
    if fmt_choice == "mp3":
        opts["format"] = "bestaudio/best"
        opts["postprocessors"] = [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ]
        opts["postprocessor_args"] = ["-ar", "44100"]
    else:
        cap = 1080 if fmt_choice == "mp4-1080" else 720
        opts["format"] = (
            f"bestvideo[ext=mp4][height<={cap}]+bestaudio[ext=m4a]/"
            f"best[ext=mp4][height<={cap}]/best"
        )
    return opts


def progress_printer(job_label: str) -> Callable[[dict], None]:
    def _hook(data: dict) -> None:
        status = data.get("status")
        if status == "downloading":
            downloaded = human_bytes(data.get("downloaded_bytes"))
            total = human_bytes(data.get("total_bytes") or data.get("total_bytes_estimate"))
            eta = data.get("eta")
            percent = data.get("_percent_str", "").strip() or "?%"
            print(f"[{job_label}] {percent:>5} {downloaded}/{total} ETA {eta if eta else '?'}    ", end="\r", flush=True)
        elif status == "finished":
            print(f"[{job_label}] Download complete, post-processing…        ")
    return _hook


def download_one(job_label: str, url: str, fmt_choice: str, output_dir: Path) -> JobResult:
    kind = classify_url(url)
    opts = build_ydl_options(kind, fmt_choice, output_dir)
    opts["progress_hooks"] = [progress_printer(job_label)]
    try:
        with YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as exc:  # pragma: no cover - network dependent
        return JobResult(url=url, kind=kind, status="failed", error=str(exc))
    return JobResult(url=url, kind=kind, status="success", output=opts["outtmpl"])


def validate_urls(urls: List[str]) -> List[str]:
    valid: List[str] = []
    skipped: List[str] = []
    for url in urls:
        lowered = url.lower()
        if any(host in lowered for host in SUPPORTED_HOSTS):
            valid.append(url)
        else:
            skipped.append(url)
    if skipped:
        print(_Color.YELLOW + "Skipping non-YouTube URLs:" + _Color.RESET)
        for item in skipped:
            print(f"  - {item}")
    return valid


def summarize(results: List[JobResult]) -> None:
    success = [r for r in results if r.status == "success"]
    failed = [r for r in results if r.status != "success"]
    print("\n" + "=" * 50)
    print(_Color.GREEN + f"Success: {len(success)}" + _Color.RESET)
    for item in success:
        print(f"  • {item.kind:8} -> {item.url}")
    if failed:
        print(_Color.RED + f"Failed: {len(failed)}" + _Color.RESET)
        for item in failed:
            print(f"  • {item.url} :: {item.error}")
    else:
        print(_Color.GREEN + "All jobs completed." + _Color.RESET)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Interactive YouTube downloader helper")
    parser.add_argument("urls", nargs="*", help="Optional URLs to skip interactive prompt")
    parser.add_argument("--list-formats", action="store_true", help="Only list formats for a URL")
    parser.add_argument("--output", type=Path, help="Output directory override")
    parser.add_argument("--workers", type=int, help="Concurrent downloads (1-5)")
    parser.add_argument("--format-choice", choices=["mp4-1080", "mp4-720", "mp3"], help="Skip format prompt")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_ffmpeg()
    if args.list_formats:
        run_format_listing()
        return
    urls = resolve_urls(args)
    urls = validate_urls(urls)
    if not urls:
        print("No valid URLs provided. Exiting.")
        return
    fmt_choice = prompt_format_choice(args)
    output_dir = args.output or prompt_output_dir(DEFAULT_OUTPUT)
    workers = prompt_workers(len(urls), args)
    print(f"\nStarting session with {len(urls)} job(s), workers={workers}, format={fmt_choice}.\n")
    job_results: List[JobResult] = []
    with futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {
            executor.submit(download_one, f"Job-{idx+1}", url, fmt_choice, output_dir): url
            for idx, url in enumerate(urls)
        }
        for future in futures.as_completed(future_map):
            result = future.result()
            job_results.append(result)
    summarize(job_results)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        sys.exit(1)
