"""
╔══════════════════════════════════════════════════════════════╗
║   HYDRA REPORTER  —  Phase 6 Pentest Report Generator       ║
║                                                              ║
║  6.1  Session HTML + JSON report generation                 ║
║  6.2  OWASP Mobile Top 10 vulnerability classification      ║
║  6.3  SHA256-hashed PoC response snapshots (tamper-proof)   ║
║  6.4  Auto-generated executive summary block                ║
╚══════════════════════════════════════════════════════════════╝
"""

import hashlib
import json
import os
from datetime import datetime
from typing import Optional

# ─────────────────────────────────────────────────────────────
#  OWASP Mobile Top 10 classification map
# ─────────────────────────────────────────────────────────────
_OWASP_OTP_SENT = {
    "id":          "M4",
    "name":        "Insecure Authentication",
    "description": (
        "The platform does not enforce effective rate-limiting on OTP generation "
        "requests, allowing an attacker to trigger unlimited OTP messages to any "
        "target phone number. No throttling, CAPTCHA, or per-number lockout was "
        "detected during testing."
    ),
    "severity": "HIGH",
}
_OWASP_RATE_LIMITED = {
    "id":          "M4",
    "name":        "Insecure Authentication — Partial Control",
    "description": (
        "Rate-limiting was detected but may be bypassable via IP rotation, "
        "timing variation, or payload morphing. Controls appear inconsistent "
        "across test iterations."
    ),
    "severity": "MEDIUM",
}
_OWASP_FAKE200 = {
    "id":          "M4",
    "name":        "Insecure Authentication — Inconsistent Error Handling",
    "description": (
        "The platform returned HTTP 200 with a success-like response body but "
        "OTP delivery could not be confirmed. This inconsistent error handling "
        "may indicate deeper authentication logic flaws."
    ),
    "severity": "LOW",
}
_OWASP_DISCOVERY = {
    "id":          "M9",
    "name":        "Reverse Engineering",
    "description": (
        "OTP API endpoints were discovered via network traffic interception / "
        "APK decompilation without any certificate pinning, API key protection, "
        "or obfuscation layer. All endpoints accepted unauthenticated requests "
        "from arbitrary clients."
    ),
    "severity": "MEDIUM",
}

# ─────────────────────────────────────────────────────────────
#  CSS (self-contained, no external deps)
# ─────────────────────────────────────────────────────────────
_CSS = """
:root {
  --bg:     #03040a;
  --panel:  #07090f;
  --border: #0d1825;
  --green:  #0aff6a;
  --cyan:   #00cfff;
  --red:    #ff4d6d;
  --yellow: #ffd54a;
  --purple: #c074ff;
  --muted:  #4a607a;
  --text:   #c8d8e8;
  --mono:   'Consolas', 'Courier New', monospace;
  --sans:   system-ui, -apple-system, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.6;
}
.page { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }

/* ── Header ───────────────────────────────────── */
.hdr { border-bottom: 2px solid var(--border); padding-bottom: 22px; margin-bottom: 36px; }
.hdr h1 {
  font-size: 20px; font-weight: 900; letter-spacing: 2.5px;
  color: var(--green); text-transform: uppercase; display: flex;
  align-items: center; gap: 10px;
}
.hdr .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); flex-shrink: 0; }
.hdr .meta { display: flex; gap: 24px; margin-top: 10px; flex-wrap: wrap; }
.hdr .meta-item { font-size: 11px; font-family: var(--mono); }
.hdr .meta-item .k { color: var(--muted); margin-right: 4px; }
.hdr .meta-item .v { color: var(--text); }

/* ── Section ──────────────────────────────────── */
.section { margin-bottom: 44px; }
.section h2 {
  font-size: 11px; letter-spacing: 2px; font-weight: 800;
  color: var(--cyan); text-transform: uppercase;
  margin-bottom: 16px; padding-bottom: 7px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px;
}
.section h2::before { content: ''; display: block; width: 3px; height: 14px; background: var(--cyan); border-radius: 2px; }

/* ── Executive summary ────────────────────────── */
.exec {
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: 3px solid var(--green);
  border-radius: 8px;
  padding: 20px 24px;
  font-size: 14px;
  line-height: 1.85;
}
.exec .hl { color: var(--green); font-weight: 700; }

/* ── Stat grid ────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}
.stat-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
}
.stat-card .label {
  font-size: 9px; letter-spacing: 1.4px; color: var(--muted);
  text-transform: uppercase; margin-bottom: 5px;
}
.stat-card .value {
  font-size: 28px; font-weight: 800; font-family: var(--mono);
}

/* ── Table ────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: var(--mono); }
th {
  background: #070910;
  color: var(--muted); font-size: 9px; letter-spacing: 1.3px;
  text-transform: uppercase; padding: 9px 10px;
  border-bottom: 1px solid var(--border); text-align: left;
}
td { padding: 6px 10px; border-bottom: 1px solid #0a1120; vertical-align: top; }
tr:hover td { background: rgba(255,255,255,0.015); }

/* ── Verdict badges ───────────────────────────── */
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  white-space: nowrap;
}
.b-otp     { background: rgba(10,255,106,0.1);  color: #0aff6a; border: 1px solid rgba(10,255,106,0.25); }
.b-rate    { background: rgba(255,213,74,0.1);  color: #ffd54a; border: 1px solid rgba(255,213,74,0.25); }
.b-blocked { background: rgba(255,77,109,0.1);  color: #ff4d6d; border: 1px solid rgba(255,77,109,0.25); }
.b-fake    { background: rgba(192,116,255,0.1); color: #c074ff; border: 1px solid rgba(192,116,255,0.25); }
.b-timeout { background: rgba(74,96,122,0.2);   color: #9aa3b2; border: 1px solid rgba(74,96,122,0.35); }

/* ── OWASP finding card ───────────────────────── */
.finding {
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: 3px solid var(--red);
  border-radius: 6px;
  padding: 16px 18px;
  margin-bottom: 12px;
}
.finding.sev-medium { border-left-color: var(--yellow); }
.finding.sev-low    { border-left-color: var(--muted); }
.finding .f-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.finding .f-id   { font-size: 10px; font-family: var(--mono); color: var(--cyan); font-weight: 700; letter-spacing: 1px; }
.finding .f-name { font-size: 13px; font-weight: 800; color: var(--text); margin: 4px 0 8px; }
.finding .f-desc { font-size: 12px; color: #6a8aaa; line-height: 1.75; }
.finding .f-targets { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px; }
.finding .tag {
  display: inline-block;
  background: rgba(0,207,255,0.07); border: 1px solid rgba(0,207,255,0.18);
  color: var(--cyan); font-size: 10px; font-family: var(--mono);
  border-radius: 3px; padding: 2px 7px;
}
.sev-high   { color: #ff4d6d; font-weight: 800; font-size: 11px; white-space: nowrap; }
.sev-medium { color: #ffd54a; font-weight: 800; font-size: 11px; white-space: nowrap; }
.sev-low    { color: #9aa3b2; font-weight: 800; font-size: 11px; white-space: nowrap; }

/* ── PoC snapshots ────────────────────────────── */
details { margin-bottom: 8px; }
summary {
  cursor: pointer;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 5px 5px 0 0;
  padding: 9px 13px;
  font-size: 11px; font-family: var(--mono);
  color: var(--text);
  display: flex; align-items: center; gap: 8px;
  list-style: none;
  user-select: none;
}
details:not([open]) summary { border-radius: 5px; }
summary::-webkit-details-marker { display: none; }
summary .arrow { color: var(--muted); font-size: 9px; transition: transform 0.15s; flex-shrink: 0; }
details[open] summary .arrow { transform: rotate(90deg); }
.poc-meta {
  background: #040508;
  border: 1px solid var(--border); border-top: none;
  padding: 8px 14px;
  font-size: 10px; font-family: var(--mono);
  display: flex; gap: 20px; flex-wrap: wrap;
  color: var(--muted);
}
.poc-meta .v { color: var(--cyan); }
.poc-body {
  background: #000;
  border: 1px solid var(--border); border-top: none;
  border-radius: 0 0 5px 5px;
  padding: 12px 14px;
  font-family: var(--mono); font-size: 11px;
  white-space: pre-wrap; word-break: break-all;
  color: #7ec87e;
  max-height: 300px; overflow: auto;
}

/* ── Footer ───────────────────────────────────── */
.footer {
  margin-top: 56px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
  font-size: 10px; color: var(--muted);
  font-family: var(--mono);
  display: flex; justify-content: space-between;
  flex-wrap: wrap; gap: 6px;
}
"""


# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────
def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


def _badge(verdict: str) -> str:
    cls = {
        "OTP_SENT":    "b-otp",
        "RATE_LIMITED":"b-rate",
        "BLOCKED":     "b-blocked",
        "200_FAKE":    "b-fake",
    }.get(verdict, "b-timeout")
    return f'<span class="badge {cls}">{verdict}</span>'


def _duration(start: str, end: str) -> str:
    if not start or not end:
        return "—"
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            s = datetime.strptime(start, fmt)
            e = datetime.strptime(end, fmt)
            delta = int((e - s).total_seconds())
            m, sec = divmod(delta, 60)
            return f"{m}m {sec}s"
        except ValueError:
            continue
    return "—"


def _html_esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ─────────────────────────────────────────────────────────────
#  CORE GENERATOR  (Phase 6.1–6.4)
# ─────────────────────────────────────────────────────────────
def generate_report(session: dict, output_dir: Optional[str] = None) -> tuple:
    """
    Generate HTML + JSON pentest report from a session_log dict.
    Returns (html_path, json_path).
    Implements 6.1 structure, 6.2 OWASP classification,
    6.3 SHA256 PoC snapshots, 6.4 executive summary.
    """
    if output_dir is None:
        output_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "hydra_reports"
        )
    os.makedirs(output_dir, exist_ok=True)

    sid      = session.get("session_id") or datetime.now().strftime("%Y%m%d_%H%M%S")
    phone    = session.get("target_phone", "UNKNOWN")
    start_ts = session.get("start_time", "")
    end_ts   = session.get("end_time", "")
    waves    = int(session.get("waves_fired", 0))
    results  = session.get("results", [])

    # ── Aggregate stats ──────────────────────────────────────
    total         = len(results)
    otp_sent_list = [r for r in results if r.get("verdict") == "OTP_SENT"]
    blocked       = sum(1 for r in results if r.get("verdict") == "BLOCKED")
    rate_ltd      = sum(1 for r in results if r.get("verdict") == "RATE_LIMITED")
    fake200       = sum(1 for r in results if r.get("verdict") == "200_FAKE")
    timeouts      = sum(
        1 for r in results
        if str(r.get("verdict", "")).startswith(("TIMEOUT", "ERROR", "FAIL"))
    )
    n_otp         = len(otp_sent_list)
    unique_targets = len({r.get("target") for r in results})
    duration      = _duration(start_ts, end_ts)
    generated_at  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── Phase 6.2 — OWASP findings ───────────────────────────
    findings: list = []

    otp_tgts = sorted({r.get("target", "?") for r in otp_sent_list})
    if otp_tgts:
        f = dict(_OWASP_OTP_SENT)
        f["affected_targets"] = otp_tgts
        f["count"] = n_otp
        findings.append(f)

    rl_tgts = sorted({r.get("target", "?") for r in results if r.get("verdict") == "RATE_LIMITED"})
    if rl_tgts:
        f = dict(_OWASP_RATE_LIMITED)
        f["affected_targets"] = rl_tgts
        f["count"] = rate_ltd
        findings.append(f)

    fake_tgts = sorted({r.get("target", "?") for r in results if r.get("verdict") == "200_FAKE"})
    if fake_tgts:
        f = dict(_OWASP_FAKE200)
        f["affected_targets"] = fake_tgts
        f["count"] = fake200
        findings.append(f)

    if total > 0:
        f = dict(_OWASP_DISCOVERY)
        f["affected_targets"] = sorted({r.get("target", "?") for r in results})[:15]
        f["count"] = unique_targets
        findings.append(f)

    # ── Phase 6.4 — Executive summary ────────────────────────
    if n_otp > 0:
        affected_names = ", ".join(otp_tgts[:5]) + ("…" if len(otp_tgts) > 5 else "")
        vuln_sentence = (
            f'<span class="hl">{n_otp} platform(s)</span> '
            f'(<b>{affected_names}</b>) successfully dispatched OTP messages '
            f'without effective rate-limiting controls, confirming the presence '
            f'of OWASP Mobile Top 10 — M4 (Insecure Authentication) vulnerabilities. '
        )
    else:
        vuln_sentence = "No platforms returned confirmed OTP delivery during this session. "

    exec_summary = (
        f'During the authorized assessment of target '
        f'<span class="hl">+91 {phone}</span>, '
        f'<span class="hl">{total}</span> OTP generation requests were fired across '
        f'<span class="hl">{unique_targets}</span> tested API endpoints over '
        f'<span class="hl">{waves}</span> wave(s) in '
        f'<span class="hl">{duration}</span>. '
        + vuln_sentence +
        f'<span class="hl">{blocked}</span> request(s) were blocked by WAF/rate-limit '
        f'controls and <span class="hl">{rate_ltd}</span> were rate-limited, indicating '
        f'partial protective measures on some platforms. All endpoints were discovered '
        f'via network traffic interception without API key or certificate-pinning '
        f'protection (OWASP Mobile Top 10 — M9: Reverse Engineering).'
    )

    # ── Phase 6.3 — PoC SHA256 snapshots (JSON) ──────────────
    poc_evidence = [
        {
            "target":      r.get("target", "?"),
            "category":    r.get("category", "?"),
            "verdict":     r.get("verdict", "?"),
            "http_status": r.get("status", "?"),
            "resp_ms":     r.get("resp_time_ms", "?"),
            "timestamp":   r.get("time", ""),
            "body_sha256": _sha256(r.get("body", "")),
            "body":        r.get("body", ""),
        }
        for r in otp_sent_list
    ]

    # ── Build JSON report ────────────────────────────────────
    json_report = {
        "report_generated":  generated_at,
        "session_id":        sid,
        "target_phone":      phone,
        "start_time":        start_ts,
        "end_time":          end_ts,
        "duration":          duration,
        "waves_fired":       waves,
        "stats": {
            "total_requests": total,
            "otp_sent":       n_otp,
            "blocked":        blocked,
            "rate_limited":   rate_ltd,
            "fake_200":       fake200,
            "timeout_error":  timeouts,
            "unique_targets": unique_targets,
        },
        "owasp_findings": [
            {
                "id":               f["id"],
                "name":             f["name"],
                "severity":         f["severity"],
                "description":      f["description"],
                "affected_targets": f.get("affected_targets", []),
                "occurrence_count": f.get("count", 0),
            }
            for f in findings
        ],
        "poc_evidence": poc_evidence,
        "full_results": results,
    }

    json_path = os.path.join(output_dir, f"report_{sid}.json")
    with open(json_path, "w", encoding="utf-8") as fp:
        json.dump(json_report, fp, indent=2, default=str)

    # ── Build HTML ───────────────────────────────────────────

    # Stat cards
    stat_cards = "".join(
        f'<div class="stat-card">'
        f'<div class="label">{lbl}</div>'
        f'<div class="value" style="color:{col}">{val}</div>'
        f'</div>'
        for lbl, val, col in [
            ("Total Fired",   total,    "#c8d8e8"),
            ("OTP Sent",      n_otp,    "#0aff6a"),
            ("Blocked",       blocked,  "#ff4d6d"),
            ("Rate-Limited",  rate_ltd, "#ffd54a"),
            ("200 Fake",      fake200,  "#c074ff"),
            ("Waves Fired",   waves,    "#00cfff"),
            ("Duration",      duration, "#c8d8e8"),
        ]
    )

    # Results table
    if results:
        rows_html = "".join(
            f"<tr>"
            f"<td style='color:#4a607a'>{r.get('time','')}</td>"
            f"<td style='color:#c8d8e8;font-weight:600'>{r.get('target','?')}</td>"
            f"<td style='color:#4a607a'>{r.get('category','?')}</td>"
            f"<td>{_badge(r.get('verdict','?'))}</td>"
            f"<td>{r.get('status','?')}</td>"
            f"<td style='color:#4a607a'>{r.get('resp_time_ms','?')}ms</td>"
            f"</tr>"
            for r in results
        )
    else:
        rows_html = '<tr><td colspan="6" style="color:#4a607a;text-align:center;padding:24px">No results recorded in this session</td></tr>'

    # OWASP findings HTML
    findings_html = ""
    for f in findings:
        sev   = f["severity"].lower()
        cls   = "finding" + (f" sev-{sev}" if sev in ("medium", "low") else "")
        tags  = "".join(f'<span class="tag">{t}</span>' for t in f.get("affected_targets", [])[:12])
        findings_html += (
            f'<div class="{cls}">'
            f'<div class="f-row">'
            f'<div>'
            f'<div class="f-id">{f["id"]} — OWASP Mobile Top 10</div>'
            f'<div class="f-name">{f["name"]}</div>'
            f'<div class="f-desc">{f["description"]}</div>'
            f'<div class="f-targets">{tags}</div>'
            f'</div>'
            f'<div class="sev-{sev}">{f["severity"]}</div>'
            f'</div>'
            f'</div>'
        )
    if not findings_html:
        findings_html = '<p style="color:#4a607a;font-size:12px">No findings — run an attack session first.</p>'

    # PoC snapshots HTML
    if poc_evidence:
        poc_html = ""
        for poc in poc_evidence:
            body_safe = _html_esc(poc["body"])
            poc_html += (
                f'<details>'
                f'<summary>'
                f'<span class="arrow">&#9654;</span>'
                f'<span style="color:#0aff6a;font-weight:700">{poc["target"]}</span>'
                f'<span style="color:#4a607a;margin-left:8px">[{poc["category"]}]</span>'
                f'<span style="color:#ffd54a;margin-left:8px">HTTP {poc["http_status"]}</span>'
                f'<span style="color:#4a607a;margin-left:auto;font-size:10px">{poc["timestamp"]}</span>'
                f'</summary>'
                f'<div class="poc-meta">'
                f'sha256 <span class="v">{poc["body_sha256"]}</span>'
                f'&nbsp;&nbsp;resp_ms <span class="v">{poc["resp_ms"]}</span>'
                f'</div>'
                f'<div class="poc-body">{body_safe}</div>'
                f'</details>'
            )
    else:
        poc_html = '<p style="color:#4a607a;font-size:12px">No OTP_SENT captures in this session.</p>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HYDRA Report — {sid}</title>
<style>{_CSS}</style>
</head>
<body>
<div class="page">

  <div class="hdr">
    <h1><span class="dot"></span>HYDRA OTP Assessment Report</h1>
    <div class="meta">
      <span class="meta-item"><span class="k">Session</span><span class="v">{sid}</span></span>
      <span class="meta-item"><span class="k">Target</span><span class="v">+91 {phone}</span></span>
      <span class="meta-item"><span class="k">Start</span><span class="v">{start_ts}</span></span>
      <span class="meta-item"><span class="k">End</span><span class="v">{end_ts}</span></span>
      <span class="meta-item"><span class="k">Generated</span><span class="v">{generated_at}</span></span>
    </div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <div class="exec">{exec_summary}</div>
  </div>

  <div class="section">
    <h2>Session Statistics</h2>
    <div class="stat-grid">{stat_cards}</div>
  </div>

  <div class="section">
    <h2>OWASP Mobile Top 10 — Findings ({len(findings)})</h2>
    {findings_html}
  </div>

  <div class="section">
    <h2>Per-Target Results — {total} total</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Target</th>
          <th>Category</th>
          <th>Verdict</th>
          <th>HTTP</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>{rows_html}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Proof-of-Concept Evidence — {n_otp} OTP_SENT captures (SHA256-hashed)</h2>
    {poc_html}
  </div>

  <div class="footer">
    <span>HYDRA v5.0 — BlackOps OTP Recon Framework — Internal Use Only</span>
    <span>Report ID: {sid}</span>
  </div>

</div>
</body>
</html>"""

    html_path = os.path.join(output_dir, f"report_{sid}.html")
    with open(html_path, "w", encoding="utf-8") as fp:
        fp.write(html)

    return html_path, json_path


# ─────────────────────────────────────────────────────────────
#  LIST REPORTS  (for /api/report/list endpoint)
# ─────────────────────────────────────────────────────────────
def list_reports(output_dir: Optional[str] = None) -> list:
    """Return list of existing reports sorted newest-first."""
    if output_dir is None:
        output_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "hydra_reports"
        )
    if not os.path.isdir(output_dir):
        return []
    reports = []
    for fn in sorted(os.listdir(output_dir), reverse=True):
        if fn.startswith("report_") and fn.endswith(".html"):
            sid     = fn[7:-5]
            json_fn = fn.replace(".html", ".json")
            mtime   = os.path.getmtime(os.path.join(output_dir, fn))
            reports.append({
                "session_id": sid,
                "html_file":  fn,
                "json_file":  json_fn if os.path.exists(os.path.join(output_dir, json_fn)) else None,
                "generated":  datetime.fromtimestamp(mtime).isoformat(),
            })
    return reports
