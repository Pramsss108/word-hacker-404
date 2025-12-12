// License Manager - Rust Module
// Handles license validation, quota tracking, HWID binding

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub valid: bool,
    pub tier: String, // "free", "pro", "ultra"
    pub quota_remaining: i32, // -1 = unlimited
    pub quota_resets_at: u64,
    pub features: TierFeatures,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierFeatures {
    pub downloads_per_day: i32,
    pub max_quality: String,
    pub methods: Vec<String>,
    pub priority_support: bool,
    pub batch_download: bool,
}

pub struct LicenseManager {
    pub api_url: String,
    license_key: Option<String>,
    hwid: String,
    pub cached_info: Option<LicenseInfo>,
}

impl LicenseManager {
    pub fn new(api_url: String) -> Self {
        LicenseManager {
            api_url,
            license_key: None,
            hwid: Self::generate_hwid(),
            cached_info: None,
        }
    }

    // Generate Hardware ID (HWID) for device binding
    pub fn generate_hwid() -> String {
        use std::process::Command;
        
        // Windows: Use WMIC to get unique machine ID
        let output = Command::new("wmic")
            .args(&["csproduct", "get", "uuid"])
            .output();
        
        if let Ok(output) = output {
            let uuid = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = uuid.lines().collect();
            if lines.len() > 1 {
                return lines[1].trim().to_string();
            }
        }
        
        // Fallback: Use username + computer name
        let username = std::env::var("USERNAME").unwrap_or_else(|_| "unknown".to_string());
        let computername = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown".to_string());
        format!("{}-{}", username, computername)
    }

    pub fn set_license_key(&mut self, key: String) {
        self.license_key = Some(key);
    }

    pub fn get_license_key(&self) -> Option<String> {
        self.license_key.clone()
    }

    pub fn get_hwid(&self) -> String {
        self.hwid.clone()
    }

    // Validate license with API
    pub async fn validate_license(&mut self) -> Result<LicenseInfo, String> {
        let client = reqwest::Client::new();
        
        let license_key = self.license_key.as_ref()
            .unwrap_or(&"FREE".to_string())
            .clone();
        
        let mut body = HashMap::new();
        body.insert("license_key", license_key.clone());
        body.insert("hwid", self.hwid.clone());
        
        let url = format!("{}/api/v1/license/validate", self.api_url);
        
        println!("🔐 Validating license: {}", if license_key == "FREE" { "FREE TIER" } else { &license_key });
        
        let response = client.post(&url)
            .json(&body)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| format!("License API connection failed: {}", e))?;
        
        let license_info: LicenseInfo = response.json().await
            .map_err(|e| format!("Invalid API response: {}", e))?;
        
        println!("✅ License validated - Tier: {} | Quota: {}", 
            license_info.tier,
            if license_info.quota_remaining < 0 { "Unlimited".to_string() } else { license_info.quota_remaining.to_string() }
        );
        
        self.cached_info = Some(license_info.clone());
        Ok(license_info)
    }

    // Check if user can download (quota available)
    pub async fn can_download(&self) -> Result<bool, String> {
        if let Some(cached) = &self.cached_info {
            // Unlimited (Pro/Ultra)
            if cached.quota_remaining < 0 {
                return Ok(true);
            }
            
            // Free tier with quota remaining
            if cached.quota_remaining > 0 {
                return Ok(true);
            }
            
            // Free tier quota exceeded
            return Ok(false);
        }
        
        // No cached info, validate first
        Err("License not validated. Call validate_license() first.".to_string())
    }

    // Record download (decrement quota for free tier)
    pub async fn record_download(&mut self, url: String, platform: String) -> Result<(), String> {
        let client = reqwest::Client::new();
        
        let license_key = self.license_key.as_ref()
            .unwrap_or(&"FREE".to_string())
            .clone();
        
        let mut body = HashMap::new();
        body.insert("license_key", license_key.clone());
        body.insert("url", url);
        body.insert("platform", platform);
        
        let api_url = format!("{}/api/v1/license/download", self.api_url);
        
        let response = client.post(&api_url)
            .json(&body)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| format!("Failed to record download: {}", e))?;
        
        #[derive(Deserialize)]
        struct DownloadResponse {
            success: bool,
            quota_remaining: i32,
            tier: String,
        }
        
        let result: DownloadResponse = response.json().await
            .map_err(|e| format!("Invalid response: {}", e))?;
        
        if !result.success {
            return Err("Download quota exceeded. Upgrade to Pro for unlimited downloads.".to_string());
        }
        
        // Update cached quota
        if let Some(cached) = &mut self.cached_info {
            cached.quota_remaining = result.quota_remaining;
        }
        
        println!("📊 Download recorded - Quota remaining: {}", 
            if result.quota_remaining < 0 { "Unlimited".to_string() } else { result.quota_remaining.to_string() }
        );
        
        Ok(())
    }

    // Get tier name for UI display
    pub fn get_tier_display(&self) -> String {
        if let Some(cached) = &self.cached_info {
            match cached.tier.as_str() {
                "pro" => "PRO".to_string(),
                "ultra" => "ULTRA".to_string(),
                _ => "FREE".to_string(),
            }
        } else {
            "FREE".to_string()
        }
    }

    // Get quota display for UI
    pub fn get_quota_display(&self) -> String {
        if let Some(cached) = &self.cached_info {
            if cached.quota_remaining < 0 {
                "∞ Unlimited".to_string()
            } else {
                format!("{}/5 downloads today", cached.quota_remaining)
            }
        } else {
            "Not validated".to_string()
        }
    }
}
