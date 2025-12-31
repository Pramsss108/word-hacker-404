use serde::{Deserialize, Serialize};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use std::error::Error;

const BASE_URL: &str = "https://www.udemy.com/api-2.0";

#[derive(Debug, Serialize, Deserialize)]
pub struct CourseListResponse {
    pub count: u32,
    pub results: Vec<Course>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Course {
    pub id: u64,
    pub title: String,
    pub url: String,
    pub image_480x270: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CurriculumResponse {
    pub count: u32,
    pub results: Vec<CurriculumItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CurriculumItem {
    pub _class: String, // "lecture" or "chapter"
    pub id: u64,
    pub title: String,
    pub asset: Option<Asset>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Asset {
    pub id: u64,
    pub asset_type: String, // "Video", "E-Book", "File"
    pub title: Option<String>,
    pub stream_urls: Option<VideoStreams>,
    pub media_sources: Option<Vec<MediaSource>>, // DRM / HLS / DASH sources
    pub caption_tracks: Option<Vec<CaptionTrack>>,
    pub download_urls: Option<VideoStreams>, // For non-video files
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaSource {
    pub src: String,
    pub type_: String, // "application/x-mpegURL" (HLS) or "application/dash+xml" (DASH)
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CaptionTrack {
    pub language: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoStreams {
    pub Video: Vec<Stream>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Stream {
    pub label: String, // "1080", "720"
    pub file: String, // The direct URL
}

pub struct UdemyClient {
    client: reqwest::Client,
    token: String,
}

impl UdemyClient {
    // UPGRADE: Now accepts a full Cookie String instead of just a token
    pub fn new(token: String, cookie_string: Option<String>) -> Self {
        let mut headers = HeaderMap::new();
        
        // 1. Authorization Header (The Key)
        let auth_val = format!("Bearer {}", token);
        if let Ok(val) = HeaderValue::from_str(&auth_val) {
            headers.insert(AUTHORIZATION, val);
        }

        // 2. Cookie Header (The Identity)
        if let Some(cookies) = cookie_string {
            if let Ok(val) = HeaderValue::from_str(&cookies) {
                headers.insert(reqwest::header::COOKIE, val);
            }
        }

        // 3. Mimic Chrome Headers (The Disguise)
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(reqwest::header::USER_AGENT, HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"));
        headers.insert(reqwest::header::ACCEPT, HeaderValue::from_static("application/json, text/plain, */*"));
        headers.insert("x-udemy-client-secret", HeaderValue::from_static("a_secret_if_we_knew_it")); // Placeholder

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .cookie_store(true) // Enable internal cookie jar
            .build()
            .unwrap_or_default();

        UdemyClient { client, token }
    }

    pub async fn get_courses(&self) -> Result<Vec<Course>, Box<dyn Error>> {
        // ⏳ TRAFFIC SHAPING
        self.apply_human_jitter().await;

        let mut debug_cards = Vec::new();

        // ---------------------------------------------------------
        // STRATEGY 1: BARE METAL (No Fields, Just Courses)
        // ---------------------------------------------------------
        // Sometimes 'fields[course]=@all' causes issues if a field is deprecated.
        let url1 = format!("{}/users/me/subscribed-courses?page_size=1000&ordering=-last_accessed", BASE_URL);
        println!("🕵️ STRATEGY 1 [BARE METAL]: {}", url1);
        
        if let Ok(resp) = self.client.get(&url1).send().await {
            if let Ok(text) = resp.text().await {
                if let Ok(data) = serde_json::from_str::<CourseListResponse>(&text) {
                    if !data.results.is_empty() {
                        println!("✅ STRATEGY 1 SUCCESS: Found {} courses", data.results.len());
                        return Ok(data.results);
                    }
                }
            }
        }

        // ---------------------------------------------------------
        // STRATEGY 2: ARCHIVED (Explicit)
        // ---------------------------------------------------------
        let url2 = format!("{}/users/me/subscribed-courses?page_size=1000&is_archived=true", BASE_URL);
        println!("🕵️ STRATEGY 2 [ARCHIVED]: {}", url2);

        if let Ok(resp) = self.client.get(&url2).send().await {
            if let Ok(text) = resp.text().await {
                if let Ok(data) = serde_json::from_str::<CourseListResponse>(&text) {
                    if !data.results.is_empty() {
                        println!("✅ STRATEGY 2 SUCCESS: Found {} archived courses", data.results.len());
                        return Ok(data.results);
                    }
                }
            }
        }

        // ---------------------------------------------------------
        // STRATEGY 3: COLLECTIONS (User Lists)
        // ---------------------------------------------------------
        // Note: This is a guess at the endpoint, but worth a shot.
        // If this fails, we fall back to debug cards.

        // ---------------------------------------------------------
        // FAILURE: GENERATE REPORT
        // ---------------------------------------------------------
        let me_url = format!("{}/users/me/", BASE_URL);
        let me_text = self.client.get(&me_url).send().await?.text().await?;
        
        let user_name = if me_text.contains("display_name") {
            let parts: Vec<&str> = me_text.split("\"display_name\":\"").collect();
            parts.get(1).and_then(|s| s.split("\"").next()).unwrap_or("Unknown").to_string()
        } else {
            "Anonymous".to_string()
        };

        // Card 1: User Info
        debug_cards.push(Course {
            id: 101,
            title: format!("👤 USER: {}", user_name),
            url: "".to_string(),
            image_480x270: Some("https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif".to_string()), // Hacker GIF
        });

        // Card 2: The Problem
        debug_cards.push(Course {
            id: 404,
            title: "❌ 0 COURSES FOUND. (Tried Active & Archived)".to_string(),
            url: "".to_string(),
            image_480x270: Some("https://media.giphy.com/media/26hkhKd9CQzzXSpsQ/giphy.gif".to_string()), // Glitch GIF
        });

        // Card 3: Suggestion
        debug_cards.push(Course {
            id: 102,
            title: "💡 TIP: Are your courses in a 'Collection'?".to_string(),
            url: "".to_string(),
            image_480x270: None,
        });

        Ok(debug_cards)
    }

    // 👻 Ghost Algorithm: Random micro-delays to defeat behavioral analysis
    async fn apply_human_jitter(&self) {
        use rand::Rng;
        let sleep_ms = rand::thread_rng().gen_range(300..1200);
        println!("👻 GHOST ENGINE: Pausing {}ms for humanization...", sleep_ms);
        tokio::time::sleep(tokio::time::Duration::from_millis(sleep_ms)).await;
    }

    pub async fn get_curriculum(&self, course_id: u64) -> Result<Vec<CurriculumItem>, Box<dyn Error>> {
        // ⏳ TRAFFIC SHAPING: The "Ghost" Algorithm
        self.apply_human_jitter().await;

        // Request extended fields for God Mode extraction
        let url = format!("{}/courses/{}/curriculum-items?page_size=1000&fields[lecture]=title,asset,supplementary_assets&fields[asset]=stream_urls,media_sources,caption_tracks,download_urls,title,asset_type", BASE_URL, course_id);
        let resp = self.client.get(&url).send().await?;
        
        if !resp.status().is_success() {
            return Err(format!("API Error: {}", resp.status()).into());
        }

        let data: CurriculumResponse = resp.json().await?;
        Ok(data.results)
    }
}
