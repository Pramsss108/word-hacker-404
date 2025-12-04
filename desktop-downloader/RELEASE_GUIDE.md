# Desktop App Release Guide

> Public build repo: **Pramsss108/wh404-desktop-builds** (stores installers)

## 🚀 How to Release a New Version

### Prerequisites
1. Install GitHub CLI: `winget install GitHub.cli`
2. Authenticate: `gh auth login`

### Quick Release (Automated)

```powershell
# 1. Navigate to desktop-downloader
cd "d:\A scret project\Word hacker 404\desktop-downloader"

# 2. Update version in package.json if needed
# Edit: "version": "0.1.1"  (or your new version)

# 3. Build the app
npm run package:win

# 4. Run release automation (installs GitHub CLI if needed)
.\quick-release-clean.ps1 -Version "1.0.1"
```

### What the Script Does
1. ✅ Builds Windows installer
2. ✅ Creates git tag in main repo
3. ✅ Pushes source tag to GitHub
4. ✅ Creates release in **wh404-desktop-builds**
5. ✅ Uploads installer to the public repo
6. ✅ Updates website download URLs
7. ✅ Commits and pushes website changes

### Manual Release (If Automation Fails)

#### Step 1: Build
```powershell
cd desktop-downloader
npm run package:win
```

#### Step 2: Find Installer
```powershell
Get-ChildItem release\*.exe
# Example output: Word Hacker Downloader 0.1.0.exe
```

#### Step 3: Create GitHub Release
1. Go to: https://github.com/Pramsss108/wh404-desktop-builds/releases/new
2. Create new tag: `desktop-v1.0.1`
3. Title: `WH404 Desktop Downloader v1.0.1`
4. Upload the .exe file from `release/` folder
5. Publish release

#### Step 4: Update Website URLs
Get the exact download URL from GitHub release page, then update:

**File: `src/App.tsx`** (line ~148)
```typescript
onClick={() => window.open('YOUR_GITHUB_RELEASE_URL_HERE', '_blank')}
```

**File: `src/components/ToolsPage.tsx`** (line ~272)
```typescript
window.open('YOUR_GITHUB_RELEASE_URL_HERE', '_blank')
```

#### Step 5: Deploy Website
```powershell
cd ..
npm run build
git add -A
git commit -m "chore: update desktop download URL to v1.0.1"
git push
```

## 🔧 Troubleshooting

### "File not found in release"
- Ensure `npm run package:win` completed successfully
- Check `desktop-downloader/release/` folder for .exe file

### "GitHub CLI not found"
```powershell
winget install GitHub.cli
gh auth login
```

### "Download link shows 404"
- Verify the file was uploaded to GitHub release
- Check the filename matches exactly (spaces vs %20 encoding)
- Wait 2-3 minutes for GitHub CDN to propagate

## 📋 Version Numbering

Follow semantic versioning:
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features
- **Patch** (0.0.1): Bug fixes

Current version: **v1.0.1** (check package.json)
