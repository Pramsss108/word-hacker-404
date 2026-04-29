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
# These are tuned for quality — broader keywords mean noise; specific TBomb-fork
# patterns mean real endpoint files maintained by SMS-bombing repo authors.
CODE_SEARCH_QUERIES = [
    'filename:api.json otp send',
    'filename:apis.json sms verify',
    'filename:bomber.json otp',
    'path:bomber+filename:json sms',
    # Higher-signal queries — target known SMS-bomber project file conventions
    'filename:api.json language:json otp india',
    'filename:apis.json indian sms',
    'path:tbomb filename:json',
    'TBomb send_otp filename:py',  # python files that import endpoint dicts
]

# Optional: hand-curated raw URLs you trust (kept empty until you verify each).
GITHUB_RAW_SOURCES: list[str] = []

# Telegram RSS — DISABLED. The public RSSHub mirrors for OTP/API channels
# are either rate-limited (403) or the channels themselves don't exist.
# Tier 1 (Code Search) + Tier 3 (crt.sh) yield far higher-quality results.
# If you ever want to re-enable: add real public channel usernames here.
TELEGRAM_RSS_SOURCES: list[str] = []

# Tier 3: crt.sh certificate-transparency mining.
# We pull subdomains for major Indian apps, keep ones whose name suggests
# OTP/auth, and synthesise candidate URLs with the most common API paths.
CRTSH_DOMAINS = [
    "swiggy.com", "zomato.com", "paytm.com", "phonepe.com",
    "bigbasket.com", "meesho.com", "nykaa.com", "myntra.com",
    "makemytrip.com", "ola.com", "1mg.com", "urbancompany.com",
]
CRTSH_KEYWORDS = ("otp", "sms", "auth", "verify", "login", "signup", "identity", "account")
CRTSH_PATHS = ("/api/v1/otp/send", "/api/otp/send", "/v1/otp", "/auth/otp", "/sendotp")

MAX_FILES_PER_QUERY = 15  # cap to stay friendly with rate limits
MAX_CRTSH_HOSTS_PER_DOMAIN = 8  # don't explode the candidate list

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


def discover_via_crtsh() -> list[dict]:
    """Tier 3: query crt.sh CT logs for subdomains, build candidate URLs.

    Pure stdlib. crt.sh sometimes returns malformed JSON or times out — we
    swallow all errors and just return what worked. Caller treats output as
    low-confidence candidates that BLAZE will verify later.
    """
    out: list[dict] = []
    for root in CRTSH_DOMAINS:
        url = f"https://crt.sh/?q=%25.{root}&output=json"
        print(f"[*] crt.sh: {root}")
        try:
            body = fetch(url, timeout=20)
            data = json.loads(body)
        except (HTTPError, URLError, json.JSONDecodeError, TimeoutError) as e:
            print(f"    [!] {e}")
            continue
        seen_hosts: set[str] = set()
        for row in data if isinstance(data, list) else []:
            name = (row.get("name_value") or "").lower()
            for host in name.split("\n"):
                host = host.strip().lstrip("*.")
                if not host or host in seen_hosts or host.startswith("."):
                    continue
                if not host.endswith(root):
                    continue
                if not any(k in host for k in CRTSH_KEYWORDS):
                    continue
                seen_hosts.add(host)
                if len(seen_hosts) >= MAX_CRTSH_HOSTS_PER_DOMAIN:
                    break
            if len(seen_hosts) >= MAX_CRTSH_HOSTS_PER_DOMAIN:
                break
        for host in seen_hosts:
            for path in CRTSH_PATHS:
                full = f"https://{host}{path}"
                out.append({
                    "name": f"{_name_from_url(full)}-CRT",
                    "url": full,
                    "method": "POST",
                    "headers": {"Content-Type": "application/json"},
                    "source": "crtsh",
                })
        time.sleep(1)  # be polite to crt.sh
    print(f"[+] crt.sh produced {len(out)} candidate URLs")
    return out


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

    # Phase 4: crt.sh CT-log subdomain mining (Tier 3)
    for ep in discover_via_crtsh():
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
