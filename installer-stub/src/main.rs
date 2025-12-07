use anyhow::{Context, Result};
use indicatif::{ProgressBar, ProgressStyle};
use serde::Deserialize;
use std::fs::{self, File};
use std::io::{self, Write, Read};
use std::path::{Path, PathBuf};
use std::process::Command;

// ----------------------------------------------------------------
// 🔧 CONFIGURATION
// ----------------------------------------------------------------
const APP_NAME: &str = "Word Hacker Tool";
const EXECUTABLE_NAME: &str = "Word Hacker Tool.exe";
// Replace with your actual GitHub Releases URL or S3 bucket
const UPDATE_URL: &str = "https://github.com/Pramsss108/wh404-desktop-builds/releases/latest/download/latest.json";

#[derive(Deserialize, Debug)]
struct ReleaseInfo {
    version: String,
    url: String, // URL to the .zip containing the app
    hash: String,
}

fn main() -> Result<()> {
    println!("🚀 Initializing {} Installer...", APP_NAME);

    // 1. Define Install Paths
    let install_dir = get_install_dir()?;
    println!("📂 Install Location: {:?}", install_dir);

    // 2. Fetch Latest Version Info
    println!("🌐 Checking for updates...");
    // In a real scenario, uncomment this. For dev, we mock it.
    // let release = fetch_latest_release()?;
    
    // MOCK DATA for Development
    let release = ReleaseInfo {
        version: "1.0.0".to_string(),
        url: "https://github.com/Pramsss108/wh404-desktop-builds/releases/download/v1.0.0/app-release.zip".to_string(),
        hash: "mock-hash".to_string(),
    };

    println!("✨ Found Version: {}", release.version);

    // 3. Download Core Package
    let zip_path = install_dir.join("update.zip");
    if !install_dir.exists() {
        fs::create_dir_all(&install_dir)?;
    }

    println!("⬇️ Downloading Core Package...");
    // download_file(&release.url, &zip_path)?; // Uncomment in prod
    
    // 4. Extract Package
    println!("📦 Extracting...");
    // extract_zip(&zip_path, &install_dir)?; // Uncomment in prod

    // 5. Create Shortcut (Windows)
    println!("🔗 Creating Shortcuts...");
    create_shortcut(&install_dir.join(EXECUTABLE_NAME))?;

    // 6. Launch App
    println!("🚀 Launching...");
    launch_app(&install_dir.join(EXECUTABLE_NAME))?;

    Ok(())
}

fn get_install_dir() -> Result<PathBuf> {
    let local_app_data = dirs::data_local_dir().context("Could not find LocalAppData")?;
    Ok(local_app_data.join("WordHacker404"))
}

fn fetch_latest_release() -> Result<ReleaseInfo> {
    let client = reqwest::blocking::Client::new();
    let resp = client.get(UPDATE_URL).send()?;
    let info: ReleaseInfo = resp.json()?;
    Ok(info)
}

fn download_file(url: &str, path: &Path) -> Result<()> {
    let client = reqwest::blocking::Client::new();
    let mut resp = client.get(url).send()?;
    let total_size = resp.content_length().unwrap_or(0);

    let pb = ProgressBar::new(total_size);
    pb.set_style(ProgressStyle::default_bar()
        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta})")?
        .progress_chars("#>-"));

    let mut file = File::create(path)?;
    let mut downloaded: u64 = 0;
    let mut buffer = [0; 8192];

    loop {
        let bytes_read = resp.read(&mut buffer)?;
        if bytes_read == 0 { break; }
        file.write_all(&buffer[..bytes_read])?;
        downloaded += bytes_read as u64;
        pb.set_position(downloaded);
    }

    pb.finish_with_message("Download Complete");
    Ok(())
}

fn extract_zip(archive_path: &Path, dest: &Path) -> Result<()> {
    let file = File::open(archive_path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p)?;
                }
            }
            let mut outfile = File::create(&outpath)?;
            io::copy(&mut file, &mut outfile)?;
        }
    }
    Ok(())
}

fn create_shortcut(exe_path: &Path) -> Result<()> {
    // PowerShell script to create shortcut (Reliable & Built-in)
    let script = format!(
        "$WshShell = New-Object -comObject WScript.Shell; \
         $Shortcut = $WshShell.CreateShortcut(\"$Home\\Desktop\\Word Hacker Tool.lnk\"); \
         $Shortcut.TargetPath = \"{}\"; \
         $Shortcut.Save()",
        exe_path.to_string_lossy()
    );

    Command::new("powershell")
        .args(&["-NoProfile", "-Command", &script])
        .output()?;
    Ok(())
}

fn launch_app(exe_path: &Path) -> Result<()> {
    Command::new(exe_path)
        .spawn()
        .context("Failed to launch application")?;
    Ok(())
}
