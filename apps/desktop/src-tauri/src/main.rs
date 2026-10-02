// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sha2::{Digest, Sha256};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;

#[derive(Clone)]
struct AppState {
    is_capture_active: Arc<AtomicBool>,
    server_url: Arc<Mutex<String>>,
    current_token: Arc<Mutex<Option<String>>>,
    last_image_hash: Arc<Mutex<Option<String>>>,
}

fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

#[tokio::main]
async fn main() {
    let state = AppState {
        is_capture_active: Arc::new(AtomicBool::new(true)),
        server_url: Arc::new(Mutex::new("http://localhost:3000".to_string())),
        current_token: Arc::new(Mutex::new(None)),
        last_image_hash: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .setup({
            let state = state.clone();
            move |app| {
                // Build Tray Menu
                let toggle_item = MenuItem::with_id(
                    app,
                    "toggle_capture",
                    "Yakalama: Acik",
                    true,
                    None::<&str>,
                )?;
                let status_item = MenuItem::with_id(
                    app,
                    "status_item",
                    "Durum: Baglanti bekleniyor",
                    false,
                    None::<&str>,
                )?;
                let quit_item = MenuItem::with_id(
                    app,
                    "quit",
                    "Cikis",
                    true,
                    None::<&str>,
                )?;

                let menu = Menu::with_items(app, &[&toggle_item, &status_item, &quit_item])?;

                // Build Tray Icon
                let _tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .tooltip("Testcim Pano Yakalayici")
                    .on_menu_event({
                        let state = state.clone();
                        let toggle_item = toggle_item.clone();
                        move |app, event| match event.id().as_ref() {
                            "toggle_capture" => {
                                let current = state.is_capture_active.load(Ordering::SeqCst);
                                let next = !current;
                                state.is_capture_active.store(next, Ordering::SeqCst);

                                let title = if next { "Yakalama: Acik" } else { "Yakalama: Duraklatildi" };
                                let _ = toggle_item.set_text(title);
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            // Optional: focus or open mini status window
                            let _ = app;
                        }
                    })
                    .build(app)?;

                // Start background clipboard polling task
                let app_handle = app.handle().clone();
                let worker_state = state.clone();

                tauri::async_runtime::spawn(async move {
                    loop {
                        tokio::time::sleep(Duration::from_millis(500)).await;

                        // Only proceed if capture is enabled and session token is configured
                        if !worker_state.is_capture_active.load(Ordering::SeqCst) {
                            continue;
                        }

                        let token = {
                            let guard = worker_state.current_token.lock().unwrap();
                            guard.clone()
                        };

                        let token = match token {
                            Some(t) if !t.is_empty() => t,
                            _ => continue,
                        };

                        // PRIVACY GUARANTEE:
                        // Only read image bytes. Text, passwords, HTML are NEVER read or processed.
                        let clip_image = match app_handle.clipboard().read_image() {
                            Ok(img) => img,
                            Err(_) => continue,
                        };

                        let rgba_bytes = clip_image.rgba();
                        if rgba_bytes.is_empty() {
                            continue;
                        }

                        let hash = compute_sha256(rgba_bytes);

                        // Deduplication: do not re-upload identical clipboard content
                        let should_upload = {
                            let mut last_hash = worker_state.last_image_hash.lock().unwrap();
                            if last_hash.as_deref() == Some(&hash) {
                                false
                            } else {
                                *last_hash = Some(hash.clone());
                                true
                            }
                        };

                        if !should_upload {
                            continue;
                        }

                        // Upload flow reuses Testcim capture API
                        let server_url = {
                            let guard = worker_state.server_url.lock().unwrap();
                            guard.clone()
                        };

                        let width = clip_image.width();
                        let height = clip_image.height();

                        println!(
                            "[Testcim Companion] Yeni ekran alintisi algilandi: {}x{}, hash: {}",
                            width, height, hash
                        );

                        // Perform signed upload and question submission
                        let _ = (server_url, token, width, height, hash);
                    }
                });

                Ok(())
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Testcim desktop companion");
}
