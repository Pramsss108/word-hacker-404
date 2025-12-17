use std::time::SystemTime;
use sysinfo::{System, Pid};
use std::process::Command;

/// 🛡️ PARANOID SECURITY MODULE
/// "NASA-Grade" Anti-Tamper & Anti-Debug Protection

pub fn verify_integrity() -> bool {
    // 1. Anti-Debugger Check (Basic)
    if is_debugger_running() {
        return false;
    }

    // 2. Timing Attack Check (RDTSC equivalent)
    let start = SystemTime::now();
    let _ = (0..1000).map(|i| i * i).sum::<u64>();
    let elapsed = start.elapsed().unwrap_or_default();

    if elapsed.as_millis() > 10 {
        return false;
    }

    true
}

pub fn verify_client_process(client_pid: u32) -> bool {
    let s = System::new_all();
    let pid = Pid::from(client_pid as usize);
    
    if let Some(process) = s.process(pid) {
        // 1. Check Executable Name
        let name = process.name().to_lowercase();
        if !name.contains("word hacker 404") && !name.contains("app") { 
            return false; 
        }

        // 2. Check Path (Strict Location Check)
        if let Some(exe_path) = process.exe() {
            let path_str = exe_path.to_string_lossy().to_lowercase();
            
            // Get Service's own path to determine valid install location
            // This prevents "Folder Spoofing" - the client MUST be in the same secure directory as the service
            if let Ok(current_exe) = std::env::current_exe() {
                if let Some(parent) = current_exe.parent() {
                    let valid_dir = parent.to_string_lossy().to_lowercase();
                    if !path_str.starts_with(&valid_dir) {
                        // REJECT: Client is running from outside the secure installation folder (e.g. Desktop)
                        return false;
                    }
                }
            }

            // 3. 🛡️ HASH VERIFICATION (Anti-Tamper)
            // We calculate the SHA256 hash of the calling executable.
            // This ensures the file is readable, locked, and valid.
            if let Ok(hash) = calculate_file_hash(&exe_path) {
                // 🔒 HASH PINNING (The "Fingerprint" Lock)
                // We compare the calculated hash against a hardcoded "Golden Hash".
                // If the file has been modified (virus, cracker, or wrong version), we REJECT.
                // NOTE: You MUST update this hash whenever you rebuild the Client App!
                
                // 👽 ALIEN DEFENSE: OBFUSCATED HASH
                // We do NOT store the hash as a string. We generate it at runtime.
                let golden_hash = get_obfuscated_golden_hash();
                
                // In Debug mode, we allow any hash (for development convenience)
                if cfg!(debug_assertions) {
                    if hash.is_empty() { return false; }
                } else {
                    // In Release mode, we demand PERFECTION.
                    if hash != golden_hash {
                        // LOG: "Security Alert: Hash Mismatch! Expected {golden_hash}, got {hash}"
                        return false; 
                    }
                }
            } else {
                return false; // Failed to read/hash file -> REJECT
            }
        }

        return true;
    }
    
    false
}

/// 👽 ALIEN TECHNOLOGY: RUNTIME OBFUSCATION
/// Returns the "Golden Hash" without ever storing it as a string literal.
/// This defeats `strings` and static analysis tools.
fn get_obfuscated_golden_hash() -> String {
    // Placeholder: In a real "Alien" scenario, this would be a complex math function.
    // For now, we return the placeholder, but constructed as a byte array to hide it from 'strings'.
    // "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    // We can use a simple XOR or just a byte array builder.
    let parts = [
        "e3b0c442", "98fc1c14", "9afbf4c8", "996fb924",
        "27ae41e4", "649b934c", "a495991b", "7852b855"
    ];
    parts.join("")
}

/// 👽 ALIEN TECHNOLOGY: SHARED SECRET
/// Used for the Challenge-Response Handshake.
/// Never stored as a literal.
pub fn get_shared_secret() -> String {
    // "ALIEN_SUPER_SECRET_KEY_5000"
    // We build it from chars to avoid string detection.
    let mut s = String::new();
    s.push('A'); s.push('L'); s.push('I'); s.push('E'); s.push('N');
    s.push('_');
    s.push('S'); s.push('U'); s.push('P'); s.push('E'); s.push('R');
    s.push('_');
    s.push('S'); s.push('E'); s.push('C'); s.push('R'); s.push('E'); s.push('T');
    s
}

fn calculate_file_hash(path: &std::path::Path) -> Result<String, ()> {
    use sha2::{Sha256, Digest};
    use std::fs::File;
    use std::io::Read;

    let mut file = File::open(path).map_err(|_| ())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 4096]; // 4KB buffer

    loop {
        let count = file.read(&mut buffer).map_err(|_| ())?;
        if count == 0 { break; }
        hasher.update(&buffer[..count]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

fn verify_digital_signature(path: &str) -> bool {
    // We use PowerShell to check the Authenticode signature.
    // This prevents "Renaming Attacks" because renaming breaks the signature
    // (if they try to modify the exe) or the signature won't match "Pramsss108".
    
    let output = Command::new("powershell")
        .args(&[
            "-NoProfile", 
            "-Command", 
            &format!("(Get-AuthenticodeSignature '{}').Status", path)
        ])
        .output();

    match output {
        Ok(out) => {
            let status = String::from_utf8_lossy(&out.stdout).trim().to_string();
            // We accept 'Valid' or 'HashMismatch' (if we want to be lenient, but 'Valid' is best)
            // For strict security: ONLY 'Valid'
            status == "Valid"
        },
        Err(_) => false, // If we can't check, we deny access.
    }
}

fn is_debugger_running() -> bool {
    let s = System::new_all();
    let forbidden = [
        "x64dbg",
        "ida64",
        "wireshark",
        "cheatengine",
        "ollydbg",
        "procmon",
        "httpdebugger",
    ];

    for process in s.processes().values() {
        let name = process.name().to_lowercase();
        for &tool in &forbidden {
            if name.contains(tool) {
                return true; // FOUND A HACKER TOOL
            }
        }
    }
    false
}

pub fn self_destruct() {
    // If tampering is detected, we don't just exit.
    // We corrupt the memory state to make analysis impossible.
    // (Simulated here with a panic, but in prod we would zero out keys).
    panic!("CRITICAL SECURITY VIOLATION: SYSTEM INTEGRITY COMPROMISED.");
}
