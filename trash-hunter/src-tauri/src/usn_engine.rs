use crate::FileInfo;
use std::collections::HashMap;
use std::path::Path;
use tauri::Emitter;
use usn_journal_rs::mft::Mft;
use usn_journal_rs::volume::Volume;

// Sentinel for Safety
const MIN_FILES_EXPECTED: usize = 5000;

#[allow(dead_code)]
pub struct EliteIndexResult {
    pub files: Vec<FileInfo>,
    pub stats: String,
}

/// The Main Entry Point for the Elite Scan
/// Returns a Vector of files OR an error string.
/// If ANY step fails, we return Err, triggering the "Parachute" (Fallback) in lib.rs
pub fn elite_scan_drive(
    app: &tauri::AppHandle,
    drive_letter: &str,
) -> Result<EliteIndexResult, String> {
    // 1. Safety: Input Sanitization
    let clean_drive = drive_letter.trim_end_matches('\\').trim_end_matches(':');
    let volume_path = format!("\\\\.\\{}:", clean_drive);

    // 2. Open Volume (Low Level)
    let volume = Volume::from_mount_point(Path::new(&volume_path))
        .map_err(|e| format!("Elite: Failed to open volume {}: {:?}", drive_letter, e))?;

    // 3. Open MFT (The Real Deal)
    let mft = Mft::new(&volume);

    // 4. Data Structures for Path Reconstruction
    // Map: FileReferenceNumber (ID) -> ParentFileReferenceNumber (ParentID)
    let mut parent_map: HashMap<u64, u64> = HashMap::with_capacity(500_000);
    // Map: FileReferenceNumber (ID) -> FileName (String)
    let mut name_map: HashMap<u64, String> = HashMap::with_capacity(500_000);

    let mut files: Vec<FileInfo> = Vec::with_capacity(500_000);

    // 5. Iterate MFT
    // MFT iteration is FINITE (snapshot). No timeout needed.
    println!("ELITE: Starting MFT Scan on {}...", drive_letter);
    let mut count = 0;

    for entry_result in mft.iter() {
        if let Ok(entry) = entry_result {
            count += 1;

            // MftEntry fields: fid, parent_fid, file_name
            parent_map.insert(entry.fid, entry.parent_fid);
            name_map.insert(entry.fid, entry.file_name.to_string_lossy().to_string());

            if count % 20_000 == 0 {
                println!("ELITE: Scanned {} MFT records...", count);
                let _ = app.emit("indexing_progress", count);
            }
        }
    }

    // 6. Safety Check (The Sentinel)
    if count < MIN_FILES_EXPECTED {
        return Err(format!(
            "Elite: Only found {} MFT items. Deploying Parachute.",
            count
        ));
    }

    println!(
        "ELITE: MFT Scan complete. Phase 2 (Reconstruction) on {} items...",
        name_map.len()
    );

    // 7. Path Reconstruction (The "Missing Link")
    // Phase 2: Turn Maps into FileInfo
    let mut processed_count = 0;

    for (id, name) in &name_map {
        processed_count += 1;
        if processed_count % 50_000 == 0 {
            println!(
                "ELITE: Reconstructed {}/{} paths...",
                processed_count,
                name_map.len()
            );
            let _ = app.emit("indexing_progress", processed_count);
        }

        let mut path_parts = Vec::new();
        // Push the file name itself first
        path_parts.push(name.clone());

        let mut curr = *id;
        let mut depth = 0;
        let mut broken_chain = false;

        // Walk up the tree
        while let Some(parent_id) = parent_map.get(&curr) {
            // Stop if we hit root or self-cycle
            if *parent_id == curr {
                break;
            }

            if let Some(parent_name) = name_map.get(parent_id) {
                path_parts.push(parent_name.clone());
                curr = *parent_id;
            } else {
                // Parent ID known, but Name unknown? (Found top of chain or broken link)
                // ADOPT THE ORPHAN: We assume this is a valid top-level path or root.
                // Do NOT set broken_chain = true. Just stop climbing.
                break;
            }

            depth += 1;
            if depth > 100 {
                broken_chain = true;
                break;
            }
        }

        if !broken_chain {
            // path_parts is [File, Parent, Grandparent, ... Root]
            // We want "Drive:\Root\Grandparent\Parent\File"

            let mut full_path = clean_drive.to_string(); // "C:"
            if !full_path.ends_with('\\') {
                full_path.push('\\');
            }

            // Reverse iteration to build path
            for part in path_parts.iter().rev() {
                full_path.push_str(part);
                full_path.push('\\');
            }
            // Remove trailing slash from file
            full_path.pop();

            files.push(FileInfo {
                path: full_path.clone(),
                name: name.clone(),
                name_lower: name.to_lowercase(),
                is_dir: false, // We need to check attributes if possible, default false for speed
                size: 0,
                modified: 0,
            });
        }
    }

    println!("ELITE: Scan Complete. Found {} files.", files.len());

    Ok(EliteIndexResult {
        files,
        stats: format!("Scanned {} MFT records", count),
    })
}
