use std::collections::HashMap;
use std::path::Path;
use tauri::Emitter;
use usn_journal_rs::mft::Mft;
use usn_journal_rs::volume::Volume;

// Sentinel for Safety
const MIN_FILES_EXPECTED: usize = 5000;

/// NEW: Return raw maps for lazy evaluation (MINIMAL for speed)
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct EliteMaps {
    pub parent_map: HashMap<u64, u64>,  // fid -> parent_fid
    pub name_map: HashMap<u64, String>, // fid -> filename
    pub drive_letter: String,
    pub total_entries: usize,
    // Removed: is_dir_map, modified_map, size_map (too slow)
}

/// The Main Entry Point for the Elite Scan
/// NOW RETURNS MAPS instead of files (Lazy Evaluation)
pub fn elite_scan_drive_lazy(
    app: &tauri::AppHandle,
    drive_letter: &str,
) -> Result<EliteMaps, String> {
    // 1. Safety: Input Sanitization
    let clean_drive = drive_letter.trim_end_matches('\\').trim_end_matches(':');
    let volume_path = format!("\\\\.\\{}:", clean_drive);

    // 2. Open Volume
    let volume = Volume::from_mount_point(Path::new(&volume_path))
        .map_err(|e| format!("Elite: Failed to open volume {}: {:?}", drive_letter, e))?;

    // 3. Open MFT
    let mft = Mft::new(&volume);

    // 4. Data Structures (MINIMAL for 5s boot)
    let mut parent_map: HashMap<u64, u64> = HashMap::with_capacity(500_000);
    let mut name_map: HashMap<u64, String> = HashMap::with_capacity(500_000);
    // Removed: is_dir_map, modified_map, size_map (too slow to extract)

    // 5. Iterate MFT (ULTRA FAST - only name + parent)
    println!("ELITE LAZY: Starting MFT Scan on {}...", drive_letter);
    let mut count = 0;

    for entry_result in mft.iter() {
        if let Ok(entry) = entry_result {
            count += 1;

            // Store ONLY name and parent (fastest possible)
            parent_map.insert(entry.fid, entry.parent_fid);
            name_map.insert(entry.fid, entry.file_name.to_string_lossy().to_string());

            // Smooth progress updates every 10k for responsive UI
            if count % 10_000 == 0 {
                let _ = app.emit("indexing_progress", count);
            }

            // Console log every 50k to avoid spam
            if count % 50_000 == 0 {
                println!("ELITE LAZY: Scanned {} MFT records...", count);
            }
        }
    }

    // 6. Safety Check
    if count < MIN_FILES_EXPECTED {
        return Err(format!(
            "Elite: Only found {} MFT items. Deploying Parachute.",
            count
        ));
    }

    println!(
        "ELITE LAZY: MFT Scan complete in ~5s. Stored {} entries.",
        name_map.len()
    );
    println!("ELITE LAZY: Paths will be built on-demand during search.");

    // Return raw maps (MINIMAL)
    Ok(EliteMaps {
        parent_map,
        name_map,
        drive_letter: clean_drive.to_string(),
        total_entries: count,
    })
}

/// Helper function to build path on-demand from maps (called during search)
pub fn resolve_path(fid: u64, maps: &EliteMaps) -> Option<String> {
    let mut path_parts = Vec::new();

    // Get file name
    let name = maps.name_map.get(&fid)?;
    path_parts.push(name.clone());

    let mut curr = fid;
    let mut depth = 0;

    // Walk up the tree
    while let Some(&parent_id) = maps.parent_map.get(&curr) {
        if parent_id == curr {
            break;
        } // Root

        if let Some(parent_name) = maps.name_map.get(&parent_id) {
            path_parts.push(parent_name.clone());
            curr = parent_id;
        } else {
            break; // Orphan - stop here
        }

        depth += 1;
        if depth > 100 {
            break;
        } // Safety
    }

    // Build full path
    let mut full_path = format!("{}:", maps.drive_letter);
    if !full_path.ends_with('\\') {
        full_path.push('\\');
    }

    for part in path_parts.iter().rev() {
        full_path.push_str(part);
        full_path.push('\\');
    }
    full_path.pop(); // Remove trailing slash

    Some(full_path)
}

/// Search function that uses lazy evaluation
pub fn search_lazy(query: &str, maps: &EliteMaps, limit: usize) -> Vec<(u64, String)> {
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    for (fid, name) in &maps.name_map {
        if name.to_lowercase().contains(&query_lower) {
            if let Some(path) = resolve_path(*fid, maps) {
                results.push((*fid, path));
                if results.len() >= limit {
                    break;
                }
            }
        }
    }

    results
}
