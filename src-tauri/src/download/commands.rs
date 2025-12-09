use crate::error::AppResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub task_id: String,
    pub name: String,
    pub downloaded: u64,
    pub total: u64,
    pub speed: u64,
    pub status: String,
}

// TODO: Implement download commands in Phase 4
#[tauri::command]
pub async fn get_download_queue() -> AppResult<Vec<DownloadProgress>> {
    Ok(vec![])
}
