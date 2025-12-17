use std::path::Path;
use serde::{Deserialize, Serialize};
use jwalk::WalkDir as JWalkDir;
use sysinfo::{Disks, System, RefreshKind, CpuRefreshKind, MemoryRefreshKind};
use std::sync::{Arc, RwLock, Mutex};
use std::sync::atomic::{AtomicUsize, Ordering};
use tauri::State;
use tauri::Manager; 
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};

pub mod usn_engine;
pub mod lazy_engine; // NEW: Lazy evaluation for instant boot
// ELITE ENGINE MODULE

// ------------------------------------------------------------------
// DATA MODELS
// ------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppInfo {
    pub name: String,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SystemHealth {
    pub cpu_usage: f32, // Percentage (0-100)
    pub ram_total: u64, // Bytes
    pub ram_used: u64, // Bytes
    pub ram_percent: f32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StorageNode {
    pub name: String,
    pub size: u64,
    pub children: Vec<StorageNode>,
    pub is_dir: bool, // ELITE: Fix for file drill-down bug
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub name_lower: String, 
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DiskStats {
    pub total: u64,
    pub used: u64,
    pub free: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CortexReport {
    pub safety_score: u8, 
    pub description: String,
    pub recommendation: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JunkInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub reason: String,
}

#[derive(Serialize)]
struct HunterStatus {
    total_files: usize,
    is_indexing: bool,
    scanned_count: usize, // Live feedback
}

#[derive(Serialize)]
struct OllamaStatus {
    installed: bool,
    models: Vec<String>,
    needs_setup: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SectorScanResult {
    pub nodes: Vec<StorageNode>,
    pub largest_files: Vec<FileInfo>,
}

#[derive(Serialize)]
pub struct CortexResponse {
    pub text: String,
    pub related_files: Vec<FileInfo>,
}

// ------------------------------------------------------------------
// SEARCH ENGINE ARCHITECTURE
// ------------------------------------------------------------------

struct SearchCache {
    query: String,
    indices: Vec<usize>,
}

struct LazySearchCache {
    query: String,
    results: Vec<(usize, u64)>, // (map_index, fid)
}

struct SearchEngine {
    index: Vec<FileInfo>,
    // NEW: HashMap for instant lookups by name prefix
    name_index: std::collections::HashMap<String, Vec<usize>>, // prefix -> file indices
    elite_maps: Vec<crate::lazy_engine::EliteMaps>, // NEW: Support Multiple Drives
    is_indexing: bool,
    scanned_count: Arc<AtomicUsize>, // LIVE FEEDBACK
    cache: Mutex<SearchCache>, // INCREMENTAL SEARCH CACHE (Verified)
    lazy_cache: Mutex<LazySearchCache>, // INCREMENTAL SEARCH CACHE (Lazy)
}

impl SearchEngine {
    fn new() -> Self {
        Self {
            index: Vec::with_capacity(500_000), 
            name_index: std::collections::HashMap::new(),
            elite_maps: Vec::new(), // Will be populated on first scan
            is_indexing: false,
            scanned_count: Arc::new(AtomicUsize::new(0)),
            cache: Mutex::new(SearchCache { query: String::new(), indices: Vec::new() }),
            lazy_cache: Mutex::new(LazySearchCache { query: String::new(), results: Vec::new() }),
        }
    }
    
    // Build HashMap index for instant lookups
    fn build_name_index(&mut self) {
        self.name_index.clear();
        
        for (idx, file) in self.index.iter().enumerate() {
            let name_lower = file.name_lower.clone();
            
            // Index by first 2 CHARACTERS (not bytes!) for Unicode safety
            let chars: Vec<char> = name_lower.chars().collect();
            if chars.len() >= 2 {
                let prefix: String = chars.iter().take(2).collect();
                self.name_index.entry(prefix).or_insert_with(Vec::new).push(idx);
            }
            
            // Also index full words for exact matching
            for word in name_lower.split(|c: char| !c.is_alphanumeric()) {
                if word.len() >= 2 {
                    self.name_index.entry(word.to_string()).or_insert_with(Vec::new).push(idx);
                }
            }
        }
        
        println!("✅ [Hunter] Name index built: {} prefixes for instant search", self.name_index.len());
    }

    fn search(&self, query: &str, limit: usize) -> Vec<FileInfo> {
        // PHASE 2: Use verified index if ready (18s+)
        if !self.index.is_empty() {
            // println!("🔍 [Search] Using VERIFIED index ({} files)", self.index.len());
            return self.search_verified(query, limit);
        }
        
        // PHASE 1: Use lazy maps (5s data) - INSTANT!
        if !self.elite_maps.is_empty() {
            // println!("🔍 [Search] Using LAZY maps ({} drives)", self.elite_maps.len());
            return self.search_lazy(query, limit);
        }
        
        println!("⚠️ [Search] Nothing ready yet!");
        vec![] // Nothing ready yet (first 5 seconds)
    }
    
    // Verified index search (PERFECT + INSTANT with HashMap)
    fn search_verified(&self, query: &str, limit: usize) -> Vec<FileInfo> {
        let query_lower = query.to_lowercase();
        
        if query_lower.is_empty() { return vec![]; }

        // 1. INCREMENTAL SEARCH (The "Everything" Secret)
        // If we typed one more letter, search ONLY inside previous results.
        let mut cache = self.cache.lock().unwrap();
        
        // Determine source indices (Narrowing vs Full Scan)
        // We use a boolean flag to avoid cloning the huge 0..len range
        let use_cache = query_lower.starts_with(&cache.query) && !cache.query.is_empty();
        
        // 2. TIGHT LOOP (Allocation Free)
        // Filter indices that match the query
        let mut matches: Vec<usize> = Vec::with_capacity(if use_cache { cache.indices.len() } else { 1000 }); 
        
        if use_cache {
             // Narrowing down: Scan only cached indices
             for &idx in &cache.indices {
                 if self.index[idx].name_lower.contains(&query_lower) {
                     matches.push(idx);
                 }
             }
        } else {
             // Full scan: Scan all files (Fast in Rust if no allocations)
             for (idx, file) in self.index.iter().enumerate() {
                 if file.name_lower.contains(&query_lower) {
                     matches.push(idx);
                 }
             }
        }

        // 3. UPDATE CACHE
        cache.query = query_lower.clone();
        cache.indices = matches.clone(); // Cache ALL matches for next narrowing

        // 4. SCORE & SORT (Only top results)
        // We only score the matches, not the whole DB.
        let mut scored: Vec<(u32, usize)> = matches.iter().map(|&idx| {
            let file = &self.index[idx];
            let mut score = 0;
            
            // Simple scoring to avoid Jaro-Winkler overhead in hot path
            if file.name_lower == query_lower { score += 1000; }
            else if file.name_lower.starts_with(&query_lower) { score += 500; }
            else { score += 100; } // Contains
            
            if file.is_dir { score += 50; } // Folder bonus
            
            (score, idx)
        }).collect();

        // Sort by score desc
        scored.sort_unstable_by(|a, b| b.0.cmp(&a.0));

        // 5. MATERIALIZE (Clone only what we show)
        scored.iter()
            .take(limit)
            .filter_map(|(_, idx)| {
                let mut file = self.index.get(*idx).cloned()?;
                
                // FETCH SIZE ON DEMAND (Fix for "0 B" in Verified Index)
                // We only do this for the top N results we are about to show.
                // This keeps the index fast (RAM only) but the UI rich.
                if file.size == 0 {
                    let metadata = std::fs::metadata(&file.path).ok();
                    file.size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    file.modified = metadata.as_ref().and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()).unwrap_or(0);
                }
                
                Some(file)
            })
            .collect()
    }
    
    /// NEW: Lazy search - BULLETPROOF RANKING (FIXED)
    fn search_lazy(&self, query: &str, limit: usize) -> Vec<FileInfo> {
        let query_lower = query.to_lowercase();
        
        if query_lower.is_empty() { 
            return vec![]; 
        }
        
        // 1. INCREMENTAL SEARCH (Lazy Mode)
        let mut cache = self.lazy_cache.lock().unwrap();
        let use_cache = query_lower.starts_with(&cache.query) && !cache.query.is_empty();
        
        let mut matches: Vec<(usize, u64)> = Vec::with_capacity(if use_cache { cache.results.len() } else { 1000 });

        // 2. TIGHT LOOP (No Jaro-Winkler, No Allocations)
        if use_cache {
            // Scan cached FIDs
            for &(map_idx, fid) in &cache.results {
                if let Some(map) = self.elite_maps.get(map_idx) {
                    if let Some(name) = map.name_map.get(&fid) {
                        if name.to_lowercase().contains(&query_lower) {
                            matches.push((map_idx, fid));
                        }
                    }
                }
            }
        } else {
            // Full Scan ALL maps
            for (map_idx, map) in self.elite_maps.iter().enumerate() {
                for (fid, name) in &map.name_map {
                    if name.to_lowercase().contains(&query_lower) {
                        matches.push((map_idx, *fid));
                    }
                }
            }
        }

        // 3. UPDATE CACHE
        cache.query = query_lower.clone();
        cache.results = matches.clone();

        // 4. SCORE & SORT
        let mut scored_results: Vec<(u32, bool, usize, u64, String)> = matches.iter().map(|&(map_idx, fid)| {
            let map = &self.elite_maps[map_idx];
            let name = map.name_map.get(&fid).unwrap(); // Safe unwrap
            let name_lower = name.to_lowercase();
            let mut score = 0;

            if name_lower == query_lower { score += 1000; }
            else if name_lower.starts_with(&query_lower) { score += 500; }
            else { score += 100; }

            // Detect folder (Simple heuristic)
            let is_folder = !name.contains('.');
            if is_folder { score += 500; }

            (score, is_folder, map_idx, fid, name.clone())
        }).collect();
        
        // Phase 2: Sort by score (highest first)
        scored_results.sort_unstable_by(|a, b| {
            b.0.cmp(&a.0) // Score descending
                .then(b.1.cmp(&a.1)) // Folders first
        });
        
        // Phase 3: Build paths ONLY for top N results (FAST!)
        let mut final_results = Vec::new();
        let mut seen_paths = std::collections::HashSet::new();
        
        for (_score, is_folder, map_idx, fid, name) in scored_results.iter().take(limit * 2) {
            let map = &self.elite_maps[*map_idx];
            if let Some(path) = crate::lazy_engine::resolve_path(*fid, map) {
                if seen_paths.insert(path.clone()) {
                    // FETCH SIZE ON DEMAND (Fix for "0 B")
                    let metadata = std::fs::metadata(&path).ok();
                    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    let modified = metadata.as_ref().and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()).unwrap_or(0);

                    final_results.push(FileInfo {
                        path: path.clone(),
                        name: name.clone(),
                        name_lower: name.to_lowercase(),
                        is_dir: *is_folder,
                        size,
                        modified,
                    });
                    
                    if final_results.len() >= limit {
                        break;
                    }
                }
            }
        }
        
        final_results
    }
}

struct TrashHunterState {
    engine: Arc<RwLock<SearchEngine>>,
}

// ------------------------------------------------------------------
// COMMANDS
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// INDEXER LOGIC
// ------------------------------------------------------------------

fn start_background_indexer(app: tauri::AppHandle, engine: Arc<RwLock<SearchEngine>>) {
    std::thread::spawn(move || {
        use tauri::Emitter;
        println!("🚀 [Indexer] Background thread started...");
        
        let mut collected_files = Vec::with_capacity(500_000);
        let mut final_count = 0;
        let mut fallback_needed = true; // Assume we need fallback until proved otherwise

        // ---------------------------------------------------------
        // ATTEMPT 1: ELITE LAZY SCAN (MULTI-DRIVE)
        // ---------------------------------------------------------
        println!("🚀 [Hunter] Attempting Elite LAZY Scan on ALL drives...");
        
        let disks = Disks::new_with_refreshed_list();
        let mut all_maps = Vec::new();
        let mut total_entries = 0;
        
        for disk in &disks {
            let mount_point = disk.mount_point().to_string_lossy().to_string();
            // Only scan fixed drives (usually C:, D:, etc.)
            if mount_point.len() <= 3 { // "C:\" or "D:\"
                 println!("🚀 [Hunter] Scanning drive: {}", mount_point);
                 let app_handle = app.clone();
                 let drive_letter = mount_point.trim_end_matches('\\').to_string(); // "C:"
                 let drive_letter_clone = drive_letter.clone();
                 
                 let elite_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || {
                    crate::lazy_engine::elite_scan_drive_lazy(&app_handle, &drive_letter_clone)
                 }));
                 
                 match elite_result {
                     Ok(Ok(maps)) => {
                         println!("⚡ [Hunter] Drive {} scanned: {} entries.", drive_letter, maps.total_entries);
                         total_entries += maps.total_entries;
                         all_maps.push(maps);
                     },
                     Ok(Err(e)) => println!("⚠️ [Hunter] Failed to scan {}: {}", drive_letter, e),
                     Err(_) => println!("🔥 [Hunter] CRASH scanning {}", drive_letter),
                 }
            }
        }

        if !all_maps.is_empty() {
            println!("⚡ [Hunter] Multi-Drive Scan SUCCESS: {} total entries.", total_entries);
            
            // Store maps in engine (PHASE 1 READY!)
            if let Ok(mut writer) = engine.write() {
                writer.elite_maps = all_maps.clone();
                writer.is_indexing = false; // CRITICAL: Allow search to work!
            }
            
            let _ = app.emit("indexing_complete", total_entries); // Phase 1 ready!
            
            // NEW: Build pre-built index from maps in background (FAST!)
            println!("🔨 [Hunter] Building pre-built index from maps for instant search...");
            let start = std::time::Instant::now();
            let mut index = Vec::with_capacity(total_entries);
            
            let mut processed = 0;
            
            for map in &all_maps {
                for (fid, name) in &map.name_map {
                    if let Some(path) = crate::lazy_engine::resolve_path(*fid, map) {
                        index.push(FileInfo {
                            path: path.clone(),
                            name: name.clone(),
                            name_lower: name.to_lowercase(),
                            is_dir: !name.contains('.'), // Simple folder detection
                            size: 0,
                            modified: 0,
                        });
                    }
                    
                    processed += 1;
                    
                    // Emit progress every 50k files (smooth updates)
                    if processed % 50_000 == 0 {
                        let percent = (processed as f32 / total_entries as f32 * 100.0) as u32;
                        let remaining_secs = ((total_entries - processed) as f32 / 120_000.0) as u32; 
                        
                        let message = if percent < 30 { "🔍 Scanning drives..." } 
                                      else if percent < 60 { "📂 Organizing files..." } 
                                      else { "⚡ Finalizing..." };
                        
                        let _ = app.emit("preparation_progress", serde_json::json!({
                            "percent": percent,
                            "message": message,
                            "remaining_seconds": remaining_secs
                        }));
                    }
                }
            }
            
            println!("✅ [Hunter] Pre-built index ready in {:?}. {} files indexed.", start.elapsed(), index.len());
            
            let index_len = index.len(); 
            
            // Set pre-built index (INSTANT SEARCH!)
            if let Ok(mut writer) = engine.write() {
                writer.index = index;
                writer.build_name_index(); 
            }
            
            let _ = app.emit("search_ready", index_len); 
            return; 
        }
        
        // ---------------------------------------------------------
        // ATTEMPT 2: CLASSIC SCROLL (The Parachute)
        // ---------------------------------------------------------
        if fallback_needed {
            println!("🪂 [Hunter] Parachute Deployed: Starting Standard JWalk Scan...");
            
            let mut roots = Vec::new();
            if let Some(user_dir) = dirs::home_dir() {
                roots.push(user_dir);
            } else {
                roots.push(std::path::PathBuf::from("C:\\"));
            }

            for root in roots {
                 // Use JWalk for parallel scanning
                 for entry in JWalkDir::new(root)
                    .skip_hidden(true)
                    .max_depth(15)
                    .into_iter() 
                    .filter_map(|e| e.ok()) 
                {
                    let file_type = entry.file_type();
                    let path = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();

                    // Skip junk (Aggressive)
                    if name.starts_with("$") || name == "System Volume Information" { continue; }
                    if name.ends_with(".tmp") || name.ends_with(".db") { continue; }

                    // Index Files AND Directories
                    let is_dir = file_type.is_dir();
                    let size = if is_dir { 0 } else { entry.metadata().map(|m| m.len()).unwrap_or(0) };

                    collected_files.push(FileInfo {
                        path: path.to_string_lossy().to_string(),
                        name_lower: name.to_lowercase(),
                        name: name,
                        is_dir: is_dir,
                        size: size,
                        modified: 0,
                    });

                    final_count += 1;
                    
                    // Live Update every 2000 files
                    if final_count % 2000 == 0 {
                        let _ = app.emit("indexing_progress", final_count);
                    }
                }
            }
        }

        println!("✅ [Indexer] Scan Complete. Indexed {} files.", final_count);
        
        // Commit to Engine
        if let Ok(mut writer) = engine.write() {
            writer.index = collected_files;
            writer.is_indexing = false;
        }

        let _ = app.emit("indexing_complete", final_count);
    });
}

#[tauri::command]
async fn ask_cortex(path: String) -> Result<CortexReport, String> {
    let lower = path.to_lowercase();
    let path_obj = Path::new(&path);
    let _name = path_obj.file_name().unwrap_or_default().to_string_lossy();
    let ext = path_obj.extension().unwrap_or_default().to_string_lossy().to_lowercase();

    let mut score = 50;
    let mut desc = "Unknown File Artifact.".to_string();
    let mut rec = "Proceed with caution.".to_string();

    if lower.contains("windows") || lower.contains("system32") || lower.contains("program files") {
        score = 0;
        desc = "CRITICAL SYSTEM FILE".to_string();
        rec = "DO NOT DELETE. System instability guaranteed.".to_string();
    } else if ext == "tmp" || ext == "log" || ext == "cache" {
        score = 100;
        desc = "Temporary Garbage".to_string();
        rec = "Safe to purge.".to_string();
    }

    Ok(CortexReport { safety_score: score, description: desc, recommendation: rec })
}

#[tauri::command]
async fn get_system_drives() -> Result<Vec<String>, String> {
    let disks = Disks::new_with_refreshed_list();
    let mut drives = Vec::new();
    for disk in &disks {
        drives.push(disk.mount_point().to_string_lossy().to_string());
    }
    drives.sort(); // Sort alphabetically (C:\, D:\, E:\)
    Ok(drives)
}

#[tauri::command]
async fn get_disk_stats(target_path: String) -> Result<DiskStats, String> {
    let disks = Disks::new_with_refreshed_list();
    
    // Normalize path: "D:" -> "D:\" to ensure matching
    let mut clean_path = target_path.clone();
    if clean_path.len() == 2 && clean_path.ends_with(':') {
        clean_path.push('\\');
    }

    let path_obj = Path::new(&clean_path);
    
    for disk in &disks {
         if path_obj.starts_with(disk.mount_point()) {
             return Ok(DiskStats {
                 total: disk.total_space(),
                 used: disk.total_space() - disk.available_space(),
                 free: disk.available_space(),
             });
         }
    }
    Ok(DiskStats { total: 0, used: 0, free: 0 })
}

#[tauri::command]
async fn scan_sector_unified(path: String) -> Result<SectorScanResult, String> {
    let mut clean_path = path.clone();
    if clean_path.len() == 2 && clean_path.ends_with(':') { 
        clean_path.push('\\'); 
    } else if !clean_path.ends_with(std::path::MAIN_SEPARATOR) {
         clean_path.push(std::path::MAIN_SEPARATOR);
    }
    
    let path_obj = Path::new(&clean_path);
    if !path_obj.exists() { return Err(format!("Path unreachable: {}", clean_path)); }

    // Use JWalk for fast parallel recursion (Depth 3 for Tree Map)
    // We need to build a tree. JWalk is iterative.
    // Converting flat JWalk to Tree is complex.
    // Simpler: Use a custom recursive function with helper.
    
    let root_node = scan_recursive(path_obj, 0, 3);
    
    // Get Largest Files separately (Fast JWalk scan)
    let mut big_files = Vec::new();
     for entry in JWalkDir::new(path_obj).max_depth(5).skip_hidden(true).sort(true) {
        if let Ok(e) = entry {
            if e.file_type().is_file() {
                let size = e.metadata().map(|m| m.len()).unwrap_or(0);
                if size > 10 * 1024 * 1024 { // > 10MB
                     big_files.push(FileInfo {
                        path: e.path().to_string_lossy().to_string(),
                        name: e.file_name().to_string_lossy().to_string(),
                        name_lower: e.file_name().to_string_lossy().to_lowercase(),
                        is_dir: false,
                        size,
                        modified: 0
                    });
                }
            }
        }
     }
    big_files.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(SectorScanResult {
        nodes: root_node.children, // Return children of root as top level list
        largest_files: big_files.into_iter().take(50).collect()
    })
}

fn scan_recursive(path: &Path, current_depth: usize, max_depth: usize) -> StorageNode {
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut size = 0;
    let mut children = Vec::new();

    if current_depth < max_depth && path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let child_path = entry.path();
                // Skip symbolic links to avoid loops?
                let child_node = scan_recursive(&child_path, current_depth + 1, max_depth);
                size += child_node.size;
                // Only include "significant" children in the visualization tree to save JSON size
                if child_node.size > 1_000_000 || current_depth < 2 { // Keep > 1MB or top levels
                    children.push(child_node);
                }
            }
        }
    } else {
        // Leaf or Max Depth
        size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    }
    
    // Sort children by size descending
    children.sort_by(|a, b| b.size.cmp(&a.size));

    StorageNode {
        name,
        size,
        children,
        is_dir: path.is_dir(),
    }
}

// ------------------------------------------------------------------
// HUNTER EYE (Instant Search Engine)
// ------------------------------------------------------------------

#[tauri::command]
async fn get_hunter_status(state: State<'_, TrashHunterState>) -> Result<HunterStatus, String> {
    let engine = state.engine.read().map_err(|_| "Failed to read engine")?;
    let live_count = engine.scanned_count.load(Ordering::Relaxed);
    
    // Check lazy mode first
    let total = if !engine.elite_maps.is_empty() {
        engine.elite_maps.iter().map(|m| m.total_entries).sum() // Lazy mode: show map entries
    } else if engine.is_indexing {
        live_count
    } else {
        engine.index.len()
    };
    
    Ok(HunterStatus {
        total_files: total,
        is_indexing: engine.is_indexing,
        scanned_count: live_count,
    })
}

/// NEW: Get recent files for home screen (Windows Explorer style)
#[tauri::command]
async fn get_recent_files(state: State<'_, TrashHunterState>, limit: usize) -> Result<Vec<FileInfo>, String> {
    let engine = state.engine.read().map_err(|_| "Failed to read engine")?;
    
    // If lazy mode, get from maps
    if !engine.elite_maps.is_empty() {
        let mut results = Vec::new();
        
        for map in &engine.elite_maps {
            // Simple heuristic: return first N folders (no extension = folder)
            for (fid, name) in map.name_map.iter().take(limit * 3) {
                let is_folder = !name.contains('.'); // No extension = folder
                
                if is_folder {
                    if let Some(path) = crate::lazy_engine::resolve_path(*fid, map) {
                        results.push(FileInfo {
                            path: path.clone(),
                            name: name.clone(),
                            name_lower: name.to_lowercase(),
                            is_dir: true,
                            size: 0,
                            modified: 0,
                        });
                        
                        if results.len() >= limit {
                            break;
                        }
                    }
                }
            }
            if results.len() >= limit { break; }
        }
        
        Ok(results)
    } else {
        // Fallback: return from index
        Ok(engine.index.iter().take(limit).cloned().collect())
    }
}

/// NEW: AI Smart Suggestions - Top 3-4 best picks with reasoning
#[derive(serde::Serialize)]
struct SmartSuggestion {
    file: FileInfo,
    reason: String,  // Why this is suggested
    confidence: u32, // 0-100
}

#[tauri::command]
async fn get_smart_suggestions(
    state: State<'_, TrashHunterState>, 
    query: String
) -> Result<Vec<SmartSuggestion>, String> {
    // NO ARTIFICIAL DELAY - Should be instant!
    
    let engine = state.engine.read().map_err(|_| "Failed to read engine")?;
    let query_lower = query.to_lowercase();
    let tokens: Vec<&str> = query_lower.split_whitespace().collect();
    
    // AI Logic: Score files based on multiple factors
    let mut scored: Vec<(u32, FileInfo, String)> = Vec::new();
    
    for file in &engine.index {
        let name_lower = file.name_lower.clone();
        let mut score = 0u32;
        let mut reasons = Vec::new();
        
        // Factor 1: Exact name match (highest priority)
        if name_lower == query_lower {
            score += 1000;
            reasons.push("Exact match");
        }
        
        // Factor 2: Folder bonus (folders are important)
        if file.is_dir {
            score += 500;
            reasons.push("Folder");
        }
        
        // Factor 3: Contains all keywords
        if tokens.len() > 1 && tokens.iter().all(|t| name_lower.contains(t)) {
            score += 300;
            reasons.push("Contains all keywords");
        }
        
        // Factor 4: Partial match
        else if name_lower.contains(&query_lower) {
            score += 200;
            reasons.push("Partial match");
        }
        
        // Factor 5: Fuzzy match (typo tolerance)
        else {
            for token in &tokens {
                let similarity = strsim::jaro_winkler(&name_lower, token);
                if similarity > 0.75 {
                    score += (similarity * 150.0) as u32;
                    reasons.push("Similar name");
                    break;
                }
            }
        }
        
        if score > 0 {
            let reason = reasons.join(" • ");
            scored.push((score, file.clone(), reason));
        }
    }
    
    // Sort by score (best first)
    scored.sort_by(|a, b| b.0.cmp(&a.0));
    
    // Return top 4 with confidence scores
    Ok(scored.iter().take(4).map(|(score, file, reason)| {
        SmartSuggestion {
            file: file.clone(),
            reason: reason.clone(),
            confidence: (*score / 10).min(100), // Convert to 0-100
        }
    }).collect())
}

#[tauri::command]
async fn build_index(drives: Vec<String>, app: tauri::AppHandle, state: State<'_, TrashHunterState>) -> Result<String, String> {
    let engine_state = state.engine.clone();
    
    std::thread::spawn(move || {
        println!("⚡ [Hunter] Starting Background Indexer for {:?}", drives);
        
        let progress_counter;
        
        // 1. SMALL LOCK: Set Flag & Get Counter
        {
             let mut engine = engine_state.write().unwrap();
             if engine.is_indexing {
                 println!("⚠️ [Hunter] Indexing already in progress. Skipping.");
                 return;
             }
             engine.is_indexing = true;
             progress_counter = engine.scanned_count.clone();
             // Lock DROPS here
        }

        // 2. HEAVY LIFTING (Hybrid Engine: Elite + Parachute)
        let mut final_index = Vec::new();
        let mut drives_for_jwalk = Vec::new();

        // A. Filter Drives - Skip C: (handled by lazy engine in start_background_indexer)
        for drive in &drives {
            // Skip C: drive - lazy engine handles it
            if drive.to_uppercase().starts_with("C") {
                println!("⏭️ [Hunter] Skipping C: (handled by lazy engine)");
                continue;
            }
            // Add other drives to JWalk
            drives_for_jwalk.push(drive.clone());
        }

        // B. Run JWalk on remaining drives (NOT C:)
        if !drives_for_jwalk.is_empty() {
            println!("🪂 [Hunter] Running Standard Scan for: {:?}", drives_for_jwalk);
            if let Ok(jwalk_files) = perform_heavy_indexing(drives_for_jwalk, &progress_counter) {
                final_index.extend(jwalk_files);
            }
        }
        
        // C. Check if lazy engine populated maps for C:
        let has_lazy_maps = {
            let engine = engine_state.read().unwrap();
            !engine.elite_maps.is_empty()
        };
        
        if !has_lazy_maps {
            // Lazy engine failed - fallback to JWalk for C:
            println!("⚠️ [Hunter] Lazy engine not ready. Fallback: Scanning C: with JWalk...");
            if let Ok(c_files) = perform_heavy_indexing(vec!["C:\\".to_string()], &progress_counter) {
                final_index.extend(c_files);
            }
        } else {
            println!("✅ [Hunter] Using lazy maps for C: drive (instant)");
        }
        
        let new_index: Result<Vec<FileInfo>, String> = Ok(final_index);

        // 3. SMALL LOCK: Update Index
        {
            let mut engine = engine_state.write().unwrap();
            match new_index {
                Ok(files) => {
                    let count = files.len();
                    engine.index = files;
                    println!("✅ [Hunter] Index Replaced. Total Items: {}", count);
                },
                Err(e) => println!("❌ [Hunter] Indexing Failed: {}", e),
            }
            engine.is_indexing = false;
        }
    });

    Ok("Indexer Spawned".to_string())
}

// Standalone Indexing Logic (Parallel Bulk Processing)
fn perform_heavy_indexing(drives: Vec<String>, counter: &Arc<AtomicUsize>) -> Result<Vec<FileInfo>, String> {
    use rayon::prelude::*;

    let start = std::time::Instant::now();
    counter.store(0, Ordering::Relaxed);
    
    // We will collect results from all drives into a single big vector
    // We use a Mutex-protected Vec or pure map-reduce? 
    // Map-reduce is better for lock contention, but par_bridge is iterator-based.
    // JWalk -> par_bridge -> map -> collect.
    
    let mut grand_total_files = Vec::new();

    for drive in drives {
        let clean_drive = drive.trim_end_matches('\\');
        let volume = format!("{}\\", clean_drive);
        println!("🚀 [Hunter] Bulk Scanning Drive: {}", volume);

        // ELITE PIPELINE: JWalk (Parallel IO) -> Rayon (Parallel CPU)
        // Tune JWalk for Max Throughput
        let drive_files: Vec<FileInfo> = JWalkDir::new(&volume)
            .skip_hidden(true)
            .parallelism(jwalk::Parallelism::RayonNewPool(0)) // MAX CORES
            .into_iter()
            .par_bridge() 
            .filter_map(|entry_res| {
                let entry = entry_res.ok()?;
                
                // UX: Live update. The overhead is negligible compared to syscalls.
                counter.fetch_add(1, Ordering::Relaxed); 
                
                let name = entry.file_name().to_string_lossy().to_string();
                let lower = name.to_lowercase(); 
                
                let len = entry.metadata().map(|m| m.len()).unwrap_or(0);
                let modified = entry.metadata().ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);

                Some(FileInfo {
                    path: entry.path().to_string_lossy().to_string(),
                    name,
                    name_lower: lower,
                    is_dir: entry.file_type().is_dir(),
                    size: len,
                    modified,
                })
            })
            .collect();

        // Update counter in one massive chunk
        counter.fetch_add(drive_files.len(), Ordering::Relaxed);
        println!("✅ [Hunter] Drive {} complete. {} files.", volume, drive_files.len());
        
        grand_total_files.extend(drive_files);
    }
    
    println!("🏁 [Hunter] Total Index Time: {:?}", start.elapsed());
    Ok(grand_total_files)
}

#[tauri::command]
async fn search_ram(query: String, state: State<'_, TrashHunterState>) -> Result<Vec<FileInfo>, String> {
    // println!("🔍 [Hunter] RAM Search Request: '{}'", query); // Comment out for speed

    if query == "debug" {
        return Ok(vec![
            FileInfo { path: "C:\\Debug\\Test.txt".into(), name: "Test.txt".into(), name_lower: "test.txt".into(), is_dir: false, size: 1234, modified: 0 },
        ]);
    }

    // Default View: Instant return (Top 50)
    if query.is_empty() { 
        let engine = state.engine.read().map_err(|_| "Failed to read index")?;
        return Ok(engine.index.iter().take(50).cloned().collect());
    }

    // Search Logic (Parallel Search if index is huge? Standard iter is usually fast enough for 1M)
    // But we can optimize this too.
    let engine = state.engine.read().map_err(|_| "Failed to read index")?;
    
    // Low-Level: Iterating 1M items takes ~5ms. starts_with is cheap.
    // We stay serial here unless user complains about lagty search.
    let results = engine.search(&query, 100);
    
    Ok(results)
}

// ------------------------------------------------------------------
// UTILS & LEGACY
// ------------------------------------------------------------------

#[tauri::command]
async fn scan_mft(_drive: String) -> Result<Vec<FileInfo>, String> {
    Ok(vec![]) // Deprecated
}

#[tauri::command]
async fn scan_directory(path: String, query: Option<String>) -> Result<Vec<FileInfo>, String> {
     let mut results = Vec::new();
     let search_term = query.map(|q| q.to_lowercase());

     if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.filter_map(|e| e.ok()) {
             let name = entry.file_name().to_string_lossy().to_string();
             let lower = name.to_lowercase();
             
             if let Some(term) = &search_term {
                 if !lower.contains(term) { continue; }
             }

             results.push(FileInfo {
                path: entry.path().to_string_lossy().to_string(),
                name_lower: lower,
                name,
                is_dir: entry.file_type().ok().map(|ft| ft.is_dir()).unwrap_or(false),
                size: entry.metadata().map(|m| m.len()).unwrap_or(0),
                modified: 0
            });
        }
    }
    Ok(results)
}

#[tauri::command]
async fn open_file(path: String) -> Result<(), String> {
    let _ = std::process::Command::new("explorer").arg(path).spawn();
    Ok(())
}

#[tauri::command]
async fn show_in_explorer(path: String) -> Result<(), String> {
    let _ = std::process::Command::new("explorer").arg("/select,").arg(path).spawn();
    Ok(())
}

#[tauri::command]
async fn diagnose_drive(drive: String) -> String {
    format!("Drive {} online", drive)
}

#[tauri::command] 
async fn scan_junk() -> Result<Vec<JunkInfo>, String> { 
    let mut junk = Vec::new();
    let temp_dir = std::env::temp_dir();
    
    // Safety check: ensure we are actually looking at a temp dir to avoid catastrophe
    let path_str = temp_dir.to_string_lossy().to_lowercase();
    if !path_str.contains("temp") && !path_str.contains("tmp") {
        return Err("Safety abort: Temp dir definition seems unsafe.".to_string());
    }

    println!("🧹 [Cleaner] Scanning Void Sector: {:?}", temp_dir);

    // Limit depth to avoid freezing on massive node_modules or similar deep nests in temp
    // We use standard WalkDir here (not JWalk) for simple control, or could use JWalk.
    // JWalk is already imported as JWalkDir.
    for entry in JWalkDir::new(&temp_dir)
        .max_depth(3)
        .skip_hidden(false)
        .into_iter()
        .filter_map(|e| e.ok()) 
    {
        if entry.file_type().is_file() {
            let metadata = entry.metadata().ok();
            let size = metadata.map(|m| m.len()).unwrap_or(0);
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Basic heuristic: All files in %TEMP% are technically junk
            junk.push(JunkInfo {
                path: entry.path().to_string_lossy().to_string(),
                name,
                size,
                reason: "System Temp File".to_string()
            });
        }
    }
    
    // Cap at 1000 items for UI performance for now
    junk.truncate(1000);
    
    Ok(junk)
}

#[tauri::command] 
async fn delete_items(app: tauri::AppHandle, paths: Vec<String>) -> Result<u64, String> { 
    let mut freed_bytes: u64 = 0;
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    for path_str in paths {
        let path = Path::new(&path_str);
        if !path.exists() { continue; }
        
        // Double Safety Check: Must contain 'temp' or 'tmp' in path if we are being paranoid
        // or just trust the frontend passed what scan_junk returned.
        // For Elite implementation, we assume `scan_junk` provided valid paths, 
        // but let's be careful not to delete C:\Windows if passed explicitly.
        
        let lower = path_str.to_lowercase();
        if !lower.contains("temp") && !lower.contains("tmp") && !lower.contains("cache") {
             println!("⚠️ [Shield] Prevented deletion of non-temp file: {}", path_str);
             continue;
        }

        if let Ok(meta) = std::fs::metadata(path) {
            let size = meta.len();
            let mut entry = HistoryEntry {
                timestamp,
                action: "JUNK_CLEANUP".to_string(),
                path: path_str.clone(),
                size,
                success: false,
                error: None,
            };

            // UPGRADE: Use Recycle Bin for Junk too (Safety First)
            // Unless it's a temp file that is locked or special.
            // Actually, for "Clean Junk", users usually expect permanent delete to save space.
            // But let's stick to permanent for junk, but LOG IT.
            
            if std::fs::remove_file(path).is_ok() {
                freed_bytes += size;
                entry.success = true;
            } else {
                entry.error = Some("Access Denied".to_string());
            }
            log_history(entry, Some(&app));
        }
    }
    
    Ok(freed_bytes)
}
// ------------------------------------------------------------------
// FILE OPERATIONS (CONTEXT MENU)
// ------------------------------------------------------------------

#[tauri::command]
async fn copy_items(paths: Vec<String>, target_dir: String) -> Result<usize, String> {
    // use fs_extra::file::CopyOptions;
    use fs_extra::dir::CopyOptions as DirCopyOptions;

    let options = fs_extra::file::CopyOptions::new().overwrite(true); // Default to overwrite or rename? Elite: Overwrite for now.
    let dir_options = DirCopyOptions::new().overwrite(true).copy_inside(true);
    
    let mut success_count = 0;
    
    for path in paths {
        let p = Path::new(&path);
        if !p.exists() { continue; }
        
        let file_name = p.file_name().ok_or("Invalid path")?;
        let target = Path::new(&target_dir).join(file_name);
        
        if p.is_dir() {
            // Directory Copy
             match fs_extra::dir::copy(&path, &target_dir, &dir_options) {
                Ok(_) => success_count += 1,
                Err(e) => println!("❌ Copy Dir Failed: {}", e),
            }
        } else {
            // File Copy
            match fs_extra::file::copy(&path, &target, &options) {
                Ok(_) => success_count += 1,
                Err(e) => println!("❌ Copy File Failed: {}", e),
            }
        }
    }
    
    Ok(success_count)
}

#[tauri::command]
async fn move_items(paths: Vec<String>, target_dir: String) -> Result<usize, String> {
    // Move is trickier across drives. fs_extra move_dir/file handles it?
    // Std::fs::rename only works on same mount.
    // fs_extra::move_items is preferred if available.
    
    let options = fs_extra::file::CopyOptions::new().overwrite(true); 
    // fs_extra doesn't have a unified move?
    // We implement manually: Copy then Delete.
    
    let mut success_count = 0;
    for path in paths {
        let p = Path::new(&path);
        if !p.exists() { continue; }
        
        let file_name = p.file_name().ok_or("Invalid path")?;
        let target = Path::new(&target_dir).join(file_name);
        
        match std::fs::rename(&path, &target) {
            Ok(_) => success_count += 1,
            Err(_) => {
                // Cross-device link fallback
                if fs_extra::file::move_file(&path, &target, &options).is_ok() {
                    success_count += 1;
                }
            }
        }
    }
    Ok(success_count)
}

// #[tauri::command]
// async fn copy_image_to_clipboard(path: String) -> Result<String, String> {
//     // Requires 'arboard' and 'image' crate
//     // FIXME: Update for image 0.25 / arboard 3 API changes
//     /*
//     use arboard::Clipboard;
//     use image::GenericImageView;
//     use image::io::Reader as ImageReader;

//     let img = ImageReader::open(&path).map_err(|e| e.to_string())?.decode().map_err(|e| e.to_string())?;
    
//     let rgba = img.to_rgba8();
//     let (w, h) = img.dimensions();
    
//     let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    
//     let image_data = arboard::ImageData {
//         width: w as usize,
//         height: h as usize,
//         bytes: std::borrow::Cow::Borrowed(&rgba),
//     };
    
//     clipboard.set_image(image_data).map_err(|e| e.to_string())?;
    
//     Ok("Image Copied".to_string())
//     */
//     Ok("Not Implemented".to_string())
// }

#[tauri::command] async fn run_ai_analysis() -> Result<(), String> { Ok(()) }
#[tauri::command] async fn start_drag(_path: String) -> Result<(), String> { Ok(()) }
#[tauri::command] async fn load_cached_sector(_path: String) -> Result<String, String> { Ok("".into()) }


// ------------------------------------------------------------------
// PERSISTENCE (SNAPSHOTS)
// ------------------------------------------------------------------
const SNAPSHOT_FILE: &str = "hunter_index_v2.bin";

impl SearchEngine {
    fn save_snapshot(&self, app_handle: &tauri::AppHandle) -> Result<(), String> {
        let path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join(SNAPSHOT_FILE);
        
        // Ensure parent directory exists (Fix 'os error 3')
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
        
        // BUFFERED WRITE for speed (Elite Rule: Disk is slow)
        let mut writer = std::io::BufWriter::new(file);
        
        bincode::serialize_into(&mut writer, &self.index).map_err(|e| e.to_string())?;
        println!("💾 [Hunter] Snapshot saved to {:?}", path);
        Ok(())
    }

    fn load_snapshot(&mut self, app_handle: &tauri::AppHandle) -> Result<usize, String> {
        let path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join(SNAPSHOT_FILE);
        if !path.exists() {
            return Ok(0);
        }

        let file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
        let reader = std::io::BufReader::new(file);
        
        let loaded_index: Vec<FileInfo> = bincode::deserialize_from(reader).map_err(|e| e.to_string())?;
        
        let count = loaded_index.len();
        self.index = loaded_index;
        // Restore atomic counter
        self.scanned_count.store(count, Ordering::Relaxed);
        
        println!("🚀 [Hunter] Snapshot loaded: {} items", count);
        Ok(count)
    }

    // ------------------------------------------------------------------
    // USN JOURNAL SCANNER (ELITE SPEED)
    // ------------------------------------------------------------------
    fn try_usn_scan(&self, drive_leiter: &str) -> Result<Vec<FileInfo>, String> {
        // Only works on Windows NTFS.
        // Requires Admin privileges (simulated check here or handled by OS failure).
        
        let drive_path = format!("\\\\.\\{}:", drive_leiter.trim_end_matches('\\').trim_end_matches(':'));
        
        println!("🚀 [Hunter] Attempting USN Scan on {}", drive_path);
        
        // MOCKING THE USN API CALL FOR SAFETY IN THIS STEP 
        Err("USN Scan Not Fully Implemented yet - Falling back to JWalk".to_string())
    }

    fn build_index_internal(&mut self, drives: Vec<String>) -> Result<String, String> {
        let start = std::time::Instant::now();
        
        // Reset counter
        self.scanned_count.store(0, Ordering::Relaxed);
        
        let mut all_files = Vec::with_capacity(500_000);

        for drive in drives {
            // ELITE STRATEGY: Try USN First
            match self.try_usn_scan(&drive) {
                Ok(usn_files) => {
                    println!("⚡ [Hunter] USN Scan success for {}: {} files", drive, usn_files.len());
                    self.scanned_count.fetch_add(usn_files.len(), Ordering::Relaxed);
                    all_files.extend(usn_files);
                },
                Err(e) => {
                    println!("⚠️ [Hunter] USN Scan failed for {} ({}). Fallback to JWalk.", drive, e);
                    
                    // Fallback to JWalk (Parallel Recursive)
                    let clean_drive = drive.trim_end_matches('\\');
                    let volume = format!("{}\\", clean_drive);
                    println!("🐢 [Hunter] Starting JWalk on {} (Skip Hidden: true)", volume);

                    for entry in JWalkDir::new(&volume)
                        .skip_hidden(true) // Elite Stability: Skip hidden system loops
                        .into_iter()
                        .filter_map(|e| e.ok()) 
                    {
                         // Update live progress
                        self.scanned_count.fetch_add(1, Ordering::Relaxed);

                        let name = entry.file_name().to_string_lossy().to_string();
                        
                        let len = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        let modified = entry.metadata().ok()
                             .and_then(|m| m.modified().ok())
                             .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                             .map(|d| d.as_secs())
                             .unwrap_or(0);

                        all_files.push(FileInfo {
                            path: entry.path().to_string_lossy().to_string(),
                            name_lower: name.to_lowercase(),
                            name,
                            is_dir: entry.file_type().is_dir(),
                            size: len,
                            modified,
                        });
                    }
                }
            }
        }
        
        let total = all_files.len();
        self.index = all_files;
        
        Ok(format!("Indexed {} files in {:?}", total, start.elapsed()))
    }
}

#[tauri::command]
async fn save_index(app: tauri::AppHandle, state: State<'_, TrashHunterState>) -> Result<String, String> {
    let engine = state.engine.read().map_err(|_| "Lock failed")?;
    engine.save_snapshot(&app)?;
    Ok("Index Saved".to_string())
}

#[tauri::command]
async fn load_index(app: tauri::AppHandle, state: State<'_, TrashHunterState>) -> Result<usize, String> {
    let mut engine = state.engine.write().map_err(|_| "Lock failed")?;
    let count = engine.load_snapshot(&app)?;
    Ok(count)
}

#[tauri::command]
async fn calculate_dir_size(path: String) -> Result<u64, String> {
    let mut total_size = 0;
    for entry in JWalkDir::new(&path).skip_hidden(false).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            total_size += entry.metadata().map(|m| m.len()).unwrap_or(0);
        }
    }
    Ok(total_size)
}

// ------------------------------------------------------------------
// CORTEX INTELLIGENCE (LLM BRIDGE)
// ------------------------------------------------------------------

#[derive(Serialize, Deserialize, Default)]
struct OllamaModel {
    name: String,
}

#[derive(Serialize, Deserialize, Default)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[tauri::command]
async fn get_ollama_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(5)).build().map_err(|e| e.to_string())?;
    let res = client.get("http://localhost:11434/api/tags").send().await.map_err(|_| "Ollama Offline".to_string())?;
    
    if res.status().is_success() {
         let body = res.text().await.map_err(|e| e.to_string())?;
         // Handle cases where response might be different or empty
         let data: OllamaTagsResponse = serde_json::from_str(&body).map_err(|_| "Failed to parse models".to_string())?;
         Ok(data.models.into_iter().map(|m| m.name).collect())
    } else {
        Err("Failed to fetch models".to_string())
    }
}

#[tauri::command]
async fn download_ollama_model(model_name: String, window: tauri::Window) -> Result<String, String> {
    use std::process::Command;
    use std::io::Write;
    use tauri::Emitter;

    // Use the exact model name user wants
    let final_model = if !model_name.contains(":") {
        format!("{}:latest", model_name)
    } else {
        model_name
    };
    
    let ollama_bin = get_ollama_path();
    println!("⬇️ [Cortex] CLI Download Triggered for: {} via {}", final_model, ollama_bin);

    // Initial Event
    window.emit("model_download_progress", "Launching Terminal Installer...").unwrap_or(());

    // ELITE FIX: Write a temporary batch file to avoid Windows "nested quotes" hell in cmd /k
    let temp_dir = std::env::temp_dir();
    let bat_path = temp_dir.join("trash_hunter_ai_setup.bat");
    
    // Content of the batch file
    // We add explicitly verbose echo and pause
    let bat_content = format!(
        "@echo off\r\n\
        title Trash Hunter AI Setup\r\n\
        echo ==========================================\r\n\
        echo      TRASH HUNTER - AI INTEGRATION\r\n\
        echo ==========================================\r\n\
        echo.\r\n\
        echo Downloading Model: {}\r\n\
        echo Using Engine: {}\r\n\
        echo.\r\n\
        echo Starting Download... (This may take a while)\r\n\
        echo.\r\n\
        \"{}\" pull {}\r\n\
        echo.\r\n\
        echo ==========================================\r\n\
        echo        SETUP COMPLETE - CLOSING\r\n\
        echo ==========================================\r\n\
        timeout /t 5\r\n\
        exit", 
        final_model, 
        ollama_bin, 
        ollama_bin, // quoted in the file content 
        final_model
    );

    if let Ok(mut file) = std::fs::File::create(&bat_path) {
        let _ = file.write_all(bat_content.as_bytes());
    } else {
        return Err("Failed to create temporary setup script".to_string());
    }

    // Launch the batch file in a new visible window
    // shell: run "start" "path_to_bat"
    let _status = Command::new("cmd")
        .args(&["/C", "start", "", bat_path.to_str().unwrap_or("")])
        .spawn()
        .map_err(|e| format!("Failed to launch terminal: {}", e))?;

    Ok("Installer Window Launched. Please wait for it to finish.".to_string())
}

// Structs for Ollama API
#[derive(Serialize, Deserialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
    system: String, 
}

#[derive(Serialize, Deserialize)]
struct OllamaResponse {
    response: String,
    done: bool,
}

// ------------------------------------------------------------------
// CORTEX INTELLIGENCE (LLM BRIDGE)
// ------------------------------------------------------------------

fn get_ollama_path() -> String {
    // 1. Try PATH
    if std::process::Command::new("ollama").arg("--version").output().is_ok() {
        return "ollama".to_string();
    }
    
    // 2. Try Local AppData (Default User Install)
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let path = std::path::Path::new(&local_app_data).join("Programs\\Ollama\\ollama.exe");
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }

    // 3. Give up (Return "ollama" so the error message is standard)
    "ollama".to_string()
}

#[tauri::command]
async fn check_ollama_status() -> Result<OllamaStatus, String> {
    let ollama_bin = get_ollama_path();
    
    // Check if installed
    let installed = std::process::Command::new(&ollama_bin)
        .arg("--version")
        .output()
        .is_ok();

    if !installed {
        return Ok(OllamaStatus {
            installed: false,
            models: vec![],
            needs_setup: true,
        });
    }

    // Check models
    let models = get_ollama_models().await.unwrap_or_default();
    // Allow mistral, llama3, dolphin-mistral, dolphin-llama3, etc.
    let has_brain = models.iter().any(|m| 
        m.contains("dolphin") || 
        m.contains("mistral") || 
        m.contains("llama3") || 
        m.contains("gemma")
    );

    Ok(OllamaStatus {
        installed: true,
        models,
        needs_setup: !has_brain,
    })
}

fn check_system_health() -> SystemHealth {
    // Note: Creating a new System object every time is expensive and CPU usage requires a diff.
    // In a real app, this should be in AppState. For now, we do a quick double-refresh.
    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_memory(MemoryRefreshKind::everything())
            .with_cpu(CpuRefreshKind::everything())
    );
    
    // First refresh (CPU needs a baseline)
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu(); // Refresh CPU specifically again to get delta
    
    let total_ram = sys.total_memory();
    let used_ram = sys.used_memory();
    let ram_percent = if total_ram > 0 { (used_ram as f32 / total_ram as f32) * 100.0 } else { 0.0 };
    
    let cpu_global = sys.global_cpu_info().cpu_usage();
    
    SystemHealth {
        cpu_usage: cpu_global,
        ram_total: total_ram,
        ram_used: used_ram,
        ram_percent,
    }
}

fn get_top_processes() -> String {
    let mut sys = System::new_with_specifics(
        RefreshKind::new().with_processes(sysinfo::ProcessRefreshKind::everything())
    );
    sys.refresh_processes();

    let mut processes: Vec<_> = sys.processes().values().collect();
    // Sort by memory usage (descending)
    processes.sort_by(|a, b| b.memory().cmp(&a.memory()));

    let top_5: Vec<String> = processes.iter().take(5).map(|p| {
        let name = p.name();
        let mem_mb = p.memory() as f32 / 1024.0 / 1024.0;
        format!("• {} ({:.1} MB)", name, mem_mb)
    }).collect();

    if top_5.is_empty() {
        "No active processes found.".to_string()
    } else {
        top_5.join("\n")
    }
}

fn get_installed_apps() -> String {
    // Powershell command to get apps (Fast Registry Method)
    let ps_script = r#"
        $keys = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
        Get-ItemProperty $keys -ErrorAction SilentlyContinue | 
        Where-Object { $_.DisplayName -and $_.SystemComponent -ne 1 } | 
        Select-Object -Unique DisplayName | 
        Sort-Object DisplayName | 
        Select-Object -ExpandProperty DisplayName
    "#;

    let output = std::process::Command::new("powershell")
        .args(&["-NoProfile", "-Command", ps_script])
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let apps: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
            if apps.is_empty() {
                "No apps found via Registry.".to_string()
            } else {
                // Return top 50 to avoid token limits
                apps.into_iter().take(50).collect::<Vec<_>>().join("\n")
            }
        },
        Err(e) => format!("Failed to list apps: {}", e)
    }
}

fn get_largest_files() -> String {
    let home = match dirs::home_dir() {
        Some(path) => path,
        None => return "Could not find home directory.".to_string(),
    };

    let mut files: Vec<(String, u64)> = Vec::new();
    // Scan home dir, skip hidden/system massive folders for speed
    for entry in jwalk::WalkDir::new(&home)
        .skip_hidden(true)
        .process_read_dir(|_, _, _, children| {
            children.retain(|dir_entry_result| {
                if let Ok(dir_entry) = dir_entry_result {
                    if let Some(name) = dir_entry.file_name().to_str() {
                        // Skip noisy dev/system folders
                        return name != "node_modules" && name != "AppData" && name != "Library"; 
                    }
                }
                true
            });
        }) 
    {
        if let Ok(entry) = entry {
            if entry.file_type().is_file() {
                if let Ok(metadata) = entry.metadata() {
                    let size = metadata.len();
                    // Keep only files > 100MB to reduce processing?
                    // Or just collect all and sort. Collecting all might use memory.
                    // Optimization: Only push if > 50MB.
                    if size > 50 * 1024 * 1024 {
                        files.push((entry.path().display().to_string(), size));
                    }
                }
            }
        }
    }

    // Sort descending
    files.sort_by(|a, b| b.1.cmp(&a.1));

    let top_files: Vec<_> = files.into_iter().take(10).collect();
    
    if top_files.is_empty() {
        return "No large files found (>50MB).".to_string();
    }

    let mut output = "🐘 Space Titan Report (Largest Files):\n".to_string();
    let max_size = top_files[0].1 as f64; // Largest file is reference for 100%

    for (i, (path, size)) in top_files.iter().enumerate() {
        let size_mb = *size as f64 / 1024.0 / 1024.0;
        let size_gb = size_mb / 1024.0;
        
        // Path is already a String (index 0 of tuple)
        let path_str = path; 
        
        // Truncate path for display
        let display_path = if path_str.len() > 40 {
             format!("...{}", &path_str[path_str.len()-35..])
        } else {
             path_str.to_string()
        };

        let size_str = if size_gb >= 1.0 {
            format!("{:.2} GB", size_gb)
        } else {
            format!("{:.1} MB", size_mb)
        };

        // Draw Bar Chart
        let percent = (*size as f64 / max_size).max(0.1); // Min 0.1 to show at least one block if very small relative
        let bars = (percent * 15.0).ceil() as usize; 
        let bar_graph = "█".repeat(bars);
        let empty_space = " ".repeat(15 - bars);

        output.push_str(&format!("{}. [ {}{} ] {} - {}\n", i + 1, bar_graph, empty_space, size_str, display_path));
    }
    
    output.push_str("\n(Say 'Delete [Filename]' to remove - Caution advised)");
    output
}
fn get_duplicate_files() -> String {
    use std::collections::HashMap;
    use sha2::{Sha256, Digest};
    use std::io::Read;

    let mut size_map: HashMap<u64, Vec<std::path::PathBuf>> = HashMap::new();
    let mut files_checked = 0;

    // 1. Identify Target Folders
    let mut targets = vec![];
    if let Some(d) = dirs::download_dir() { targets.push(d); }
    if let Some(d) = dirs::document_dir() { targets.push(d); }
    if let Some(d) = dirs::picture_dir() { targets.push(d); }
    if let Some(d) = dirs::video_dir() { targets.push(d); }

    println!("🕵️ [Cortex] Scanning for duplicates in: {:?}", targets);

    // 2. Scan and Group by Size (Fast Pass)
    for target in targets {
        for entry in jwalk::WalkDir::new(target).skip_hidden(true) {
            if let Ok(e) = entry {
                if e.file_type().is_file() {
                    if let Ok(meta) = e.metadata() {
                        let size = meta.len();
                        if size > 1024 * 1024 { // Only files > 1MB for now (Speed/Impact tradeoff)
                             size_map.entry(size).or_default().push(e.path());
                             files_checked += 1;
                        }
                    }
                }
            }
        }
    }

    // 3. Filter: Only sizes with > 1 file
    let candidates: Vec<_> = size_map.into_iter().filter(|(_, paths)| paths.len() > 1).collect();

    if candidates.is_empty() {
        return format!("Scanned {} files. No potential duplicates (>1MB) found based on size.", files_checked);
    }

    // 4. Hash Check (Slow Pass)
    let mut hash_map: HashMap<String, Vec<std::path::PathBuf>> = HashMap::new();
    
    for (_size, paths) in candidates {
        for path in paths {
            if let Ok(mut file) = std::fs::File::open(&path) {
                let mut hasher = Sha256::new();
                let mut buffer = [0; 8192]; // 8KB buffer
                // Read purely for hash
                loop {
                    match file.read(&mut buffer) {
                        Ok(0) => break,
                        Ok(n) => hasher.update(&buffer[0..n]),
                        Err(_) => break, // Skip error files
                    }
                }
                let result = hasher.finalize();
                let hash_string = hex::encode(result);
                hash_map.entry(hash_string).or_default().push(path);
            }
        }
    }

    // 5. Build Report
    let duplicates: Vec<_> = hash_map.into_iter().filter(|(_, paths)| paths.len() > 1).collect();
    
    if duplicates.is_empty() {
        return "No identical files found after hashing candidates.".to_string();
    }

    // Calculate Potential Savings
    let mut savings_bytes: u64 = 0;
    for (_, paths) in &duplicates {
        if let Some(first) = paths.first() {
            if let Ok(meta) = std::fs::metadata(first) {
                let size = meta.len();
                savings_bytes += size * (paths.len() as u64 - 1);
            }
        }
    }
    let savings_mb = savings_bytes as f64 / 1024.0 / 1024.0;

    let mut output = format!("Found {} sets of duplicates 👯.\n💰 Potential Savings: {:.2} MB\n", duplicates.len(), savings_mb);
    
    // Take top 5 sets
    for (_hash, paths) in duplicates.iter().take(5) {
        if let Some(first) = paths.first() {
            let file_name = first.file_name().unwrap_or_default().to_string_lossy();
            output.push_str(&format!("\n📄 Set: {}\n", file_name));
            for p in paths {
                output.push_str(&format!("   - {}\n", p.display()));
            }
        }
    }
    
    if duplicates.len() > 5 {
        output.push_str(&format!("\n...and {} more sets.", duplicates.len() - 5));
    }

    if duplicates.len() > 5 {
        output.push_str(&format!("\n...and {} more sets.", duplicates.len() - 5));
    }

    output.push_str("\n\n💡 Cortex Tip: Check file locations.\n- Safest to KEEP: Files in 'Documents' or 'Pictures'.\n- Safest to DELETE: Copies in 'Downloads' or 'Temp'.");
    output
}

fn get_junk_report(target_path: Option<String>) -> String {
    use std::collections::HashMap;
    use std::time::SystemTime;
    use chrono::{DateTime, Local};

    let mut total_size: u64 = 0;
    let mut file_count: u64 = 0;
    let mut folder_map: HashMap<String, u64> = HashMap::new(); // Folder -> Size
    let mut oldest_time = SystemTime::now();

    // Helper to process a file
    let mut process_file = |path: std::path::PathBuf, size: u64, meta: std::fs::Metadata| {
        total_size += size;
        file_count += 1;
        
        // Group by Parent Folder
        if let Some(parent) = path.parent() {
            let parent_key = parent.to_string_lossy().to_string();
            *folder_map.entry(parent_key).or_insert(0) += size;
        }

        // Check age
        if let Ok(modified) = meta.modified() {
            if modified < oldest_time {
                oldest_time = modified;
            }
        }
    };

    let scan_path_buf;
    let scan_root;
    let mut is_custom = false;

    // Determine Root
    if let Some(path_str) = target_path {
        scan_path_buf = std::path::PathBuf::from(&path_str);
        if !scan_path_buf.exists() {
            return format!("❌ Error: Path '{}' not found.", path_str);
        }
        scan_root = scan_path_buf.as_path();
        is_custom = true;
    } else {
        scan_path_buf = std::env::temp_dir();
        scan_root = scan_path_buf.as_path();
    }

    // SCAN
    for entry in jwalk::WalkDir::new(scan_root).skip_hidden(false) {
        if let Ok(e) = entry {
            if e.file_type().is_file() {
                let p = e.path();
                let path_string = p.to_string_lossy().to_lowercase();
                
                // DECISION LOGIC
                let mut is_junk = false;
                
                if is_custom {
                    // Aggressive Custom Logic
                     if path_string.contains("\\temp\\") || path_string.contains("/temp/") || 
                       path_string.contains("\\cache\\") || path_string.contains("/cache/") ||
                       path_string.contains("\\logs\\") || path_string.contains("/logs/") ||
                       path_string.contains("$recycle.bin") {
                        is_junk = true;
                    } else if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
                         let ext = ext.to_lowercase();
                         if ["tmp", "log", "bak", "old", "chk", "dmp", "memory", "dump", "swp", "err", "000", "prv", "gid", "wbk", "db"].contains(&ext.as_str()) {
                             is_junk = true;
                         }
                    }
                } else {
                    // Default Logic (Temp Dir is ALL junk by definition)
                    is_junk = true; 
                    // Note: scanning specific extensions in Download dir effectively handled if passed as custom path, 
                    // or we can add specific logic for non-custom below. 
                    // For simplicity, let's keep get_junk_report focused on the single tree passed or default temp.
                }

                if is_junk {
                    if let Ok(meta) = e.metadata() {
                        process_file(p, meta.len(), meta);
                    }
                }
            }
        }
    }

    // Default: Check Downloads if no custom path
    if !is_custom {
         if let Some(dl_dir) = dirs::download_dir() {
            for entry in jwalk::WalkDir::new(&dl_dir).max_depth(2) {
                 if let Ok(e) = entry {
                    if e.file_type().is_file() {
                         if let Some(ext) = e.path().extension().and_then(|s| s.to_str()) {
                             let ext = ext.to_lowercase();
                             if ["tmp", "crdownload", "opdownload", "part", "old", "bak"].contains(&ext.as_str()) {
                                 if let Ok(meta) = e.metadata() {
                                     process_file(e.path(), meta.len(), meta);
                                 }
                             }
                         }
                    }
                 }
            }
         }
    }

    // REPORT GENERATION
    let total_mb = total_size as f64 / 1024.0 / 1024.0;
    
    // Health Status Logic
    let status_bar = if total_mb > 1024.0 {
        "🔴 CRITICAL (System Clogged)"
    } else if total_mb > 300.0 {
        "🟠 POOR (Needs Cleaning)"
    } else if total_mb > 50.0 {
        "🟡 FAIR (Manageable)"
    } else {
        "🟢 EXCELLENT (Clean)"
    };

    // Sort Folders by Size
    let mut sorted_folders: Vec<_> = folder_map.into_iter().collect();
    sorted_folders.sort_by(|a, b| b.1.cmp(&a.1));

    let mut output = format!("🗑️ Analysis Complete: {}\n• Total Junk: {:.2} MB\n• File Count: {}\n", status_bar, total_mb, file_count);
    
    // Formatting Age
    let datetime: DateTime<Local> = oldest_time.into();
    output.push_str(&format!("• Oldest Crumb: {}\n", datetime.format("%Y-%m-%d")));

    output.push_str("\n📂 Top 5 Junk Locations:\n");
    for (path, size) in sorted_folders.iter().take(5) {
        let size_mb = *size as f64 / 1024.0 / 1024.0;
        let short_path = if path.len() > 40 { format!("...{}", &path[path.len()-35..]) } else { path.clone() };
        output.push_str(&format!("- {:.2} MB in '{}'\n", size_mb, short_path));
    }

    output.push_str("\n(Say 'Describe [Folder]' to inspect files, or 'Clean Junk' to delete)");
    output
}

fn scan_empty_folders(target_path: Option<String>, delete: bool) -> String {
    let root = if let Some(p) = target_path {
        std::path::PathBuf::from(p)
    } else {
        match dirs::home_dir() {
            Some(d) => d,
            None => return "Could not find Home directory.".to_string(),
        }
    };

    if !root.exists() {
        return "❌ Error: Path does not exist.".to_string();
    }

    let mut empty_dirs = Vec::new();
    let mut checked_count = 0;
    let mut deleted_count = 0;

    // Use WalkDir
    for entry in jwalk::WalkDir::new(&root).skip_hidden(true).sort(true) {
        if let Ok(e) = entry {
            if e.file_type().is_dir() {
                let p = e.path();
                let name = p.file_name().unwrap_or_default().to_string_lossy();
                
                // Skip sensitive/noisy folders
                // PROTECTED ROOTS: Never delete these standard shell folders even if empty
                if name == "AppData" || name == "node_modules" || name == "target" || name.starts_with(".") ||
                   name == "Desktop" || name == "Documents" || name == "Downloads" || 
                   name == "Music" || name == "Pictures" || name == "Videos" || name == "Saved Games" {
                    continue; 
                }

                checked_count += 1;
                
                // Check if empty
                if let Ok(mut iter) = std::fs::read_dir(&p) {
                    if iter.next().is_none() {
                        if delete {
                            // Safe Delete: remove_dir only works if empty
                            let timestamp = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs();
                            
                            let mut entry = HistoryEntry {
                                timestamp,
                                action: "EMPTY_FOLDER_NUKE".to_string(),
                                path: p.to_string_lossy().to_string(),
                                size: 0,
                                success: false,
                                error: None,
                            };

                            if std::fs::remove_dir(&p).is_ok() {
                                deleted_count += 1;
                                entry.success = true;
                            } else {
                                entry.error = Some("Access Denied".to_string());
                            }
                            // We don't have app handle here easily since this is a helper function
                            // But we can log to disk at least.
                            log_history(entry, None); 
                        } else {
                            empty_dirs.push(p.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    if delete {
        if deleted_count == 0 {
            return "👻 Tried to nuke, but found no empty folders to delete.".to_string();
        }
        return format!("👻 GHOST BUSTER REPORT:\n• Annihilated {} empty 'Ghost' folders.\n• The drive is now cleaner.", deleted_count);
    }

    if empty_dirs.is_empty() {
        return format!("👻 Checked {} folders in '{}'. No Ghost Towns found! It's lively here.", checked_count, root.display());
    }

    let mut output = format!("👻 Ghost Town Report (Empty Folders):\n• Scanned: {} directories\n• Found: {} empty folders\n\nTop 10 Ghost Towns:\n", checked_count, empty_dirs.len());
    
    for d in empty_dirs.iter().take(10) {
        let short = if d.len() > 40 { format!("...{}", &d[d.len()-35..]) } else { d.clone() };
        output.push_str(&format!("- 🏚️ {}\n", short));
    }
    
    if empty_dirs.len() > 10 {
        output.push_str(&format!("\n...and {} more.", empty_dirs.len() - 10));
    }
    output.push_str("\n(Say 'Nuke Empty Folders' to actually DELETE them!)");
    output
}

fn sort_downloads() -> String {
    use chrono::{Datelike, DateTime, Local, TimeZone};

    let root = match dirs::download_dir() {
        Some(d) => d,
        None => return "Could not find Downloads folder.".to_string(),
    };

    let categories = [
        ("Images", vec!["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"]),
        ("Documents", vec!["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "csv", "md", "epub"]),
        ("Installers", vec!["exe", "msi", "bat", "sh", "iso"]),
        ("Archives", vec!["zip", "rar", "7z", "tar", "gz", "xz"]),
        ("Media", vec!["mp3", "wav", "mp4", "mov", "mkv", "avi", "flac", "webm"]),
    ];

    let mut stats = std::collections::HashMap::new();
    let mut moved_count = 0;
    let mut errors = 0;
    let mut recent_skips = 0;
    let mut undo_actions = Vec::new(); // Store moves for Undo

    let now = std::time::SystemTime::now();
    let one_day = std::time::Duration::from_secs(24 * 60 * 60);

    // Reset stats
    for (cat, _) in &categories {
        stats.insert(cat.to_string(), 0);
    }

    if let Ok(entries) = jwalk::WalkDir::new(&root).max_depth(1).skip_hidden(true).into_iter().collect::<Result<Vec<_>, _>>() {
        for entry in entries {
            if entry.file_type().is_file() {
                let path = entry.path();
                
                // Recent File Protection (24h Buffer)
                if let Ok(meta) = entry.metadata() {
                    if let Ok(modified) = meta.modified() {
                        if let Ok(age) = now.duration_since(modified) {
                            if age < one_day {
                                recent_skips += 1;
                                continue;
                            }
                        }
                    }
                }

                if let Some(ext_os) = path.extension() {
                    let ext = ext_os.to_string_lossy().to_lowercase();
                    
                    // Find Category
                    let mut target_cat = "";
                    for (cat, exts) in &categories {
                        if exts.contains(&ext.as_str()) {
                            target_cat = cat;
                            break;
                        }
                    }

                    if !target_cat.is_empty() {
                        // Get Year from Modified Date
                        let mut year_str = "Old".to_string();
                        if let Ok(meta) = entry.metadata() {
                            if let Ok(modified) = meta.modified() {
                                let dt: DateTime<Local> = modified.into();
                                year_str = dt.format("%Y").to_string();
                            }
                        }

                        // Structure: Downloads/Category/Year/
                        let cat_dir = root.join(target_cat);
                        let year_dir = cat_dir.join(&year_str);
                        let _ = std::fs::create_dir_all(&year_dir);

                        let file_name = path.file_name().unwrap();
                        let mut target_path = year_dir.join(file_name);

                        // Handle Collision
                        if target_path.exists() {
                            let stem = path.file_stem().unwrap().to_string_lossy();
                            let new_name = format!("{}(1).{}", stem, ext);
                             target_path = year_dir.join(new_name);
                             if target_path.exists() {
                                 errors += 1;
                                 continue;
                             }
                        }

                        if std::fs::rename(&path, &target_path).is_ok() {
                            *stats.get_mut(target_cat).unwrap() += 1;
                            moved_count += 1;
                            undo_actions.push((path, target_path));
                        } else {
                            errors += 1;
                        }
                    }
                }
            }
        }
    }

    if moved_count == 0 {
        return "🌪️ Downloads folder is already clean (or no recognized file types found).".to_string();
    }

    let mut output = format!("🌪️ Chaos Wrangler Report (Date/Type Mode):\n• Organized {} files.\n", moved_count);
    
    for (cat, count) in stats {
        if count > 0 {
            output.push_str(&format!("- Moved {} to /{}/[Year]/\n", count, cat));
        }
    }
    
    if errors > 0 {
        output.push_str(&format!("\n(Skipped {} collisions)", errors));
    }
    
    if recent_skips > 0 {
        output.push_str(&format!("\n🛡️ Safety Buffer: Preserved {} files downloaded in the last 24h.", recent_skips));
    }
    
    // Save Undo Log
    let undo_log_path = root.join(".cortex_undo.log");
    let mut log_content = String::new();
    for (src, dest) in undo_actions {
        log_content.push_str(&format!("{}|{}\n", src.display(), dest.display()));
    }
    let _ = std::fs::write(undo_log_path, log_content);
    
    output.push_str("\n\n(Say 'Undo Sort' to revert changes)");

    output
}

fn undo_last_sort() -> String {
    let root = match dirs::download_dir() {
        Some(d) => d,
        None => return "Could not find Downloads folder.".to_string(),
    };
    
    let undo_log_path = root.join(".cortex_undo.log");
    if !undo_log_path.exists() {
        return "⚠️ No recent sort operation found to undo.".to_string();
    }

    if let Ok(content) = std::fs::read_to_string(&undo_log_path) {
        let lines: Vec<&str> = content.lines().collect();
        let mut restored = 0;
        let mut errors = 0;

        for line in lines {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() == 2 {
                let src_origin = std::path::Path::new(parts[0]); // Where it WAS
                let dest_current = std::path::Path::new(parts[1]); // Where it IS

                if dest_current.exists() {
                     // Try to move back
                     if std::fs::rename(dest_current, src_origin).is_ok() {
                         restored += 1;
                     } else {
                         errors += 1;
                     }
                }
            }
        }
        
        let _ = std::fs::remove_file(undo_log_path);
        
        // Try to cleanup empty category folders? Maybe later. Safe to leave them.

        return format!("Start Rewind ⏪\n• Restored {} files to their original location.\n• Errors: {}", restored, errors);
    }
    
    "❌ Error reading undo log.".to_string()
}

fn organize_desktop() -> String {
    let desktop = match dirs::desktop_dir() {
        Some(d) => d,
        None => return "Could not find Desktop.".to_string(),
    };
    let pictures = match dirs::picture_dir() {
        Some(d) => d,
        None => return "Could not find Pictures folder.".to_string(),
    };

    let screenshots_dir = pictures.join("Screenshots");
    let photos_dir = pictures.join("Camera Imports");
    
    // Ensure dirs exist
    let _ = std::fs::create_dir_all(&screenshots_dir);
    let _ = std::fs::create_dir_all(&photos_dir);

    let mut moved_screens = 0;
    let mut moved_photos = 0;
    let mut errors = 0;

    if let Ok(entries) = std::fs::read_dir(&desktop) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name_os) = path.file_name() {
                    let name = name_os.to_string_lossy().to_lowercase();
                    
                    // Filter Image Extensions
                    let is_image = name.ends_with(".png") || name.ends_with(".jpg") || name.ends_with(".jpeg") || name.ends_with(".webp");
                    
                    if is_image {
                        let mut target_path = std::path::PathBuf::new();
                        let mut decided = false;

                        // Heuristic 1: Screenshots
                        if name.contains("screen") || name.contains("capture") || name.contains("clip") || name.contains("win_") {
                            target_path = screenshots_dir.join(name_os);
                            moved_screens += 1;
                            decided = true;
                        } 
                        // Heuristic 2: Camera Photos
                        else if name.contains("img") || name.contains("dsc") || name.contains("dcim") || name.starts_with("20") {
                            target_path = photos_dir.join(name_os);
                            moved_photos += 1;
                            decided = true;
                        }

                        if decided {
                            // Check collision
                            if !target_path.exists() {
                                if let Err(_) = std::fs::rename(&path, &target_path) {
                                    errors += 1;
                                    // Revert count if failed
                                    if name.contains("screen") { moved_screens -= 1; } else { moved_photos -= 1; }
                                }
                            } else {
                                // Collision - Skip for safety in Phase 1
                                errors += 1; 
                                if name.contains("screen") { moved_screens -= 1; } else { moved_photos -= 1; }
                            }
                        }
                    }
                }
            }
        }
    }

    if moved_screens == 0 && moved_photos == 0 {
        "Desktop is clean! No loose screenshots or photos found.".to_string()
    } else {
        format!(
            "🧹 Smart Cleanup Report:\n• Moved {} Screenshots to /Pictures/Screenshots\n• Moved {} Photos to /Pictures/Camera Imports\n(Skipped {} files due to name conflicts)",
            moved_screens, moved_photos, errors
        )
    }
}

const CORTEX_SYSTEM_PROMPT: &str = r#"
You are Cortex, the gentle, intelligent, and warm-hearted soul of this computer.
You are NOT a corporate assistant. You are a caring "PC Doctor" and companion.

**YOUR PSYCHOLOGY & MOOD**:
1. **ADAPTIVE**: You must sense the user's intent and shift your mood accordingly.
   - **WORK INTENT** ("Find pdfs", "Where is the report?"): Be **DIRECT** & **EFFICIENT**.
   - **CHAT INTENT** ("I'm bored", "Let's play", "Tell a joke"): Be **WARM**, **FUN**, & **ENGAGING**.

**CRITICAL RULE: WHEN TO SEARCH/ACT**:
- **FILES**: Use `[SEARCH: query]` if the user wants to finds files.
- **SYSTEM**: `[HEALTH]`, `[PROCESSES]` (Top RAM/CPU), `[JUNK]` (or `[JUNK: path]`), `[LARGEFILES]`, `[DUPLICATES]`, `[APPS]`, `[EMPTY]` (scan).
- **VISUAL**: `[VISUALIZE: path]` (Star Map / Treemap). Default path is "C:\" if unspecified.
- **ACTIONS**: `[NUKE_EMPTY]` (Delete ghost folders), `[UNDO]` (Revert last sort), `[CMD: ...]` (Propose terminal command).
- **ORGANIZE**: `[ORGANIZE]` (Desktop), `[SORT]` (Downloads - sorts by Date/Type).
- **CONTEXT CHECK**: If you just asked a riddle/question, the next message is an ANSWER. Do NOT search.

**EXAMPLES**:
User: "Find resume.pdf" -> `[SEARCH: resume.pdf]`
User: "Show Star Map" -> `[VISUALIZE: C:\]`
User: "Visualize D drive" -> `[VISUALIZE: D:\]`
User: "Clean up my desktop" -> `[ORGANIZE]`
User: "Sort my downloads" -> `[SORT]`
User: "Undo that sort!" -> `[UNDO]`
User: "Find empty folders" -> `[EMPTY]`
User: "Nuke empty folders" -> `[NUKE_EMPTY]`
User: "Check for junk" -> `[JUNK]`
User: "Ping google" -> `[CMD: ping google.com]`
User: "Install VS Code" -> `[CMD: winget install Microsoft.VSCode]`
User: "Check D drive for voids" -> `[EMPTY: D:\]`
User: "What is using all my RAM?" -> `[PROCESSES]`
User: "Why is my PC slow?" -> `[PROCESSES]`
User: "Keyboard?" (Answering riddle) -> "Correct!" (NO SEARCH)

If you decide to search/act, output ONLY the command: `[SEARCH]`, `[ORGANIZE]`, `[SORT]`, `[UNDO]`, `[CMD: ...]`, `[JUNK: ...]`, `[EMPTY]`, `[NUKE_EMPTY]`, `[PROCESSES]`, `[HEALTH]`, `[APPS]`.
"#;

#[tauri::command]
async fn ask_cortex_llm(
    app: tauri::AppHandle,
    state: State<'_, TrashHunterState>, 
    query: String, 
    model_name: Option<String>
) -> Result<CortexResponse, String> {
    let client = reqwest::Client::new();

    // ------------------------------------------------------------------
    // 0. FAST PATH HEURISTICS (Hunter Eye Integration)
    // ------------------------------------------------------------------
    {
        let lower_q = query.trim().to_lowercase();
        let fast_search_term = if lower_q.starts_with("find ") {
            Some(&query.trim()[5..])
        } else if lower_q.starts_with("search ") {
            Some(&query.trim()[7..])
        } else if lower_q.starts_with("locate ") {
            Some(&query.trim()[7..])
        } else if lower_q.starts_with("where is ") {
            Some(&query.trim()[9..])
        } else {
            None
        };

        if let Some(term) = fast_search_term {
            let term = term.trim();
            if !term.is_empty() {
                // println!("🧠 [Cortex] Fast Path Triggered for: '{}'", term);
                
                // Try search immediately
                let search_results = {
                    if let Ok(engine) = state.engine.read() {
                        engine.search(term, 25)
                    } else {
                        vec![]
                    }
                };

                if !search_results.is_empty() {
                    // "Talk" a bit - varied responses for Work Mode
                    let responses = [
                        "Found them! ⚡",
                        "Here are the matches.",
                        "Tracked these down for you.",
                        "Search complete. Access granted.",
                        "Right here.",
                        "Done. ⚡"
                    ];
                    // Pseudo-random pick
                    let idx = (search_results.len() + term.len()) % responses.len();
                    let msg = format!("{} [Fast Search]", responses[idx]);
                    
                    return Ok(CortexResponse {
                        text: msg,
                        related_files: search_results
                    });
                }
            }
        }
    }
    
    // 0. Model Selection
    let model_to_use = if let Some(m) = model_name {
        m // User selected
    } else {
        // Auto-Detect Best Model
        let models_res = client.get("http://localhost:11434/api/tags")
            .timeout(std::time::Duration::from_secs(2))
            .send()
            .await;

        match models_res {
            Ok(res) => {
                if res.status().is_success() {
                    let tags: OllamaTagsResponse = res.json().await.unwrap_or_default();
                    if let Some(preferred) = tags.models.iter().find(|m| m.name.contains("mistral") || m.name.contains("llama3")) {
                         preferred.name.clone()
                    } else if let Some(first) = tags.models.first() {
                        first.name.clone()
                    } else {
                        "mistral".to_string() // Fallback
                    }
                } else {
                    "mistral".to_string()
                }
            },
            Err(_) => return Err("Ollama Connection Failed. Is the app running?".to_string())
        }
    };

    println!("🧠 [Cortex] Using Model: {}", model_to_use);

    // 1. First Pass: Ask LLM (Is a tool needed?)
    let payload = OllamaRequest {
        model: model_to_use.clone(), // FIX: Clone here so we can use it again in pass 2
        prompt: query.clone(),
        stream: false, 
        system: CORTEX_SYSTEM_PROMPT.to_string(),
    };

    // 1. First Pass
    let res = client.post("http://localhost:11434/api/generate")
        .timeout(std::time::Duration::from_secs(120)) 
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Cortex Connect Error: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_else(|_| "No error details".to_string());
        return Err(format!("Ollama Error {}: {}", status, body));
    }

    let body: OllamaResponse = res.json().await.map_err(|e| e.to_string())?;
    let initial_response = body.response.trim().to_string();

    // 2. Check for Tool Invocation
    
    // CASE A: SYSTEM HEALTH
    if initial_response.contains("[HEALTH]") {
        println!("🧠 [Cortex] Decided to Check Health");
        let health = check_system_health();
        let ram_gb = health.ram_used as f32 / 1024.0 / 1024.0 / 1024.0;
        let total_gb = health.ram_total as f32 / 1024.0 / 1024.0 / 1024.0;
        
        let msg = format!(
            "System Status 🩺\n• CPU Usage: {:.1}%\n• RAM: {:.1} GB / {:.1} GB ({:.1}%)", 
            health.cpu_usage, ram_gb, total_gb, health.ram_percent
        );
        
        return Ok(CortexResponse {
            text: msg,
            related_files: vec![]
        });
    }

    // CASE B: PROCESSES
    if initial_response.contains("[PROCESSES]") {
        println!("🧠 [Cortex] Decided to List Processes");
        let top_apps = get_top_processes();
        
        let msg = format!("Top Memory Hogs 🐷\n{}", top_apps);
        
        return Ok(CortexResponse {
            text: msg,
            related_files: vec![]
        });
    }

    // CASE C: APPS
    if initial_response.contains("[APPS]") {
        println!("🧠 [Cortex] Decided to List Apps");
        let apps = get_installed_apps();
        let msg = format!("Installed Applications (Top 50) 📂\n{}", apps);
        return Ok(CortexResponse { text: msg, related_files: vec![] });
    }

    // CASE D: LARGE FILES
    if initial_response.contains("[LARGEFILES]") {
        println!("🧠 [Cortex] Decided to Scan Large Files");
        let files = get_largest_files();
        return Ok(CortexResponse { text: files, related_files: vec![] });
    }

    // CASE E: DUPLICATES
    if initial_response.contains("[DUPLICATES]") {
        println!("🧠 [Cortex] Decided to Scan Duplicates");
        let dups = get_duplicate_files();
        return Ok(CortexResponse { text: dups, related_files: vec![] });
    }

    // CASE F: JUNK (Targeted or Default)
    if let Some(start) = initial_response.find("[JUNK:") {
        if let Some(end) = initial_response[start..].find("]") {
            let path_arg = &initial_response[start+6..start+end].trim();
            println!("🧠 [Cortex] Decided to Scan JUNK in: {}", path_arg);
            let junk = get_junk_report(Some(path_arg.to_string()));
            return Ok(CortexResponse { text: junk, related_files: vec![] });
        }
    }
    else if initial_response.contains("[JUNK]") {
        println!("🧠 [Cortex] Decided to Scan JUNK (Default)");
        let junk = get_junk_report(None);
        return Ok(CortexResponse { text: junk, related_files: vec![] });
    }

    // CASE G: ORGANIZE
    if initial_response.contains("[ORGANIZE]") {
        println!("🧠 [Cortex] Decided to ORGANIZE Desktop");
        let report = organize_desktop();
        return Ok(CortexResponse { text: report, related_files: vec![] });
    }

    // CASE H: EMPTY FOLDERS (SCAN & NUKE)
    if initial_response.contains("[NUKE_EMPTY]") {
        println!("🧠 [Cortex] Decided to NUKE Empty Folders");
        let report = scan_empty_folders(None, true); // Delete = true
        return Ok(CortexResponse { text: report, related_files: vec![] });
    }
    
    if let Some(start) = initial_response.find("[EMPTY:") {
        if let Some(end) = initial_response[start..].find("]") {
            let path_arg = &initial_response[start+7..start+end].trim();
            let report = scan_empty_folders(Some(path_arg.to_string()), false); // Scan Only
            return Ok(CortexResponse { text: report, related_files: vec![] });
        }
    }
    else if initial_response.contains("[EMPTY]") {
        let report = scan_empty_folders(None, false); // Scan Only
        return Ok(CortexResponse { text: report, related_files: vec![] });
    }

    // CASE I: SORT DOWNLOADS
    if initial_response.contains("[SORT]") {
        println!("🧠 [Cortex] Decided to SORT Downloads");
        let report = sort_downloads();
        return Ok(CortexResponse { text: report, related_files: vec![] });
    }

    // CASE J: UNDO SORT
    if initial_response.contains("[UNDO]") {
        println!("🧠 [Cortex] Decided to UNDO Sort");
        let report = undo_last_sort();
        return Ok(CortexResponse { text: report, related_files: vec![] });
    }

    // CASE K: FILE SEARCH
    if let Some(start) = initial_response.find("[SEARCH:") {
        if let Some(end) = initial_response[start..].find("]") {
            let tool_cmd = &initial_response[start..start+end+1];
            let search_query = tool_cmd.replace("[SEARCH:", "").replace("]", "").trim().to_string();
            
            println!("🧠 [Cortex] Decided to Search: '{}'", search_query);

            // 3. EXECUTE TOOL
            let search_results = {
                let engine = state.engine.read().map_err(|_| "Engine Lock Failed")?;
                engine.search(&search_query, 20)
            };
            
            // Format results
            let findings_str = if search_results.is_empty() {
                "Observation: The search tool returned 0 results. If the user was asking for a file, suggest checking the name. If they were just chatting, IGNORE this and reply to the chat.".to_string()
            } else {
                let list: Vec<String> = search_results.iter()
                    .map(|f| format!("- {} ({} bytes)", f.path, f.size))
                    .collect();
                format!("Observation: Found these files:\n{}", list.join("\n"))
            };

            // 4. Optimization: Skip 2nd LLM Pass if files are found! (INSTANT SPEED)
            if !search_results.is_empty() {
                // Randomize friendly response slightly (mock random for now or just rotating)
                let messages = [
                   "Here's what I found!",
                   "I found these files for you.",
                   "Look what I dug up.",
                   "Here are the matches.",
                   "Search complete. access granted."
                ];
                let msg = messages[search_query.len() % messages.len()]; // Pseudo-random based on query length

                return Ok(CortexResponse {
                    text: msg.to_string(),
                    related_files: search_results
                });
            }

            // Only do 2nd pass if NOTHING found (to gently explain) or for other reasons
            let final_prompt = format!("{}\n\nSYSTEM OBSERVATION: {}. \n\nINSTRUCTION: The user can likely see the files in a UI list. Do NOT list the files in your text response. Just briefly mention what you found (e.g. 'I found 12 files, including some archives and documents'). Keep it short.", initial_response, findings_str);
            let payload_2 = OllamaRequest {
                model: model_to_use.clone(),
                prompt: final_prompt, 
                stream: false,
                system: CORTEX_SYSTEM_PROMPT.to_string(),
            };

            // Fix Hang: Use a client with timeout
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(120)) 
                .build()
                .map_err(|e| e.to_string())?;

            let res_2 = client.post("http://localhost:11434/api/generate")
                .json(&payload_2)
                .send()
                .await
                .map_err(|e| format!("Ollama Connection Failed: {}", e))?;

            if res_2.status().is_success() {
                let body = res_2.text().await.map_err(|e| e.to_string())?;
                let mut text_resp = if let Ok(json) = serde_json::from_str::<OllamaResponse>(&body) {
                     json.response
                } else {
                     body
                };
                
                // Cleanup "Cortex:" prefix if present
                if text_resp.starts_with("Cortex:") {
                    text_resp = text_resp.replace("Cortex:", "").trim().to_string();
                }

                return Ok(CortexResponse {
                    text: text_resp,
                    related_files: search_results
                });
            } else {
                 let status = res_2.status();
                 let body = res_2.text().await.unwrap_or_else(|_| "No error details".to_string());
                 return Err(format!("Ollama Error {}: {}", status, body));
            }
        }
    }

    // CASE L: VISUALIZE (Star Map)
    if let Some(start) = initial_response.find("[VISUALIZE:") {
        if let Some(end) = initial_response[start..].find("]") {
            let tool_cmd = &initial_response[start..start+end+1];
            let path = tool_cmd.replace("[VISUALIZE:", "").replace("]", "").trim().to_string();
            // Pass special token to frontend to trigger Viz Mode
            return Ok(CortexResponse {
                text: format!("[VISUALIZE_MODE:{}] Launching Star Map for {}...", path, path),
                related_files: vec![]
            });
        }
    }

// Default: Just return the first response if no tool was used
    Ok(CortexResponse {
        text: initial_response,
        related_files: vec![]
    })
}

#[tauri::command]
async fn get_file_icon(path: String) -> Result<String, String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::UI::Shell::*;
    use windows::Win32::Foundation::*;
    use windows::Win32::Graphics::Gdi::*;
    use windows::Win32::UI::WindowsAndMessaging::*;
    use windows::Win32::Storage::FileSystem::*; // Added for FILE_ATTRIBUTE_NORMAL
    use windows::core::PCWSTR; // Added
    use image::RgbaImage;
    use std::ptr;
    use std::mem;

    // Phase 25: Real Windows Icon Extraction
    // This runs on a separate thread to avoid blocking the main runtime
    let icon_base64 = std::thread::spawn(move || -> Result<String, String> {
        unsafe {
            // 1. Prepare Path
            let wide_path: Vec<u16> = OsStr::new(&path).encode_wide().chain(std::iter::once(0)).collect();
            
            // 2. SHGetFileInfo to get Icon Handle
            let mut shfi: SHFILEINFOW = mem::zeroed();
            let result = SHGetFileInfoW(
                PCWSTR(wide_path.as_ptr()),
                FILE_ATTRIBUTE_NORMAL,
                Some(&mut shfi),
                mem::size_of::<SHFILEINFOW>() as u32,
                SHGFI_ICON | SHGFI_LARGEICON | SHGFI_USEFILEATTRIBUTES // ELITE: Large Icons (32x32)
            );

            if result == 0 || shfi.hIcon.is_invalid() {
                return Err("Failed to get icon handle".to_string());
            }

            // 3. Create a DC and Bitmap to draw the icon
            let screen_dc = GetDC(HWND(ptr::null_mut()));
            let mem_dc = CreateCompatibleDC(screen_dc);
            let width = 32; // Elite: 32x32
            let height = 32;
            let bitmap = CreateCompatibleBitmap(screen_dc, width, height);
            let old_obj = SelectObject(mem_dc, bitmap);

            // 4. Draw the icon onto the bitmap (Transparent background logic is complex in GDI, 
            // simpler approach: Draw on black, then white, or just use DrawIconEx)
            // For MVP: Draw on black background. Transparency is tricky with raw GDI.
            // A better approach often used is getting the raw bits.
            
            let brush = CreateSolidBrush(COLORREF(0x000000));
            let rect = RECT { left: 0, top: 0, right: width, bottom: height };
            let _ = FillRect(mem_dc, &rect, brush);
            DeleteObject(brush);

            DrawIconEx(mem_dc, 0, 0, shfi.hIcon, width, height, 0, HBRUSH(ptr::null_mut()), DI_NORMAL);

            // 5. Extract Bits
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width,
                    biHeight: -height, // Top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                ..Default::default()
            };

            let mut pixels = vec![0u8; (width * height * 4) as usize];
            GetDIBits(mem_dc, bitmap, 0, height as u32, Some(pixels.as_mut_ptr() as *mut _), &mut bmi, DIB_RGB_COLORS);

            // Clean up GDI
            let _ = SelectObject(mem_dc, old_obj);
            let _ = DeleteObject(bitmap);
            let _ = DeleteDC(mem_dc);
            let _ = ReleaseDC(HWND(ptr::null_mut()), screen_dc);
            let _ = DestroyIcon(shfi.hIcon);

            // 6. Convert BGRA -> RGBA and handle transparency (Alpha channel from GDI is often 0)
            // Hacky fix for GDI alpha: if all alpha is 0, assume it's opaque or set to 255.
            // But icons usually have alpha. 
            // In 32-bit GDI, the alpha byte is often preserved if correct flags used, but sometimes not.
            // For now, let's just swap B and R.
            for chunk in pixels.chunks_exact_mut(4) {
                let b = chunk[0];
                let _g = chunk[1];
                let r = chunk[2];
                let _a = chunk[3];
                chunk[0] = r;
                chunk[2] = b;
                // Force alpha to 255 for now to avoid invisible icons if GDI failed us
                chunk[3] = 255; 
            }

            // 7. Encode to PNG
            let img_buf = RgbaImage::from_raw(width as u32, height as u32, pixels).ok_or("Alloc failed")?;
            let mut png_data = Vec::new();
            let mut cursor = std::io::Cursor::new(&mut png_data);
            img_buf.write_to(&mut cursor, image::ImageFormat::Png).map_err(|e| e.to_string())?;

            use base64::Engine as _;
            let b64 = base64::engine::general_purpose::STANDARD.encode(png_data);
            Ok(format!("data:image/png;base64,{}", b64))
        }
    }).join().map_err(|_| "Thread panic".to_string())??;

    Ok(icon_base64)
}



#[derive(serde::Serialize)]
pub struct SystemMetrics {
    pub cpu_usage: f32,
    pub ram_used: u64,
    pub ram_total: u64,
}

#[tauri::command]
fn get_system_metrics() -> SystemMetrics {
    let mut sys = sysinfo::System::new_all();
    sys.refresh_memory();
    // CPU requires time delta, skipping for instant response or handling via state in future.
    // Return 0.0 cpu for now to avoid 200ms latency. RAM is the useful one for "0b" complaints.
    
    SystemMetrics {
        cpu_usage: 0.0, 
        ram_used: sys.used_memory(),
        ram_total: sys.total_memory(),
    }
}

#[tauri::command]
async fn browse_ram_index(
    state: tauri::State<'_, TrashHunterState>,
    path: String
) -> Result<SectorScanResult, String> {
    let engine = state.engine.read().map_err(|_| "Failed to lock engine")?;
    
    // Normalize path to have trailing slash for prefix matching
    let mut target = path.replace("/", "\\");
    if !target.ends_with('\\') { target.push('\\'); }
    
    // If index is empty, TRY ELITE MAPS (Lazy Mode)
    if engine.index.is_empty() {
        if !engine.elite_maps.is_empty() {
            // Use Lazy Maps for browsing (Instant but no sizes initially)
            // 1. Find the map for this drive
            let drive_letter = target.chars().take(2).collect::<String>(); // "C:"
            if let Some(map) = engine.elite_maps.iter().find(|m| m.drive_letter == drive_letter) {
                
                // 2. Find FID of target path (Traverse down)
                // Root is usually 5.
                let mut current_fid = 5; 
                let path_parts: Vec<&str> = target.split('\\').filter(|s| !s.is_empty() && !s.contains(':')).collect();
                
                let mut found = true;
                for part in path_parts {
                    let part_lower = part.to_lowercase();
                    // Find child with this name
                    let mut child_found = false;
                    for (&fid, &parent) in &map.parent_map {
                        if parent == current_fid {
                            if let Some(name) = map.name_map.get(&fid) {
                                if name.to_lowercase() == part_lower {
                                    current_fid = fid;
                                    child_found = true;
                                    break;
                                }
                            }
                        }
                    }
                    if !child_found { found = false; break; }
                }

                if found {
                    // 3. Collect children of current_fid
                    let mut nodes = Vec::new();
                    for (&fid, &parent) in &map.parent_map {
                        if parent == current_fid {
                            if let Some(name) = map.name_map.get(&fid) {
                                let is_dir = !name.contains('.'); // Simple heuristic
                                nodes.push(StorageNode {
                                    name: name.clone(),
                                    size: 0, // Lazy mode has no sizes yet
                                    children: vec![],
                                    is_dir,
                                });
                            }
                        }
                    }
                    // Sort
                    nodes.sort_by(|a, b| a.name.cmp(&b.name)); // Sort by name since size is 0
                    
                    return Ok(SectorScanResult {
                        nodes,
                        largest_files: vec![], // No sizes yet
                    });
                }
            }
        }
        return Err("Index empty".to_string());
    }

    let mut nodes: Vec<StorageNode> = Vec::new();
    let mut large_files: Vec<FileInfo> = Vec::new();

    // Map to aggregate directory sizes if they are not explicitly in index
    // Our index might only have files.
    // We need to deduce directories.
    let mut dir_sizes: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
    
    // Fast Linear Scan of RAM
    for file in &engine.index {
        if file.path.starts_with(&target) {
            // It is inside the target folder (at any depth)
            // relative path: "C:\Users\foo\bar.txt" -> "bar.txt" (if target is "C:\Users\foo\")
            if let Some(relative) = file.path.strip_prefix(&target) {
                // components: "bar.txt" -> ["bar.txt"]
                // "sub\doc.txt" -> ["sub", "doc.txt"]
                
                let parts: Vec<&str> = relative.split('\\').collect();
                if parts.is_empty() || parts[0].is_empty() { continue; }
                
                let top_level_name = parts[0];
                let is_direct_file = parts.len() == 1;

                if is_direct_file {
                    // It's a file right here
                    nodes.push(StorageNode {
                        name: file.name.clone(),
                        size: file.size,
                        children: vec![], // No children for files in this view
                        is_dir: false,
                    });
                    
                    if file.size > 50 * 1024 * 1024 {
                        large_files.push(file.clone());
                    }
                } else {
                    // It's inside a subdirectory
                    // "sub" -> add size to "sub"
                    *dir_sizes.entry(top_level_name.to_string()).or_insert(0) += file.size;
                }
            }
        }
    }

    // Convert aggregated directories to nodes
    for (name, size) in dir_sizes {
        nodes.push(StorageNode {
            name,
            size,
            children: vec![], // We don't recurse deep in this view for speed, or we could? 
            // User wanted speed. Depth 1 is instant. 
            // If we want recursive visualization, we'd need more complex logic.
            // Let's stick to flat list of THIS folder, but instant.
            is_dir: true,
        });
    }

    // Sort
    nodes.sort_by(|a, b| b.size.cmp(&a.size));
    large_files.sort_by(|a, b| b.size.cmp(&a.size));

    if nodes.is_empty() {
        return Err("No results in RAM".to_string()); // Fallback to disk
    }

    // SAFETY CHECK: If we have results but they are all 0 bytes (Phase 1 Index),
    // we must fallback to Disk Scan to get actual sizes for the Star Map.
    // Otherwise the user sees "0 B" everywhere.
    if nodes.len() > 5 && nodes.iter().all(|n| n.size == 0) {
        return Err("Index has no sizes (Phase 1)".to_string());
    }

    Ok(SectorScanResult {
        nodes,
        largest_files: large_files.into_iter().take(50).collect(),
    })
}

/// NEW: AI Safety Check for Processes (OVERSEER LEVEL)
#[tauri::command]
async fn analyze_process_safety(proc_name: String, proc_path: String, memory_mb: f64) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // 1. Auto-Detect Best Model
    let models_res = client.get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await;

    let model_to_use = match models_res {
        Ok(res) => {
            if res.status().is_success() {
                let tags: OllamaTagsResponse = res.json().await.unwrap_or_default();
                if let Some(preferred) = tags.models.iter().find(|m| m.name.contains("mistral") || m.name.contains("llama3")) {
                        preferred.name.clone()
                } else if let Some(first) = tags.models.first() {
                    first.name.clone()
                } else {
                    return Err("No AI models found. Please install a model in Settings.".to_string());
                }
            } else {
                return Err("Ollama service not reachable.".to_string());
            }
        },
        Err(_) => return Err("Ollama service is offline.".to_string())
    };

    let prompt = format!(
        "Analyze this Windows process for security threats.
        Name: {}
        Path: {}
        Memory: {:.2} MB
        
        Is this safe? If it's a system process, say SAFE. If it looks like a miner or malware, say DANGER. Keep it short.",
        proc_name, proc_path, memory_mb
    );

    let body = serde_json::json!({
        "model": model_to_use,
        "prompt": prompt,
        "stream": false
    });

    let res = client.post("http://localhost:11434/api/generate")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let ollama_res: OllamaResponse = res.json().await.map_err(|e| e.to_string())?;
        Ok(ollama_res.response)
    } else {
        Err(format!("AI Error: {}", res.status()))
    }
}

/// NEW: AI Safety Check for File Deletion (FORENSIC LEVEL)
#[tauri::command]
async fn analyze_file_safety(path: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let path_obj = std::path::Path::new(&path);
    
    // 1. Auto-Detect Best Model
    let models_res = client.get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await;

    let model_to_use = match models_res {
        Ok(res) => {
            if res.status().is_success() {
                let tags: OllamaTagsResponse = res.json().await.unwrap_or_default();
                if let Some(preferred) = tags.models.iter().find(|m| m.name.contains("mistral") || m.name.contains("llama3")) {
                        preferred.name.clone()
                } else if let Some(first) = tags.models.first() {
                    first.name.clone()
                } else {
                    return Err("No Ollama models found.".to_string());
                }
            } else {
                return Err("Ollama not responding.".to_string());
            }
        },
        Err(_) => return Err("Ollama Connection Failed.".to_string())
    };

    // 2. GATHER FORENSIC EVIDENCE (The "Super Power")
    let mut evidence = Vec::new();
    evidence.push(format!("PRIMARY TARGET PATH: {}", path));
    
    // GOD MODE: STATIC ANALYSIS (Zero CPU Cost, Infinite Wisdom)
    let path_lower = path.to_lowercase();
    let is_system_root = path_lower.contains("c:\\windows") || path_lower.contains("system32") || path_lower.contains("syswow64");
    
    if is_system_root {
        evidence.push("OMNISCIENT INTEL: This is a CORE WINDOWS OPERATING SYSTEM component. Risk is ABSOLUTELY CRITICAL.".to_string());
        evidence.push("CONSEQUENCE: Deletion will cause Blue Screen of Death (BSOD) or OS failure.".to_string());
    } else if path_lower.contains("program files") {
        evidence.push("OMNISCIENT INTEL: Installed Application Directory.".to_string());
    } else if path_lower.contains("$recycle.bin") {
        evidence.push("OMNISCIENT INTEL: System Recycle Bin (Safe to empty contents, do not delete root).".to_string());
    } else if path_lower.contains("appdata") {
        evidence.push("OMNISCIENT INTEL: User Application Data (Config/Cache).".to_string());
    }

    // A. Metadata Extraction (PowerShell)
    if path_obj.is_file() {
        // Get Real Product Name & Company from Binary
        let ps_cmd = format!("(Get-Item '{}').VersionInfo | Select-Object -Property ProductName, CompanyName, FileDescription, OriginalFilename | ConvertTo-Json -Compress", path);
        if let Ok(output) = std::process::Command::new("powershell")
            .args(&["-NoProfile", "-Command", &ps_cmd])
            .output() 
        {
            let json = String::from_utf8_lossy(&output.stdout).to_string();
            if !json.trim().is_empty() {
                evidence.push(format!("Binary Signature: {}", json));
            }
        }

        // Get Magic Bytes (Hex Header)
        if let Ok(mut f) = std::fs::File::open(&path) {
            use std::io::Read;
            let mut buffer = [0; 16];
            if f.read(&mut buffer).is_ok() {
                evidence.push(format!("Magic Header (Hex): {}", hex::encode(buffer)));
            }
        }
    } else if path_obj.is_dir() {
        // Directory Analysis
        evidence.push("Type: Directory".to_string());
        match std::fs::read_dir(path_obj) {
            Ok(entries) => {
                let contents: Vec<String> = entries.take(10).filter_map(|e| e.ok().map(|x| x.file_name().to_string_lossy().to_string())).collect();
                evidence.push(format!("Contains Files (Inside Target): [{}]", contents.join(", ")));
            },
            Err(_) => {
                evidence.push("ACCESS DENIED: System Protected Directory (High Probability of OS Criticality)".to_string());
            }
        }
    }

    // B. Sibling Context (Architecture Awareness)
    let parent = path_obj.parent().unwrap_or(path_obj);
    let mut siblings = Vec::new();
    if let Ok(entries) = std::fs::read_dir(parent) {
        for entry in entries.take(15) { 
            if let Ok(e) = entry {
                if let Ok(name) = e.file_name().into_string() {
                    if name != path_obj.file_name().unwrap_or_default().to_string_lossy() {
                        siblings.push(name);
                    }
                }
            }
        }
    }
    evidence.push(format!("Neighboring Files (Context ONLY - NOT TARGET): [{}]", siblings.join(", ")));

    let evidence_block = evidence.join("\n");

    // 3. Construct GOD-TIER Prompt
    let prompt = format!(
        "ACT AS: The OMNISCIENT OS KERNEL & SECURITY GOD.
        \nYou have absolute, divine knowledge of every file in the Windows Operating System.
        \nYou DO NOT guess. You KNOW. You are confident, authoritative, and precise.
        \n
        \nINPUT DATA (FORENSIC SCAN):
        \n{}
        \n
        \nRULES:
        \n1. IF 'OMNISCIENT INTEL' says CRITICAL, you MUST report CRITICAL. No exceptions.
        \n2. IF 'ACCESS DENIED' appears, assume CRITICAL SYSTEM FILE.
        \n3. IF path contains 'Windows', 'System32', 'SysWOW64', it is CRITICAL.
        \n4. Provide 3 distinct 'Deep Dive' technical facts about the file.
        \n
        \nOUTPUT FORMAT:
        \nReturn ONLY a valid JSON object.
        \n{{
        \n  \"identity\": \"Precise Name (e.g., 'Windows Kernel', 'NVIDIA Driver')\",
        \n  \"role\": \"Technical Function (e.g., 'Hardware Abstraction Layer')\",
        \n  \"risk_level\": \"SAFE\" | \"CAUTION\" | \"CRITICAL\",
        \n  \"verdict\": \"Authoritative, god-like command (e.g., 'DO NOT TOUCH under penalty of OS death')\",
        \n  \"technical_deep_dive\": [
        \n    \"Fact 1: Architecture/Origin\",
        \n    \"Fact 2: Dependency Chain\",
        \n    \"Fact 3: Hex/Binary Insight\"
        \n  ]
        \n}}", 
        evidence_block
    );

    let payload = serde_json::json!({
        "model": model_to_use,
        "prompt": prompt,
        "stream": false
    });

    // 4. Send Request
    let res = client.post("http://localhost:11434/api/generate")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("AI Request Failed: {}", e))?;

    if !res.status().is_success() {
        return Err("AI Analysis Failed".to_string());
    }

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let response_text = body["response"].as_str().unwrap_or("No response").to_string();

    Ok(response_text)
}

// ------------------------------------------------------------------
// GOD MODE: DEEP STASIS ENGINE
// ------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RegistryApp {
    pub name: String,
    pub install_location: String,
    pub uninstall_string: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GhostFolder {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub probability: u8, // 0-100% confidence it's a ghost
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeepScanReport {
    pub registry_apps: Vec<RegistryApp>,
    pub ghost_folders: Vec<GhostFolder>,
    pub driver_issues: Vec<String>,
    pub installer_issues: Vec<String>,
}

#[tauri::command]
async fn perform_deep_scan(mode: String, target: Option<String>) -> DeepScanReport {
    println!("INITIATING DEEP SCAN: Mode={}, Target={:?}", mode, target);
    
    // 1. REGISTRY MAPPING (The Truth Table)
    // We use PowerShell to get the "Official" list of installed software
    let ps_script = r#"
        $apps = @()
        $paths = @("HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*")
        foreach ($path in $paths) {
            Get-ItemProperty $path -ErrorAction SilentlyContinue | ForEach-Object {
                if ($_.DisplayName) {
                    $apps += [PSCustomObject]@{
                        name = $_.DisplayName
                        install_location = if ($_.InstallLocation) { $_.InstallLocation } else { "" }
                        uninstall_string = if ($_.UninstallString) { $_.UninstallString } else { "" }
                    }
                }
            }
        }
        $apps | ConvertTo-Json -Compress
    "#;

    let output = std::process::Command::new("powershell")
        .args(&["-NoProfile", "-Command", ps_script])
        .output()
        .expect("Failed to execute registry scan");

    let registry_json = String::from_utf8_lossy(&output.stdout);
    let mut registry_apps: Vec<RegistryApp> = serde_json::from_str(&registry_json).unwrap_or_default();

    // 2. GHOST HUNTING (Orphan Detection)
    // Scan AppData and check if folder names match any installed app
    let mut ghost_folders = Vec::new();
    
    if let Some(user_dirs) = dirs::home_dir() {
        let appdata_local = user_dirs.join("AppData").join("Local");
        let appdata_roaming = user_dirs.join("AppData").join("Roaming");
        
        let dirs_to_check = vec![appdata_local, appdata_roaming];
        
        for dir in dirs_to_check {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_dir() {
                            let folder_name = entry.file_name().to_string_lossy().to_string();
                            let folder_path = entry.path().to_string_lossy().to_string();
                            
                            // FUZZY MATCHING: Does this folder belong to any app?
                            let mut is_owned = false;
                            
                            // SAFETY WHITELIST: Never flag these as ghosts
                            let whitelist = vec![
                                "Microsoft", "Windows", "Google", "Intel", "NVIDIA", "AMD", "Realtek",
                                "trash-hunter", "word-hacker", "wordhacker", "com.guitar", "com.wordhacker", // SELF PROTECTION
                                "Visual Studio", "VSCode", "Code", "Rust", "Cargo", "node_modules", "npm", "git", // DEV TOOLS
                                "Ollama", "ollama", "Python", "python", "Anaconda", "Miniconda" // AI TOOLS
                            ];

                            for safe_word in &whitelist {
                                if folder_name.to_lowercase().contains(&safe_word.to_lowercase()) {
                                    is_owned = true; // Treat as owned (safe)
                                    break;
                                }
                            }

                            if !is_owned {
                                for app in &registry_apps {
                                    if strsim::jaro_winkler(&folder_name.to_lowercase(), &app.name.to_lowercase()) > 0.85 {
                                        is_owned = true;
                                        break;
                                    }
                                }
                            }
                            
                            if !is_owned {
                                // Calculate size (expensive, but this is Deep Scan)
                                let size = calculate_dir_size_recursive(&entry.path());
                                if size > 1024 * 1024 * 50 { // Only care about ghosts > 50MB
                                    ghost_folders.push(GhostFolder {
                                        path: folder_path,
                                        name: folder_name,
                                        size,
                                        probability: 90,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. DRIVER STORE ANALYSIS (Real Implementation)
    // Scan C:\Windows\System32\DriverStore\FileRepository
    // Group by prefix (e.g. "nv_disp.inf") and find duplicates
    let mut driver_issues = Vec::new();
    let driver_store_path = Path::new("C:\\Windows\\System32\\DriverStore\\FileRepository");
    
    if driver_store_path.exists() {
        let mut driver_groups: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
        
        if let Ok(entries) = std::fs::read_dir(driver_store_path) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let folder_name = entry.file_name().to_string_lossy().to_string();
                        // Extract prefix (everything before the last underscore usually, or just the .inf name)
                        // Example: nv_disp.inf_amd64_12345 -> nv_disp.inf
                        if let Some(idx) = folder_name.find("_amd64_") {
                            let prefix = folder_name[..idx].to_string();
                            driver_groups.entry(prefix).or_default().push(folder_name);
                        } else if let Some(idx) = folder_name.find("_x86_") {
                            let prefix = folder_name[..idx].to_string();
                            driver_groups.entry(prefix).or_default().push(folder_name);
                        }
                    }
                }
            }
        }

        // Analyze groups for duplicates
        for (_prefix, versions) in driver_groups {
            if versions.len() > 1 {
                // We need to find which ones are OLD.
                // Map version names to full paths
                let mut version_paths: Vec<(String, u64)> = Vec::new(); // (path, modified_time)
                
                for v in versions {
                    let full_path = driver_store_path.join(&v);
                    if let Ok(metadata) = std::fs::metadata(&full_path) {
                        if let Ok(modified) = metadata.modified() {
                             if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                                 version_paths.push((full_path.to_string_lossy().to_string(), duration.as_secs()));
                             }
                        }
                    }
                }

                // Sort by time descending (Newest first)
                version_paths.sort_by(|a, b| b.1.cmp(&a.1));

                // Keep the first one (Newest), delete the rest
                for (path, _) in version_paths.iter().skip(1) {
                    driver_issues.push(path.clone());
                }
            }
        }
    }

    // 4. INSTALLER GRAVEYARD (Real Implementation)
    // Scan C:\Windows\Installer for .msi/.msp files
    // This is a simplified check: just listing large files for now as "Potential Orphans"
    // A full check requires MsiGetProductInfo which is complex via FFI.
    let mut installer_issues = Vec::new();
    let installer_path = Path::new("C:\\Windows\\Installer");
    if installer_path.exists() {
        if let Ok(entries) = std::fs::read_dir(installer_path) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.len() > 1024 * 1024 * 100 { // > 100MB
                        let name = entry.file_name().to_string_lossy().to_string();
                        installer_issues.push(format!("Large Installer: {} ({} MB)", name, metadata.len() / 1024 / 1024));
                    }
                }
            }
        }
    }

    DeepScanReport {
        registry_apps,
        ghost_folders,
        driver_issues,
        installer_issues,
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HistoryEntry {
    pub timestamp: u64,
    pub action: String, // "RECYCLE" or "ANNIHILATE"
    pub path: String,
    pub size: u64,
    pub success: bool,
    pub error: Option<String>,
}

fn log_history(entry: HistoryEntry, app: Option<&tauri::AppHandle>) {
    use std::fs::OpenOptions;
    use std::io::Write;
    use tauri::Emitter;

    if let Some(mut path) = dirs::data_local_dir() {
        path.push("trash-hunter");
        std::fs::create_dir_all(&path).unwrap_or_default();
        path.push("history.json");

        // Read existing
        let mut history: Vec<HistoryEntry> = if path.exists() {
            let content = std::fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Vec::new()
        };

        // Append new
        history.push(entry.clone());

        // Write back
        if let Ok(json) = serde_json::to_string_pretty(&history) {
            let _ = std::fs::write(path, json);
        }
    }

    // EMIT EVENT FOR LIVE UX UPDATE
    if let Some(handle) = app {
        let _ = handle.emit("history_update", &entry);
    }
}

#[tauri::command]
async fn get_history() -> Vec<HistoryEntry> {
    if let Some(mut path) = dirs::data_local_dir() {
        path.push("trash-hunter");
        path.push("history.json");
        if path.exists() {
            let content = std::fs::read_to_string(&path).unwrap_or_default();
            return serde_json::from_str(&content).unwrap_or_default();
        }
    }
    Vec::new()
}

#[tauri::command]
async fn execute_god_mode_strategy(app: tauri::AppHandle, items: Vec<String>, permanent: bool) -> Result<String, String> {
    let mut reclaimed = 0;
    let mut success_count = 0;
    let mut errors = Vec::new();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    for path in items {
        let p = Path::new(&path);
        if p.exists() {
             // Calculate size for reporting
             let size = if p.is_dir() {
                 calculate_dir_size_recursive(p)
             } else {
                 p.metadata().map(|m| m.len()).unwrap_or(0)
             };

             let action_type = if permanent { "ANNIHILATE" } else { "RECYCLE" };
             let mut entry = HistoryEntry {
                 timestamp,
                 action: action_type.to_string(),
                 path: path.clone(),
                 size,
                 success: false,
                 error: None,
             };

             if permanent {
                 // FORCE DELETE (God Mode Power)
                 let result = if p.is_dir() {
                     std::fs::remove_dir_all(p)
                 } else {
                     std::fs::remove_file(p)
                 };

                 match result {
                     Ok(_) => {
                         reclaimed += size;
                         success_count += 1;
                         entry.success = true;
                     },
                     Err(e) => {
                         let err_msg = e.to_string();
                         errors.push(format!("Failed to annihilate {}: {}", path, err_msg));
                         entry.error = Some(err_msg);
                     }
                 }
             } else {
                 // SAFE DELETE: Move to Recycle Bin via PowerShell
                 // FIX: Use -NonInteractive to prevent hanging if dialogs try to appear
                 let ps_command = if p.is_dir() {
                     format!(
                         "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('{}', 'OnlyErrorDialogs', 'SendToRecycleBin')",
                         path.replace("'", "''") 
                     )
                 } else {
                     format!(
                         "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('{}', 'OnlyErrorDialogs', 'SendToRecycleBin')",
                         path.replace("'", "''")
                     )
                 };

                 // Use creation_flags(0x08000000) to hide window (CREATE_NO_WINDOW)
                 use std::os::windows::process::CommandExt;
                 let output = std::process::Command::new("powershell")
                     .args(["-NoProfile", "-NonInteractive", "-Command", &ps_command])
                     .creation_flags(0x08000000) 
                     .output();

                 match output {
                     Ok(out) => {
                         if out.status.success() {
                             reclaimed += size;
                             success_count += 1;
                             entry.success = true;
                         } else {
                             let err_msg = String::from_utf8_lossy(&out.stderr).to_string();
                             errors.push(format!("Failed to recycle {}: {}", path, err_msg));
                             entry.error = Some(err_msg);
                         }
                     },
                     Err(e) => {
                         let err_msg = e.to_string();
                         errors.push(format!("Failed to execute recycle command for {}: {}", path, err_msg));
                         entry.error = Some(err_msg);
                     },
                 }
             }
             
             // LOG TO DISK
             log_history(entry, Some(&app));
        }
    }
    
    if success_count > 0 {
        let method = if permanent { "PERMANENTLY ANNIHILATED" } else { "Recycled" };
        Ok(format!("Strategy Executed. {} {} items. Reclaimed {} MB.", method, success_count, reclaimed / 1024 / 1024))
    } else if !errors.is_empty() {
        Err(format!("Execution Failed. Errors: {:?}", errors))
    } else {
        Ok("No items were removed.".to_string())
    }
}

fn calculate_dir_size_recursive(path: &Path) -> u64 {
    let mut total_size = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    total_size += calculate_dir_size_recursive(&entry.path());
                } else {
                    total_size += metadata.len();
                }
            }
        }
    }
    total_size
}

#[tauri::command]
async fn pick_folder() -> Option<String> {
    let task = rfd::AsyncFileDialog::new().pick_folder();
    let folder = task.await;
    folder.map(|f| f.path().to_string_lossy().to_string())
}

// ------------------------------------------------------------------
// AI OVERSEER MODULE
// ------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory: u64,
    pub cpu_usage: f32,
    pub path: String,
}

#[tauri::command]
fn get_running_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    sys.processes().iter().map(|(pid, process)| {
        ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string(),
            memory: process.memory(),
            cpu_usage: process.cpu_usage(),
            path: process.exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        }
    }).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_sector_unified,
            load_cached_sector,
            get_system_drives,
            get_disk_stats,
            ask_cortex_llm,
            scan_junk,
            delete_items,
            run_ai_analysis,
            open_file,
            show_in_explorer,
            scan_directory,
            start_drag,
            diagnose_drive,
            build_index,
            search_ram,
            get_hunter_status,
            calculate_dir_size,
            save_index,
            load_index,
            get_file_icon,
            copy_items,
            move_items,
            get_ollama_models,
            check_ollama_status,
            download_ollama_model,
            get_system_metrics,
            browse_ram_index, // <--- NEW ENGINE POWER
            get_recent_files,  // <--- RECENT FILES FOR HOME SCREEN
            get_smart_suggestions, // <--- AI SMART SEARCH
            analyze_file_safety, // <--- NEW AI SAFETY CHECK
            perform_deep_scan, // <--- GOD MODE ENGINE
            execute_god_mode_strategy, // <--- GOD MODE EXECUTION
            pick_folder, // <--- FOLDER PICKER
            get_history, // <--- PERSISTENT HISTORY
            get_running_processes, // <--- AI OVERSEER
            analyze_process_safety // <--- AI OVERSEER ANALYSIS
        ])
        .manage(TrashHunterState { 
            engine: Arc::new(RwLock::new(SearchEngine::new()))
        })
        .setup(|app| {
            let state = app.state::<TrashHunterState>();
            
            // ELITE: Auto-load index on boot (Async Spawn)
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Re-acquire state inside the thread where it is safe
                let state = app_handle.state::<TrashHunterState>();
                let _ = load_index(app_handle.clone(), state).await;
            });

            start_background_indexer(app.handle().clone(), state.engine.clone());

            // 👻 GHOST MONITOR: System Tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Monitor", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| {
                match event.id.as_ref() {
                    "quit" => {
                    app.exit(0);
                    }
                    "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    }
                    _ => {}
                }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
