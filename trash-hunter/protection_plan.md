# Protection & Monetization Plan

## Anti-Crack Protection

### 1. Code Obfuscation
- Use `cargo-obfuscate` or similar tools
- Rename all functions/variables to random strings
- Strip debug symbols from release build

### 2. License Key System
- Online activation (server validates key)
- Hardware fingerprinting (CPU ID + MAC address)
- Key stored encrypted in registry
- Check license on every app start

### 3. Anti-Debugging
- Detect debuggers (x64dbg, IDA, etc.)
- Exit immediately if debugger detected
- Use anti-tamper checks

### 4. Code Signing
- Sign executable with certificate
- Windows SmartScreen won't block it
- Harder to modify without breaking signature

### 5. Critical Code Protection
- Keep MFT scanning logic in encrypted DLL
- Load and decrypt at runtime
- Use VM protection for license checks

## Professional Installer

### Using Inno Setup (Free & Professional)
- Custom UI with branding
- Silent background installation option
- Registry keys for auto-start
- Encrypted config files
- Online license activation during install
- Uninstaller that removes all traces

### Installer Features
- [ ] Check Windows version compatibility
- [ ] Request admin rights automatically
- [ ] Install to Program Files
- [ ] Add to Windows startup
- [ ] Create hidden AppData folder
- [ ] Download and verify license
- [ ] Set up auto-update mechanism

## Monetization Strategy
- Free trial (7 days or limited features)
- License key required for full version
- Online activation prevents key sharing
- Subscription model option (monthly/yearly)

## Implementation Priority
1. Build lazy engine (speed)
2. Add license system
3. Create Inno Setup installer
4. Add code obfuscation
5. Sign executable
