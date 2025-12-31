// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Serialize, Deserialize)]
struct OllamaResponse {
    response: String,
}

// 4. AI Brain Connector (Bypasses CORS)
#[tauri::command]
async fn ask_ollama(model: String, prompt: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let payload = OllamaRequest {
        model,
        prompt,
        stream: false,
    };

    let res = client.post("http://localhost:11434/api/generate")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Connection Failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama Error: {}", res.status()));
    }

    let body: OllamaResponse = res.json().await.map_err(|e| format!("Parse Error: {}", e))?;
    Ok(body.response)
}

// 5. List AI Models
#[tauri::command]
async fn list_ollama_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let res = client.get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Connection Failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama Error: {}", res.status()));
    }

    let body: serde_json::Value = res.json().await.map_err(|e| format!("Parse Error: {}", e))?;
    
    let mut models = Vec::new();
    if let Some(list) = body["models"].as_array() {
        for m in list {
            if let Some(name) = m["name"].as_str() {
                models.push(name.to_string());
            }
        }
    }
    Ok(models)
}

// 6. File Existence Check (For Handshake Validation)
#[tauri::command]
async fn check_file_exists(path: String) -> bool {
    // Check if file exists inside WSL
    let output = Command::new("wsl")
        .args(&["-d", "kali-linux", "test", "-f", &path])
        .output();

    match output {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![check_wsl_status, run_wsl_command, run_black_ops, ask_ollama, list_ollama_models, check_file_exists])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
#[tauri::command]
async fn check_wsl_status() -> String {
    // 1. Check if WSL is enabled
    let status_check = Command::new("wsl")
        .arg("--status")
        .output();

    if status_check.is_err() {
        return "WSL_NOT_ENABLED".to_string();
    }

    // 2. Check if Kali is installed
    let list_check = Command::new("wsl")
        .arg("--list")
        .output();
    
    if let Ok(o) = list_check {
        let output = String::from_utf8_lossy(&o.stdout).to_string();
        // UTF-16 fix might be needed for wsl --list sometimes, but usually --list is okay or we check --list --verbose
        // Actually wsl --list output is often UTF-16LE on Windows. 
        // Let's try a simpler check: try to run a command in kali.
        // If it fails with "Wsl/Service/WSL_E_DISTRO_NOT_FOUND", then it's missing.
    }

    // Let's combine the check. Try to run 'echo hello' in kali.
    let distro_check = Command::new("wsl")
        .args(&["-d", "kali-linux", "echo", "ok"])
        .output();

    match distro_check {
        Ok(o) => {
            if !o.status.success() {
                // If exit code is not 0, likely distro not found or other error
                return "KALI_MISSING".to_string();
            }
        },
        Err(_) => return "WSL_ERROR".to_string(),
    }

    // 3. Now check for Wireless Interface inside Kali
    // We look for 'wlan' or 'wl' in the output of 'ip link'
    let adapter_check = Command::new("wsl")
        .args(&["-d", "kali-linux", "ip", "link"])
        .output();

    match adapter_check {
        Ok(o) => {
            let output = String::from_utf8_lossy(&o.stdout).to_string();
            if output.contains("wlan") || output.contains("wl") {
                "ONLINE".to_string()
            } else {
                "NO_ADAPTER".to_string()
            }
        },
        Err(_) => "OFFLINE".to_string(),
    }
}

// 2. The "Commander" - Sends orders to Kali Linux
#[tauri::command]
async fn run_wsl_command(cmd: String) -> String {
    // Usage: wsl -d kali-linux -- bash -c "your_command"
    println!("Executing in WSL: {}", cmd);
    
    let output = Command::new("wsl")
        .args(&["-d", "kali-linux", "--", "bash", "-c", &cmd])
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            if !stderr.is_empty() {
                format!("LOG: {}\nERROR: {}", stdout, stderr)
            } else {
                stdout
            }
        },
        Err(e) => format!("SYSTEM FAILURE: {}", e),
    }
}

// 3. Black Ops Module Runner
#[tauri::command]
async fn run_black_ops(module: String, args: Vec<String>) -> String {
    let script_path = format!("/home/kali/blackops/{}.sh", module);
    let args_str = args.join(" ");
    
    // Use sed to remove carriage returns (Windows line endings) - safer than dos2unix which might be missing
    let full_cmd = format!("sed -i 's/\\r$//' {} 2>/dev/null; {} {}", script_path, script_path, args_str);
    
    println!("BLACK OPS EXEC: {}", full_cmd);

    // Ensure script is executable
    let _ = Command::new("wsl")
        .args(&["-d", "kali-linux", "chmod", "+x", &script_path])
        .output();

    let output = Command::new("wsl")
        .args(&["-d", "kali-linux", "bash", "-c", &full_cmd])
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            if !stdout.is_empty() {
                stdout
            } else if !stderr.is_empty() {
                format!("ERROR: {}", stderr)
            } else {
                "COMMAND EXECUTED (NO OUTPUT)".to_string()
            }
        },
        Err(e) => format!("EXECUTION FAILED: {}", e),
    }
}
