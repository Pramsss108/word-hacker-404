"""
Minimal Telegram bot for YouTube downloads.

Requirements:
- python-telegram-bot>=21.0
- yt-dlp
- python-dotenv

Setup:
1. Create bot via @BotFather, get token.
2. Add token to .env: BOT_TOKEN=your_token
3. python bot.py

User flow:
- Send YouTube URL → bot extracts video info
- Choose MP4 (1080/720) or MP3
- Bot downloads via yt-dlp and sends file back
"""
import asyncio
import logging
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

try:
    import yt_dlp
except ImportError:
    raise RuntimeError("Install yt-dlp: pip install yt-dlp")

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN not found in .env")

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "48"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Send a YouTube link and I'll fetch it for you.\n"
        "Supports videos (1080p/720p MP4) and audio (MP3)."
    )


async def handle_url(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    url = update.message.text.strip()
    if not ("youtube.com" in url.lower() or "youtu.be" in url.lower()):
        await update.message.reply_text("Please send a valid YouTube URL.")
        return

    keyboard = [
        [
            InlineKeyboardButton("MP4 1080p", callback_data=f"mp4-1080|{url}"),
            InlineKeyboardButton("MP4 720p", callback_data=f"mp4-720|{url}"),
        ],
        [InlineKeyboardButton("MP3 Audio", callback_data=f"mp3|{url}")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Choose format:", reply_markup=reply_markup)


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    data = query.data
    fmt_choice, url = data.split("|", 1)

    msg = await query.message.reply_text(f"Downloading {fmt_choice}…")

    try:
        file_path = await download_video(url, fmt_choice)
        file_size = Path(file_path).stat().st_size
        if file_size > MAX_UPLOAD_BYTES:
            await msg.edit_text(
                f"File too large ({file_size // (1024 * 1024)} MB). "
                f"Max allowed: {MAX_UPLOAD_MB} MB."
            )
            Path(file_path).unlink(missing_ok=True)
            return

        await msg.edit_text("Uploading…")
        if fmt_choice == "mp3":
            await query.message.reply_audio(audio=open(file_path, "rb"))
        else:
            await query.message.reply_video(video=open(file_path, "rb"))
        await msg.delete()
        Path(file_path).unlink(missing_ok=True)

    except Exception as exc:
        logger.error(f"Download failed: {exc}")
        await msg.edit_text(f"Download failed: {exc}")


async def download_video(url: str, fmt_choice: str) -> str:
    """Downloads video/audio via yt-dlp and returns local file path."""
    tmp_dir = Path(tempfile.gettempdir()) / "wordhacker_bot"
    tmp_dir.mkdir(exist_ok=True)

    ydl_opts = {
        "outtmpl": str(tmp_dir / "%(title)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
    }

    if fmt_choice == "mp3":
        ydl_opts["format"] = "bestaudio/best"
        ydl_opts["postprocessors"] = [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ]
    elif fmt_choice == "mp4-1080":
        ydl_opts["format"] = (
            "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/"
            "best[ext=mp4][height<=1080]/best"
        )
        ydl_opts["merge_output_format"] = "mp4"
    elif fmt_choice == "mp4-720":
        ydl_opts["format"] = (
            "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/"
            "best[ext=mp4][height<=720]/best"
        )
        ydl_opts["merge_output_format"] = "mp4"

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        # If audio extraction occurred, filename might have changed extension
        if fmt_choice == "mp3":
            filename = Path(filename).with_suffix(".mp3")
        return str(filename)


def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_url))
    app.add_handler(CallbackQueryHandler(handle_callback))

    logger.info("Bot started. Press Ctrl+C to stop.")
    app.run_polling()


if __name__ == "__main__":
    main()
