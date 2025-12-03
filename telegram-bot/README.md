# Telegram Bot for YouTube Downloads

Minimal Python bot that receives YouTube links, offers MP4/MP3 choices, and sends back the downloaded file.

## Setup

1. **Create bot**  
   Open Telegram, message [@BotFather](https://t.me/botfather), run `/newbot`, and note the token.

2. **Configure**  
   Copy `.env.example` to `.env` and paste your token:
   ```ini
   BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   MAX_UPLOAD_MB=48
   ```

3. **Install dependencies**  
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

4. **Run**  
   ```bash
   python bot.py
   ```
   The bot stays online while this script runs. Kill it with Ctrl+C when done testing.

## Deploy (24/7)

- **Local machine**: Keep `python bot.py` running in a terminal or use `nohup python bot.py &` on Linux.
- **VPS/Cloud**: Deploy on Render, Fly.io, or a DigitalOcean droplet. Install Python + requirements, run the script via systemd or PM2.
- **Render example**: Create a new Web Service, set build command `pip install -r telegram-bot/requirements.txt`, start command `cd telegram-bot && python bot.py`, add environment variable `BOT_TOKEN`.

## Usage

1. Start a chat with your bot.
2. Send a YouTube link.
3. Pick MP4 (1080p/720p) or MP3.
4. Bot downloads and sends the file back (up to 48 MB by default).

## Notes

- Requires FFmpeg on PATH for audio extraction (MP3).
- Large videos may exceed Telegram's file size limit; reduce resolution or use external hosting for bigger files.
