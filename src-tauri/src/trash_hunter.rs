use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::{Disks, System};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShadowCopy {
    pub id: String,
    pub created_at: String,
    pub volume: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory: u64,
    pub cpu_usage: f32,
    pub path: String,
}

#[command]
pub fn get_running_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    sys.processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string(),
            memory: process.memory(),
            cpu_usage: process.cpu_usage(),
            path: process.exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        })
        .collect()
}

#[command]
pub fn get_system_drives() -> Vec<DriveInfo> {
    let disks = Disks::new_with_refreshed_list();
    
    disks.list()
        .iter()
        .map(|disk| DriveInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
        })
        .collect()
}

#[command]
pub fn scan_shadow_copies() -> Result<Vec<ShadowCopy>, String> {
    // Use vssadmin via PowerShell to get structured data if possible, or parse text
    // vssadmin list shadows
    // Parsing vssadmin output is painful. 
    // Better to use PowerShell: Get-ComputerRestorePoint (requires admin) or vssadmin
    
    // Let's try vssadmin list shadows and parse it simply for now.
    // Or better, use wmic: wmic shadowcopy get ID,InstallDate,VolumeName
    
    let output = Command::new("powershell")
        .args(&["-NoProfile", "-Command", "vssadmin list shadows"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut shadows = Vec::new();
    
    // Simple parser for vssadmin output
    // Contents of shadow copy set ID: {uuid}
    //    Contained 1 shadow copies at creation time: 12/17/2025 10:00:00 AM
    //       Shadow Copy ID: {uuid}
    //       Original Volume: (C:)\\?\Volume{...}\
    
    let mut current_id = String::new();
    let mut current_time = String::new();
    
    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("Shadow Copy ID:") {
            current_id = line.replace("Shadow Copy ID:", "").trim().to_string();
        } else if line.starts_with("Contained 1 shadow copies at creation time:") {
             current_time = line.replace("Contained 1 shadow copies at creation time:", "").trim().to_string();
        } else if line.starts_with("Original Volume:") {
            let volume = line.replace("Original Volume:", "").trim().to_string();
            if !current_id.is_empty() {
                shadows.push(ShadowCopy {
                    id: current_id.clone(),
                    created_at: current_time.clone(),
                    volume,
                });
                current_id.clear();
                current_time.clear();
            }
        }
    }

    Ok(shadows)
}

#[command]
pub async fn delete_shadow_copy(id: String) -> Result<String, String> {
    // 🛡️ USE SILENT ENGINE (Service)
    // Instead of running vssadmin directly (which fails without Admin),
    // we ask the Service to do it via the Secure IPC Pipe.
    crate::ipc_client::send_service_command("delete_shadow".to_string(), Some(id)).await
}
