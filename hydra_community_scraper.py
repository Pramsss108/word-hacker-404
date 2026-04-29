"""
Hydra Community Scraper - REAL self-discovering version.

Strategy (no hardcoded dead URLs):
  1. Use GitHub Code Search API to find ACTIVE repos with apis.json-style files
     containing OTP/SMS URLs. Auto-discovers fresh sources as old ones get DMCA'd.
  2. Optionally pull RSS-bridged Telegram public channels.
  3. Dedupe by URL, write community_drops.json.

Auth: GitHub Code Search REQUIRES a token. In GitHub Actions, GITHUB_TOKEN is
auto-injected. Locally, set env var GITHUB_TOKEN (a free PAT with read-only
public_repo scope works fine).
"""
import json
import os
import re
import sys
import time
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()

# Code-search queries: hunt for files that look like API/OTP endpoint lists.
# Each query returns up to 30 files; we then fetch the raw content of each.
CODE_SEARCH_QUERIES = [
    'filename:api.json otp send',
    'filename:apis.json sms verify',
    'filename:bomber.json otp',
    'path:bomber+filename:json sms',
]

# Optional: hand-curated raw URLs you trust (kept empty until you verify each).
GITHUB_RAW_SOURCES: list[str] = []

# Optional Telegram public channels via RSSHub (read-only, no Telegram login).
TELEGRAM_RSS_SOURCES: list[str] = [
    # "https://rsshub.app/telegram/channel/<channel_username>",
]

MAX_FILES_PER_QUERY = 15  # cap to stay friendly with rate limits

URL_REGEX = re.compile(
    r"https?://[a-zA-Z0-9.\-_/?=&%]+(?:otp|sms|send|verify|login|signup|auth)[a-zA-Z0-9.\-_/?=&%]*",
    re.IGNORECASE,
)

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; HydraCommunityBot/1.0)",
    "Accept": "application/json, text/plain, */*",
}


def fetch(url: str, timeout: int = 15, auth: bool = False) -> str:
    headers = dict(DEFAULT_HEADERS)
    if auth and GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
        headers["Accept"] = "application/vnd.github+json"
    req = Request(url, headers=headers)
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def discover_via_code_search() -> list[str]:
    """Use GitHub Code Search to find raw URLs of candidate apis.json files."""
    if not GITHUB_TOKEN:
        print("[!] No GITHUB_TOKEN set - skipping code search (set env var to enable).")
        return []
    raw_urls: list[str] = []
    for q in CODE_SEARCH_QUERIES:
        url = f"https://api.github.com/search/code?q={quote(q)}&per_page={MAX_FILES_PER_QUERY}"
        print(f"[*] Code search: {q}")
        try:
            body = fetch(url, auth=True)
            data = json.loads(body)
        except (HTTPError, URLError, json.JSONDecodeError) as e:
            print(f"    [!] {e}")
            continue
        for item in data.get("items", []):
            repo = item.get("repository", {}).get("full_name")
            path = item.get("path")
            # Default branch lookup is expensive; assume main/master.
            if not repo or not path:
                continue
            for branch in ("main", "master"):
                raw_urls.append(f"https://raw.githubusercontent.com/{repo}/{branch}/{path}")
        time.sleep(2)  # respect search rate limits (30/min authenticated)
    print(f"[+] Discovered {len(raw_urls)} candidate raw URLs from code search")
    return raw_urls


def parse_tbomb_json(payload: str) -> list[dict]:
    """TBomb apis.json format: list of {url, method, headers, data, ...}."""
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = data.get("apis") or data.get("targets") or list(data.values())
    else:
        return []
    out = []
    for it in items:
        if not isinstance(it, dict):
            continue
        url = it.get("url")
        if not url or not isinstance(url, str) or not url.startswith("http"):
            continue
        out.append({
            "name": it.get("name") or it.get("identifier") or _name_from_url(url),
            "url": url,
            "method": (it.get("method") or "POST").upper(),
            "headers": it.get("headers") or {},
            "source": "github:tbomb-fork",
        })
    return out


def parse_rss_for_urls(payload: str) -> list[dict]:
    urls = set(URL_REGEX.findall(payload))
    return [
        {
            "name": _name_from_url(u),
            "url": u,
            "method": "POST",
            "headers": {},
            "source": "telegram:rss",
        }
        for u in urls
    ]


def _name_from_url(url: str) -> str:
    try:
        host = url.split("//", 1)[1].split("/", 1)[0]
        return host.replace("www.", "").split(".")[0].title()
    except Exception:
        return "Unknown"


def main() -> int:
    all_endpoints: dict[str, dict] = {}

    # Phase 1: Auto-discover repos via GitHub Code Search
    discovered_raw_urls = discover_via_code_search()

    # Phase 2: Fetch raw content from both discovered + curated URLs
    for src in discovered_raw_urls + GITHUB_RAW_SOURCES:
        try:
            body = fetch(src)
        except (HTTPError, URLError):
            continue  # quietly skip 404s (one of main/master will fail)
        # Try strict JSON parse first; if it fails, fall back to URL regex.
        parsed = parse_tbomb_json(body) or parse_rss_for_urls(body)
        added_here = 0
        for ep in parsed:
            if ep["url"] not in all_endpoints:
                all_endpoints[ep["url"]] = ep
                added_here += 1
        if added_here:
            print(f"  [+] {src.split('/')[-3]}/{src.split('/')[-1]}: +{added_here}")

    # Phase 3: Telegram RSS bridges
    for src in TELEGRAM_RSS_SOURCES:
        print(f"[*] Telegram-RSS: {src}")
        try:
            body = fetch(src)
        except (HTTPError, URLError) as e:
            print(f"    [!] {e}")
            continue
        for ep in parse_rss_for_urls(body):
            all_endpoints.setdefault(ep["url"], ep)

    endpoints = list(all_endpoints.values())
    payload = {
        "generated_by": "hydra_community_scraper",
        "count": len(endpoints),
        "new_endpoints": endpoints,
    }
    with open("community_drops.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Saved {len(endpoints)} unique endpoints to community_drops.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
