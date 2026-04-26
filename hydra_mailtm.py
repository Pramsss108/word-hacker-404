"""
╔══════════════════════════════════════════════════════════════╗
║      HYDRA EMAIL OTP VECTOR  —  Phase 4.2                   ║
║                                                              ║
║  Uses mail.tm (free, no signup) to generate a temp email    ║
║  address and poll for incoming OTP messages. Useful for     ║
║  platforms that send OTP to BOTH phone + email.             ║
║                                                              ║
║  API Docs: https://docs.mail.tm                             ║
║  Base URL: https://api.mail.tm                              ║
╚══════════════════════════════════════════════════════════════╝
"""

import json
import re
import secrets
import string
import time

try:
    import requests as _req
except ImportError:
    _req = None

MAILTM_BASE = "https://api.mail.tm"
_TIMEOUT    = 10

# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────

def _rand_string(n: int = 12) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(n))


def _get_domain() -> str:
    """Fetch the first available @mail.tm domain."""
    if _req is None:
        raise RuntimeError("requests not installed")
    r = _req.get(f"{MAILTM_BASE}/domains", timeout=_TIMEOUT)
    r.raise_for_status()
    domains = r.json().get("hydra:member", [])
    if not domains:
        raise RuntimeError("No mail.tm domains available")
    return domains[0]["domain"]


# ─────────────────────────────────────────────────────────────
#  TempMailBox
# ─────────────────────────────────────────────────────────────

class TempMailBox:
    """
    Create a temporary mailbox at mail.tm and poll for OTP emails.

    Usage:
        mb = TempMailBox.create()
        print(mb.address)
        otp = mb.wait_for_otp(timeout=120)
    """

    def __init__(self, address: str, password: str, token: str):
        self.address  = address
        self.password = password
        self._token   = token
        self._headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def create(cls, prefix: str | None = None) -> "TempMailBox":
        """Create a fresh temp mailbox. Returns TempMailBox instance."""
        if _req is None:
            raise RuntimeError("requests not installed")
        domain   = _get_domain()
        name     = prefix or _rand_string(10)
        address  = f"{name}@{domain}"
        password = _rand_string(16)

        # Register account
        r = _req.post(f"{MAILTM_BASE}/accounts",
                      json={"address": address, "password": password},
                      timeout=_TIMEOUT)
        r.raise_for_status()

        # Get auth token
        r2 = _req.post(f"{MAILTM_BASE}/token",
                       json={"address": address, "password": password},
                       timeout=_TIMEOUT)
        r2.raise_for_status()
        token = r2.json()["token"]

        return cls(address=address, password=password, token=token)

    def get_messages(self) -> list:
        """Fetch all inbox messages."""
        if _req is None:
            return []
        try:
            r = _req.get(f"{MAILTM_BASE}/messages", headers=self._headers, timeout=_TIMEOUT)
            r.raise_for_status()
            return r.json().get("hydra:member", [])
        except Exception:
            return []

    def get_message_body(self, msg_id: str) -> str:
        """Fetch full text of a message by id."""
        if _req is None:
            return ""
        try:
            r = _req.get(f"{MAILTM_BASE}/messages/{msg_id}", headers=self._headers, timeout=_TIMEOUT)
            r.raise_for_status()
            data = r.json()
            return data.get("text", "") or data.get("html", "")
        except Exception:
            return ""

    def extract_otp(self, text: str) -> str | None:
        """
        Extract first OTP-like token from email body.
        Looks for 4–8 consecutive digits near OTP keyword.
        """
        # Strategy 1: keyword-adjacent digits
        patterns = [
            r"(?:otp|code|verify|verification|pin)[^\d]{0,20}(\d{4,8})",
            r"(\d{4,8})(?:[^\d]{0,20}(?:otp|code|verify|verification|pin))",
            r"\b(\d{6})\b",  # standalone 6-digit
            r"\b(\d{4})\b",  # standalone 4-digit
        ]
        low = text.lower()
        for pat in patterns:
            m = re.search(pat, low)
            if m:
                return m.group(1)
        return None

    def wait_for_otp(self, timeout: int = 120, poll_interval: int = 4) -> str | None:
        """
        Poll inbox until an OTP email arrives or timeout.
        Returns OTP string or None.
        """
        seen_ids: set = set()
        deadline = time.time() + timeout
        while time.time() < deadline:
            msgs = self.get_messages()
            for msg in msgs:
                mid = msg.get("id", "")
                if mid in seen_ids:
                    continue
                seen_ids.add(mid)
                body = self.get_message_body(mid)
                otp  = self.extract_otp(body)
                if otp:
                    return otp
            time.sleep(poll_interval)
        return None

    def delete(self):
        """Delete the mailbox account."""
        if _req is None:
            return
        try:
            _req.delete(f"{MAILTM_BASE}/me", headers=self._headers, timeout=_TIMEOUT)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────
#  STANDALONE TEST
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Creating temp mailbox...")
    mb = TempMailBox.create()
    print(f"Address: {mb.address}")
    print(f"Waiting up to 60s for OTP email...")
    otp = mb.wait_for_otp(timeout=60)
    if otp:
        print(f"OTP captured: {otp}")
    else:
        print("No OTP received within timeout.")
    mb.delete()
    print("Mailbox deleted.")
