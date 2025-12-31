use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE, AUTHORIZATION};
use std::error::Error;

pub struct LicenseSigner;

impl LicenseSigner {
    /// Sends the License Challenge Blob to the License Server and returns the License Response.
    pub async fn execute_challenge(
        client: &reqwest::Client,
        license_url: &str,
        token: &str,
        cookie_string: Option<&str>,
        challenge_blob: &[u8]
    ) -> Result<Vec<u8>, Box<dyn Error>> {
        
        println!("🔐 LICENSE SIGNER: Initiating Handshake with {}", license_url);

        let mut headers = HeaderMap::new();
        
        // 1. Authorization (Bearer Token)
        let auth_val = format!("Bearer {}", token);
        if let Ok(val) = HeaderValue::from_str(&auth_val) {
            headers.insert(AUTHORIZATION, val);
        }

        // 2. Cookies (Session Identity)
        if let Some(cookies) = cookie_string {
            if let Ok(val) = HeaderValue::from_str(cookies) {
                headers.insert(reqwest::header::COOKIE, val);
            }
        }

        // 3. Mimic Chrome Headers (Critical for License Servers)
        // License servers are very strict about User-Agent and Origin
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/octet-stream")); // Widevine challenges are binary
        headers.insert(reqwest::header::USER_AGENT, HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"));
        headers.insert(reqwest::header::ORIGIN, HeaderValue::from_static("https://www.udemy.com"));
        headers.insert(reqwest::header::REFERER, HeaderValue::from_static("https://www.udemy.com/"));

        // 4. Send the POST request
        let resp = client.post(license_url)
            .headers(headers)
            .body(challenge_blob.to_vec())
            .send()
            .await?;

        // 5. Handle Response
        if resp.status().is_success() {
            let bytes = resp.bytes().await?;
            println!("✅ LICENSE SIGNER: Handshake Successful. Received {} bytes.", bytes.len());
            Ok(bytes.to_vec())
        } else {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            println!("❌ LICENSE SIGNER: Handshake Failed ({}). Response: {}", status, text);
            Err(format!("License Request Failed: {}", status).into())
        }
    }
}
