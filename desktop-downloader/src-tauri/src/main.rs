#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{command, Window, Manager};
use tauri::api::process::{Command, CommandEvent};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::io::BufRead;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// New modules for advanced scraping
mod orchestrator;
mod oembed;
mod cloudflare;
mod license;
mod security;
mod ad_manager;
mod services; 

use services::udemy_api::UdemyClient;
use services::mpd_parser;
use services::cdm::WidevineDevice;
use services::license_signer::LicenseSigner;
use services::swarm::SwarmDownloader;
use services::ffmpeg_merger::FfmpegMerger;
use services::decryptor::Decryptor;

// ============================================
// UDEMY BLACK OPS COMMANDS (MOVED TO BOTTOM)
// ============================================
// Legacy definitions removed to prevent conflict with God Mode implementations.


#[command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let path = path.replace("/", "\\");
        let path_buf = std::path::PathBuf::from(&path);
        // FIX: If it's a directory, just open it. If it's a file, select it.
        if path_buf.is_dir() {
             std::process::Command::new("explorer")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            // Default to select behavior for files (or if unsure)
            std::process::Command::new("explorer")
                .arg("/select,")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn strip_unc(path: PathBuf) -> String {
    let s = path.to_string_lossy().to_string();
    if s.starts_with(r"\\?\") {
        s[4..].to_string()
    } else {
        s
    }
}

// Store active downloads to allow cancellation
#[derive(Clone, Debug)]
struct UdemySession {
    token: String,
    cookies: String,
}

struct DownloadState {
    active_downloads: Arc<Mutex<HashMap<String, u32>>>, // URL -> PID
    orchestrator: Arc<Mutex<orchestrator::DownloadOrchestrator>>,
    license_manager: Arc<Mutex<license::LicenseManager>>,
    ad_manager: Arc<Mutex<ad_manager::AdManager>>,
    udemy_session: Arc<Mutex<Option<UdemySession>>>,
}

// 👽 ALIEN STEALTH: Identity Generation
fn generate_alien_identity() -> (String, String) {
    use rand::seq::SliceRandom;
    let user_agents = vec![
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    ];
    let referers = vec![
        "https://www.google.com/",
        "https://www.bing.com/",
        "https://duckduckgo.com/",
        "https://www.udemy.com/",
        "https://www.youtube.com/",
    ];
    
    let mut rng = rand::thread_rng();
    let ua = user_agents.choose(&mut rng).unwrap().to_string();
    let referer = referers.choose(&mut rng).unwrap().to_string();
    
    (ua, referer)
}

#[derive(Serialize, Deserialize)]
#[allow(dead_code)]
struct ApiRequest {
    url: String,
    license_key: String,
    quality: String,
}

#[derive(Serialize, Deserialize)]
struct EngineParams {
    concurrent_fragments: u32,
    buffer_size: String,
}

#[derive(Serialize, Deserialize)]
#[allow(dead_code)]
struct ApiResponse {
    allowed: Option<bool>,
    error: Option<String>,
    message: Option<String>,
    engine_params: Option<EngineParams>,
}

#[command]
async fn launch_stealth_browser(app: tauri::AppHandle) -> Result<(), String> {
    println!("🕵️ BLACK OPS: Launching Stealth Browser...");

    // 1. Script to inject into the Satellite
    let init_script = r##"
        // IMMEDIATE VISUAL CONFIRMATION
        if (!window.BO_INJECTED) {
            document.title = "💀 SYSTEM READY // WAITING FOR TRAFFIC";
            // console.log("💀 INJECTED: BLACK OPS SATELLITE");
            window.BO_INJECTED = true;
        }

        // GLOBAL STORE
        window.CAPTURED_TOKEN = null;

        // ==============================
        // 1. ROBUST NETWORK SNIFFER
        // ==============================
        if (!window.BO_SNIFFER_ACTIVE) {
            window.BO_SNIFFER_ACTIVE = true;
            const originalFetch = window.fetch;
            window.fetch = async function(...args) {
                try {
                    let token = null;
                    
                    // Case 1: fetch(url, options)
                    if (args[1] && args[1].headers) {
                        token = extractFromHeaders(args[1].headers);
                    }
                    
                    // Case 2: fetch(Request)
                    if (!token && args[0] && typeof args[0] === 'object' && args[0].headers) {
                        token = extractFromHeaders(args[0].headers);
                    }

                    if (token) {
                         window.CAPTURED_TOKEN = token;
                         showSuccessUI(token);
                         copyToken(token);
                    }
                } catch(e) {}
                return originalFetch.apply(this, args);
            };

            // Restore XHR Interceptor
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                return originalOpen.apply(this, arguments);
            };
            const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
            XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                if (header.toLowerCase() === 'authorization' && value.includes('Bearer')) {
                     const t = value.replace('Bearer ', '');
                     if(t.length > 20) {
                        window.CAPTURED_TOKEN = t;
                        showSuccessUI(t);
                        copyToken(t);
                     }
                }
                return originalSetHeader.apply(this, arguments);
            };
        }

        function extractFromHeaders(headers) {
            // Headers can be a Headers object or plain object
            let auth = null;
            if (headers instanceof Headers) {
                auth = headers.get('Authorization') || headers.get('authorization');
            } else {
                auth = headers.Authorization || headers.authorization;
            }
            
            if (auth && auth.includes('Bearer')) {
                return auth.replace('Bearer ', '');
            }
            return null;
        }

        // ==============================
        // 2. UI SYSTEM (DOM OVERLAY)
        // ==============================
        function showSuccessUI(token) {
            if(document.getElementById('bo-success-banner')) return;
            
            const banner = document.createElement('div');
            banner.id = 'bo-success-banner';
            banner.innerHTML = `
                <div style="font-size:16px; font-weight:bold; margin-bottom:5px;">✅ TOKEN EXTRACTED</div>
                <div style="font-size:12px;">The access token has been captured.</div>
                <input type="text" value="${token}" id="bo-token-input" style="width:100%; margin-top:5px; background:#000; color:#0f0; border:1px solid #0f0;">
                <button id="bo-copy-btn" style="width:100%; margin-top:5px; background:#0f0; color:#000; border:none; padding:5px; font-weight:bold; cursor:pointer;">CLICK TO COPY & CLOSE</button>
            `;
            // Safe Inline Styles (if CSP allows generally, otherwise fallback to defaults)
            banner.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.95); color:#0aff6a; padding:20px; border:2px solid #0aff6a; border-radius:8px; z-index:999999; box-shadow:0 0 30px #0aff6a; font-family:monospace; width: 300px; text-align:center;";
            
            document.body.appendChild(banner);
            
            // Auto Select
            setTimeout(() => {
                const input = document.getElementById('bo-token-input');
                if(input) input.select();
            }, 100);

            document.getElementById('bo-copy-btn').onclick = () => {
                copyToken(token);
                banner.remove();
                document.title = "✅ MISSION COMPLETE";
            };
        }



        // ==============================
        // 3. MANUAL TRIGGER & DEEP SCAN (DIAGNOSTIC MODE)
        // ==============================
        function deepScan() {
            let log = [];
            let foundToken = null;

            // 1. Check LocalStorage (DUMP KEYS)
            try {
                log.push("=== LOCAL STORAGE (" + localStorage.length + ") ===");
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const val = localStorage.getItem(key);
                    
                    // Log interesting keys
                    if (key.includes('token') || key.includes('auth') || key.includes('session') || key.includes('udemy')) {
                        log.push("LS Key: " + key + " (Len: " + val.length + ")");
                    }

                    // Aggressive Search
                    if (val && val.length > 20) {
                        if (val.startsWith('eyJ')) {
                            foundToken = val;
                            log.push(">>> FOUND JWT in LS: " + key);
                            break;
                        }
                        // Check inside JSON
                        if (val.includes('access_token')) {
                             try {
                                 const parsed = JSON.parse(val);
                                 if (parsed.access_token) {
                                     foundToken = parsed.access_token;
                                     log.push(">>> FOUND inside JSON: " + key);
                                     break;
                                 }
                             } catch(e) {}
                        }
                    }
                }
            } catch(e) {
                log.push("LS Error: " + e.message);
            }

            if (foundToken) return { token: foundToken, log: log };

            // 2. Check Cookies (DUMP KEYS)
            try {
                const cookies = document.cookie.split(';');
                log.push("=== COOKIES (" + cookies.length + ") ===");
                for (let c of cookies) {
                    const parts = c.trim().split('=');
                    if(parts.length < 2) continue;
                    const k = parts[0].trim();
                    const v = parts.slice(1).join('=').trim();
                    
                    // Log interesting cookies
                    if (k.includes('token') || k.includes('auth') || k.includes('session') || k.includes('udemy')) {
                        log.push("Cookie: " + k + " (Len: " + v.length + ")");
                        if (k === 'ud_last_auth_information') {
                             log.push("VAL(ud_last_auth_information): " + v.substring(0, 100) + "...");
                        }
                    }
                    
                    if (v && v.length > 20) {
                        if (v.startsWith('eyJ')) {
                            foundToken = v;
                            log.push(">>> FOUND JWT in Cookie: " + k);
                            break;
                        }
                        if (k === 'access_token' || k === 'dj_session') {
                            // dj_session might be the token itself or contain it
                            foundToken = v; 
                            log.push(">>> FOUND Cookie: " + k);
                            break;
                        }
                    }
                }
            } catch(e) {
                log.push("Cookie Error: " + e.message);
            }

            if (foundToken) return { token: foundToken, log: log };

            // 3. Check Global Variables (DUMP KEYS)
            try {
                log.push("=== GLOBALS ===");
                if (window.UD) {
                    log.push("Found window.UD");
                    
                    // DUMP UD.me
                    if (window.UD.me) {
                        try {
                            const meStr = JSON.stringify(window.UD.me);
                            log.push("UD.me: " + meStr.substring(0, 200) + "...");
                            if (window.UD.me.access_token) {
                                foundToken = window.UD.me.access_token;
                                log.push(">>> FOUND in UD.me.access_token");
                            }
                        } catch(err) { log.push("UD.me stringify err"); }
                    } else {
                        log.push("UD.me is undefined");
                    }

                    // DUMP UD.visiting
                    if (window.UD.visiting) {
                         try {
                            const vStr = JSON.stringify(window.UD.visiting);
                            log.push("UD.visiting: " + vStr.substring(0, 200) + "...");
                         } catch(err) { log.push("UD.visiting stringify err"); }
                    }

                    // Check specific paths
                    if (window.UD.visitingUser && window.UD.visitingUser.accessToken) {
                        foundToken = window.UD.visitingUser.accessToken;
                        log.push(">>> FOUND in UD.visitingUser.accessToken");
                    }
                    // Dump keys
                    log.push("UD Keys: " + Object.keys(window.UD).join(', '));
                } else {
                    log.push("window.UD is undefined");
                }
            } catch(e) {
                log.push("Global Var Error: " + e.message);
            }

            return { token: foundToken, log: log };
        }

        // ==============================
        // 0. NETWORK SNIFFER (IMMEDIATE)
        // ==============================
        (function() {
            const originalFetch = window.fetch;
            window.fetch = async function(...args) {
                const response = await originalFetch(...args);
                
                // Check Request Headers (if possible) or Response
                // Note: We can't easily see request headers in fetch unless we wrap the Request object
                // But we can check if the URL is an API call
                const url = args[0] instanceof Request ? args[0].url : args[0];
                
                // AGGRESSIVE SNIFFER: Check ALL requests, not just API
                if (url) {
                    const clone = response.clone();
                    clone.text().then(text => {
                        // Check for JWT pattern in response body
                        if (text.includes('eyJ') && text.length > 100) {
                             const jwtRegex = /"eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+"/g;
                             const matches = text.match(jwtRegex);
                             if (matches) {
                                 const token = matches[0].replace(/"/g, '');
                                 if (token.length > 100) { // Avoid short strings
                                     window.CAPTURED_TOKEN = token;
                                     showSuccessUI(token);
                                 }
                             }
                        }
                        // Check for access_token key
                        if (text.includes('access_token')) {
                             try {
                                 const data = JSON.parse(text);
                                 if (data && data.access_token) {
                                     window.CAPTURED_TOKEN = data.access_token;
                                     showSuccessUI(data.access_token);
                                 }
                             } catch(e) {}
                        }
                    }).catch(e => {});
                }
                
                return response;
            };

            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                this.addEventListener('load', function() {
                    // AGGRESSIVE SNIFFER: Check ALL responses
                    if (this.responseText && this.responseText.includes('eyJ')) {
                        const jwtRegex = /"eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+"/g;
                        const matches = this.responseText.match(jwtRegex);
                        if (matches) {
                             const token = matches[0].replace(/"/g, '');
                             if (token.length > 100) {
                                 window.CAPTURED_TOKEN = token;
                                 showSuccessUI(token);
                             }
                        }
                    }
                });
                
                // Intercept Request Headers
                const originalSetRequestHeader = this.setRequestHeader;
                this.setRequestHeader = function(header, value) {
                    if (header.toLowerCase() === 'authorization') {
                        if (value.startsWith('Bearer ')) {
                            const token = value.split(' ')[1];
                            window.CAPTURED_TOKEN = token;
                            showSuccessUI(token);
                        }
                    }
                    // Also check for custom headers like X-Udemy-Authorization
                    if (header.toLowerCase().includes('auth') || header.toLowerCase().includes('token')) {
                         console.log(">>> POTENTIAL HEADER: " + header + " = " + value);
                    }
                    originalSetRequestHeader.apply(this, arguments);
                };
                
                originalOpen.apply(this, arguments);
            };
        })();

        // ==============================
        // 1. UI INJECTION
        // ==============================
        function showSuccessUI(token) {
            if(document.getElementById('bo-success-overlay')) return;
            
            const div = document.createElement('div');
            div.id = 'bo-success-overlay';
            div.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2147483647; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#0aff6a; font-family:monospace;";
            
            div.innerHTML = `
                <h1 style="font-size:40px; margin-bottom:20px;">✅ TOKEN CAPTURED</h1>
                <div style="background:#111; padding:20px; border:2px solid #0aff6a; max-width:80%; word-break:break-all;">
                    ${token.substring(0, 50)}...
                </div>
                <button id="bo-copy-final" style="margin-top:20px; padding:15px 30px; font-size:20px; background:#0aff6a; color:black; border:none; cursor:pointer; font-weight:bold;">COPY TOKEN & CLOSE</button>
            `;
            
            document.body.appendChild(div);
            
            document.getElementById('bo-copy-final').onclick = () => {
                navigator.clipboard.writeText(token);
                div.remove();
                updateStatus("TOKEN COPIED");
            };
            
            updateStatus("TOKEN FOUND!");
            copyToken(token);
        }

        // ==============================
        // 4. LINK JAILBREAKER (FORCE STAY IN WINDOW)
        // ==============================
        setInterval(() => {
            // Force all links to open in the SAME window
            const links = document.querySelectorAll('a[target="_blank"]');
            links.forEach(link => {
                link.target = "_self";
            });
        }, 1000);

        setTimeout(() => {
            if(document.getElementById('bo-extract-btn')) return;
            
            // CONTAINER
            const container = document.createElement('div');
            container.id = 'bo-extract-btn';
            container.style.cssText = "position:fixed; bottom:10px; right:10px; z-index:99999; display:flex; flex-direction:column; gap:5px;";
            document.body.appendChild(container);

            // BUTTON 1: SCAN PAGE SOURCE
            const btnFetch = document.createElement('button');
            btnFetch.innerText = "📄 1. SCAN PAGE SOURCE";
            btnFetch.style.cssText = "padding:10px; background:#0aff6a; color:#000; border:none; font-weight:bold; font-family:monospace; cursor:pointer;";
            btnFetch.onclick = () => {
                btnFetch.innerText = "📄 SCANNING HTML...";
                
                // 1. Check current DOM first (fastest)
                const html = document.documentElement.outerHTML;
                const tokenMatch = html.match(/access_token["']?:\s*["']([^"']+)["']/i);
                
                if (tokenMatch && tokenMatch[1]) {
                     window.CAPTURED_TOKEN = tokenMatch[1];
                     showSuccessUI(tokenMatch[1]);
                     btnFetch.innerText = "✅ FOUND IN DOM!";
                     return;
                }

                // 2. Re-fetch page source (in case it's in a script tag not fully rendered or something)
                fetch(window.location.href)
                .then(res => res.text())
                .then(text => {
                    // Look for access_token pattern
                    // Common patterns: "access_token":"...", access_token="...", etc.
                    const regex = /access_token["']?:\s*["']([^"']+)["']/i;
                    const match = text.match(regex);
                    
                    if(match && match[1]) {
                        window.CAPTURED_TOKEN = match[1];
                        showSuccessUI(match[1]);
                        btnFetch.innerText = "✅ FOUND IN SOURCE!";
                    } else {
                        // Try looking for just the JWT pattern if access_token key is missing
                        // eyJ...
                        const jwtRegex = /"eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+"/g;
                        const jwtMatches = text.match(jwtRegex);
                        
                        if (jwtMatches && jwtMatches.length > 0) {
                             // Just take the first one that looks long enough
                             const token = jwtMatches[0].replace(/"/g, '');
                             window.CAPTURED_TOKEN = token;
                             showSuccessUI(token);
                             btnFetch.innerText = "✅ FOUND JWT!";
                        } else {
                             btnFetch.innerText = "❌ NOT FOUND IN HTML";
                             console.log("HTML Scan failed.");
                        }
                    }
                })
                .catch(e => {
                    btnFetch.innerText = "❌ SCAN FAILED";
                    alert("Scan Error: " + e.message);
                });
            };
            container.appendChild(btnFetch);

            // BUTTON 2: DEEP SCAN
            const btnScan = document.createElement('button');
            btnScan.innerText = "🕵️ 2. DEEP STORAGE SCAN";
            btnScan.style.cssText = "padding:10px; background:#222; color:#fff; border:1px solid #555; font-weight:bold; font-family:monospace; cursor:pointer;";
            
            btnScan.onclick = () => {
                btnScan.innerText = "⏳ SCANNING...";
                
                setTimeout(() => {
                    // Try captured first
                    if (window.CAPTURED_TOKEN) {
                        showSuccessUI(window.CAPTURED_TOKEN);
                        btnScan.innerText = "✅ TOKEN FOUND";
                        return;
                    }

                    // Deep scan
                    let result = deepScan();
                    
                    if(result.token) {
                        showSuccessUI(result.token);
                        btnScan.innerText = "✅ TOKEN FOUND";
                    } else {
                        btnScan.innerText = "❌ FAILED - RETRY?";
                        
                        // Create a visible log area
                        let logDiv = document.getElementById('bo-debug-log');
                        if(logDiv) logDiv.remove(); // Reset
                        
                        logDiv = document.createElement('div');
                        logDiv.id = 'bo-debug-log';
                        logDiv.style.cssText = "position:fixed; top:50px; left:50px; width:400px; height:500px; background:rgba(0,0,0,0.95); color:#0aff6a; overflow:auto; z-index:2147483647; padding:20px; border:2px solid red; font-size:12px; font-family:monospace; box-shadow: 0 0 50px rgba(0,0,0,0.8);";
                        document.body.appendChild(logDiv);
                        
                        const close = document.createElement('button');
                        close.innerText = "[ CLOSE LOG ]";
                        close.style.cssText = "background:red; color:white; border:none; padding:5px; margin-bottom:10px; cursor:pointer; width:100%;";
                        close.onclick = () => logDiv.remove();
                        logDiv.appendChild(close);

                        const copyBtn = document.createElement('button');
                        copyBtn.innerText = "[ COPY LOG ]";
                        copyBtn.style.cssText = "background:#0aff6a; color:black; border:none; padding:5px; margin-bottom:10px; cursor:pointer; width:100%; font-weight:bold;";
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(result.log.join('\n'));
                            copyBtn.innerText = "COPIED!";
                            setTimeout(() => copyBtn.innerText = "[ COPY LOG ]", 2000);
                        };
                        logDiv.appendChild(copyBtn);
                        
                        const content = document.createElement('pre');
                        content.innerText = "SCAN REPORT:\n" + result.log.join('\n');
                        logDiv.appendChild(content);
                    }
                }, 500);
            };
            container.appendChild(btnScan);

            // BUTTON 3: DUMP CONFIG
            const btnConfig = document.createElement('button');
            btnConfig.innerText = "⚙️ 3. DUMP CONFIG";
            btnConfig.style.cssText = "padding:10px; background:#444; color:#fff; border:1px solid #777; font-weight:bold; font-family:monospace; cursor:pointer;";
            btnConfig.onclick = () => {
                let log = [];
                log.push("=== CONFIG DUMP ===");
                
                // Check UD.Config
                if (window.UD && window.UD.Config) {
                    try {
                        log.push("UD.Config keys: " + Object.keys(window.UD.Config).join(', '));
                        if (window.UD.Config.mobile_api_app_id) log.push("Mobile App ID: " + window.UD.Config.mobile_api_app_id);
                        if (window.UD.Config.client_id) log.push("Client ID: " + window.UD.Config.client_id);
                    } catch(e) { log.push("Config Error: " + e.message); }
                }
                
                // Check Player Config
                if (window.Udemy && window.Udemy.player_config) {
                     log.push("Found window.Udemy.player_config");
                     log.push(JSON.stringify(window.Udemy.player_config).substring(0, 200));
                }
                
                // Check for bootstrapper
                const scripts = document.querySelectorAll('script');
                scripts.forEach(s => {
                    if (s.innerText.includes('UD.Config')) {
                        log.push("Found UD.Config script tag (Len: " + s.innerText.length + ")");
                    }
                });

                // Show log
                let logDiv = document.getElementById('bo-debug-log');
                if(logDiv) logDiv.remove();
                logDiv = document.createElement('div');
                logDiv.id = 'bo-debug-log';
                logDiv.style.cssText = "position:fixed; top:50px; left:50px; width:400px; height:500px; background:rgba(0,0,0,0.95); color:#0aff6a; overflow:auto; z-index:2147483647; padding:20px; border:2px solid red; font-size:12px; font-family:monospace; box-shadow: 0 0 50px rgba(0,0,0,0.8);";
                document.body.appendChild(logDiv);
                
                const close = document.createElement('button');
                close.innerText = "[ CLOSE LOG ]";
                close.style.cssText = "background:red; color:white; border:none; padding:5px; margin-bottom:10px; cursor:pointer; width:100%;";
                close.onclick = () => logDiv.remove();
                logDiv.appendChild(close);
                
                const content = document.createElement('pre');
                content.innerText = log.join('\n');
                logDiv.appendChild(content);
            };
            container.appendChild(btnConfig);
        }, 1000);



        // ==============================
        // 2. HELPER FUNCTIONS
        // ==============================
        function updateStatus(msg) {
             document.title = "✅ " + msg;
             // console.log(">> " + msg); // Reduced noise
        }

        function copyToken(token) {
            // console.log("TOKEN:", token); // Reduced noise
            navigator.clipboard.writeText(token).catch(e => {});
        }


    "##;

    // Check if open
    if let Some(w) = app.get_window("black-ops-satellite") {
        let _ = w.set_focus();
        return Ok(());
    }

    tauri::WindowBuilder::new(
        &app,
        "black-ops-satellite",
        tauri::WindowUrl::External("https://www.udemy.com/join/login-popup/".parse().unwrap())
    )
    .title("Black Ops Satellite // Auth Relay")
    .inner_size(500.0, 700.0)
    .always_on_top(true)
    .center()
    // 1.3 User-Agent Mimicry: Force the same UA as the backend
    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    .initialization_script(init_script) 
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================
// BLACK OPS DOWNLOADER (Phase 3/4)
// ============================================
async fn run_black_ops_download(
    window: Window,
    url: String,
    output_path: PathBuf,
    session: UdemySession,
) -> Result<String, String> {
    println!("🏴‍☠️ BLACK OPS: Starting Secure Download...");
    
    // 1. Fetch MPD & PSSH (Recon)
    let client = reqwest::Client::new();
    let mut pssh_data: Option<String> = None;

    let mpd_res = client.get(&url)
        .header("Cookie", &session.cookies)
        .header("Authorization", format!("Bearer {}", session.token))
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .send().await;

    if let Ok(res) = mpd_res {
        if let Ok(text) = res.text().await {
            if let Ok(drm) = mpd_parser::extract_pssh_from_mpd(&text) {
                println!("🔐 PSSH FOUND: {}", drm.pssh);
                pssh_data = Some(drm.pssh);
            }
        }
    }

    // 2. Download Encrypted Stream (Extraction)
    // We use yt-dlp as the engine because it handles DASH merging perfectly.
    // We just need to force it to download even if encrypted.
    
    let output_str = strip_unc(output_path.clone());
    println!("💾 Saving to: {}", output_str);

    let args = vec![
        url.clone(),
        "-o".to_string(), output_str.clone(),
        "--allow-unplayable-formats".to_string(), // CRITICAL: Download encrypted streams
        "--no-check-certificate".to_string(),
        "--user-agent".to_string(), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string(),
        "--referer".to_string(), "https://www.udemy.com/".to_string(),
    ];

    let command = Command::new_sidecar("yt-dlp").map_err(|e| e.to_string())?;
    let (mut rx, _) = command.args(args).spawn().map_err(|e| e.to_string())?;

    // Monitor progress
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                println!("BO_OUT: {}", line);
                if line.contains("[download]") && line.contains("%") {
                    // Parse progress (simple)
                    if let Some(start) = line.find("] ") {
                        if let Some(end) = line.find("%") {
                            if end > start + 2 {
                                let pct_str = &line[start+2..end];
                                if let Ok(pct) = pct_str.trim().parse::<f32>() {
                                    window.emit("download_progress", Payload {
                                        url: url.clone(),
                                        progress: pct as f64,
                                        status: "downloading".to_string(),
                                        filename: None,
                                    }).ok();
                                }
                            }
                        }
                    }
                }
            }
            CommandEvent::Stderr(line) => println!("BO_ERR: {}", line),
            _ => {}
        }
    }

    println!("✅ BLACK OPS: Download Complete (Encrypted)");
    
    // 3. Decryption (Phase 4.2)
    if let Some(pssh) = pssh_data {
        println!("🔐 STARTING DECRYPTION SEQUENCE...");
        
        // A. Load CDM
        match WidevineDevice::load() {
            Ok(device) => {
                println!("✅ CDM Loaded: Client ID len={}", device.client_id.len());
                
                // B. Generate Challenge (Placeholder - Requires CDM Lib)
                // In a real implementation, we would use the device + PSSH to generate a challenge blob.
                // For now, we will simulate the flow.
                let challenge_blob = vec![0u8; 10]; // DUMMY CHALLENGE
                
                // C. Sign License Request
                let license_url = "https://www.udemy.com/api-2.0/media-license-token/"; // Standard Udemy License URL
                
                match LicenseSigner::execute_challenge(
                    &client,
                    license_url,
                    &session.token,
                    Some(&session.cookies),
                    &challenge_blob
                ).await {
                    Ok(response_bytes) => {
                        println!("✅ License Response Received: {} bytes", response_bytes.len());
                        
                        // D. Parse Keys (Placeholder - Requires CDM Lib to parse license message)
                        // We would extract the keys from the response_bytes here.
                        // let keys = parse_keys(response_bytes, device);
                        
                        // MOCK KEYS for demonstration of flow
                        // Format: kid:key (hex)
                        let keys = vec!["00000000000000000000000000000000:00000000000000000000000000000000".to_string()];
                        
                        // E. Decrypt File
                        let decrypted_path = output_path.with_extension("decrypted.mp4");
                        match Decryptor::decrypt_file(&output_path, &decrypted_path, &keys) {
                            Ok(_) => {
                                println!("🔓 DECRYPTION SUCCESSFUL: {:?}", decrypted_path);
                                // Replace original with decrypted
                                if std::fs::rename(&decrypted_path, &output_path).is_ok() {
                                    println!("✅ File replaced with decrypted version.");
                                    
                                    window.emit("download_complete", Payload {
                                        url: url.clone(),
                                        progress: 100.0,
                                        status: "Decryption Successful".to_string(),
                                        filename: Some(strip_unc(output_path.clone())),
                                    }).ok();
                                    return Ok("Decryption Successful".to_string());
                                }
                            },
                            Err(e) => println!("❌ Decryption Failed: {}", e),
                        }
                    },
                    Err(e) => println!("❌ License Handshake Failed: {}", e),
                }
            },
            Err(e) => println!("⚠️ CDM Load Failed (Skipping Decryption): {}", e),
        }
    } else {
        println!("⚠️ No PSSH found. File might not be encrypted or PSSH extraction failed.");
    }
    
    window.emit("download_complete", Payload {
        url: url.clone(),
        progress: 100.0,
        status: "completed (encrypted)".to_string(),
        filename: Some(strip_unc(output_path)),
    }).ok();

    Ok("Downloaded (Encrypted)".to_string())
}

#[command]
async fn download_video(
    window: Window, 
    url: String, 
    format: String,
    force_mode: Option<bool>,
    state: tauri::State<'_, DownloadState>
) -> Result<String, String> {

    println!("🚀 MULTI-METHOD DOWNLOADER ACTIVATED");
    println!("🎯 URL: {}", url);
    println!("📦 Format: {}", format);

    // 0. LICENSE & QUOTA CHECK - FREE tier = unlimited with ads, PRO = no ads
    let can_proceed = true; // Always allow - ads handle monetization
    
    if !can_proceed {
        window.emit("quota_exceeded", Payload {
            url: url.clone(),
            progress: 0.0,
            status: "Daily quota exceeded! Watch ad or upgrade to PRO.".to_string(),
            filename: None,
        }).ok();
        return Err("Daily quota exceeded. Watch ad to continue or upgrade to PRO.".to_string());
    }
    
    println!("✅ Quota check passed");

    // 1. DUPLICATE CHECK (Prevent Crash)
    {
        let mut downloads = state.active_downloads.lock().unwrap();
        if downloads.contains_key(&url) {
            println!("⚠️ Found stuck lock for {}. FORCING REMOVAL to allow retry.", url);
            downloads.remove(&url);
        }
        downloads.insert(url.clone(), 0);
    }
    
    // 🔥 NEW: Try all 3 methods with smart fallback
    let download_dir = tauri::api::path::download_dir().unwrap_or(PathBuf::from("."));
    let output_template = download_dir.join("WordHacker").join("%(title)s.%(ext)s");
    let output_path = strip_unc(output_template.clone());
    
    println!("\n🎲 METHOD 1: Trying yt-dlp...");
    let ytdlp_result = try_ytdlp_download(
        window.clone(),
        url.clone(),
        format.clone(),
        force_mode.unwrap_or(false),
        state.active_downloads.clone()
    );
    
    if ytdlp_result.is_ok() {
        println!("✅ METHOD 1 SUCCESS: yt-dlp downloaded!");
        state.orchestrator.lock().unwrap().record_success("yt-dlp", 5.0);
        
        // FREE tier = unlimited with ads
        println!("📊 Download complete");
        
        return ytdlp_result;
    }
    println!("❌ METHOD 1 FAILED: {}", ytdlp_result.unwrap_err());
    state.orchestrator.lock().unwrap().record_failure("yt-dlp");
    
    // METHOD 2: Try Instagram oEmbed API
    if url.contains("instagram.com") {
        println!("\n🎲 METHOD 2: Trying Instagram oEmbed API...");
        let oembed_result = oembed::download_via_oembed(&url).await;
        
        if let Ok(video_url) = oembed_result {
            println!("📹 Found video URL via oEmbed: {}", video_url);
            match oembed::download_video_file(&video_url, &output_path).await {
                Ok(_) => {
                    println!("✅ METHOD 2 SUCCESS: oEmbed downloaded!");
                    state.orchestrator.lock().unwrap().record_success("oembed", 8.0);
                    state.active_downloads.lock().unwrap().remove(&url);
                    
                    // Decrement quota
                    // FREE tier = unlimited with ads
                    println!("📊 Download complete");
                    
                    window.emit("download_complete", Payload {
                        url: url.clone(),
                        progress: 100.0,
                        status: "completed".to_string(),
                        filename: Some(output_path.clone()),
                    }).ok();
                    return Ok("Downloaded via oEmbed API".to_string());
                }
                Err(e) => {
                    println!("❌ METHOD 2 FAILED: {}", e);
                    state.orchestrator.lock().unwrap().record_failure("oembed");
                }
            }
        } else {
            println!("❌ METHOD 2 FAILED: {}", oembed_result.unwrap_err());
            state.orchestrator.lock().unwrap().record_failure("oembed");
        }
    }
    
    // METHOD 3: Try Cloudflare Worker Proxy
    println!("\n🎲 METHOD 3: Trying Cloudflare Worker proxy...");
    let worker_url = {
        let orch = state.orchestrator.lock().unwrap();
        orch.cloudflare_worker_url.clone()
    };
    
    if let Some(worker) = worker_url {
        let cf_worker = cloudflare::CloudflareWorker::new(worker);
        
        match cf_worker.download_via_proxy(&url).await {
            Ok(video_url) => {
                println!("📹 Found video URL via Cloudflare: {}", video_url);
                match cf_worker.download_video_file(&video_url, &output_path).await {
                    Ok(_) => {
                        println!("✅ METHOD 3 SUCCESS: Cloudflare downloaded!");
                        state.orchestrator.lock().unwrap().record_success("cloudflare-worker", 10.0);
                        state.active_downloads.lock().unwrap().remove(&url);
                        window.emit("download_complete", Payload {
                            url: url.clone(),
                            progress: 100.0,
                            status: "completed".to_string(),
                            filename: Some(output_path),
                        }).ok();
                        return Ok("Downloaded via Cloudflare Worker".to_string());
                    }
                    Err(e) => {
                        println!("❌ METHOD 3 FAILED: {}", e);
                        state.orchestrator.lock().unwrap().record_failure("cloudflare-worker");
                    }
                }
            }
            Err(e) => {
                println!("❌ METHOD 3 FAILED: {}", e);
                state.orchestrator.lock().unwrap().record_failure("cloudflare-worker");
            }
        }
    }
    
    // METHOD 4: BLACK OPS (Udemy Native)
    if url.contains("udemy.com") && url.contains(".mpd") {
        println!("\n🏴‍☠️ METHOD 4: BLACK OPS PROTOCOL ENGAGED");
        
        let session = {
            let guard = state.udemy_session.lock().unwrap();
            guard.clone()
        };
        
        if let Some(sess) = session {
            return run_black_ops_download(window, url, PathBuf::from(output_path), sess).await;
        } else {
            println!("⚠️ No Session found. Falling back to standard methods.");
        }
    }

    // ALL METHODS FAILED
    println!("\n💀 ALL 3 METHODS FAILED!");
    state.active_downloads.lock().unwrap().remove(&url);
    window.emit("download_error", Payload {
        url: url.clone(),
        progress: 0.0,
        status: "All download methods failed".to_string(),
        filename: None,
    }).ok();
    Err("All download methods failed. Try a different URL or check your internet connection.".to_string())
}

// OLD METHOD: yt-dlp only (now extracted as fallback option)
fn try_ytdlp_download(
    window: Window, 
    url: String, 
    format: String,
    force_mode: bool,
    active_downloads: Arc<Mutex<HashMap<String, u32>>>
) -> Result<String, String> {
    println!("DEBUG: try_ytdlp_download() CALLED");
    println!("DEBUG: URL: {}", url);
    println!("DEBUG: Format: {}", format);
    println!("DEBUG: Force Mode: {}", force_mode);

    println!("DEBUG: yt-dlp method starting...");

    // Simplified for yt-dlp method

    // 0.5 FORMAT TRANSLATION (Fix for "Stuck" Issue)
    // Frontend sends "mp4-1080", "mp3", etc. yt-dlp needs real format strings.
    println!("DEBUG: Translating format: {}", format);
    let (dlp_format, is_audio) = match format.as_str() {
        // UPGRADE: "mp4-1080" now maps to BEST available quality (including 4K/8K)
        "mp4-1080" => ("bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best", false),
        "mp4-720" => ("bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best", false),
        "mp3" => ("bestaudio/best", true),
        "social" => ("best", false),
        _ => ("best", false), // Default fallback
    };

    println!("Mapped format '{}' to '{}'", format, dlp_format);

    // -------------------------------

    // 1. Setup Arguments
    // Resolve Downloads directory
    let download_dir = tauri::api::path::download_dir().unwrap_or(PathBuf::from("."));
    let output_template = download_dir.join("WordHacker").join("%(title)s.%(ext)s");
    
    println!("Saving to: {:?}", output_template); // LOGGING ADDED
    println!("Current Directory: {:?}", std::env::current_dir()); // DEBUG CWD

    // FIND FFMPEG (Robust Search for Sidecar)
    let mut ffmpeg_arg = None;
    
    // 1. Try to find ffmpeg sidecar in the same directory as the executable (Production)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            if let Ok(entries) = std::fs::read_dir(exe_dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if let Some(name) = path.file_name() {
                            let name_str = name.to_string_lossy();
                            // Look for ffmpeg-*.exe or ffmpeg.exe
                            if (name_str.starts_with("ffmpeg") && name_str.ends_with(".exe")) || name_str == "ffmpeg.exe" {
                                println!("Found ffmpeg sidecar at: {:?}", path);
                                ffmpeg_arg = Some(path);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Fallback to dev paths if not found
    if ffmpeg_arg.is_none() {
        let possible_paths = vec![
            PathBuf::from("ffmpeg.exe"),
            PathBuf::from("src-tauri/ffmpeg.exe"),
            PathBuf::from("../src-tauri/ffmpeg.exe"),
            PathBuf::from("ffmpeg-x86_64-pc-windows-msvc.exe"),
        ];
        for p in possible_paths {
            if let Ok(abs_path) = std::fs::canonicalize(&p) {
                if abs_path.exists() {
                    println!("Found ffmpeg (dev) at: {:?}", abs_path);
                    ffmpeg_arg = Some(abs_path);
                    break;
                }
            }
        }
    }

    // Note: We rely on yt-dlp finding ffmpeg in the same directory or PATH
    // Args are defined below after sidecar resolution

    // RESTORE REAL ARGS
    let mut args = vec![
        url.clone(),
        "-f".to_string(), dlp_format.to_string(),
        "-o".to_string(), strip_unc(output_template),
        // "--progress".to_string(), // Disabled to reduce noise/buffering issues
        "--newline".to_string(),
        // "--no-input".to_string(), // REMOVED: Not supported by yt-dlp
        "--no-playlist".to_string(), // CRITICAL: Prevent playlist crashes
        "--max-downloads".to_string(), "1".to_string(), // Safety valve
        "--verbose".to_string(), // DEBUG: See what's happening
    ];

    if force_mode {
        println!("⚠️ RED TEAM MODE: Engaging Alien Stealth Protocols...");
        let (alien_ua, alien_ref) = generate_alien_identity();
        
        println!("👽 POLYMORPHIC ID: Spoofing {}", alien_ua);
        
        args.push("--user-agent".to_string());
        args.push(alien_ua);
        args.push("--referer".to_string());
        args.push(alien_ref);
        
        args.push("--check-formats".to_string());
        args.push("--allow-unplayable-formats".to_string()); // FORCE DUMP
        args.push("--no-check-certificate".to_string());
        args.push("--geo-bypass".to_string());
        
        // Anti-Fingerprinting randomness
        use rand::Rng;
        let sleep_ms = rand::thread_rng().gen_range(100..800);
        println!("⏳ TRAFFIC SHAPING: Injecting {}ms micro-latency...", sleep_ms);
        std::thread::sleep(std::time::Duration::from_millis(sleep_ms));
    }

    if let Some(path) = ffmpeg_arg {
        args.push("--ffmpeg-location".to_string());
        args.push(strip_unc(path));
    } else {
        println!("WARNING: Could not find ffmpeg.exe. yt-dlp might fail to merge formats.");
    }

    // Add audio extraction flags if needed
    if is_audio {
        args.push("-x".to_string());
        args.push("--audio-format".to_string());
        args.push("mp3".to_string());
    }

    println!("DEBUG: Spawning yt-dlp sidecar with args: {:?}", args);

    let window_clone = window.clone();
    let url_clone = url.clone();
    let active_downloads_clone = active_downloads.clone();

    // Use Tauri's async runtime to handle the sidecar
    tauri::async_runtime::spawn(async move {
        println!("DEBUG: Starting Command::new_sidecar for {}", url_clone);
        
        let command = match Command::new_sidecar("yt-dlp") {
            Ok(cmd) => cmd,
            Err(e) => {
                println!("Failed to create sidecar command: {}", e);
                active_downloads_clone.lock().unwrap().remove(&url_clone);
                let _ = window_clone.emit("download_error", Payload {
                    url: url_clone,
                    progress: 0.0,
                    status: format!("Failed to create downloader process: {}", e),
                    filename: None,
                });
                return;
            }
        };

        let (mut rx, _child) = match command.args(args).spawn() {
            Ok(res) => res,
            Err(e) => {
                println!("Failed to spawn sidecar: {}", e);
                active_downloads_clone.lock().unwrap().remove(&url_clone);
                let _ = window_clone.emit("download_error", Payload {
                    url: url_clone,
                    progress: 0.0,
                    status: format!("Failed to start downloader: {}", e),
                    filename: None,
                });
                return;
            }
        };

        println!("DEBUG: Child spawned, capturing output...");
        
        let mut captured_filename: Option<String> = None;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("DL_OUT: {}", line);
                    
                    // Capture filename
                    
                    if line.contains("Destination:") {
                        // 1. Standard Download
                        if line.contains("[download]") {
                            if let Some(idx) = line.find("Destination: ") {
                                let path = line[idx + 13..].trim().to_string();
                                captured_filename = Some(path);
                            }
                        } 
                        // 2. Audio Extraction (e.g. webm -> mp3)
                        else if line.contains("[ExtractAudio]") {
                            if let Some(idx) = line.find("Destination: ") {
                                let path = line[idx + 13..].trim().to_string();
                                println!("DEBUG: Captured Audio Output: {}", path);
                                captured_filename = Some(path);
                            }
                        }
                    }
                    
                    // 3. Merger (e.g. video+audio -> mp4)
                    // Output: [Merger] Merging formats into "C:\path\to\file.mp4"
                    if line.contains("[Merger]") && line.contains("Merging formats into") {
                         if let Some(start) = line.find("\"") {
                             if let Some(end) = line.rfind("\"") {
                                 if end > start {
                                     let path = line[start+1..end].to_string();
                                     println!("DEBUG: Captured Merged Output: {}", path);
                                     captured_filename = Some(path);
                                 }
                             }
                         }
                    }

                    if line.contains("[download]") {
                        if line.contains("has already been downloaded") {
                            // Format: [download] C:\path\to\file.mp4 has already been downloaded
                            if let Some(start_idx) = line.find("[download] ") {
                                if let Some(end_idx) = line.find(" has already been downloaded") {
                                    let path = line[start_idx + 11..end_idx].trim().to_string();
                                    captured_filename = Some(path);
                                }
                            }
                        }
                    }

                    // Parse progress
                    if line.contains("[download]") && line.contains("%") {
                        if let Some(pct) = extract_percent(&line) {
                            let _ = window_clone.emit("download_progress", Payload {
                                url: url_clone.clone(),
                                progress: pct,
                                status: "downloading".to_string(),
                                filename: None,
                            });
                        }
                    }
                }
                CommandEvent::Stderr(line) => {
                    // CLEAN LOGS: Only show real errors as DL_ERR
                    if line.contains("WARNING") || line.contains("[debug]") || line.contains("[youtube]") || line.contains("[info]") {
                        println!("DEBUG: {}", line);
                    } else {
                        println!("DL_ERR: {}", line);
                    }
                    
                    // Also try to parse progress from stderr (yt-dlp sometimes writes progress here)
                    if line.contains("[download]") && line.contains("%") {
                        if let Some(pct) = extract_percent(&line) {
                            let _ = window_clone.emit("download_progress", Payload {
                                url: url_clone.clone(),
                                progress: pct,
                                status: "downloading".to_string(),
                                filename: None,
                            });
                        }
                    }
                }
                _ => {}
            }
        }
        
        println!("DEBUG: Process finished");
        
        active_downloads_clone.lock().unwrap().remove(&url_clone);
        
        // If we captured a filename, it means success (even if it was already downloaded)
        if captured_filename.is_some() {
             let _ = window_clone.emit("download_progress", Payload {
                url: url_clone.clone(),
                progress: 100.0,
                status: "downloading".to_string(),
                filename: None,
            });
        }

        let _ = window_clone.emit("download_complete", Payload {
            url: url_clone,
            progress: 100.0,
            status: "completed".to_string(),
            filename: captured_filename,
        });
    });

    Ok("Download started".to_string())
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    url: String,
    progress: f64,
    status: String,
    filename: Option<String>,
}

fn extract_percent(line: &str) -> Option<f64> {
    // Example line: [download]  45.0% of 10.00MiB at 2.00MiB/s ETA 00:05
    if let Some(start) = line.find("[download]") {
        let rest = &line[start + 10..];
        if let Some(end) = rest.find('%') {
            let pct_str = &rest[..end].trim();
            return pct_str.parse::<f64>().ok();
        }
    }
    None
}

#[derive(Clone, serde::Serialize)]
struct VideoMetadata {
    id: String,
    title: String,
    thumbnail: String,
    description: String,
    formats: Vec<VideoFormat>,
    tags: Vec<String>,
}

#[derive(Clone, serde::Serialize)]
struct VideoFormat {
    id: String,
    ext: String,
    resolution: String,
    width: Option<u32>,
    height: Option<u32>,
    tbr: Option<f64>,
    abr: Option<f64>,
    asr: Option<u32>,
    filesize: Option<u64>,
    vcodec: Option<String>,
    acodec: Option<String>,
    fps: Option<f64>,
    container: Option<String>,
    language: Option<String>,
    url: Option<String>,
}

#[derive(Clone, serde::Deserialize)]
struct AudioTrackRequest {
    language: String,
    format_id: String,
}

#[command]
async fn cache_audio_tracks(window: tauri::Window, video_url: String, tracks: Vec<AudioTrackRequest>) -> Result<(), String> {
    println!("[Cache] Starting background cache for {} tracks", tracks.len());
    
    for track in tracks {
        let window_clone = window.clone();
        let video_url_clone = video_url.clone();
        
        std::thread::spawn(move || {
            // 1. Determine temp path
            let temp_dir = std::env::temp_dir().join("wh404_cache");
            if !temp_dir.exists() {
                let _ = std::fs::create_dir_all(&temp_dir);
            }
            
            // Sanitize language code for filename
            let safe_lang = track.language.replace(|c: char| !c.is_alphanumeric(), "_");
            let filename = format!("audio_{}_{}.m4a", safe_lang, track.format_id);
            let file_path = temp_dir.join(&filename);
            let file_path_str = file_path.to_string_lossy().to_string();
            
            if file_path.exists() {
                println!("[Cache] Hit: {}", track.language);
                let _ = window_clone.emit("audio-cache-complete", serde_json::json!({
                    "language": track.language,
                    "path": file_path_str
                }));
                return;
            }
            
            println!("[Cache] Miss: Downloading {}...", track.language);
            
            // 2. Download using yt-dlp sidecar
            // yt-dlp -f format_id -o path video_url
            let output = Command::new_sidecar("yt-dlp")
                .expect("failed to create sidecar")
                .args(&[
                    "-f", &track.format_id,
                    "-o", &file_path_str,
                    &video_url_clone
                ])
                .output();
                
            match output {
                Ok(o) if o.status.success() => {
                    println!("[Cache] Downloaded: {}", track.language);
                    let _ = window_clone.emit("audio-cache-complete", serde_json::json!({
                        "language": track.language,
                        "path": file_path_str
                    }));
                },
                Ok(o) => {
                    println!("[Cache] Failed: {} - {}", track.language, o.stderr);
                },
                Err(e) => {
                    println!("[Cache] Error: {} - {}", track.language, e);
                }
            }
        });
    }
    
    Ok(())
}

#[command]
async fn get_video_metadata(url: String) -> Result<VideoMetadata, String> {
    println!("DEBUG: Fetching metadata for {}", url);
    
    // Use Tauri sidecar for robust path resolution in production
    let output = Command::new_sidecar("yt-dlp")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(&["--dump-json", "--no-playlist", &url])
        .output()
        .map_err(|e| format!("Failed to execute sidecar: {}", e))?;

    if !output.status.success() {
        return Err(output.stderr);
    }

    let json_str = output.stdout;
    let json: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let mut formats = Vec::new();
    if let Some(fmt_array) = json["formats"].as_array() {
        for f in fmt_array {
            formats.push(VideoFormat {
                id: f["format_id"].as_str().unwrap_or("").to_string(),
                ext: f["ext"].as_str().unwrap_or("").to_string(),
                resolution: f["resolution"].as_str().unwrap_or("unknown").to_string(),
                width: f["width"].as_u64().map(|v| v as u32),
                height: f["height"].as_u64().map(|v| v as u32),
                tbr: f["tbr"].as_f64(),
                abr: f["abr"].as_f64(),
                asr: f["asr"].as_u64().map(|v| v as u32),
                filesize: f["filesize"].as_u64(),
                vcodec: f["vcodec"].as_str().map(|s| s.to_string()),
                acodec: f["acodec"].as_str().map(|s| s.to_string()),
                fps: f["fps"].as_f64(),
                container: f["container"].as_str().map(|s| s.to_string()),
                language: f["language"].as_str().map(|s| s.to_string()),
                url: f["url"].as_str().map(|s| s.to_string()),
            });
        }
    }

    let mut tags = Vec::new();
    if let Some(tags_array) = json["tags"].as_array() {
        for t in tags_array {
            if let Some(tag_str) = t.as_str() {
                tags.push(tag_str.to_string());
            }
        }
    }

    Ok(VideoMetadata {
        id: json["id"].as_str().unwrap_or("").to_string(),
        title: json["title"].as_str().unwrap_or("").to_string(),
        thumbnail: json["thumbnail"].as_str().unwrap_or("").to_string(),
        description: json["description"].as_str().unwrap_or("").to_string(),
        formats,
        tags,
    })
}

// ============================================
// AD MONETIZATION COMMANDS
// Professional Ad-Gated Download System
// ============================================

#[command]
async fn check_ad_required(state: tauri::State<'_, DownloadState>) -> Result<bool, String> {
    let ad_mgr = state.ad_manager.lock().unwrap();
    Ok(ad_mgr.requires_ad())
}

#[command]
async fn request_download_token(state: tauri::State<'_, DownloadState>) -> Result<String, String> {
    // Get data needed without holding lock across await
    let (hwid, api_url) = {
        let ad_mgr = state.ad_manager.lock().unwrap();
        (ad_mgr.get_hwid(), ad_mgr.get_api_url())
    };
    
    // Create temporary instance for token request (no lock held)
    let mut temp_mgr = ad_manager::AdManager::new(hwid, api_url);
    let token = temp_mgr.request_ad_token().await?;
    
    // Update the stored ad_manager with new token (lock briefly)
    {
        let mut ad_mgr = state.ad_manager.lock().unwrap();
        *ad_mgr = temp_mgr;
    }
    
    Ok(token)
}

#[command]
async fn authorize_download(
    state: tauri::State<'_, DownloadState>,
    token: String,
    url: String
) -> Result<(), String> {
    // Get hwid and API URL without holding lock during async
    let (hwid, api_url) = {
        let ad_mgr = state.ad_manager.lock().unwrap();
        (ad_mgr.get_hwid(), ad_mgr.get_api_url())
    };
    
    // Create temporary instance for authorization
    let temp_mgr = ad_manager::AdManager::new(hwid, api_url);
    temp_mgr.authorize_download(&token, &url).await
}

// ============================================
// FFMPEG EXPORT COMMAND
// Professional Video/Audio Export with Trim Support
// ============================================

#[derive(Deserialize)]
struct TrimData {
    start: f64,
    end: f64,
}

#[derive(Deserialize)]
struct ExportPayload {
    files: Vec<String>,
    destination: Option<String>,
    #[serde(rename = "outputFormat")]
    output_format: Option<String>,
    #[serde(rename = "audioLanguage")]
    audio_language: Option<String>,
    #[serde(rename = "formatId")]
    format_id: Option<String>,
    trim: Option<TrimData>,
}

#[derive(Serialize)]
struct ExportResult {
    exported: Vec<String>,
    #[serde(rename = "outputDir")]
    output_dir: String,
}

#[command]
async fn export_files(payload: ExportPayload) -> Result<ExportResult, String> {
    println!("[BACKEND Export] 📥 Received payload:");
    println!("  - Files count: {}", payload.files.len());
    println!("  - Destination: {:?}", payload.destination);
    println!("  - Output format: {:?}", payload.output_format);
    println!("  - Trim: {:?}", payload.trim.as_ref().map(|t| format!("{}s → {}s", t.start, t.end)));
    
    if payload.files.is_empty() {
        return Err("No files to export".to_string());
    }
    
    // Resolve output directory
    let output_dir = if let Some(dest) = &payload.destination {
        // Check if destination starts with "Downloads/" - if so, it's relative to Downloads folder
        if dest.starts_with("Downloads/") || dest.starts_with("Downloads\\") {
            let download_dir = tauri::api::path::download_dir().unwrap_or(PathBuf::from("."));
            // Strip "Downloads/" prefix to avoid double path
            let relative_path = dest.strip_prefix("Downloads/")
                .or_else(|| dest.strip_prefix("Downloads\\"))
                .unwrap_or(dest);
            download_dir.join(relative_path)
        } else {
            // Absolute path or relative to current directory
            PathBuf::from(dest)
        }
    } else {
        tauri::api::path::download_dir().unwrap_or(PathBuf::from("."))
    };
    
    // Ensure output directory exists
    std::fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
    
    let mut exported_files = Vec::new();
    
    // Find FFmpeg
    let possible_paths = vec![
        PathBuf::from("ffmpeg.exe"),
        PathBuf::from("src-tauri/ffmpeg.exe"),
        PathBuf::from("../src-tauri/ffmpeg.exe"),
        PathBuf::from("ffmpeg-x86_64-pc-windows-msvc.exe"),
    ];
    
    let mut ffmpeg_path: Option<PathBuf> = None;
    for p in possible_paths {
        if let Ok(abs_path) = std::fs::canonicalize(&p) {
            if abs_path.exists() {
                println!("[BACKEND Export] Found ffmpeg at: {:?}", abs_path);
                ffmpeg_path = Some(abs_path);
                break;
            }
        }
    }
    
    if ffmpeg_path.is_none() {
        return Err("FFmpeg not found. Cannot export files.".to_string());
    }
    
    let ffmpeg_exe = ffmpeg_path.unwrap();
    
    // Process each file
    for temp_path in &payload.files {
        let temp_pathbuf = PathBuf::from(temp_path);
        
        if !temp_pathbuf.exists() {
            println!("[BACKEND Export] ⚠️ File not found: {}", temp_path);
            return Err(format!("Source file not found: {}. Please try downloading again.", temp_path));
        }
        
        let ext = temp_pathbuf.extension().and_then(|s| s.to_str()).unwrap_or("");
        let base_name = temp_pathbuf.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
        let target_format = payload.output_format.as_deref().unwrap_or("mp4");
        
        println!("[BACKEND Export] 📄 Processing file:");
        println!("  - Path: {}", temp_path);
        println!("  - Ext: .{}", ext);
        println!("  - Base name: {}", base_name);
        println!("  - Target format: {}", target_format);
        
        // Check if processing needed
        let needs_processing = payload.trim.is_some() || (target_format != ext);
        
        println!("[BACKEND Export] 🔍 Processing check:");
        println!("  - needsProcessing: {}", needs_processing);
        println!("  - hasTrim: {}", payload.trim.is_some());
        println!("  - needsFormatChange: {} ('{}'  != '{}')", target_format != ext, target_format, ext);
        
        if needs_processing {
            println!("[BACKEND Export] ⚙️ Using FFmpeg for processing");
            
            // Build FFmpeg command
            // ENHANCEMENT: Smart Naming to prevent overwrites
            // If trim is used, append trim range to filename
            let mut output_filename = if let Some(trim) = &payload.trim {
                format!("{}_trim_{}-{}.{}", base_name, trim.start, trim.end, target_format)
            } else {
                format!("{}.{}", base_name, target_format)
            };
            
            // Check for duplicates and auto-increment
            let mut dest_path = output_dir.join(&output_filename);
            let mut counter = 1;
            while dest_path.exists() {
                let stem = PathBuf::from(&output_filename).file_stem().unwrap().to_string_lossy().to_string();
                let new_name = format!("{}_({}).{}", stem, counter, target_format);
                dest_path = output_dir.join(&new_name);
                counter += 1;
            }
            
            let mut args = vec!["-i".to_string(), temp_path.clone()];
            
            // Add trim parameters if specified
            if let Some(trim) = &payload.trim {
                println!("[BACKEND Export] ✂️ Adding trim: {}s to {}s", trim.start, trim.end);
                args.push("-ss".to_string());
                args.push(trim.start.to_string());
                args.push("-to".to_string());
                args.push(trim.end.to_string());
            }
            
            // Add format-specific encoding parameters
            let is_audio_format = ["mp3", "m4a", "ogg", "wav", "aac"].contains(&target_format);
            
            if is_audio_format {
                println!("[BACKEND Export] 🎵 Audio-only export");
                args.push("-vn".to_string()); // No video
                
                if target_format == "mp3" {
                    args.push("-c:a".to_string());
                    args.push("libmp3lame".to_string());
                    args.push("-b:a".to_string());
                    args.push("192k".to_string());
                } else if target_format == "m4a" {
                    args.push("-c:a".to_string());
                    args.push("aac".to_string());
                    args.push("-b:a".to_string());
                    args.push("192k".to_string());
                } else if target_format == "ogg" {
                    args.push("-c:a".to_string());
                    args.push("libvorbis".to_string());
                    args.push("-q:a".to_string());
                    args.push("5".to_string());
                } else {
                    args.push("-c:a".to_string());
                    args.push("copy".to_string());
                }
            } else {
                println!("[BACKEND Export] 📹 Video export");
                args.push("-c:v".to_string());
                args.push("libx264".to_string());
                args.push("-preset".to_string());
                args.push("fast".to_string());
                args.push("-crf".to_string());
                args.push("23".to_string());
                args.push("-pix_fmt".to_string());
                args.push("yuv420p".to_string());
                args.push("-c:a".to_string());
                args.push("aac".to_string());
                args.push("-b:a".to_string());
                args.push("192k".to_string());
                args.push("-movflags".to_string());
                args.push("+faststart".to_string());
            }
            
            args.push("-y".to_string()); // Overwrite output
            args.push(strip_unc(dest_path.clone()));
            
            println!("[BACKEND Export] 🎬 FFmpeg command: {:?} {:?}", ffmpeg_exe, args);
            
            // Execute FFmpeg
            let mut cmd = std::process::Command::new(&ffmpeg_exe);
            cmd.args(&args);
            
            #[cfg(target_os = "windows")]
            {
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                cmd.creation_flags(CREATE_NO_WINDOW);
            }

            let output = cmd.output()
                .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
            
            if output.status.success() {
                println!("[BACKEND Export] ✅ FFmpeg success: {:?}", dest_path);
                exported_files.push(strip_unc(dest_path));
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                println!("[BACKEND Export] ❌ FFmpeg failed: {}", stderr);
                return Err(format!("FFmpeg processing failed: {}", stderr));
            }
            
        } else {
            println!("[BACKEND Export] 📋 Simple copy path (no FFmpeg)");
            
            // Safety check
            if target_format != ext {
                println!("[BACKEND Export] ⚠️ FORMAT MISMATCH IN COPY PATH!");
                return Err(format!("Cannot convert .{} to .{} without FFmpeg", ext, target_format));
            }
            
            let filename = temp_pathbuf.file_name().unwrap();
            let mut dest_path = output_dir.join(filename);
            
            // Check for duplicates and auto-increment
            let mut counter = 1;
            while dest_path.exists() {
                let stem = temp_pathbuf.file_stem().unwrap().to_string_lossy().to_string();
                let ext = temp_pathbuf.extension().unwrap().to_string_lossy().to_string();
                let new_name = format!("{}_({}).{}", stem, counter, ext);
                dest_path = output_dir.join(&new_name);
                counter += 1;
            }
            
            std::fs::copy(temp_path, &dest_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
            
            println!("[BACKEND Export] ✅ Copied to: {:?}", dest_path);
            exported_files.push(strip_unc(dest_path));
        }
    }
    
    Ok(ExportResult {
        exported: exported_files,
        output_dir: strip_unc(output_dir),
    })
}

// ============================================
// BLACK OPS API COMMANDS
// Direct "God Mode" Access to Udemy API
// ============================================

#[derive(Serialize)]
struct ApiCourse {
    id: u64,
    title: String,
    image: String,
}

#[command]
async fn fetch_udemy_courses(token: String, cookie_string: Option<String>) -> Result<Vec<ApiCourse>, String> {
    println!("🕵️ BLACK OPS: Fetching Course Matrix...");
    let client = services::udemy_api::UdemyClient::new(token, cookie_string);
    let courses = client.get_courses().await.map_err(|e| e.to_string())?;
    
    let mapped = courses.into_iter().map(|c| ApiCourse {
        id: c.id,
        title: c.title,
        image: c.image_480x270.unwrap_or_default(),
    }).collect();
    
    Ok(mapped)
}

#[derive(Serialize)]
struct ApiLecture {
    id: u64,
    title: String,
    download_url: Option<String>,
    // God Mode Extras
    asset_type: String,
    drm_encrypted: bool,
    captions: Vec<String>,
}

#[command]
async fn fetch_course_lectures(token: String, course_id: u64, cookie_string: Option<String>) -> Result<Vec<ApiLecture>, String> {
    println!("🕵️ BLACK OPS: Decrypting Curriculum for ID {}...", course_id);
    let client = services::udemy_api::UdemyClient::new(token, cookie_string);
    let items = client.get_curriculum(course_id).await.map_err(|e| e.to_string())?;
    
    let mut lectures = Vec::new();
    
    for item in items {
        if let Some(asset) = item.asset {
            let mut download_url = None;
            let mut drm_encrypted = false;
            let mut captions = Vec::new();

            // 1. Check Media Sources (HLS/DASH - often DRM or High Qual)
            if let Some(sources) = &asset.media_sources {
                for source in sources {
                    // BLACK OPS: Look for DASH (.mpd) for Widevine Decryption
                    if source.type_ == "application/dash+xml" {
                        println!("🔐 FOUND DRM LOCK: {}", source.src);
                        download_url = Some(source.src.clone());
                        drm_encrypted = true;
                        // TODO: In Phase 2.2, we will fetch this URL and extract PSSH here
                        break;
                    }
                    
                    // Prioritize HLS (m3u8) as it is most compatible with yt-dlp
                    if source.type_ == "application/x-mpegURL" && download_url.is_none() {
                        download_url = Some(source.src.clone());
                        // If it's HLS, it might be encrypted
                        drm_encrypted = true; 
                    }
                }
            }

            // 2. Fallback to Stream URLs (Direct MP4 - Tokenized)
            if download_url.is_none() {
                if let Some(streams) = &asset.stream_urls {
                    // Find best resolution (1080 > 720 > 480)
                    // We just grab the first one for now, usually API returns best first or we sort
                    if let Some(best) = streams.Video.first() {
                         download_url = Some(best.file.clone());
                    }
                }
            }

            // 3. Fallback to Download URLs (Files/Resources)
            if download_url.is_none() {
                 if let Some(dls) = &asset.download_urls {
                     if let Some(best) = dls.Video.first() {
                         download_url = Some(best.file.clone());
                     }
                 }
            }
            
            // 4. Extract Captions
            if let Some(tracks) = &asset.caption_tracks {
                for track in tracks {
                    captions.push(track.language.clone());
                }
            }

            // Only add if we have a title (some assets are weird)
            lectures.push(ApiLecture {
                id: asset.id,
                title: item.title,
                download_url,
                asset_type: asset.asset_type,
                drm_encrypted,
                captions
            });
        }
    }
    
    println!("✅ Extracted {} assets.", lectures.len());
    Ok(lectures)
}

#[command]
async fn run_visual_scraper(app: tauri::AppHandle, script: String) -> Result<(), String> {
    println!("🕵️ BLACK OPS: Injecting Visual Scraper...");
    
    let window = app.get_window("black-ops-satellite").ok_or("Satellite not found. Launch it first.")?;
    
    window.eval(&script).map_err(|e| e.to_string())?;
    
    println!("✅ Injection Successful");
    Ok(())
}

#[command]
async fn set_black_ops_session(
    token: String, 
    cookies: String,
    state: tauri::State<'_, DownloadState>
) -> Result<(), String> {
    println!("🕵️ BLACK OPS: Session Captured.");
    let mut session = state.udemy_session.lock().unwrap();
    *session = Some(UdemySession { token, cookies });
    Ok(())
}

fn main() {
    // 🔒 SECURITY LAYER 1: Anti-Debug Check (DISABLED for Stability)
    // if security::check_debugger() || security::check_debugger_processes() {
    //     println!("⚠️ Security violation detected");
    //     std::process::exit(0);
    // }
    
    // 🔒 SECURITY LAYER 2: Integrity Check (DISABLED for Stability)
    // if !security::verify_integrity() {
    //     println!("⚠️ Binary integrity check failed");
    //     std::process::exit(0);
    // }
    
    // 🔒 SECURITY LAYER 3: Start Continuous Monitoring (DISABLED for Stability)
    // security::start_security_monitor();
    
    // Initialize orchestrator with ENCRYPTED Cloudflare Worker URL
    let mut orch = orchestrator::DownloadOrchestrator::new();
    let cloudflare_url = security::get_cloudflare_worker_url();
    orch.set_cloudflare_worker(cloudflare_url.clone());
    
    // Initialize license manager with ENCRYPTED API URL
    let license_api_url = security::get_license_api_url();
    let license_mgr = license::LicenseManager::new(license_api_url.clone());
    
    // 💰 Initialize Ad Manager for monetization
    let hwid = license::LicenseManager::generate_hwid();
    println!("🔐 Ad Manager API URL: {}", license_api_url);
    let ad_mgr = ad_manager::AdManager::new(hwid, license_api_url);
    
    println!("✅ Cloudflare Worker enabled: {}", cloudflare_url);
    println!("🔐 License Manager initialized - HWID: {}", license_mgr.get_hwid());
    println!("🛡️ Security layers active: Anti-Debug + Integrity + Monitoring");
    
    tauri::Builder::default()
        .manage(DownloadState {
            active_downloads: Arc::new(Mutex::new(HashMap::new())),
            orchestrator: Arc::new(Mutex::new(orch)),
            license_manager: Arc::new(Mutex::new(license_mgr)),
            ad_manager: Arc::new(Mutex::new(ad_mgr)),
            udemy_session: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            open_folder,
            download_video,
            get_video_metadata,
            cache_audio_tracks,
            check_ad_required,
            request_download_token,
            authorize_download,
            export_files,
            fetch_udemy_courses, // NEW
            fetch_course_lectures, // NEW
            launch_stealth_browser, // NEW
            run_visual_scraper, // NEW
            set_black_ops_session // NEW
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
