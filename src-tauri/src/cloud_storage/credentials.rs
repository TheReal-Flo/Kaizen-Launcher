//! OAuth credentials embedded at compile time from environment variables.
//!
//! For production builds, these are injected via GitHub Secrets in CI.
//! For local development, create a `.env` file or set environment variables.

/// Google OAuth Client ID (from Google Cloud Console)
pub const GOOGLE_CLIENT_ID: Option<&str> = option_env!("GOOGLE_CLIENT_ID");

/// Google OAuth Client Secret (from Google Cloud Console)
pub const GOOGLE_CLIENT_SECRET: Option<&str> = option_env!("GOOGLE_CLIENT_SECRET");

/// Dropbox App Key (from Dropbox App Console)
pub const DROPBOX_APP_KEY: Option<&str> = option_env!("DROPBOX_APP_KEY");

/// Dropbox App Secret (from Dropbox App Console)
pub const DROPBOX_APP_SECRET: Option<&str> = option_env!("DROPBOX_APP_SECRET");

/// Check if Google Drive OAuth is available
pub fn is_google_available() -> bool {
    GOOGLE_CLIENT_ID.is_some() && GOOGLE_CLIENT_SECRET.is_some()
}

/// Check if Dropbox OAuth is available
pub fn is_dropbox_available() -> bool {
    DROPBOX_APP_KEY.is_some() && DROPBOX_APP_SECRET.is_some()
}

/// Get Google credentials, returns None if not configured
pub fn get_google_credentials() -> Option<(&'static str, &'static str)> {
    match (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) {
        (Some(id), Some(secret)) => Some((id, secret)),
        _ => None,
    }
}

/// Get Dropbox credentials, returns None if not configured
pub fn get_dropbox_credentials() -> Option<(&'static str, &'static str)> {
    match (DROPBOX_APP_KEY, DROPBOX_APP_SECRET) {
        (Some(key), Some(secret)) => Some((key, secret)),
        _ => None,
    }
}
