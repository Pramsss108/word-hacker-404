use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};

mod trash_hunter;
mod ipc_client;
mod security; // 🛡️ Import Security Module
mod black_ops; // 🏴‍☠️ Black Ops Module

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // 🛡️ CLIENT SELF-DEFENSE (Anti-Injection)
  // The Client checks ITSELF for debuggers before starting.
  // If a debugger is found, it crashes immediately.
  if !cfg!(debug_assertions) {
      if !security::verify_integrity() {
          security::self_destruct();
      }
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      trash_hunter::get_system_drives,
      trash_hunter::scan_shadow_copies,
      trash_hunter::delete_shadow_copy,
      trash_hunter::get_running_processes, // 🧠 AI Overseer: Process Scanner
      ipc_client::send_service_command,
      black_ops::run_black_ops
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 👻 GHOST MONITOR: System Tray
      let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let show_i = MenuItem::with_id(app, "show", "Show Monitor", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

      let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| {
          match event.id.as_ref() {
            "quit" => {
              app.exit(0);
            }
            "show" => {
               if let Some(window) = app.get_webview_window("main") {
                   let _ = window.show();
                   let _ = window.set_focus();
               }
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
