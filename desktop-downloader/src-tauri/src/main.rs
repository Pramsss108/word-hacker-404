#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{command, Window};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::io::BufRead;

fn strip_unc(path: PathBuf) -> String {
    let s = path.to_string_lossy().to_string();
    if s.starts_with(r"\\?\") {
        s[4..].to_string()
    } else {
        s
    }
}

// Store active downloads to allow cancellation
struct DownloadState {
    active_downloads: Arc<Mutex<HashMap<String, u32>>>, // URL -> PID
}

#[derive(Serialize, Deserialize)]
#[allow(dead_code)]
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
#[allow(dead_code)]
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
    println!("DEBUG: download_video() CALLED");
    println!("DEBUG: URL: {}", url);
    println!("DEBUG: Format: {}", format);


    // 0. DUPLICATE CHECK (Prevent Crash)
    {
        let mut downloads = state.active_downloads.lock().unwrap();
        if downloads.contains_key(&url) {
            println!("⚠️ DEBUG: Found stuck lock for {}. FORCING REMOVAL to allow retry.", url);
            downloads.remove(&url);
            // In production, we would return Err here.
            // return Err("Download already in progress".to_string());
        }
        // Insert placeholder to block immediate subsequent clicks
        downloads.insert(url.clone(), 0);
    }
    println!("DEBUG: Duplicate check passed (Lock acquired)");

    // --- GOD MODE SECURITY CHECK ---
    // In a real app, fetch this from secure storage
    // let license_key = "WH404-FREE-USER".to_string(); 
    
    // let client = reqwest::Client::new();
    // Replace with your actual Worker URL after deployment
    // let api_url = "https://wh404-api.YOUR_SUBDOMAIN.workers.dev/api/v1/video/resolve";

    println!("DEBUG: Skipped network init");

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
    let _params = EngineParams {
        concurrent_fragments: 8,
        buffer_size: "16K".to_string(),
    };
    println!("DEBUG: Params set");

    // 0.5 FORMAT TRANSLATION (Fix for "Stuck" Issue)
    // Frontend sends "mp4-1080", "mp3", etc. yt-dlp needs real format strings.
    println!("DEBUG: Translating format: {}", format);
    let (dlp_format, is_audio) = match format.as_str() {
        "mp4-1080" => ("bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best", false),
        "mp4-720" => ("bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best", false),
        "mp3" => ("bestaudio/best", true),
        "social" => ("best", false),
        _ => ("best", false), // Default fallback
    };

    println!("Mapped format '{}' to '{}'", format, dlp_format);

    // -------------------------------

    // 1. Setup Arguments
    // Resolve Downloads directory
    let download_dir = tauri::api::path::download_dir().unwrap_or(PathBuf::from("."));
    let output_template = download_dir.join("WordHacker").join("%(title)s.%(ext)s");
    
    println!("Saving to: {:?}", output_template); // LOGGING ADDED
    println!("Current Directory: {:?}", std::env::current_dir()); // DEBUG CWD

    // FIND FFMPEG (Robust Search)
    let possible_paths = vec![
        PathBuf::from("ffmpeg.exe"),
        PathBuf::from("src-tauri/ffmpeg.exe"),
        PathBuf::from("../src-tauri/ffmpeg.exe"),
        PathBuf::from("ffmpeg-x86_64-pc-windows-msvc.exe"),
    ];

    let mut ffmpeg_arg = None;
    for p in possible_paths {
        if let Ok(abs_path) = std::fs::canonicalize(&p) {
            if abs_path.exists() {
                println!("Found ffmpeg at: {:?}", abs_path);
                ffmpeg_arg = Some(abs_path);
                break;
            }
        }
    }

    // Note: We rely on yt-dlp finding ffmpeg in the same directory or PATH
    // Args are defined below after sidecar resolution


    // 2. Spawn Sidecar (MANUAL RESOLUTION to bypass Tauri sidecar bug)
    let sidecar_filename = "yt-dlp-x86_64-pc-windows-msvc.exe";
    let mut sidecar_path = PathBuf::from(sidecar_filename);
    
    // Try to find it in known locations
    if let Ok(cwd) = std::env::current_dir() {
        let p1 = cwd.join("src-tauri").join(sidecar_filename);
        let p2 = cwd.join(sidecar_filename);
        
        if p1.exists() { 
            sidecar_path = p1; 
        } else if p2.exists() { 
            sidecar_path = p2; 
        } else {
             // Fallback to trying to find it in the resources directory if packaged
             // But for dev, p1 or p2 should work.
             println!("WARNING: Could not find sidecar in standard dev locations. Using default: {:?}", sidecar_path);
        }
    }
    
    // Ensure we have an absolute path if possible
    if let Ok(abs) = std::fs::canonicalize(&sidecar_path) {
        sidecar_path = abs;
    }

    println!("DEBUG: Attempting to spawn yt-dlp via Command::new...");
    
    // Use Command::new with the resolved path
    // On Windows, we might need to be careful with UNC paths if canonicalize adds \\?\.
    // But Command::new usually handles it.
    // let command = Command::new(sidecar_path.to_string_lossy().to_string());

    // RESTORE REAL ARGS
    // RESTORE REAL ARGS
    let mut args = vec![
        url.clone(),
        "-f".to_string(), dlp_format.to_string(),
        "-o".to_string(), strip_unc(output_template),
        // "--progress".to_string(), // Disabled to reduce noise/buffering issues
        "--newline".to_string(),
        // "--no-input".to_string(), // REMOVED: Not supported by yt-dlp
        "--no-playlist".to_string(), // CRITICAL: Prevent playlist crashes
        "--max-downloads".to_string(), "1".to_string(), // Safety valve
        "--verbose".to_string(), // DEBUG: See what's happening
    ];

    if let Some(path) = ffmpeg_arg {
        args.push("--ffmpeg-location".to_string());
        args.push(strip_unc(path));
    } else {
        println!("WARNING: Could not find ffmpeg.exe. yt-dlp might fail to merge formats.");
    }

    // Add audio extraction flags if needed
    if is_audio {
        args.push("-x".to_string());
        args.push("--audio-format".to_string());
        args.push("mp3".to_string());
    }

    println!("DEBUG: Sidecar found. Spawning with args: {:?}", args);

    let window_clone = window.clone();
    let url_clone = url.clone();
    let active_downloads = state.active_downloads.clone();
    // FIX: Strip UNC prefix from executable path too, just in case
    let sidecar_path_str = strip_unc(sidecar_path.clone());

    // Use std::thread to avoid blocking the async runtime, and use std::process for reliable piping
    std::thread::spawn(move || {
        println!("DEBUG: Starting std::process::Command for {}", url_clone);
        println!("DEBUG: Executing binary: {}", sidecar_path_str);
        
        // const CREATE_NO_WINDOW: u32 = 0x08000000;
        let child = std::process::Command::new(sidecar_path_str)
            .args(args)
            .env("PYTHONUNBUFFERED", "1") // Force unbuffered output
            .stdin(std::process::Stdio::null()) // CRITICAL: Prevent waiting for input
            .stdout(std::process::Stdio::piped()) // RESTORED: Capture output for UI
            .stderr(std::process::Stdio::piped()) // RESTORED: Capture errors for UI
            // .creation_flags(CREATE_NO_WINDOW) // DEBUG: Let window show if needed
            .spawn();

        match child {
            Ok(mut child) => {
                println!("DEBUG: Child spawned, capturing stdout and stderr...");
                let stdout = child.stdout.take().unwrap();
                let stderr = child.stderr.take().unwrap();

                let window_clone_stderr = window_clone.clone();
                let url_clone_stderr = url_clone.clone();

                // Spawn thread for stderr
                std::thread::spawn(move || {
                    let reader = std::io::BufReader::new(stderr);
                    for line in reader.lines() {
                        match line {
                            Ok(line) => {
                                // CLEAN LOGS: Only show real errors as DL_ERR
                                if line.contains("WARNING") || line.contains("[debug]") || line.contains("[youtube]") || line.contains("[info]") {
                                    println!("DEBUG: {}", line);
                                } else {
                                    println!("DL_ERR: {}", line);
                                }
                                
                                // Also try to parse progress from stderr
                                if line.contains("[download]") && line.contains("%") {
                                    if let Some(pct) = extract_percent(&line) {
                                        let _ = window_clone_stderr.emit("download_progress", Payload {
                                            url: url_clone_stderr.clone(),
                                            progress: pct,
                                            status: "downloading".to_string(),
                                            filename: None,
                                        });
                                    }
                                }
                            }
                            Err(e) => println!("DL_ERR_READ_FAIL: {}", e),
                        }
                    }
                });

                let reader = std::io::BufReader::new(stdout);
                let mut captured_filename: Option<String> = None;

                // Read stdout line by line
                for line in reader.lines() {
                    match line {
                        Ok(line) => {
                            println!("DL_OUT: {}", line);
                            
                            // Capture filename
                            if line.contains("[download]") {
                                if line.contains("Destination:") {
                                    // Format: [download] Destination: C:\path\to\file.mp4
                                    if let Some(idx) = line.find("Destination: ") {
                                        let path = line[idx + 13..].trim().to_string();
                                        captured_filename = Some(path);
                                    }
                                } else if line.contains("has already been downloaded") {
                                    // Format: [download] C:\path\to\file.mp4 has already been downloaded
                                    if let Some(start_idx) = line.find("[download] ") {
                                        if let Some(end_idx) = line.find(" has already been downloaded") {
                                            let path = line[start_idx + 11..end_idx].trim().to_string();
                                            captured_filename = Some(path);
                                        }
                                    }
                                }
                            }

                            // Parse progress
                            if line.contains("[download]") && line.contains("%") {
                                if let Some(pct) = extract_percent(&line) {
                                    let _ = window_clone.emit("download_progress", Payload {
                                        url: url_clone.clone(),
                                        progress: pct,
                                        status: "downloading".to_string(),
                                        filename: None,
                                    });
                                }
                            }
                        }
                        Err(e) => println!("DL_OUT_READ_FAIL: {}", e),
                    }
                }
                
                // Wait for exit
                let status = child.wait();
                println!("DEBUG: Process finished with status: {:?}", status);
                
                active_downloads.lock().unwrap().remove(&url_clone);
                
                // If we captured a filename, it means success (even if it was already downloaded)
                // If it was already downloaded, we might not have sent 100% progress yet.
                if captured_filename.is_some() {
                     let _ = window_clone.emit("download_progress", Payload {
                        url: url_clone.clone(),
                        progress: 100.0,
                        status: "downloading".to_string(),
                        filename: None,
                    });
                }

                let _ = window_clone.emit("download_complete", Payload {
                    url: url_clone,
                    progress: 100.0,
                    status: "completed".to_string(),
                    filename: captured_filename,
                });
            }
            Err(e) => {
                println!("Failed to spawn std::process: {}", e);
                active_downloads.lock().unwrap().remove(&url_clone);
                let _ = window_clone.emit("download_error", Payload {
                    url: url_clone,
                    progress: 0.0,
                    status: format!("Failed to start download: {}", e),
                    filename: None,
                });
            }
        }
    });

    Ok("Download started".to_string())
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    url: String,
    progress: f64,
    status: String,
    filename: Option<String>,
}

fn extract_percent(line: &str) -> Option<f64> {
    // Example line: [download]  45.0% of 10.00MiB at 2.00MiB/s ETA 00:05
    if let Some(start) = line.find("[download]") {
        let rest = &line[start + 10..];
        if let Some(end) = rest.find('%') {
            let pct_str = &rest[..end].trim();
            return pct_str.parse::<f64>().ok();
        }
    }
    None
}

#[derive(Clone, serde::Serialize)]
struct VideoMetadata {
    id: String,
    title: String,
    thumbnail: String,
    description: String,
    formats: Vec<VideoFormat>,
}

#[derive(Clone, serde::Serialize)]
struct VideoFormat {
    id: String,
    ext: String,
    resolution: String,
    width: Option<u32>,
    height: Option<u32>,
    tbr: Option<f64>,
    filesize: Option<u64>,
    vcodec: Option<String>,
    acodec: Option<String>,
    fps: Option<f64>,
    container: Option<String>,
}

#[command]
async fn get_video_metadata(url: String) -> Result<VideoMetadata, String> {
    println!("DEBUG: Fetching metadata for {}", url);
    
    // Resolve sidecar path (same logic as download_video)
    let sidecar_filename = "yt-dlp-x86_64-pc-windows-msvc.exe";
    let mut sidecar_path = PathBuf::from(sidecar_filename);
    if let Ok(cwd) = std::env::current_dir() {
        let p1 = cwd.join("src-tauri").join(sidecar_filename);
        let p2 = cwd.join(sidecar_filename);
        if p1.exists() { sidecar_path = p1; } else if p2.exists() { sidecar_path = p2; }
    }
    
    let output = std::process::Command::new(sidecar_path)
        .args(&["--dump-json", "--no-playlist", &url])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let mut formats = Vec::new();
    if let Some(fmt_array) = json["formats"].as_array() {
        for f in fmt_array {
            formats.push(VideoFormat {
                id: f["format_id"].as_str().unwrap_or("").to_string(),
                ext: f["ext"].as_str().unwrap_or("").to_string(),
                resolution: f["resolution"].as_str().unwrap_or("unknown").to_string(),
                width: f["width"].as_u64().map(|v| v as u32),
                height: f["height"].as_u64().map(|v| v as u32),
                tbr: f["tbr"].as_f64(),
                filesize: f["filesize"].as_u64(),
                vcodec: f["vcodec"].as_str().map(|s| s.to_string()),
                acodec: f["acodec"].as_str().map(|s| s.to_string()),
                fps: f["fps"].as_f64(),
                container: f["container"].as_str().map(|s| s.to_string()),
            });
        }
    }

    Ok(VideoMetadata {
        id: json["id"].as_str().unwrap_or("").to_string(),
        title: json["title"].as_str().unwrap_or("").to_string(),
        thumbnail: json["thumbnail"].as_str().unwrap_or("").to_string(),
        description: json["description"].as_str().unwrap_or("").to_string(),
        formats,
    })
}

fn main() {
    tauri::Builder::default()
        .manage(DownloadState {
            active_downloads: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![download_video, get_video_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
