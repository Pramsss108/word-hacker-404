#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{command, Window, Manager};
use tauri::api::process::{Command, CommandEvent};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

// Store active downloads to allow cancellation
struct DownloadState {
    active_downloads: Arc<Mutex<HashMap<String, u32>>>, // URL -> PID
}

#[derive(Serialize, Deserialize)]
struct ApiRequest {
    url: String,
    license_key: String,
    quality: String,
}

#[derive(Serialize, Deserialize)]
struct EngineParams {
    concurrent_fragments: u32,
    buffer_size: String,
}

#[derive(Serialize, Deserialize)]
struct ApiResponse {
    allowed: Option<bool>,
    error: Option<String>,
    message: Option<String>,
    engine_params: Option<EngineParams>,
}

#[command]
async fn download_video(
    window: Window, 
    url: String, 
    format: String,
    state: tauri::State<'_, DownloadState>
) -> Result<String, String> {
    println!("Starting download for: {}", url);

    // --- GOD MODE SECURITY CHECK ---
    // In a real app, fetch this from secure storage
    let license_key = "WH404-FREE-USER".to_string(); 
    
    let client = reqwest::Client::new();
    // Replace with your actual Worker URL after deployment
    let api_url = "https://wh404-api.YOUR_SUBDOMAIN.workers.dev/api/v1/video/resolve";

    // For now, we skip the actual network call if the URL is a placeholder
    // to prevent crashing during development.
    // In production, UNCOMMENT the network call block.
    
    /* 
    let res = client.post(api_url)
        .json(&ApiRequest {
            url: url.clone(),
            license_key: license_key.clone(),
            quality: "1080p".to_string(), // Extract from format string in real app
        })
        .send()
        .await
        .map_err(|e| format!("API Connection Failed: {}", e))?;

    let api_data: ApiResponse = res.json().await
        .map_err(|e| format!("Invalid API Response: {}", e))?;

    if let Some(err) = api_data.error {
        return Err(format!("Server Error: {} - {}", err, api_data.message.unwrap_or_default()));
    }
    
    let params = api_data.engine_params.unwrap_or(EngineParams {
        concurrent_fragments: 4,
        buffer_size: "16K".to_string(),
    });
    */

    // Mock Params for Dev (Simulating "Free Tier")
    let params = EngineParams {
        concurrent_fragments: 8,
        buffer_size: "16K".to_string(),
    };

    // -------------------------------

    // 1. Setup Arguments
    // Note: We rely on yt-dlp finding ffmpeg in the same directory or PATH
    let args = vec![
        url.clone(),
        "-f".to_string(), format,
        "-o".to_string(), "%(title)s.%(ext)s".to_string(), // Simple output template for now
        "--progress".to_string(),
        "--newline".to_string(),
        "--no-warnings".to_string(),
        "--concurrent-fragments".to_string(), params.concurrent_fragments.to_string(),
        "--buffer-size".to_string(), params.buffer_size,
    ];

    // 2. Spawn Sidecar
    // "bin/yt-dlp" matches the entry in tauri.conf.json
    let (mut rx, child) = Command::new_sidecar("bin/yt-dlp")
        .map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?
        .args(args)
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let pid = child.pid();
    println!("Spawned yt-dlp with PID: {}", pid);

    // 3. Store PID for cancellation
    {
        let mut downloads = state.active_downloads.lock().unwrap();
        downloads.insert(url.clone(), pid);
    }

    // 4. Handle Output Stream
    let url_clone = url.clone();
    let state_clone = state.active_downloads.clone();
    
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    // Emit raw line to frontend, let JS parse it (like before)
                    window.emit("download:progress", Payload { url: url_clone.clone(), line }).unwrap();
                }
                CommandEvent::Stderr(line) => {
                    // yt-dlp sends progress to stderr sometimes
                    window.emit("download:progress", Payload { url: url_clone.clone(), line }).unwrap();
                }
                CommandEvent::Terminated(payload) => {
                    println!("Download terminated: {:?}", payload);
                    window.emit("download:complete", Payload { url: url_clone.clone(), line: "done".to_string() }).unwrap();
                    
                    // Cleanup
                    let mut downloads = state_clone.lock().unwrap();
                    downloads.remove(&url_clone);
                }
                _ => {}
            }
        }
    });

    Ok("Download started".to_string())
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    url: String,
    line: String,
}

fn main() {
    tauri::Builder::default()
        .manage(DownloadState {
            active_downloads: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![download_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
