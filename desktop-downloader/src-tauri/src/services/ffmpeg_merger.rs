use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs::File;
use std::io::Write;
use anyhow::{Result, Context};

pub struct FfmpegMerger;

impl FfmpegMerger {
    /// Merges video segments into a single file using FFmpeg.
    /// 
    /// # Arguments
    /// * `segment_dir` - Directory containing the downloaded segments
    /// * `output_path` - Path where the final merged file should be saved
    /// * `segment_files` - Ordered list of segment filenames (relative to segment_dir)
    pub fn merge_segments(
        segment_dir: &Path,
        output_path: &Path,
        segment_files: &[String],
    ) -> Result<()> {
        // 1. Create the concat list file
        let list_path = segment_dir.join("file_list.txt");
        let mut list_file = File::create(&list_path)
            .context("Failed to create FFmpeg list file")?;

        for filename in segment_files {
            // FFmpeg concat format: file 'filename'
            // We need to escape single quotes if they exist, but usually segment names are safe.
            writeln!(list_file, "file '{}'", filename)
                .context("Failed to write to FFmpeg list file")?;
        }

        // 2. Construct the FFmpeg command
        // We assume 'ffmpeg' is in the PATH. In a production app, we might bundle it.
        // Command: ffmpeg -f concat -safe 0 -i file_list.txt -c copy output.mp4
        let status = Command::new("ffmpeg")
            .current_dir(segment_dir) // Run in the segment dir so relative paths work
            .arg("-f")
            .arg("concat")
            .arg("-safe")
            .arg("0") // Allow unsafe file paths (needed for absolute paths if we used them, but good practice)
            .arg("-i")
            .arg("file_list.txt")
            .arg("-c")
            .arg("copy") // Stream copy (no re-encoding) - FAST!
            .arg("-y") // Overwrite output if exists
            .arg(output_path)
            .status()
            .context("Failed to execute FFmpeg command. Is FFmpeg installed and in the PATH?")?;

        if !status.success() {
            return Err(anyhow::anyhow!("FFmpeg exited with error status: {}", status));
        }

        // 3. Cleanup
        if let Err(e) = std::fs::remove_file(&list_path) {
            println!("⚠️ Failed to remove temp file list: {}", e);
        }

        Ok(())
    }
}
