// Cloudflare Worker Integration Module
// Connects your app to the Cloudflare global network

use reqwest;

pub struct CloudflareWorker {
    worker_url: String,
}

impl CloudflareWorker {
    pub fn new(worker_url: String) -> Self {
        println!("[Cloudflare] Initialized with URL: {}", worker_url);
        CloudflareWorker { worker_url }
    }

    /// Download through Cloudflare Worker proxy
    pub async fn download_via_proxy(&self, target_url: &str) -> Result<String, String> {
        println!("[Cloudflare] Proxying request for: {}", target_url);
        
        // Build proxy request URL
        let proxy_request = format!("{}?url={}", self.worker_url, urlencoding::encode(target_url));
        
        println!("[Cloudflare] Proxy URL: {}", proxy_request);
        
        // Make request through Cloudflare
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        
        let response = client.get(&proxy_request)
            .send()
            .await
            .map_err(|e| format!("Cloudflare proxy request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("Cloudflare proxy returned status: {}", response.status()));
        }
        
        // Get response text (could be HTML, JSON, or video URL)
        let content = response.text().await
            .map_err(|e| format!("Failed to read response: {}", e))?;
        
        println!("[Cloudflare] ✅ Successfully fetched through proxy");
        Ok(content)
    }

    /// Test if Cloudflare Worker is accessible
    pub async fn test_connection(&self) -> Result<bool, String> {
        println!("[Cloudflare] Testing connection...");
        
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        
        let response = client.get(&self.worker_url)
            .send()
            .await
            .map_err(|e| format!("Connection test failed: {}", e))?;
        
        let is_working = response.status().is_success();
        
        if is_working {
            println!("[Cloudflare] ✅ Worker is accessible and responding");
        } else {
            println!("[Cloudflare] ❌ Worker returned status: {}", response.status());
        }
        
        Ok(is_working)
    }

    /// Download video file through Cloudflare proxy
    pub async fn download_video_file(&self, video_url: &str, output_path: &str) -> Result<(), String> {
        println!("[Cloudflare] Downloading video through proxy...");
        
        // Build proxy request URL for video download
        let proxy_request = format!("{}?url={}", self.worker_url, urlencoding::encode(video_url));
        
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(300)) // 5 minutes for large files
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        
        let response = client.get(&proxy_request)
            .send()
            .await
            .map_err(|e| format!("Video download request failed: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("Video download failed with status: {}", response.status()));
        }
        
        let bytes = response.bytes().await
            .map_err(|e| format!("Failed to read video bytes: {}", e))?;
        
        // Write to file
        std::fs::write(output_path, bytes)
            .map_err(|e| format!("Failed to write video file: {}", e))?;
        
        println!("[Cloudflare] ✅ Video saved to: {}", output_path);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cloudflare_worker_creation() {
        let worker = CloudflareWorker::new(
            "https://universal-downloader-proxy.test.workers.dev".to_string()
        );
        assert!(!worker.worker_url.is_empty());
    }
}
