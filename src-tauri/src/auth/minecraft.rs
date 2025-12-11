use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinecraftToken {
    pub access_token: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinecraftProfile {
    pub id: String,
    pub name: String,
    pub skins: Vec<MinecraftSkin>,
    pub capes: Vec<MinecraftCape>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinecraftCape {
    pub id: String,
    pub state: String,
    pub url: String,
    pub alias: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinecraftSkin {
    pub id: String,
    pub state: String,
    pub url: String,
    pub variant: String,
}

#[derive(Debug, Serialize)]
struct MinecraftAuthRequest {
    #[serde(rename = "identityToken")]
    identity_token: String,
}

#[derive(Debug, Deserialize)]
struct MinecraftAuthResponse {
    access_token: String,
    expires_in: u64,
}

#[derive(Debug, Deserialize)]
struct MinecraftProfileResponse {
    id: String,
    name: String,
    skins: Option<Vec<SkinResponse>>,
    capes: Option<Vec<CapeResponse>>,
}

#[derive(Debug, Deserialize)]
struct CapeResponse {
    id: String,
    state: String,
    url: String,
    alias: String,
}

#[derive(Debug, Deserialize)]
struct SkinResponse {
    id: String,
    state: String,
    url: String,
    variant: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct MinecraftOwnershipResponse {
    items: Vec<OwnershipItem>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct OwnershipItem {
    name: String,
}

pub async fn authenticate_minecraft(
    client: &reqwest::Client,
    user_hash: &str,
    xsts_token: &str,
) -> AppResult<MinecraftToken> {
    let request = MinecraftAuthRequest {
        identity_token: format!("XBL3.0 x={};{}", user_hash, xsts_token),
    };

    let response = client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header("User-Agent", "KaizenLauncher/1.0")
        .json(&request)
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("Minecraft auth failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!(
            "Minecraft auth failed: {}",
            error_text
        )));
    }

    let auth_response: MinecraftAuthResponse = response
        .json()
        .await
        .map_err(|e| AppError::Auth(format!("Failed to parse Minecraft auth response: {}", e)))?;

    Ok(MinecraftToken {
        access_token: auth_response.access_token,
        expires_in: auth_response.expires_in,
    })
}

#[allow(dead_code)]
pub async fn check_game_ownership(
    client: &reqwest::Client,
    minecraft_token: &str,
) -> AppResult<bool> {
    let response = client
        .get("https://api.minecraftservices.com/entitlements/mcstore")
        .header("Authorization", format!("Bearer {}", minecraft_token))
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("Ownership check failed: {}", e)))?;

    if !response.status().is_success() {
        // If we can't check ownership, assume they own it (will fail at profile fetch anyway)
        return Ok(true);
    }

    let ownership: MinecraftOwnershipResponse = response
        .json()
        .await
        .map_err(|e| AppError::Auth(format!("Failed to parse ownership response: {}", e)))?;

    // Check for game_minecraft or product_minecraft
    let owns_game = ownership
        .items
        .iter()
        .any(|item| item.name == "game_minecraft" || item.name == "product_minecraft");

    Ok(owns_game)
}

pub async fn get_minecraft_profile(
    client: &reqwest::Client,
    minecraft_token: &str,
) -> AppResult<MinecraftProfile> {
    let response = client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .header("Authorization", format!("Bearer {}", minecraft_token))
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("Profile fetch failed: {}", e)))?;

    let status = response.status();

    if status.as_u16() == 404 {
        return Err(AppError::Auth(
            "This account does not own Minecraft Java Edition".to_string(),
        ));
    }

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!(
            "Profile fetch failed: {}",
            error_text
        )));
    }

    let profile: MinecraftProfileResponse = response
        .json()
        .await
        .map_err(|e| AppError::Auth(format!("Failed to parse profile response: {}", e)))?;

    let skins = profile
        .skins
        .unwrap_or_default()
        .into_iter()
        .map(|s| MinecraftSkin {
            id: s.id,
            state: s.state,
            url: s.url,
            variant: s.variant,
        })
        .collect();

    let capes = profile
        .capes
        .unwrap_or_default()
        .into_iter()
        .map(|c| MinecraftCape {
            id: c.id,
            state: c.state,
            url: c.url,
            alias: c.alias,
        })
        .collect();

    Ok(MinecraftProfile {
        id: profile.id,
        name: profile.name,
        skins,
        capes,
    })
}

pub async fn upload_skin(
    client: &reqwest::Client,
    minecraft_token: &str,
    file_path: &std::path::Path,
    variant: &str,
) -> AppResult<()> {
    let file_content = tokio::fs::read(file_path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;

    let part = reqwest::multipart::Part::bytes(file_content)
        .file_name("skin.png")
        .mime_str("image/png")
        .map_err(|e| AppError::Auth(format!("Failed to create multipart: {}", e)))?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("variant", variant.to_string());

    let response = client
        .post("https://api.minecraftservices.com/minecraft/profile/skins")
        .header("Authorization", format!("Bearer {}", minecraft_token))
        .multipart(form)
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("Skin upload failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!(
            "Skin upload failed: {}",
            error_text
        )));
    }

    Ok(())
}

pub async fn reset_skin(client: &reqwest::Client, minecraft_token: &str) -> AppResult<()> {
    let response = client
        .delete("https://api.minecraftservices.com/minecraft/profile/skins/active")
        .header("Authorization", format!("Bearer {}", minecraft_token))
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("Skin reset failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!("Skin reset failed: {}", error_text)));
    }

    Ok(())
}

pub async fn change_skin_url(
    client: &reqwest::Client,
    minecraft_token: &str,
    url: &str,
    variant: &str,
) -> AppResult<()> {
    let json = serde_json::json!({
        "variant": variant,
        "url": url,
    });

    let response = client
        .post("https://api.minecraftservices.com/minecraft/profile/skins")
        .header("Authorization", format!("Bearer {}", minecraft_token))
        .header("Content-Type", "application/json")
        .json(&json)
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("Skin change failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!(
            "Skin change failed: {}",
            error_text
        )));
    }

    Ok(())
}

pub async fn change_active_cape(
    client: &reqwest::Client,
    minecraft_token: &str,
    cape_id: &str,
) -> AppResult<()> {
    let json = serde_json::json!({
        "capeId": cape_id,
    });

    let response = client
        .put("https://api.minecraftservices.com/minecraft/profile/capes/active")
        .header("Authorization", format!("Bearer {}", minecraft_token))
        .header("Content-Type", "application/json")
        .json(&json)
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("Cape change failed: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Auth(format!(
            "Cape change failed: {}",
            error_text
        )));
    }

    Ok(())
}
