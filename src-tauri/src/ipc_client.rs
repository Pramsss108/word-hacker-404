use serde::{Deserialize, Serialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::windows::named_pipe::ClientOptions;
use tauri::command;
use sha2::{Sha256, Digest}; // 🛡️ Added for Challenge-Response
use crate::security; // 🛡️ Import Security Module

const PIPE_NAME: &str = r"\\.\pipe\trash-hunter-ipc";

#[derive(Serialize, Deserialize, Debug)]
pub struct IpcCommand {
    pub action: String,
    pub payload: Option<String>,
    pub client_pid: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IpcResponse {
    pub status: String,
    pub message: String,
}

#[command]
pub async fn send_service_command(action: String, payload: Option<String>) -> Result<String, String> {
    // 1. Connect to the Named Pipe
    let mut client = ClientOptions::new()
        .open(PIPE_NAME)
        .map_err(|e| format!("Failed to connect to service: {}. Is the service installed and running?", e))?;

    // 👽 ALIEN DEFENSE: CHALLENGE-RESPONSE HANDSHAKE
    // We don't just send the command. We wait for a challenge first.
    
    // A. Read Challenge (Nonce)
    let mut buffer = [0; 1024];
    let n = client.read(&mut buffer).await.map_err(|e| e.to_string())?;
    let challenge_str = String::from_utf8_lossy(&buffer[..n]);
    let challenge: IpcResponse = serde_json::from_str(&challenge_str).map_err(|e| format!("Invalid handshake: {}", e))?;

    if challenge.status != "challenge" {
        return Err("Service did not send challenge".into());
    }

    // B. Solve Challenge: SHA256(Nonce + SECRET)
    let nonce = challenge.message;
    let secret = security::get_shared_secret();
    let mut hasher = Sha256::new();
    hasher.update(nonce.as_bytes());
    hasher.update(secret.as_bytes());
    let signature = hex::encode(hasher.finalize());

    // C. Send Response
    let pid = std::process::id();
    let auth_cmd = IpcCommand { 
        action: "challenge_response".into(), 
        payload: Some(signature), 
        client_pid: pid 
    };
    client.write_all(serde_json::to_string(&auth_cmd).unwrap().as_bytes()).await.map_err(|e| e.to_string())?;

    // D. Wait for Auth Success
    let n_auth = client.read(&mut buffer).await.map_err(|e| e.to_string())?;
    let auth_response: IpcResponse = serde_json::from_str(&String::from_utf8_lossy(&buffer[..n_auth])).map_err(|e| e.to_string())?;
    
    if auth_response.status != "ok" {
        return Err("Authentication Failed".into());
    }

    // 2. NOW Send the Real Command
    let cmd = IpcCommand { action, payload, client_pid: pid };
    let cmd_json = serde_json::to_string(&cmd).map_err(|e| e.to_string())?;

    // 3. Send the command
    client.write_all(cmd_json.as_bytes()).await.map_err(|e| e.to_string())?;

    // 4. Read the response
    let n_final = client.read(&mut buffer).await.map_err(|e| e.to_string())?;
    
    let response_str = String::from_utf8_lossy(&buffer[..n_final]);
    let response: IpcResponse = serde_json::from_str(&response_str).map_err(|e| format!("Invalid response from service: {}", e))?;

    if response.status == "ok" {
        Ok(response.message)
    } else {
        Err(response.message)
    }
}
