use crate::auth::minecraft::{self, MinecraftProfile};
use crate::crypto;
use crate::db::accounts::Account;
use crate::error::{AppError, AppResult};
use crate::state::SharedState;
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub async fn upload_skin(
    state: State<'_, SharedState>,
    file_path: PathBuf,
    variant: String,
) -> AppResult<()> {
    let state_guard = state.read().await;
    let account = Account::get_active(&state_guard.db)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::Auth("No active account".to_string()))?;

    let access_token = if crypto::is_encrypted(&account.access_token) {
        crypto::decrypt(&state_guard.encryption_key, &account.access_token)
            .map_err(|e| AppError::Encryption(format!("Failed to decrypt access token: {}", e)))?
    } else {
        account.access_token
    };

    minecraft::upload_skin(
        &state_guard.http_client,
        &access_token,
        &file_path,
        &variant,
    )
    .await
}

#[tauri::command]
pub async fn reset_skin(state: State<'_, SharedState>) -> AppResult<()> {
    let state_guard = state.read().await;
    let account = Account::get_active(&state_guard.db)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::Auth("No active account".to_string()))?;

    let access_token = if crypto::is_encrypted(&account.access_token) {
        crypto::decrypt(&state_guard.encryption_key, &account.access_token)
            .map_err(|e| AppError::Encryption(format!("Failed to decrypt access token: {}", e)))?
    } else {
        account.access_token
    };

    minecraft::reset_skin(&state_guard.http_client, &access_token).await
}

#[tauri::command]
pub async fn change_skin_url(
    state: State<'_, SharedState>,
    url: String,
    variant: String,
) -> AppResult<()> {
    let state_guard = state.read().await;
    let account = Account::get_active(&state_guard.db)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::Auth("No active account".to_string()))?;

    let access_token = if crypto::is_encrypted(&account.access_token) {
        crypto::decrypt(&state_guard.encryption_key, &account.access_token)
            .map_err(|e| AppError::Encryption(format!("Failed to decrypt access token: {}", e)))?
    } else {
        account.access_token
    };

    minecraft::change_skin_url(&state_guard.http_client, &access_token, &url, &variant).await
}

#[tauri::command]
pub async fn get_minecraft_profile(state: State<'_, SharedState>) -> AppResult<MinecraftProfile> {
    let state_guard = state.read().await;
    let account = Account::get_active(&state_guard.db)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::Auth("No active account".to_string()))?;

    let access_token = if crypto::is_encrypted(&account.access_token) {
        crypto::decrypt(&state_guard.encryption_key, &account.access_token)
            .map_err(|e| AppError::Encryption(format!("Failed to decrypt access token: {}", e)))?
    } else {
        account.access_token
    };

    minecraft::get_minecraft_profile(&state_guard.http_client, &access_token).await
}

#[tauri::command]
pub async fn change_active_cape(state: State<'_, SharedState>, cape_id: String) -> AppResult<()> {
    let state_guard = state.read().await;
    let account = Account::get_active(&state_guard.db)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::Auth("No active account".to_string()))?;

    let access_token = if crypto::is_encrypted(&account.access_token) {
        crypto::decrypt(&state_guard.encryption_key, &account.access_token)
            .map_err(|e| AppError::Encryption(format!("Failed to decrypt access token: {}", e)))?
    } else {
        account.access_token
    };

    minecraft::change_active_cape(&state_guard.http_client, &access_token, &cape_id).await
}
