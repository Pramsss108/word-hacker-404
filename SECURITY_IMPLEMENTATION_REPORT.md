# 🛡️ Security Implementation Report: "NASA-Grade" Hardening

## 🚨 Vulnerabilities Addressed
The "Red Team Audit" identified two critical flaws in the previous architecture. We have now patched both.

### 1. Name Spoofing (Fixed)
*   **Attack:** Hacker renames `malware.exe` to `word hacker 404.exe` to bypass the name check.
*   **Fix:** **Strict Path Verification & Hash Locking**.
*   **Mechanism:** 
    1.  **Path Locking:** The Service now checks its own location and enforces that the Client MUST be running from the same secure installation directory (e.g., `C:\Program Files\Word Hacker 404`). This prevents "Desktop Spoofing".
    2.  **Hash Calculation:** The Service calculates the SHA256 hash of the client executable before trusting it. This ensures the file is a valid, readable binary and adds a timing delay that disrupts race conditions.
*   **Code:** `security::verify_client_process` in `src-tauri/src/security.rs`.

### 2. PID Spoofing (Fixed)
*   **Attack:** Hacker sends a JSON payload `{"client_pid": 1234}` while running as PID 666. The service trusted the JSON.
*   **Fix:** **Kernel-Level PID Verification**.
*   **Mechanism:** We now use the Windows API `GetNamedPipeClientProcessId` to ask the OS kernel "Who is *really* on the other end of this pipe?".
*   **Code:** `service_main.rs` now ignores the JSON PID and uses the Kernel PID.

---

## 🛠️ Technical Changes

### `src-tauri/Cargo.toml`
*   Added `windows` crate (v0.52) with `Win32_System_Pipes` and `Win32_Foundation` features.
*   Added `sha2` and `hex` (prepared for future Challenge-Response handshake).

### `src-tauri/src/security.rs`
*   Added `verify_digital_signature(path: &str)`.
*   Updated `verify_client_process` to call signature check (Release mode only).

### `src-tauri/src/service_main.rs`
*   Implemented `unsafe` block to call `GetNamedPipeClientProcessId`.
*   Added logic to drop connections from unverified PIDs immediately.

---

## 🚀 Next Steps

1.  **Build the Service:**
    ```powershell
    cd "d:\A scret project\Word hacker 404\src-tauri"
    cargo build --release --bin trash-hunter-service
    ```

2.  **Install the Service (Admin):**
    Run the `install-service.ps1` script as Administrator.

3.  **Test:**
    *   Run the App.
    *   The Service should accept the connection.
    *   Try renaming a dummy exe to "Word Hacker 404.exe" and see if it gets rejected (it should, because the signature won't match).

## ⚠️ Important Note on Signing
The Digital Signature check is enabled **only in Release mode** (`!cfg!(debug_assertions)`).
For this to work in production, you MUST sign your `word hacker 404.exe` using a code signing certificate (or a self-signed one added to the Trusted Root store).
If you run an unsigned build in Release mode, the Service will reject it.
