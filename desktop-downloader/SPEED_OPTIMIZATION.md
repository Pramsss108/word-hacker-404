# ⚡ Speed Optimization Guide

## Parallel Multi-Connection Downloads

The app now supports **parallel multi-connection downloading** for maximum speed!

### Current Configuration

✅ **Active by default:**
- 8 concurrent fragment downloads
- 16 connections per server
- 10MB chunk size for optimal throughput
- Automatic retry on failed fragments
- Large 16K buffer for faster processing

### Optional: Install aria2c for Even Faster Downloads

**aria2c** is an ultra-fast download utility that can boost speeds by 3-10x!

#### Windows Installation:
```powershell
# Using Chocolatey (recommended)
choco install aria2

# Or download from: https://github.com/aria2/aria2/releases
```

#### Mac Installation:
```bash
brew install aria2
```

#### Linux Installation:
```bash
# Ubuntu/Debian
sudo apt install aria2

# Fedora
sudo dnf install aria2

# Arch
sudo pacman -S aria2
```

### How It Works

**Without aria2c:**
- Uses built-in yt-dlp downloader
- Still fast with 8 concurrent fragments
- ~5-10MB/s typical speed

**With aria2c installed:**
- Automatically detected and used
- 16 parallel connections per server
- 16 simultaneous servers
- ~20-50MB/s typical speed
- Can max out your internet connection!

### Verification

After installing aria2c, restart the app. The downloader will automatically use it if available.

Check download speeds - you should see significant improvement, especially on large files!

### Technical Details

**Optimization Parameters:**
```javascript
concurrentFragments: 8          // Download 8 fragments simultaneously
downloader: 'aria2c'             // Use aria2c multi-connection engine
downloaderArgs: '-x 16 -s 16 -k 1M'  // 16 connections, 16 servers, 1MB chunks
bufferSize: '16K'                // Large buffer for speed
httpChunkSize: 10485760          // 10MB chunks
fragmentRetries: 10              // Retry failed fragments
```

### Troubleshooting

**Download seems slow?**
1. Check your internet speed (run speedtest)
2. Some platforms rate-limit downloads
3. Install aria2c for maximum speed
4. Check firewall isn't blocking connections

**aria2c not being used?**
1. Verify installation: `aria2c --version`
2. Restart the app completely
3. Check PATH environment variable includes aria2c

---

**Pro Tip:** The fastest downloads come from platforms with CDN support (YouTube, Vimeo). Social media platforms (Instagram, TikTok) may have rate limits.
