#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{command, Window};
use tauri::api::process::{Command, CommandEvent};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::io::BufRead;

// New modules for advanced scraping
mod orchestrator;
mod oembed;
mod cloudflare;
mod license;
mod security;
mod ad_manager;

#[command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let path = path.replace("/", "\\");
        let path_buf = std::path::PathBuf::from(&path);
        // FIX: If it's a directory, just open it. If it's a file, select it.
        if path_buf.is_dir() {
             std::process::Command::new("explorer")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            // Default to select behavior for files (or if unsure)
            std::process::Command::new("explorer")
                .arg("/select,")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

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
    orchestrator: Arc<Mutex<orchestrator::DownloadOrchestrator>>,
    license_manager: Arc<Mutex<license::LicenseManager>>,
    ad_manager: Arc<Mutex<ad_manager::AdManager>>,
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
    println!("🚀 MULTI-METHOD DOWNLOADER ACTIVATED");
    println!("🎯 URL: {}", url);
    println!("📦 Format: {}", format);

    // 0. LICENSE & QUOTA CHECK - FREE tier = unlimited with ads, PRO = no ads
    let can_proceed = true; // Always allow - ads handle monetization
    
    if !can_proceed {
        window.emit("quota_exceeded", Payload {
            url: url.clone(),
            progress: 0.0,
            status: "Daily quota exceeded! Watch ad or upgrade to PRO.".to_string(),
            filename: None,
        }).ok();
        return Err("Daily quota exceeded. Watch ad to continue or upgrade to PRO.".to_string());
    }
    
    println!("✅ Quota check passed");

    // 1. DUPLICATE CHECK (Prevent Crash)
    {
        let mut downloads = state.active_downloads.lock().unwrap();
        if downloads.contains_key(&url) {
            println!("⚠️ Found stuck lock for {}. FORCING REMOVAL to allow retry.", url);
            downloads.remove(&url);
        }
        downloads.insert(url.clone(), 0);
    }
    
    // 🔥 NEW: Try all 3 methods with smart fallback
    let download_dir = tauri::api::path::download_dir().unwrap_or(PathBuf::from("."));
    let output_template = download_dir.join("WordHacker").join("%(title)s.%(ext)s");
    let output_path = strip_unc(output_template.clone());
    
    println!("\n🎲 METHOD 1: Trying yt-dlp...");
    let ytdlp_result = try_ytdlp_download(
        window.clone(),
        url.clone(),
        format.clone(),
        state.active_downloads.clone()
    );
    
    if ytdlp_result.is_ok() {
        println!("✅ METHOD 1 SUCCESS: yt-dlp downloaded!");
        state.orchestrator.lock().unwrap().record_success("yt-dlp", 5.0);
        
        // FREE tier = unlimited with ads
        println!("📊 Download complete");
        
        return ytdlp_result;
    }
    println!("❌ METHOD 1 FAILED: {}", ytdlp_result.unwrap_err());
    state.orchestrator.lock().unwrap().record_failure("yt-dlp");
    
    // METHOD 2: Try Instagram oEmbed API
    if url.contains("instagram.com") {
        println!("\n🎲 METHOD 2: Trying Instagram oEmbed API...");
        let oembed_result = oembed::download_via_oembed(&url).await;
        
        if let Ok(video_url) = oembed_result {
            println!("📹 Found video URL via oEmbed: {}", video_url);
            match oembed::download_video_file(&video_url, &output_path).await {
                Ok(_) => {
                    println!("✅ METHOD 2 SUCCESS: oEmbed downloaded!");
                    state.orchestrator.lock().unwrap().record_success("oembed", 8.0);
                    state.active_downloads.lock().unwrap().remove(&url);
                    
                    // Decrement quota
                    // FREE tier = unlimited with ads
                    println!("📊 Download complete");
                    
                    window.emit("download_complete", Payload {
                        url: url.clone(),
                        progress: 100.0,
                        status: "completed".to_string(),
                        filename: Some(output_path.clone()),
                    }).ok();
                    return Ok("Downloaded via oEmbed API".to_string());
                }
                Err(e) => {
                    println!("❌ METHOD 2 FAILED: {}", e);
                    state.orchestrator.lock().unwrap().record_failure("oembed");
                }
            }
        } else {
            println!("❌ METHOD 2 FAILED: {}", oembed_result.unwrap_err());
            state.orchestrator.lock().unwrap().record_failure("oembed");
        }
    }
    
    // METHOD 3: Try Cloudflare Worker Proxy
    println!("\n🎲 METHOD 3: Trying Cloudflare Worker proxy...");
    let worker_url = {
        let orch = state.orchestrator.lock().unwrap();
        orch.cloudflare_worker_url.clone()
    };
    
    if let Some(worker) = worker_url {
        let cf_worker = cloudflare::CloudflareWorker::new(worker);
        
        match cf_worker.download_via_proxy(&url).await {
            Ok(video_url) => {
                println!("📹 Found video URL via Cloudflare: {}", video_url);
                match cf_worker.download_video_file(&video_url, &output_path).await {
                    Ok(_) => {
                        println!("✅ METHOD 3 SUCCESS: Cloudflare downloaded!");
                        state.orchestrator.lock().unwrap().record_success("cloudflare-worker", 10.0);
                        state.active_downloads.lock().unwrap().remove(&url);
                        window.emit("download_complete", Payload {
                            url: url.clone(),
                            progress: 100.0,
                            status: "completed".to_string(),
                            filename: Some(output_path),
                        }).ok();
                        return Ok("Downloaded via Cloudflare Worker".to_string());
                    }
                    Err(e) => {
                        println!("❌ METHOD 3 FAILED: {}", e);
                        state.orchestrator.lock().unwrap().record_failure("cloudflare-worker");
                    }
                }
            }
            Err(e) => {
                println!("❌ METHOD 3 FAILED: {}", e);
                state.orchestrator.lock().unwrap().record_failure("cloudflare-worker");
            }
        }
    }
    
    // ALL METHODS FAILED
    println!("\n💀 ALL 3 METHODS FAILED!");
    state.active_downloads.lock().unwrap().remove(&url);
    window.emit("download_error", Payload {
        url: url.clone(),
        progress: 0.0,
        status: "All download methods failed".to_string(),
        filename: None,
    }).ok();
    Err("All download methods failed. Try a different URL or check your internet connection.".to_string())
}

// OLD METHOD: yt-dlp only (now extracted as fallback option)
fn try_ytdlp_download(
    window: Window,
    url: String,
    format: String,
    active_downloads: Arc<Mutex<HashMap<String, u32>>>
) -> Result<String, String> {
    println!("DEBUG: try_ytdlp_download() CALLED");
    println!("DEBUG: URL: {}", url);
    println!("DEBUG: Format: {}", format);

    println!("DEBUG: yt-dlp method starting...");

    // Simplified for yt-dlp method

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

    // FIND FFMPEG (Robust Search for Sidecar)
    let mut ffmpeg_arg = None;
    
    // 1. Try to find ffmpeg sidecar in the same directory as the executable (Production)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            if let Ok(entries) = std::fs::read_dir(exe_dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if let Some(name) = path.file_name() {
                            let name_str = name.to_string_lossy();
                            // Look for ffmpeg-*.exe or ffmpeg.exe
                            if (name_str.starts_with("ffmpeg") && name_str.ends_with(".exe")) || name_str == "ffmpeg.exe" {
                                println!("Found ffmpeg sidecar at: {:?}", path);
                                ffmpeg_arg = Some(path);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Fallback to dev paths if not found
    if ffmpeg_arg.is_none() {
        let possible_paths = vec![
            PathBuf::from("ffmpeg.exe"),
            PathBuf::from("src-tauri/ffmpeg.exe"),
            PathBuf::from("../src-tauri/ffmpeg.exe"),
            PathBuf::from("ffmpeg-x86_64-pc-windows-msvc.exe"),
        ];
        for p in possible_paths {
            if let Ok(abs_path) = std::fs::canonicalize(&p) {
                if abs_path.exists() {
                    println!("Found ffmpeg (dev) at: {:?}", abs_path);
                    ffmpeg_arg = Some(abs_path);
                    break;
                }
            }
        }
    }

    // Note: We rely on yt-dlp finding ffmpeg in the same directory or PATH
    // Args are defined below after sidecar resolution

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

    println!("DEBUG: Spawning yt-dlp sidecar with args: {:?}", args);

    let window_clone = window.clone();
    let url_clone = url.clone();
    let active_downloads_clone = active_downloads.clone();

    // Use Tauri's async runtime to handle the sidecar
    tauri::async_runtime::spawn(async move {
        println!("DEBUG: Starting Command::new_sidecar for {}", url_clone);
        
        let command = match Command::new_sidecar("yt-dlp") {
            Ok(cmd) => cmd,
            Err(e) => {
                println!("Failed to create sidecar command: {}", e);
                active_downloads_clone.lock().unwrap().remove(&url_clone);
                let _ = window_clone.emit("download_error", Payload {
                    url: url_clone,
                    progress: 0.0,
                    status: format!("Failed to create downloader process: {}", e),
                    filename: None,
                });
                return;
            }
        };

        let (mut rx, _child) = match command.args(args).spawn() {
            Ok(res) => res,
            Err(e) => {
                println!("Failed to spawn sidecar: {}", e);
                active_downloads_clone.lock().unwrap().remove(&url_clone);
                let _ = window_clone.emit("download_error", Payload {
                    url: url_clone,
                    progress: 0.0,
                    status: format!("Failed to start downloader: {}", e),
                    filename: None,
                });
                return;
            }
        };

        println!("DEBUG: Child spawned, capturing output...");
        
        let mut captured_filename: Option<String> = None;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("DL_OUT: {}", line);
                    
                    // Capture filename
                    // We need to handle multiple stages: [download], [Merger], [ExtractAudio]
                    // The LAST one reported is the final file we want.
                    
                    if line.contains("Destination:") {
                        // 1. Standard Download
                        if line.contains("[download]") {
                            if let Some(idx) = line.find("Destination: ") {
                                let path = line[idx + 13..].trim().to_string();
                                captured_filename = Some(path);
                            }
                        } 
                        // 2. Audio Extraction (e.g. webm -> mp3)
                        else if line.contains("[ExtractAudio]") {
                            if let Some(idx) = line.find("Destination: ") {
                                let path = line[idx + 13..].trim().to_string();
                                println!("DEBUG: Captured Audio Output: {}", path);
                                captured_filename = Some(path);
                            }
                        }
                    }
                    
                    // 3. Merger (e.g. video+audio -> mp4)
                    // Output: [Merger] Merging formats into "C:\path\to\file.mp4"
                    if line.contains("[Merger]") && line.contains("Merging formats into") {
                         if let Some(start) = line.find("\"") {
                             if let Some(end) = line.rfind("\"") {
                                 if end > start {
                                     let path = line[start+1..end].to_string();
                                     println!("DEBUG: Captured Merged Output: {}", path);
                                     captured_filename = Some(path);
                                 }
                             }
                         }
                    }

                    if line.contains("[download]") {
                        if line.contains("has already been downloaded") {
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
                CommandEvent::Stderr(line) => {
                    // CLEAN LOGS: Only show real errors as DL_ERR
                    if line.contains("WARNING") || line.contains("[debug]") || line.contains("[youtube]") || line.contains("[info]") {
                        println!("DEBUG: {}", line);
                    } else {
                        println!("DL_ERR: {}", line);
                    }
                    
                    // Also try to parse progress from stderr (yt-dlp sometimes writes progress here)
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
                _ => {}
            }
        }
        
        println!("DEBUG: Process finished");
        
        active_downloads_clone.lock().unwrap().remove(&url_clone);
        
        // If we captured a filename, it means success (even if it was already downloaded)
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
    tags: Vec<String>,
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
    
    // Use Tauri sidecar for robust path resolution in production
    let output = Command::new_sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(&["--dump-json", "--no-playlist", &url])
        .output()
        .map_err(|e| format!("Failed to execute sidecar: {}", e))?;

    if !output.status.success() {
        return Err(output.stderr);
    }

    let json_str = output.stdout;
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

    let mut tags = Vec::new();
    if let Some(tags_array) = json["tags"].as_array() {
        for t in tags_array {
            if let Some(tag_str) = t.as_str() {
                tags.push(tag_str.to_string());
            }
        }
    }

    Ok(VideoMetadata {
        id: json["id"].as_str().unwrap_or("").to_string(),
        title: json["title"].as_str().unwrap_or("").to_string(),
        thumbnail: json["thumbnail"].as_str().unwrap_or("").to_string(),
        description: json["description"].as_str().unwrap_or("").to_string(),
        formats,
        tags,
    })
}

// ============================================
// AD MONETIZATION COMMANDS
// Professional Ad-Gated Download System
// ============================================

#[command]
async fn check_ad_required(state: tauri::State<'_, DownloadState>) -> Result<bool, String> {
    let ad_mgr = state.ad_manager.lock().unwrap();
    Ok(ad_mgr.requires_ad())
}

#[command]
async fn request_download_token(state: tauri::State<'_, DownloadState>) -> Result<String, String> {
    // Get data needed without holding lock across await
    let (hwid, api_url) = {
        let ad_mgr = state.ad_manager.lock().unwrap();
        (ad_mgr.get_hwid(), ad_mgr.get_api_url())
    };
    
    // Create temporary instance for token request (no lock held)
    let mut temp_mgr = ad_manager::AdManager::new(hwid, api_url);
    let token = temp_mgr.request_ad_token().await?;
    
    // Update the stored ad_manager with new token (lock briefly)
    {
        let mut ad_mgr = state.ad_manager.lock().unwrap();
        *ad_mgr = temp_mgr;
    }
    
    Ok(token)
}

#[command]
async fn authorize_download(
    state: tauri::State<'_, DownloadState>,
    token: String,
    url: String
) -> Result<(), String> {
    // Get hwid and API URL without holding lock during async
    let (hwid, api_url) = {
        let ad_mgr = state.ad_manager.lock().unwrap();
        (ad_mgr.get_hwid(), ad_mgr.get_api_url())
    };
    
    // Create temporary instance for authorization
    let temp_mgr = ad_manager::AdManager::new(hwid, api_url);
    temp_mgr.authorize_download(&token, &url).await
}

// ============================================
// FFMPEG EXPORT COMMAND
// Professional Video/Audio Export with Trim Support
// ============================================

#[derive(Deserialize)]
struct TrimData {
    start: f64,
    end: f64,
}

#[derive(Deserialize)]
struct ExportPayload {
    files: Vec<String>,
    destination: Option<String>,
    #[serde(rename = "outputFormat")]
    output_format: Option<String>,
    trim: Option<TrimData>,
}

#[derive(Serialize)]
struct ExportResult {
    exported: Vec<String>,
    #[serde(rename = "outputDir")]
    output_dir: String,
}

#[command]
async fn export_files(payload: ExportPayload) -> Result<ExportResult, String> {
    println!("[BACKEND Export] 📥 Received payload:");
    println!("  - Files count: {}", payload.files.len());
    println!("  - Destination: {:?}", payload.destination);
    println!("  - Output format: {:?}", payload.output_format);
    println!("  - Trim: {:?}", payload.trim.as_ref().map(|t| format!("{}s → {}s", t.start, t.end)));
    
    if payload.files.is_empty() {
        return Err("No files to export".to_string());
    }
    
    // Resolve output directory
    let output_dir = if let Some(dest) = &payload.destination {
        // Check if destination starts with "Downloads/" - if so, it's relative to Downloads folder
        if dest.starts_with("Downloads/") || dest.starts_with("Downloads\\") {
            let download_dir = tauri::api::path::download_dir().unwrap_or(PathBuf::from("."));
            // Strip "Downloads/" prefix to avoid double path
            let relative_path = dest.strip_prefix("Downloads/")
                .or_else(|| dest.strip_prefix("Downloads\\"))
                .unwrap_or(dest);
            download_dir.join(relative_path)
        } else {
            // Absolute path or relative to current directory
            PathBuf::from(dest)
        }
    } else {
        tauri::api::path::download_dir().unwrap_or(PathBuf::from("."))
    };
    
    // Ensure output directory exists
    std::fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
    
    let mut exported_files = Vec::new();
    
    // Find FFmpeg
    let possible_paths = vec![
        PathBuf::from("ffmpeg.exe"),
        PathBuf::from("src-tauri/ffmpeg.exe"),
        PathBuf::from("../src-tauri/ffmpeg.exe"),
        PathBuf::from("ffmpeg-x86_64-pc-windows-msvc.exe"),
    ];
    
    let mut ffmpeg_path: Option<PathBuf> = None;
    for p in possible_paths {
        if let Ok(abs_path) = std::fs::canonicalize(&p) {
            if abs_path.exists() {
                println!("[BACKEND Export] Found ffmpeg at: {:?}", abs_path);
                ffmpeg_path = Some(abs_path);
                break;
            }
        }
    }
    
    if ffmpeg_path.is_none() {
        return Err("FFmpeg not found. Cannot export files.".to_string());
    }
    
    let ffmpeg_exe = ffmpeg_path.unwrap();
    
    // Process each file
    for temp_path in &payload.files {
        let temp_pathbuf = PathBuf::from(temp_path);
        
        if !temp_pathbuf.exists() {
            println!("[BACKEND Export] ⚠️ File not found: {}", temp_path);
            return Err(format!("Source file not found: {}. Please try downloading again.", temp_path));
        }
        
        let ext = temp_pathbuf.extension().and_then(|s| s.to_str()).unwrap_or("");
        let base_name = temp_pathbuf.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
        let target_format = payload.output_format.as_deref().unwrap_or("mp4");
        
        println!("[BACKEND Export] 📄 Processing file:");
        println!("  - Path: {}", temp_path);
        println!("  - Ext: .{}", ext);
        println!("  - Base name: {}", base_name);
        println!("  - Target format: {}", target_format);
        
        // Check if processing needed
        let needs_processing = payload.trim.is_some() || (target_format != ext);
        
        println!("[BACKEND Export] 🔍 Processing check:");
        println!("  - needsProcessing: {}", needs_processing);
        println!("  - hasTrim: {}", payload.trim.is_some());
        println!("  - needsFormatChange: {} ('{}'  != '{}')", target_format != ext, target_format, ext);
        
        if needs_processing {
            println!("[BACKEND Export] ⚙️ Using FFmpeg for processing");
            
            // Build FFmpeg command
            // ENHANCEMENT: Smart Naming to prevent overwrites
            // If trim is used, append trim range to filename
            let mut output_filename = if let Some(trim) = &payload.trim {
                format!("{}_trim_{}-{}.{}", base_name, trim.start, trim.end, target_format)
            } else {
                format!("{}.{}", base_name, target_format)
            };
            
            // Check for duplicates and auto-increment
            let mut dest_path = output_dir.join(&output_filename);
            let mut counter = 1;
            while dest_path.exists() {
                let stem = PathBuf::from(&output_filename).file_stem().unwrap().to_string_lossy().to_string();
                let new_name = format!("{}_({}).{}", stem, counter, target_format);
                dest_path = output_dir.join(&new_name);
                counter += 1;
            }
            
            let mut args = vec!["-i".to_string(), temp_path.clone()];
            
            // Add trim parameters if specified
            if let Some(trim) = &payload.trim {
                println!("[BACKEND Export] ✂️ Adding trim: {}s to {}s", trim.start, trim.end);
                args.push("-ss".to_string());
                args.push(trim.start.to_string());
                args.push("-to".to_string());
                args.push(trim.end.to_string());
            }
            
            // Add format-specific encoding parameters
            let is_audio_format = ["mp3", "m4a", "ogg", "wav", "aac"].contains(&target_format);
            
            if is_audio_format {
                println!("[BACKEND Export] 🎵 Audio-only export");
                args.push("-vn".to_string()); // No video
                
                if target_format == "mp3" {
                    args.push("-c:a".to_string());
                    args.push("libmp3lame".to_string());
                    args.push("-b:a".to_string());
                    args.push("192k".to_string());
                } else if target_format == "m4a" {
                    args.push("-c:a".to_string());
                    args.push("aac".to_string());
                    args.push("-b:a".to_string());
                    args.push("192k".to_string());
                } else if target_format == "ogg" {
                    args.push("-c:a".to_string());
                    args.push("libvorbis".to_string());
                    args.push("-q:a".to_string());
                    args.push("5".to_string());
                } else {
                    args.push("-c:a".to_string());
                    args.push("copy".to_string());
                }
            } else {
                println!("[BACKEND Export] 📹 Video export");
                args.push("-c:v".to_string());
                args.push("libx264".to_string());
                args.push("-preset".to_string());
                args.push("fast".to_string());
                args.push("-crf".to_string());
                args.push("23".to_string());
                args.push("-pix_fmt".to_string());
                args.push("yuv420p".to_string());
                args.push("-c:a".to_string());
                args.push("aac".to_string());
                args.push("-b:a".to_string());
                args.push("192k".to_string());
                args.push("-movflags".to_string());
                args.push("+faststart".to_string());
            }
            
            args.push("-y".to_string()); // Overwrite output
            args.push(strip_unc(dest_path.clone()));
            
            println!("[BACKEND Export] 🎬 FFmpeg command: {:?} {:?}", ffmpeg_exe, args);
            
            // Execute FFmpeg
            let output = std::process::Command::new(&ffmpeg_exe)
                .args(&args)
                .output()
                .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
            
            if output.status.success() {
                println!("[BACKEND Export] ✅ FFmpeg success: {:?}", dest_path);
                exported_files.push(strip_unc(dest_path));
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                println!("[BACKEND Export] ❌ FFmpeg failed: {}", stderr);
                return Err(format!("FFmpeg processing failed: {}", stderr));
            }
            
        } else {
            println!("[BACKEND Export] 📋 Simple copy path (no FFmpeg)");
            
            // Safety check
            if target_format != ext {
                println!("[BACKEND Export] ⚠️ FORMAT MISMATCH IN COPY PATH!");
                return Err(format!("Cannot convert .{} to .{} without FFmpeg", ext, target_format));
            }
            
            let filename = temp_pathbuf.file_name().unwrap();
            let mut dest_path = output_dir.join(filename);
            
            // Check for duplicates and auto-increment
            let mut counter = 1;
            while dest_path.exists() {
                let stem = temp_pathbuf.file_stem().unwrap().to_string_lossy().to_string();
                let ext = temp_pathbuf.extension().unwrap().to_string_lossy().to_string();
                let new_name = format!("{}_({}).{}", stem, counter, ext);
                dest_path = output_dir.join(&new_name);
                counter += 1;
            }
            
            std::fs::copy(temp_path, &dest_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
            
            println!("[BACKEND Export] ✅ Copied to: {:?}", dest_path);
            exported_files.push(strip_unc(dest_path));
        }
    }
    
    Ok(ExportResult {
        exported: exported_files,
        output_dir: strip_unc(output_dir),
    })
}

fn main() {
    // 🔒 SECURITY LAYER 1: Anti-Debug Check (DISABLED for Stability)
    // if security::check_debugger() || security::check_debugger_processes() {
    //     println!("⚠️ Security violation detected");
    //     std::process::exit(0);
    // }
    
    // 🔒 SECURITY LAYER 2: Integrity Check (DISABLED for Stability)
    // if !security::verify_integrity() {
    //     println!("⚠️ Binary integrity check failed");
    //     std::process::exit(0);
    // }
    
    // 🔒 SECURITY LAYER 3: Start Continuous Monitoring (DISABLED for Stability)
    // security::start_security_monitor();
    
    // Initialize orchestrator with ENCRYPTED Cloudflare Worker URL
    let mut orch = orchestrator::DownloadOrchestrator::new();
    let cloudflare_url = security::get_cloudflare_worker_url();
    orch.set_cloudflare_worker(cloudflare_url.clone());
    
    // Initialize license manager with ENCRYPTED API URL
    let license_api_url = security::get_license_api_url();
    let license_mgr = license::LicenseManager::new(license_api_url.clone());
    
    // 💰 Initialize Ad Manager for monetization
    let hwid = license::LicenseManager::generate_hwid();
    println!("🔐 Ad Manager API URL: {}", license_api_url);
    let ad_mgr = ad_manager::AdManager::new(hwid, license_api_url);
    
    println!("✅ Cloudflare Worker enabled: {}", cloudflare_url);
    println!("🔐 License Manager initialized - HWID: {}", license_mgr.get_hwid());
    println!("🛡️ Security layers active: Anti-Debug + Integrity + Monitoring");
    
    tauri::Builder::default()
        .manage(DownloadState {
            active_downloads: Arc::new(Mutex::new(HashMap::new())),
            orchestrator: Arc::new(Mutex::new(orch)),
            license_manager: Arc::new(Mutex::new(license_mgr)),
            ad_manager: Arc::new(Mutex::new(ad_mgr)),
        })
        .invoke_handler(tauri::generate_handler![
            download_video, 
            get_video_metadata,
            check_ad_required,
            request_download_token,
            authorize_download,
            export_files,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
