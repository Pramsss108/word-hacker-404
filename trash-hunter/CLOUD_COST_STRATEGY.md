# ☁️ CLOUD COST STRATEGY: "Infinite Scale, Zero Cost"
**Goal:** Use Firebase for critical security/auth, but offload heavy lifting to free platforms (GitHub).

---

## 1. The "Hybrid Cloud" Architecture

### A. GitHub (The "CDN") - **COST: $0**
We use a public (or private) GitHub Repository as our "Content Delivery Network".
*   **What goes here:**
    *   `latest_version.json`: Tells the app if an update is available.
    *   `blacklist.json`: List of banned license keys (updated hourly).
    *   `models/`: Small AI model configs.
*   **Why:** GitHub has unlimited bandwidth for public repos. We don't pay for reads.
*   **Implementation:** The app fetches `https://raw.githubusercontent.com/Pramsss108/trash-hunter-cloud/main/latest_version.json`.

### B. Firebase (The "Vault") - **COST: Low (Free Tier)**
We use Firebase Firestore/Auth only for **Writes** and **Private Reads**.
*   **What goes here:**
    *   **License Activation:** When a user buys a key, we write `{"key": "XYZ", "hwid": "UUID", "active": true}` to Firestore.
    *   **Fraud Detection:** If the same key is used on 2 IPs in 1 hour, Firebase Cloud Functions flag it.
*   **Optimization:**
    *   **Cache-First:** The app checks the local encrypted license file first. It only hits Firebase once every 3 days to re-validate.
    *   **Result:** 1 user = 10 reads/month (instead of 10,000).

---

## 2. The "Anti-Hacker" Update System
**Goal:** Prevent hackers from blocking our update server.

### A. Domain Fronting (Advanced)
*   Instead of `api.trashhunter.com` (easy to block), we use `raw.githubusercontent.com`.
*   Hackers cannot block GitHub without breaking half the internet.

### B. The "Kill Switch"
*   If a version is cracked, we update `blacklist.json` on GitHub.
*   The next time the cracked app starts, it sees its version is banned and locks itself.

---

## 3. Implementation Plan

### Step 1: Create the "Cloud Repo"
*   Create a new repo `trash-hunter-cloud`.
*   Add `status.json`: `{"min_version": "1.0.0", "message": "All systems operational"}`.

### Step 2: Update Rust Client
*   Add `reqwest` crate to fetch these JSONs.
*   Implement `check_update()` that runs silently in the background.

---

**Verdict:** This strategy allows us to support 100,000+ users on the **Free Tier** of Firebase because 99% of the traffic (updates, blacklists) goes to GitHub.
