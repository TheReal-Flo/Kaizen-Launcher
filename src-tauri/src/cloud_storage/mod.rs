pub mod commands;
pub mod credentials;
pub mod db;
pub mod dropbox;
pub mod google_drive;
pub mod manager;
pub mod nextcloud;
pub mod s3;

use serde::{Deserialize, Serialize};

/// Cloud storage provider types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CloudProvider {
    GoogleDrive,
    Nextcloud,
    S3,
    Dropbox,
}

impl std::fmt::Display for CloudProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CloudProvider::GoogleDrive => write!(f, "google_drive"),
            CloudProvider::Nextcloud => write!(f, "nextcloud"),
            CloudProvider::S3 => write!(f, "s3"),
            CloudProvider::Dropbox => write!(f, "dropbox"),
        }
    }
}

impl std::str::FromStr for CloudProvider {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "google_drive" | "googledrive" => Ok(CloudProvider::GoogleDrive),
            "nextcloud" | "webdav" => Ok(CloudProvider::Nextcloud),
            "s3" | "aws" | "minio" => Ok(CloudProvider::S3),
            "dropbox" => Ok(CloudProvider::Dropbox),
            _ => Err(format!("Unknown cloud provider: {}", s)),
        }
    }
}

/// Cloud sync status
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CloudSyncStatus {
    #[default]
    Pending,
    Uploading,
    Synced,
    Failed,
}

impl std::fmt::Display for CloudSyncStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CloudSyncStatus::Pending => write!(f, "pending"),
            CloudSyncStatus::Uploading => write!(f, "uploading"),
            CloudSyncStatus::Synced => write!(f, "synced"),
            CloudSyncStatus::Failed => write!(f, "failed"),
        }
    }
}

impl std::str::FromStr for CloudSyncStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "pending" => Ok(CloudSyncStatus::Pending),
            "uploading" => Ok(CloudSyncStatus::Uploading),
            "synced" => Ok(CloudSyncStatus::Synced),
            "failed" => Ok(CloudSyncStatus::Failed),
            _ => Err(format!("Unknown sync status: {}", s)),
        }
    }
}

/// Cloud storage configuration stored in database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudStorageConfig {
    pub id: String,
    pub provider: CloudProvider,
    pub enabled: bool,
    pub auto_upload: bool,

    // Google Drive (OAuth)
    pub google_access_token: Option<String>,
    pub google_refresh_token: Option<String>,
    pub google_expires_at: Option<String>,
    pub google_folder_id: Option<String>,

    // Nextcloud (WebDAV)
    pub nextcloud_url: Option<String>,
    pub nextcloud_username: Option<String>,
    pub nextcloud_password: Option<String>,
    pub nextcloud_folder_path: Option<String>,

    // S3-compatible
    pub s3_endpoint: Option<String>,
    pub s3_region: Option<String>,
    pub s3_bucket: Option<String>,
    pub s3_access_key: Option<String>,
    pub s3_secret_key: Option<String>,
    pub s3_folder_prefix: Option<String>,

    // Dropbox (OAuth)
    pub dropbox_access_token: Option<String>,
    pub dropbox_refresh_token: Option<String>,
    pub dropbox_expires_at: Option<String>,
    pub dropbox_folder_path: Option<String>,
}

impl Default for CloudStorageConfig {
    fn default() -> Self {
        Self {
            id: "global".to_string(),
            provider: CloudProvider::Nextcloud,
            enabled: false,
            auto_upload: false,
            google_access_token: None,
            google_refresh_token: None,
            google_expires_at: None,
            google_folder_id: None,
            nextcloud_url: None,
            nextcloud_username: None,
            nextcloud_password: None,
            nextcloud_folder_path: Some("/Kaizen Backups".to_string()),
            s3_endpoint: None,
            s3_region: None,
            s3_bucket: None,
            s3_access_key: None,
            s3_secret_key: None,
            s3_folder_prefix: Some("kaizen-backups/".to_string()),
            dropbox_access_token: None,
            dropbox_refresh_token: None,
            dropbox_expires_at: None,
            dropbox_folder_path: Some("/Kaizen Backups".to_string()),
        }
    }
}

/// Cloud backup sync record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudBackupSync {
    pub id: String,
    pub local_backup_path: String,
    pub instance_id: String,
    pub world_name: String,
    pub backup_filename: String,
    pub remote_path: Option<String>,
    pub sync_status: CloudSyncStatus,
    pub last_synced_at: Option<String>,
    pub file_size_bytes: Option<i64>,
    pub error_message: Option<String>,
}

impl CloudBackupSync {
    pub fn new(
        local_backup_path: &str,
        instance_id: &str,
        world_name: &str,
        backup_filename: &str,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            local_backup_path: local_backup_path.to_string(),
            instance_id: instance_id.to_string(),
            world_name: world_name.to_string(),
            backup_filename: backup_filename.to_string(),
            remote_path: None,
            sync_status: CloudSyncStatus::Pending,
            last_synced_at: None,
            file_size_bytes: None,
            error_message: None,
        }
    }
}

/// OAuth device code flow response (for Google/Dropbox)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

/// Connection test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub storage_used: Option<u64>,
    pub storage_total: Option<u64>,
}

/// Upload progress event
#[derive(Debug, Clone, Serialize)]
pub struct CloudUploadProgressEvent {
    pub backup_filename: String,
    pub progress: u32,
    pub bytes_uploaded: u64,
    pub total_bytes: u64,
    pub status: CloudSyncStatus,
    pub message: String,
}

/// Remote backup info (from cloud storage)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteBackupInfo {
    pub filename: String,
    pub remote_path: String,
    pub size_bytes: u64,
    pub modified_at: String,
}
