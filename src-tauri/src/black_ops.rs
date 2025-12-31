use tauri::command;
use std::process::Command;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[command]
pub async fn run_black_ops(module: String, args: Vec<String>) -> Result<String, String> {
    // Construct the command: wsl -d kali-linux bash /home/kali/blackops/<module>.sh <args>
    let mut wsl_args = vec![
        "-d".to_string(),
        "kali-linux".to_string(),
        "bash".to_string(),
        format!("/home/kali/blackops/{}.sh", module),
    ];
    wsl_args.extend(args);

    let output = Command::new("wsl")
        .args(&wsl_args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
