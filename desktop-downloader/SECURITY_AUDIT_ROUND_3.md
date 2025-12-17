# 👽 Security Audit Round 3: The "Alien / Year 5000" Attack

## 🌌 Hacker Persona: "The Singularity"
> "Your physics are cute. You check files (Matter) and PIDs (Identity). But I exist in the spaces between. I don't attack your walls; I change the definition of 'Wall'."

## 🚨 Theoretical "Unfixable" Vulnerabilities

### 1. Static Analysis & String Extraction (The "X-Ray" Attack)
*   **Severity:** **EXTREME**
*   **The Attack:**
    *   I don't run your app. I just open your binary in a Hex Editor or Disassembler (IDA Pro / Ghidra).
    *   I search for strings. I see `\\.\pipe\trash-hunter-ipc`. I see `GOLDEN_HASH`.
    *   **Result:** I know your secrets without ever fighting your defenses. I can build a "Mock Service" that perfectly mimics your pipe, or patch your binary to change the Golden Hash to *my* hash.

### 2. Replay Attacks (The "Time Loop")
*   **Severity:** **HIGH**
*   **The Attack:**
    *   I sniff the pipe traffic. I see the Client send `{"action": "delete", "payload": "file.txt"}`.
    *   I don't need to know *how* to generate that command. I just record it and play it back later.
    *   **Result:** I can trigger admin actions by replaying old valid messages.

### 3. Memory Snapshotting (The "Freeze Ray")
*   **Severity:** **HIGH**
*   **The Attack:**
    *   I run your app in a virtual machine.
    *   I wait for you to decrypt your secrets in memory.
    *   I pause the VM, dump the RAM, and search for the secret key.
    *   **Result:** Obfuscation fails if the secret ever exists in plain text in RAM.

---

## 🛡️ The "Singularity" Defense Plan (Round 3)

To defeat an opponent who can see everything (Static Analysis) and manipulate time (Replay/VMs), we need **Dynamic Cryptography**.

### Fix 1: Compile-Time Obfuscation (The "Invisible Ink")
*   **Action:** We will NEVER store sensitive strings (Pipe Names, Hashes, Secrets) as plain text.
*   **Mechanism:** We will construct them mathematically at runtime (e.g., Stack Strings or XOR arrays).
*   **Effect:** `strings.exe` returns nothing. A disassembler shows a mess of math operations, not data.

### Fix 2: Challenge-Response Handshake (The "Telepathic Link")
*   **Action:** The Service will never trust a command immediately.
    1.  Client connects.
    2.  Service sends a random **Nonce** (e.g., "82734...").
    3.  Client must respond with `SHA256(Nonce + SECRET_SALT)`.
    4.  Service verifies.
*   **Effect:** Replay attacks fail (the Nonce changes every time). Fake clients fail (they don't know the `SECRET_SALT`).

### Fix 3: The "Polymorphic" Secret
*   **Action:** The `SECRET_SALT` is not a string. It is the result of a complex calculation involving the machine's own hardware ID or a hardcoded math sequence.

## 📝 Execution Plan
1.  **Update `security.rs`**: Add `get_obfuscated_secret()` and `get_pipe_name()`.
2.  **Update `service_main.rs`**: Implement the Challenge-Response logic.
3.  **Update `ipc_client.rs`**: Teach the client to answer the challenge.
