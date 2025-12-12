// Multi-Method Download Orchestrator
// This file manages multiple download methods and automatically switches between them

use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadMethod {
    pub name: String,
    pub success_count: u32,
    pub failure_count: u32,
    pub avg_speed_mbps: f32,
    pub last_success: Option<SystemTime>,
    pub enabled: bool,
}

#[derive(Debug, Clone)]
pub struct DownloadResult {
    pub success: bool,
    pub method_used: String,
    pub time_taken_secs: f32,
    pub error_message: Option<String>,
}

pub struct DownloadOrchestrator {
    methods: Vec<DownloadMethod>,
    pub cloudflare_worker_url: Option<String>,
    proxy_list: Vec<String>,
}

impl DownloadOrchestrator {
    pub fn new() -> Self {
        DownloadOrchestrator {
            methods: vec![
                DownloadMethod {
                    name: "yt-dlp".to_string(),
                    success_count: 0,
                    failure_count: 0,
                    avg_speed_mbps: 0.0,
                    last_success: None,
                    enabled: true,
                },
                DownloadMethod {
                    name: "oembed-api".to_string(),
                    success_count: 0,
                    failure_count: 0,
                    avg_speed_mbps: 0.0,
                    last_success: None,
                    enabled: true,
                },
                DownloadMethod {
                    name: "cloudflare-worker".to_string(),
                    success_count: 0,
                    failure_count: 0,
                    avg_speed_mbps: 0.0,
                    last_success: None,
                    enabled: false, // Enabled when client provides URL
                },
                DownloadMethod {
                    name: "free-proxy".to_string(),
                    success_count: 0,
                    failure_count: 0,
                    avg_speed_mbps: 0.0,
                    last_success: None,
                    enabled: false, // Enabled when proxies available
                },
            ],
            cloudflare_worker_url: None,
            proxy_list: Vec::new(),
        }
    }

    /// Set Cloudflare Worker URL (from client setup)
    pub fn set_cloudflare_worker(&mut self, url: String) {
        self.cloudflare_worker_url = Some(url);
        if let Some(method) = self.methods.iter_mut().find(|m| m.name == "cloudflare-worker") {
            method.enabled = true;
        }
        println!("✅ Cloudflare Worker enabled: {}", self.cloudflare_worker_url.as_ref().unwrap());
    }

    /// Load proxy list from file
    pub fn load_proxies(&mut self, proxies: Vec<String>) {
        self.proxy_list = proxies;
        if let Some(method) = self.methods.iter_mut().find(|m| m.name == "free-proxy") {
            method.enabled = !self.proxy_list.is_empty();
        }
        println!("✅ Loaded {} proxies", self.proxy_list.len());
    }

    /// Get next best method to try
    pub fn get_next_method(&self) -> Option<&DownloadMethod> {
        // Sort by success rate (success_count / total_attempts)
        let mut enabled_methods: Vec<&DownloadMethod> = self.methods
            .iter()
            .filter(|m| m.enabled)
            .collect();

        enabled_methods.sort_by(|a, b| {
            let a_rate = if a.success_count + a.failure_count > 0 {
                a.success_count as f32 / (a.success_count + a.failure_count) as f32
            } else {
                1.0 // Untested methods get priority
            };

            let b_rate = if b.success_count + b.failure_count > 0 {
                b.success_count as f32 / (b.success_count + b.failure_count) as f32
            } else {
                1.0
            };

            b_rate.partial_cmp(&a_rate).unwrap_or(std::cmp::Ordering::Equal)
        });

        enabled_methods.first().copied()
    }

    /// Record success for a method
    pub fn record_success(&mut self, method_name: &str, speed_mbps: f32) {
        if let Some(method) = self.methods.iter_mut().find(|m| m.name == method_name) {
            method.success_count += 1;
            method.last_success = Some(SystemTime::now());
            
            // Update rolling average speed
            if method.avg_speed_mbps == 0.0 {
                method.avg_speed_mbps = speed_mbps;
            } else {
                method.avg_speed_mbps = (method.avg_speed_mbps + speed_mbps) / 2.0;
            }

            println!("✅ Method '{}' succeeded (Total: {} successes)", method_name, method.success_count);
        }
    }

    /// Record failure for a method
    pub fn record_failure(&mut self, method_name: &str) {
        if let Some(method) = self.methods.iter_mut().find(|m| m.name == method_name) {
            method.failure_count += 1;
            println!("❌ Method '{}' failed (Total: {} failures)", method_name, method.failure_count);
            
            // Disable if too many consecutive failures
            let total = method.success_count + method.failure_count;
            if total > 10 && method.failure_count as f32 / total as f32 > 0.9 {
                method.enabled = false;
                println!("⚠️  Method '{}' disabled due to high failure rate", method_name);
            }
        }
    }

    /// Get random proxy from list
    pub fn get_random_proxy(&self) -> Option<String> {
        if self.proxy_list.is_empty() {
            return None;
        }
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let index = rng.gen_range(0..self.proxy_list.len());
        Some(self.proxy_list[index].clone())
    }

    /// Get statistics for all methods
    pub fn get_stats(&self) -> Vec<(String, f32, u32, u32)> {
        self.methods.iter().map(|m| {
            let success_rate = if m.success_count + m.failure_count > 0 {
                (m.success_count as f32 / (m.success_count + m.failure_count) as f32) * 100.0
            } else {
                0.0
            };
            (m.name.clone(), success_rate, m.success_count, m.failure_count)
        }).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_orchestrator_initialization() {
        let orch = DownloadOrchestrator::new();
        assert_eq!(orch.methods.len(), 4);
    }

    #[test]
    fn test_method_selection() {
        let orch = DownloadOrchestrator::new();
        let method = orch.get_next_method();
        assert!(method.is_some());
    }
}
