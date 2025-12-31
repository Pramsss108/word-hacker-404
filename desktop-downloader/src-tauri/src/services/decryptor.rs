use std::path::Path;
use std::process::Command;
use anyhow::{Result, Context, anyhow};

pub struct Decryptor;

impl Decryptor {
    /// Decrypts a file using mp4decrypt (Bento4).
    /// 
    /// # Arguments
    /// * `input_path` - Path to the encrypted file
    /// * `output_path` - Path to save the decrypted file
    /// * `keys` - List of keys in "kid:key" format (hex)
    pub fn decrypt_file(
        input_path: &Path,
        output_path: &Path,
        keys: &[String],
    ) -> Result<()> {
        // Command: mp4decrypt --key <kid>:<key> [--key <kid>:<key> ...] input.mp4 output.mp4
        
        let mut cmd = Command::new("mp4decrypt");
        
        for key in keys {
            cmd.arg("--key").arg(key);
        }
        
        let status = cmd
            .arg(input_path)
            .arg(output_path)
            .status()
            .context("Failed to execute mp4decrypt. Is Bento4 installed and in the PATH?")?;

        if !status.success() {
            return Err(anyhow!("mp4decrypt exited with error status: {}", status));
        }

        Ok(())
    }
}
