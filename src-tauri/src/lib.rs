use tauri::Manager; // <--- Diese Zeile ist der Retter!

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Jetzt wird .path() erkannt, weil Manager im Scope ist
            if let Ok(path) = app.path().app_local_data_dir() {
                println!("App Local Data Path: {:?}", path);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}