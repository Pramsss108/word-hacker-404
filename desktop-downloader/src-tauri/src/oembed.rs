// oEmbed API Method - Instagram's Official API
// This uses Instagram's public API that doesn't require authentication

use serde::{Deserialize, Serialize};
use reqwest;

#[derive(Debug, Serialize, Deserialize)]
struct OEmbedResponse {
    pub version: Option<String>,
    pub title: Option<String>,
    pub author_name: Option<String>,
    pub author_url: Option<String>,
    pub provider_name: Option<String>,
    pub thumbnail_url: Option<String>,
    pub html: Option<String>,
}

pub async fn download_via_oembed(post_url: &str) -> Result<String, String> {
    println!("[oEmbed] Attempting to download via Instagram oEmbed API...");
    
    // Build oEmbed API request URL
    let oembed_url = format!(
        "https://api.instagram.com/oembed/?url={}",
        urlencoding::encode(post_url)
    );
    
    println!("[oEmbed] Request URL: {}", oembed_url);
    
    // Make API request
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client.get(&oembed_url)
        .send()
        .await
        .map_err(|e| format!("oEmbed API request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("oEmbed API returned status: {}", response.status()));
    }
    
    // Parse JSON response
    let oembed_data: OEmbedResponse = response.json().await
        .map_err(|e| format!("Failed to parse oEmbed JSON: {}", e))?;
    
    println!("[oEmbed] Successfully got response from API");
    
    // Extract HTML embed code
    let html = oembed_data.html
        .ok_or_else(|| "oEmbed response missing 'html' field".to_string())?;
    
    // Extract video URL from HTML
    let video_url = extract_video_url_from_html(&html)?;
    
    println!("[oEmbed] ✅ Successfully extracted video URL");
    Ok(video_url)
}

/// Extract video URL from Instagram's embed HTML
fn extract_video_url_from_html(html: &str) -> Result<String, String> {
    // Instagram oEmbed returns HTML with video source
    // Pattern: src="https://...mp4"
    
    let re = regex::Regex::new(r#"src="([^"]+\.mp4[^"]*)""#)
        .map_err(|e| format!("Regex compilation failed: {}", e))?;
    
    if let Some(captures) = re.captures(html) {
        if let Some(url_match) = captures.get(1) {
            return Ok(url_match.as_str().to_string());
        }
    }
    
    // Try alternative pattern: video_url in JSON
    let re_json = regex::Regex::new(r#""video_url":"([^"]+)""#)
        .map_err(|e| format!("Regex compilation failed: {}", e))?;
    
    if let Some(captures) = re_json.captures(html) {
        if let Some(url_match) = captures.get(1) {
            let url = url_match.as_str().replace("\\/", "/");
            return Ok(url);
        }
    }
    
    Err("Could not extract video URL from oEmbed HTML".to_string())
}

/// Download the actual video file
pub async fn download_video_file(video_url: &str, output_path: &str) -> Result<(), String> {
    println!("[oEmbed] Downloading video from: {}", video_url);
    
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(300)) // 5 minutes for large files
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client.get(video_url)
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
    
    println!("[oEmbed] ✅ Video saved to: {}", output_path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_video_url_extraction() {
        let html = r#"<video src="https://example.com/video.mp4" />"#;
        let result = extract_video_url_from_html(html);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "https://example.com/video.mp4");
    }
}
