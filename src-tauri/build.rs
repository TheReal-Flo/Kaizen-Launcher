use std::fs;
use std::path::Path;

fn main() {
    // Load .env file for local development (OAuth credentials)
    let env_path = Path::new(".env");
    if env_path.exists() {
        if let Ok(contents) = fs::read_to_string(env_path) {
            for line in contents.lines() {
                let line = line.trim();
                // Skip comments and empty lines
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                // Parse KEY=VALUE
                if let Some((key, value)) = line.split_once('=') {
                    let key = key.trim();
                    let value = value.trim();
                    // Only set OAuth-related env vars
                    if key.starts_with("GOOGLE_") || key.starts_with("DROPBOX_") {
                        println!("cargo:rustc-env={}={}", key, value);
                    }
                }
            }
        }
        // Rebuild if .env changes
        println!("cargo:rerun-if-changed=.env");
    }

    tauri_build::build()
}
