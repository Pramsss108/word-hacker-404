# Quick Deploy Scripts

## Autonomous Deployment Agent

### Windows PowerShell (Recommended)
```powershell
# Navigate to project
cd "D:\A scret project\Word hacker 404"

# Run autonomous deployment with NASA-grade QA
.\deploy-autonomous.ps1

# Quick deploy with custom message
.\deploy-autonomous.ps1 -CommitMessage "feat: new feature update"

# Skip QA for hotfixes (use with caution)
.\deploy-autonomous.ps1 -SkipQA -CommitMessage "hotfix: critical update"

# Force deploy even with lint warnings
.\deploy-autonomous.ps1 -Force -CommitMessage "feat: deploy despite warnings"
```

### One-Liner Commands

**Full Autonomous Deploy:**
```powershell
cd "D:\A scret project\Word hacker 404"; .\deploy-autonomous.ps1
```

**Quick Update Deploy:**
```powershell
cd "D:\A scret project\Word hacker 404"; git add .; git commit -m "feat: quick update"; git push origin main
```

**Emergency Hotfix:**
```powershell
cd "D:\A scret project\Word hacker 404"; git add .; git commit -m "hotfix: emergency fix"; git push origin main --force
```

### Manual Deployment (Fallback)

If autonomous script fails, use these manual steps:

```powershell
# 1. Navigate to project
cd "D:\A scret project\Word hacker 404"

# 2. Install/update dependencies  
npm install

# 3. Run quality checks
npm run type-check
npm run build

# 4. Deploy changes
git add .
git commit -m "feat: manual deployment"
git push origin main
```

### Deployment Monitoring

**Live Site:** https://pramsss108.github.io/word-hacker-404/

**Check Deployment Status:**
- GitHub Actions: https://github.com/Pramsss108/word-hacker-404/actions
- Deployment typically takes 2-3 minutes
- Site updates automatically after successful GitHub Actions completion

### Troubleshooting

**Common Issues:**

1. **PowerShell Execution Policy**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Git Authentication Issues**
   ```powershell
   git config --global credential.helper manager-core
   ```

3. **Build Failures**
   ```powershell
   rm -rf node_modules
   npm install
   npm run type-check
   ```

4. **Deployment Stuck**
   ```powershell
   # Check GitHub Actions status
   # Force refresh browser cache: Ctrl+F5
   ```

### Script Features

- ✅ **Autonomous Operation**: Zero user prompts or confirmations
- ✅ **NASA-Grade QA**: TypeScript validation, production build testing
- ✅ **Auto-Configuration**: Git settings optimized for automation  
- ✅ **Progress Monitoring**: Real-time deployment status updates
- ✅ **Error Handling**: Comprehensive failure detection and reporting
- ✅ **Browser Integration**: Auto-opens live site after deployment
- ✅ **Flexible Options**: Skip QA, force deploy, custom messages

### Development Workflow

```powershell
# Start development server
npm run dev

# Make changes to code...
# Test locally at http://localhost:3001

# Deploy when ready
.\deploy-autonomous.ps1 -CommitMessage "feat: implemented new feature"

# Monitor live site
# https://pramsss108.github.io/word-hacker-404/
```