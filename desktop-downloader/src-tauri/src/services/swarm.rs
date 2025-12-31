use reqwest::Client;
use std::error::Error;
use std::sync::Arc;
use tokio::sync::Semaphore;
use std::path::PathBuf;
use tokio::io::AsyncWriteExt;

pub struct SwarmDownloader {
    client: Client,
    max_concurrent: usize,
}

impl SwarmDownloader {
    pub fn new(max_concurrent: usize) -> Self {
        let client = Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_default();

        SwarmDownloader {
            client,
            max_concurrent,
        }
    }

    /// Downloads a list of segments in parallel
    pub async fn download_segments(
        &self,
        base_url: &str,
        segments: Vec<String>,
        output_dir: PathBuf,
        progress_callback: impl Fn(usize, usize) + Send + Sync + 'static,
    ) -> Result<Vec<PathBuf>, Box<dyn Error>> {
        
        if !output_dir.exists() {
            tokio::fs::create_dir_all(&output_dir).await?;
        }

        let semaphore = Arc::new(Semaphore::new(self.max_concurrent));
        let client = self.client.clone();
        let base_url = Arc::new(base_url.to_string());
        let output_dir = Arc::new(output_dir);
        let total = segments.len();
        let completed = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let callback = Arc::new(progress_callback);

        let mut handles = Vec::new();
        let mut file_paths = Vec::new();

        for (index, segment) in segments.into_iter().enumerate() {
            let permit = semaphore.clone().acquire_owned().await?;
            let client = client.clone();
            let base = base_url.clone();
            let dir = output_dir.clone();
            let counter = completed.clone();
            let cb = callback.clone();
            
            // Construct full URL (handle relative vs absolute)
            let url = if segment.starts_with("http") {
                segment.clone()
            } else {
                format!("{}{}", base, segment)
            };

            let filename = format!("segment_{:05}.ts", index);
            let path = dir.join(&filename);
            file_paths.push(path.clone());

            let handle = tokio::spawn(async move {
                let _permit = permit; // Hold permit until end of scope
                
                // Retry logic
                let mut attempts = 0;
                loop {
                    attempts += 1;
                    match client.get(&url).send().await {
                        Ok(resp) => {
                            if resp.status().is_success() {
                                if let Ok(bytes) = resp.bytes().await {
                                    if let Ok(mut file) = tokio::fs::File::create(&path).await {
                                        if file.write_all(&bytes).await.is_ok() {
                                            break; // Success
                                        }
                                    }
                                }
                            }
                        }
                        Err(_) => {}
                    }
                    
                    if attempts > 3 {
                        println!("❌ Failed to download segment: {}", url);
                        break;
                    }
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                }

                let current = counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
                if current % 10 == 0 || current == total {
                    cb(current, total);
                }
            });
            handles.push(handle);
        }

        // Wait for all
        for handle in handles {
            handle.await?;
        }

        println!("✅ SWARM: Downloaded {} segments.", total);
        Ok(file_paths)
    }
}
