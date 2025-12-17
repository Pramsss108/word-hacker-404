# 🧠 The Central AI Brain (Free & Unlimited)

**Status:** ONLINE 🟢  
**Model:** OpenAI GPT-OSS-120B (Served via Groq LPU)  
**Cost:** $0.00 (Forever)

This project is now powered by a **Centralized AI Gateway**. We do not rely on user hardware. We run on a serverless cloud architecture.

---

## ⚡ Power & Capabilities
We have access to one of the world's most powerful open-source models.
*   **Intelligence:** 120 Billion Parameters (Comparable to GPT-4)
*   **Speed:** 500+ Tokens/second (Instant)
*   **Tasks:**
    *   Coding & Scripting
    *   Hacking/Security Analysis
    *   Translation (Polyglot)
    *   Creative Writing

## 🔐 Access Levels

### 1. Developer (God Mode)
*   **Access:** Unlimited, Unrestricted.
*   **Method:** Uses the `VITE_AI_ACCESS_SECRET` in `.env`.
*   **Cost:** Free.

### 2. Public Users (Planned)
*   **Access:** Limited (10 Chats / Day).
*   **Method:** Must log in via Google/Firebase.
*   **Refill:** Must watch an Ad to get more credits.

---

## 🛠️ Architecture
1.  **Client:** React App (Sends requests)
2.  **Gateway:** Cloudflare Worker (Protects the API Key)
3.  **Brain:** Groq API (Runs the Model)

*See `scripts/deploy-brain.ps1` to redeploy the brain if needed.*
