# 🚀 How to Release (The "Magic" Way)

Since we moved the installer to a public directory, the release process is now fully automated.

## 1. Run the Magic Script
Open your terminal in VS Code and run:

```powershell
.\MAGIC_RELEASE.ps1
```

**What this does:**
1.  Builds the **Desktop Downloader** (Tauri app).
2.  Builds the **Installer Stub**.
3.  **Copies the new installer** to `public/downloads/WordHacker404-Setup.exe`.
4.  Commits and pushes everything to GitHub.

## 2. Wait for Deployment
- GitHub Actions will automatically deploy the website.
- Wait ~3-5 minutes.

## 3. Verify
- Go to `https://wordhacker404.me`.
- Open **Tools** -> **404 Social Media Downloader**.
- Click **Download for Windows**.
- You should get the NEW installer (check the file size or version).

---

## ⚠️ Troubleshooting "Wrong App"
If the installer still opens the website instead of the downloader:
1.  **Delete** the old `WordHacker404-Setup.exe` from your downloads folder.
2.  **Clear Browser Cache** (Ctrl+Shift+Delete).
3.  **Run `.\MAGIC_RELEASE.ps1` again** to force a fresh build.
