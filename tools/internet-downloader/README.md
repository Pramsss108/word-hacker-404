# Internet Downloader Toolkit

Local companion utility for downloading YouTube videos, playlists, channels, or audio-only sets. The scripts stay inside this repo so you can run everything from the same checkout without touching the production front-end.

## Requirements

- Python 3.8 or newer (`python --version`)
- FFmpeg installed and available on `PATH`
- Windows PowerShell, macOS Terminal, or any Unix shell
- `pip` network access to fetch dependencies
- Personal permission to download the media you request

## Quick Start

```powershell
cd "D:/A scret project/Word hacker 404/tools/internet-downloader"
python -m venv .venv
.\.venv\Scripts\activate   # PowerShell on Windows
pip install -r requirements.txt
```

macOS/Linux activation:

```bash
source .venv/bin/activate
```

## Usage

### Interactive downloader

```powershell
python download.py
```

Features:

- Accepts single or multiple URLs (comma/space separated or multi-line prompt)
- Detects videos, playlists, and channel feeds with automatic folder layouts
- Lets you choose MP4 (1080p cap), MP4 (720p cap), or MP3 (192 kbps) per session
- When multiple URLs are provided you can choose 1–5 concurrent workers
- Displays per-job progress plus a session summary
- `--list-formats` flag prints the available yt-dlp formats for troubleshooting

### Cleanup helper

If a run is interrupted, remove leftover partial files:

```powershell
python cleanup_downloads.py --path downloads
```

## Output Layout

- Single videos → `downloads/<Title>.mp4`
- Playlists → `downloads/<Playlist Title>/<##>-<Video>.mp4`
- Channels → `downloads/<Channel Name>/<YYYYMMDD>-<Video>.mp4`
- Audio-only mode mirrors the same layout but writes `.mp3` files

## Tips

- Use `python download.py --list-formats` before downloading if you need a specific resolution
- Re-run `pip install -r requirements.txt` whenever the repo updates dependencies
- `cleanup_downloads.py --dry-run` shows what would be deleted without removing files
- Keep FFmpeg updated to avoid muxing errors when YouTube ships new codecs
