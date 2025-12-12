// ============================================
// AD MANAGER - Desktop Ad Coordination Module
// Professional Ad-Gated Download System
// ============================================

use serde::{Deserialize, Serialize};
use reqwest;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadToken {
    pub token: String,
    pub expires_at: u64,
    pub hwid: String,
}

pub struct AdManager {
    hwid: String,
    api_url: String,
    current_token: Option<DownloadToken>,
}

impl AdManager {
    pub fn new(hwid: String, api_url: String) -> Self {
        println!("🎬 AdManager initialized with API URL: {}", api_url);
        println!("🆔 HWID: {}", hwid);
        AdManager {
            hwid,
            api_url,
            current_token: None,
        }
    }
    
    /// Check if we have a valid, non-expired token
    pub fn has_valid_token(&self) -> bool {
        if let Some(token) = &self.current_token {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            // Token valid if not expired (60 second window)
            token.expires_at > now
        } else {
            false
        }
    }
    
    /// Request download token after ad completion
    pub async fn request_ad_token(&mut self) -> Result<String, String> {
        let client = reqwest::Client::new();
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        let full_url = format!("{}/api/v1/ads/verify", self.api_url);
        println!("🌐 Requesting token from: {}", full_url);
        println!("📦 Request body: hwid={}, timestamp={}", self.hwid, timestamp);
        
        let response = client
            .post(&full_url)
            .json(&serde_json::json!({
                "hwid": self.hwid,
                "ad_event": "completed",
                "timestamp": timestamp
            }))
            .send()
            .await
            .map_err(|e| format!("Failed to verify ad: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("Ad verification failed: {}", response.status()));
        }
        
        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let token_str = data["token"]
            .as_str()
            .ok_or("Token not found in response")?
            .to_string();
        
        let expires_in = data["expires_in"].as_u64().unwrap_or(60);
        
        // Store token with expiry time
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        self.current_token = Some(DownloadToken {
            token: token_str.clone(),
            expires_at: now + expires_in,
            hwid: self.hwid.clone(),
        });
        
        Ok(token_str)
    }
    
    /// Consume token (one-time use) and return it
    pub fn consume_token(&mut self) -> Option<String> {
        if !self.has_valid_token() {
            return None;
        }
        
        // Take token and clear it (one-time use)
        self.current_token
            .take()
            .map(|t| t.token)
    }
    
    /// Clear expired or invalid token
    pub fn clear_token(&mut self) {
        self.current_token = None;
    }
    
    /// Authorize download with server using token
    pub async fn authorize_download(&self, token: &str, url: &str) -> Result<(), String> {
        let client = reqwest::Client::new();
        
        let response = client
            .post(format!("{}/api/v1/download/authorize", self.api_url))
            .header("Authorization", format!("Bearer {}", token))
            .json(&serde_json::json!({
                "hwid": self.hwid,
                "url": url
            }))
            .send()
            .await
            .map_err(|e| format!("Authorization request failed: {}", e))?;
        
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Download not authorized: {}", error_text));
        }
        
        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse auth response: {}", e))?;
        
        if data["allowed"].as_bool().unwrap_or(false) {
            Ok(())
        } else {
            Err("Download not allowed by server".to_string())
        }
    }
    
    /// Get HWID for this device
    pub fn get_hwid(&self) -> String {
        self.hwid.clone()
    }
    
    /// Get API URL
    pub fn get_api_url(&self) -> String {
        self.api_url.clone()
    }
    
    /// Check if user needs to watch an ad before downloading
    /// FREE users ALWAYS need ad (one ad per download)
    pub fn requires_ad(&self) -> bool {
        // FREE tier = ad for EVERY download
        // Token system only validates server-side, not for repeat downloads
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_token_expiry() {
        let mut manager = AdManager::new(
            "TEST-HWID".to_string(),
            "https://test.api".to_string()
        );
        
        // No token initially
        assert!(!manager.has_valid_token());
        assert!(manager.requires_ad());
        
        // Add expired token
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        manager.current_token = Some(DownloadToken {
            token: "TEST-TOKEN".to_string(),
            expires_at: now - 10, // Expired 10 seconds ago
            hwid: "TEST-HWID".to_string(),
        });
        
        // Should detect as invalid
        assert!(!manager.has_valid_token());
        
        // Add valid token
        manager.current_token = Some(DownloadToken {
            token: "VALID-TOKEN".to_string(),
            expires_at: now + 60, // Expires in 60 seconds
            hwid: "TEST-HWID".to_string(),
        });
        
        // Should be valid
        assert!(manager.has_valid_token());
        assert!(!manager.requires_ad());
    }
    
    #[test]
    fn test_token_consumption() {
        let mut manager = AdManager::new(
            "TEST-HWID".to_string(),
            "https://test.api".to_string()
        );
        
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        manager.current_token = Some(DownloadToken {
            token: "CONSUME-ME".to_string(),
            expires_at: now + 60,
            hwid: "TEST-HWID".to_string(),
        });
        
        // First consumption works
        let token = manager.consume_token();
        assert_eq!(token, Some("CONSUME-ME".to_string()));
        
        // Second consumption fails (token consumed)
        let token2 = manager.consume_token();
        assert_eq!(token2, None);
    }
}
