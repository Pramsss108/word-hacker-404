// Security Module - String Encryption & Anti-Debug
// Protects sensitive strings and detects debugging attempts

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use std::time::{SystemTime, UNIX_EPOCH};

// XOR-based string obfuscation (simple but effective)
pub fn decrypt_string(encrypted: &[u8], key: u8) -> String {
    encrypted
        .iter()
        .map(|&b| (b ^ key) as char)
        .collect()
}

// Encrypt string at compile time (use in build.rs)
pub fn encrypt_string(input: &str, key: u8) -> Vec<u8> {
    input.bytes().map(|b| b ^ key).collect()
}

// Get encrypted API URL
pub fn get_license_api_url() -> String {
    // Encrypted: "https://wh404-license-api.guitarguitarabhijit.workers.dev"
    let encrypted = vec![
        0x77, 0x6b, 0x6b, 0x6f, 0x6c, 0x25, 0x30, 0x30, 0x68, 0x77, 0x2b, 0x2f, 0x2b,
        0x32, 0x73, 0x76, 0x7c, 0x7a, 0x71, 0x6c, 0x7a, 0x32, 0x7e, 0x6f, 0x76, 0x31,
        0x78, 0x6a, 0x76, 0x6b, 0x7e, 0x6d, 0x78, 0x6a, 0x76, 0x6b, 0x7e, 0x6d, 0x7e,
        0x7d, 0x77, 0x76, 0x75, 0x76, 0x6b, 0x31, 0x68, 0x70, 0x6d, 0x74, 0x7a, 0x6d,
        0x6c, 0x31, 0x7b, 0x7a, 0x69,
    ];
    let key = compute_runtime_key();
    decrypt_string(&encrypted, key)
}

// Get encrypted Cloudflare Worker URL
pub fn get_cloudflare_worker_url() -> String {
    // Encrypted: "https://universal-downloader-proxy.guitarguitarabhijit.workers.dev"
    let encrypted = vec![
        0x6b, 0x71, 0x71, 0x70, 0x72, 0x3b, 0x2e, 0x2e, 0x72, 0x63, 0x68, 0x75, 0x64,
        0x71, 0x72, 0x66, 0x6c, 0x2d, 0x61, 0x6e, 0x76, 0x63, 0x6c, 0x6e, 0x66, 0x61,
        0x64, 0x71, 0x2d, 0x70, 0x71, 0x6e, 0x77, 0x78, 0x3a, 0x60, 0x72, 0x68, 0x71,
        0x66, 0x71, 0x60, 0x72, 0x68, 0x71, 0x66, 0x71, 0x66, 0x65, 0x6b, 0x68, 0x6f,
        0x68, 0x71, 0x3a, 0x76, 0x6e, 0x71, 0x6c, 0x64, 0x71, 0x72, 0x3a, 0x61, 0x64,
        0x75,
    ];
    let key = compute_runtime_key();
    decrypt_string(&encrypted, key)
}

// Compute runtime key (static for URL decryption)
fn compute_runtime_key() -> u8 {
    // Static key for consistent URL decryption
    // XOR key: 'h' (0x68) ^ 0x77 (first encrypted byte) = 0x1f
    0x1f
}

// Anti-debugging checks
pub fn check_debugger() -> bool {
    #[cfg(target_os = "windows")]
    {
        use winapi::um::debugapi::IsDebuggerPresent;
        unsafe {
            if IsDebuggerPresent() != 0 {
                return true;
            }
        }
    }
    
    // Timing attack - debuggers slow execution
    let start = std::time::Instant::now();
    let mut x = 0u64;
    for i in 0..1000 {
        x = x.wrapping_add(i);
    }
    let elapsed = start.elapsed().as_micros();
    
    // If too slow, debugger likely present
    if elapsed > 5000 {
        return true;
    }
    
    false
}

// Check for common debugger processes
pub fn check_debugger_processes() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        let debuggers = [
            "x64dbg", "x32dbg", "ollydbg", "ida", "ida64",
            "windbg", "ghidra", "processhacker", "procmon",
        ];
        
        if let Ok(output) = Command::new("tasklist").output() {
            let list = String::from_utf8_lossy(&output.stdout).to_lowercase();
            for debugger in &debuggers {
                if list.contains(debugger) {
                    return true;
                }
            }
        }
    }
    
    false
}

// Poison license cache if debugger detected
pub fn handle_debugger_detection() {
    // Don't exit immediately (obvious)
    // Instead, corrupt state silently
    std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_secs(30));
        // Corrupt memory gradually
        std::process::exit(0);
    });
}

// Continuous monitoring thread
pub fn start_security_monitor() {
    std::thread::spawn(|| {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(60));
            
            if check_debugger() || check_debugger_processes() {
                println!("🔐 Security alert detected");
                handle_debugger_detection();
            }
        }
    });
}

// Integrity check - verify binary not modified
pub fn verify_integrity() -> bool {
    use sha2::{Sha256, Digest};
    
    #[cfg(debug_assertions)]
    {
        // Skip in debug mode
        return true;
    }
    
    #[cfg(not(debug_assertions))]
    {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Ok(exe_bytes) = std::fs::read(&exe_path) {
                let mut hasher = Sha256::new();
                hasher.update(&exe_bytes);
                let hash = hasher.finalize();
                
                // Expected hash (computed at build time)
                // TODO: Replace with actual hash in build.rs
                let expected = [0u8; 32];
                
                return hash.as_slice() == expected;
            }
        }
    }
    
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_string_encryption() {
        let original = "test_string";
        let key = 0x1f;
        let encrypted = encrypt_string(original, key);
        let decrypted = decrypt_string(&encrypted, key);
        assert_eq!(original, decrypted);
    }
}
