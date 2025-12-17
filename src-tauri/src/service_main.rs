mod security;

use std::ffi::OsString;
use std::sync::mpsc::channel;
use std::time::Duration;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};
use tokio::net::windows::named_pipe::ServerOptions;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest}; // 🛡️ Added for Challenge-Response

const PIPE_NAME: &str = r"\\.\pipe\trash-hunter-ipc";

#[derive(Serialize, Deserialize, Debug)]
struct IpcCommand {
    action: String,
    payload: Option<String>,
    client_pid: u32, // 🛡️ ADDED: Client must identify itself
}

#[derive(Serialize, Deserialize, Debug)]
struct IpcResponse {
    status: String,
    message: String,
}

// Define the service entry point
define_windows_service!(ffi_service_main, my_service_main);

fn main() -> windows_service::Result<()> {
    // Register the service entry point with the Windows Service Control Manager
    service_dispatcher::start("TrashHunterService", ffi_service_main)?;
    Ok(())
}

fn my_service_main(_arguments: Vec<OsString>) {
    // Handle service control events (Stop, Pause, etc.)
    if let Err(_e) = run_service() {
        // In a real app, log this error to a file
    }
}

fn run_service() -> windows_service::Result<()> {
    // Create a channel to communicate between the control handler and the main loop
    let (shutdown_tx, shutdown_rx) = channel();

    // Define the event handler
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop => {
                shutdown_tx.send(()).unwrap();
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    // Register the system service control handler
    let status_handle = service_control_handler::register("TrashHunterService", event_handler)?;

    // Tell Windows we are running
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    // --- START IPC SERVER (Async Runtime) ---
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut server = ServerOptions::new()
                .first_pipe_instance(true)
                .create(PIPE_NAME)
                .expect("Failed to create named pipe");

            loop {
                // Wait for a client to connect
                if let Ok(()) = server.connect().await {
                    let mut connected_server = server;
                    
                    // Re-create the server for the next connection immediately
                    // (In a real robust server, we'd spawn a task for the connection and create a new listener)
                    server = ServerOptions::new()
                        .create(PIPE_NAME)
                        .expect("Failed to create named pipe instance");

                    // Handle the connection in a separate task
                    tokio::spawn(async move {
                        // 🛡️ SECURE PID CHECK (Kernel Level)
                        // We ask the OS who is on the other end of the pipe.
                        // This prevents "PID Spoofing" where malware lies in the JSON.
                        use std::os::windows::io::AsRawHandle;
                        use windows::Win32::System::Pipes::GetNamedPipeClientProcessId;
                        use windows::Win32::Foundation::HANDLE;

                        let raw_handle = connected_server.as_raw_handle();
                        let mut real_client_pid = 0;
                        unsafe {
                            // Get the PID of the process connected to the pipe
                            let _ = GetNamedPipeClientProcessId(
                                HANDLE(raw_handle as isize),
                                &mut real_client_pid
                            );
                        }

                        // Verify the REAL PID, not the one in the JSON
                        if !security::verify_client_process(real_client_pid) {
                            // LOG: "Security Alert: Unauthorized process tried to connect! PID: {real_client_pid}"
                            return; // Drop connection silently
                        }

                        // 👽 ALIEN DEFENSE: CHALLENGE-RESPONSE HANDSHAKE
                        // Before accepting any command, we demand proof of identity.
                        // 1. Generate Random Nonce
                        let nonce = format!("{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
                        
                        // 2. Send Challenge
                        let challenge_req = IpcResponse {
                            status: "challenge".into(),
                            message: nonce.clone(),
                        };
                        let _ = connected_server.write_all(serde_json::to_string(&challenge_req).unwrap().as_bytes()).await;

                        // 3. Wait for Response (Client must sign the nonce)
                        let mut buffer = [0; 1024];
                        if let Ok(n) = connected_server.read(&mut buffer).await {
                            if n == 0 { return; }
                            let response_str = String::from_utf8_lossy(&buffer[..n]);
                            
                            if let Ok(cmd) = serde_json::from_str::<IpcCommand>(&response_str) {
                                if cmd.action == "challenge_response" {
                                    // 4. Verify Signature: SHA256(nonce + SECRET)
                                    let secret = security::get_shared_secret();
                                    let mut hasher = Sha256::new();
                                    hasher.update(nonce.as_bytes());
                                    hasher.update(secret.as_bytes());
                                    let expected_hash = hex::encode(hasher.finalize());

                                    if cmd.payload.as_deref() == Some(&expected_hash) {
                                        // AUTHENTICATED! Now we can process real commands.
                                        // (In a real app, we'd loop here to accept multiple commands)
                                        // For this simple version, we just send "OK" and close, or wait for next command.
                                        // Let's just send "Auth Success" and wait for the REAL command.
                                        let auth_ok = IpcResponse { status: "ok".into(), message: "Authenticated".into() };
                                        let _ = connected_server.write_all(serde_json::to_string(&auth_ok).unwrap().as_bytes()).await;
                                        
                                        // NOW read the actual command
                                        let mut cmd_buffer = [0; 1024];
                                        if let Ok(cmd_n) = connected_server.read(&mut cmd_buffer).await {
                                            let cmd_str = String::from_utf8_lossy(&cmd_buffer[..cmd_n]);
                                            if let Ok(real_cmd) = serde_json::from_str::<IpcCommand>(&cmd_str) {
                                                let response = handle_command(real_cmd);
                                                let _ = connected_server.write_all(serde_json::to_string(&response).unwrap().as_bytes()).await;
                                            }
                                        }
                                    } else {
                                        // WRONG SIGNATURE -> KICK
                                        return;
                                    }
                                }
                            }
                        }
                    });
                }
            }
        });
    });

    // --- THE MAIN LOOP (The "Engine") ---
    loop {
        // 🛡️ PARANOID SECURITY CHECK (Every 1 second)
        if !security::verify_integrity() {
            // If a debugger or hack tool is found, KILL THE SERVICE immediately.
            // This prevents them from analyzing the memory.
            security::self_destruct();
        }

        // Check if we received a stop signal
        if let Ok(_) = shutdown_rx.recv_timeout(Duration::from_secs(1)) {
            break;
        }
    }

    // Tell Windows we are stopped
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    Ok(())
}

fn handle_command(cmd: IpcCommand) -> IpcResponse {
    // 🛡️ ZERO TRUST VERIFICATION
    // Before doing ANYTHING, verify who sent this command.
    if !security::verify_client_process(cmd.client_pid) {
        // Log this attempt?
        return IpcResponse {
            status: "denied".into(),
            message: "SECURITY ALERT: UNAUTHORIZED CLIENT DETECTED.".into(),
        };
    }

    match cmd.action.as_str() {
        "ping" => IpcResponse {
            status: "ok".into(),
            message: "pong".into(),
        },
        "delete_file" => {
            // REAL ADMIN ACTION WOULD GO HERE
            if let Some(path) = cmd.payload {
                // std::fs::remove_file(path)...
                IpcResponse {
                    status: "ok".into(),
                    message: format!("Simulated deletion of: {}", path),
                }
            } else {
                IpcResponse {
                    status: "error".into(),
                    message: "No path provided".into(),
                }
            }
        },
        "delete_shadow" => {
            // 🛡️ PRIVILEGED ACTION: Delete Shadow Copy
            if let Some(id) = cmd.payload {
                // Run vssadmin as SYSTEM
                let output = std::process::Command::new("vssadmin")
                    .args(&["delete", "shadows", &format!("/Shadow={}", id), "/Quiet"])
                    .output();

                match output {
                    Ok(out) => {
                        if out.status.success() {
                            IpcResponse { status: "ok".into(), message: "Shadow copy deleted".into() }
                        } else {
                            IpcResponse { status: "error".into(), message: String::from_utf8_lossy(&out.stderr).to_string() }
                        }
                    },
                    Err(e) => IpcResponse { status: "error".into(), message: e.to_string() }
                }
            } else {
                IpcResponse { status: "error".into(), message: "No Shadow ID provided".into() }
            }
        },
        _ => IpcResponse {
            status: "error".into(),
            message: "Unknown command".into(),
        }
    }
}
