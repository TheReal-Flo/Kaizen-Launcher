//! HTTP file server for instance sharing
//! Serves the export ZIP file via a local HTTP server that can be tunneled

use crate::error::{AppError, AppResult};
use crate::sharing::manifest::SharingManifest;
use crate::tunnel::agent::get_agent_binary_path;
use crate::tunnel::TunnelProvider;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::SeekFrom;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncSeekExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::process::Command;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

// Windows-specific: CREATE_NO_WINDOW flag to hide console window
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// Pre-compiled regex for bore URL parsing
static BORE_URL_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"listening at ([a-zA-Z0-9.-]+:\d+)").expect("Invalid bore URL regex"));
static BORE_HOST_PORT_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"bore\.pub:\d+").expect("Invalid bore host:port regex"));

/// Information about an active share session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveShare {
    pub share_id: String,
    pub instance_name: String,
    pub package_path: String,
    pub local_port: u16,
    pub public_url: Option<String>,
    pub download_count: u32,
    pub uploaded_bytes: u64,
    pub started_at: String,
    pub file_size: u64,
}

/// Event emitted when share status changes
#[derive(Debug, Clone, Serialize)]
pub struct ShareStatusEvent {
    pub share_id: String,
    pub status: String,
    pub public_url: Option<String>,
    pub error: Option<String>,
}

/// Event emitted when download progress updates
#[derive(Debug, Clone, Serialize)]
pub struct ShareDownloadEvent {
    pub share_id: String,
    pub download_count: u32,
    pub uploaded_bytes: u64,
}

/// Tracks running share sessions
pub type RunningShares = Arc<RwLock<HashMap<String, ShareSession>>>;

/// A running share session with server and tunnel
pub struct ShareSession {
    pub info: ActiveShare,
    pub server_handle: tokio::task::JoinHandle<()>,
    pub tunnel_pid: Option<u32>,
    pub shutdown_tx: tokio::sync::broadcast::Sender<()>,
}

/// Find an available port
async fn find_available_port() -> AppResult<u16> {
    // Try to bind to port 0 to get an available port
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| AppError::Io(format!("Failed to find available port: {}", e)))?;

    let port = listener
        .local_addr()
        .map_err(|e| AppError::Io(format!("Failed to get local address: {}", e)))?
        .port();

    // Drop the listener to free the port
    drop(listener);

    Ok(port)
}

/// Start the HTTP file server
async fn start_http_server(
    package_path: PathBuf,
    port: u16,
    share_id: String,
    app: AppHandle,
    mut shutdown_rx: tokio::sync::broadcast::Receiver<()>,
    download_count: Arc<RwLock<u32>>,
    uploaded_bytes: Arc<RwLock<u64>>,
) -> AppResult<()> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| AppError::Io(format!("Failed to bind HTTP server: {}", e)))?;

    info!("[SHARE] HTTP server listening on port {}", port);

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => {
                info!("[SHARE] Shutting down HTTP server");
                break;
            }
            result = listener.accept() => {
                match result {
                    Ok((stream, peer_addr)) => {
                        info!("[SHARE] Connection from {}", peer_addr);
                        let path = package_path.clone();
                        let share_id_clone = share_id.clone();
                        let app_clone = app.clone();
                        let download_count_clone = download_count.clone();
                        let uploaded_bytes_clone = uploaded_bytes.clone();

                        tokio::spawn(async move {
                            if let Err(e) = handle_connection(
                                stream,
                                &path,
                                &share_id_clone,
                                &app_clone,
                                download_count_clone,
                                uploaded_bytes_clone,
                            ).await {
                                error!("[SHARE] Connection error: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        error!("[SHARE] Accept error: {}", e);
                    }
                }
            }
        }
    }

    Ok(())
}

/// Handle an HTTP connection
async fn handle_connection(
    mut stream: TcpStream,
    package_path: &Path,
    share_id: &str,
    app: &AppHandle,
    download_count: Arc<RwLock<u32>>,
    uploaded_bytes: Arc<RwLock<u64>>,
) -> AppResult<()> {
    let mut buffer = [0u8; 4096];
    let n = stream
        .read(&mut buffer)
        .await
        .map_err(|e| AppError::Io(format!("Read error: {}", e)))?;

    let request = String::from_utf8_lossy(&buffer[..n]);
    let first_line = request.lines().next().unwrap_or("");

    debug!("[SHARE] Request: {}", first_line);

    // Parse request
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 {
        send_response(&mut stream, 400, "Bad Request", None).await?;
        return Ok(());
    }

    let method = parts[0];
    let path = parts[1];

    // Check if range request
    let range_header = request
        .lines()
        .find(|line| line.to_lowercase().starts_with("range:"))
        .and_then(|line| line.split(':').nth(1))
        .map(|s| s.trim().to_string());

    match (method, path) {
        ("GET", "/") | ("GET", "/download") | ("GET", "/instance.kaizen") => {
            serve_file(&mut stream, package_path, range_header, share_id, app, download_count, uploaded_bytes).await?;
        }
        ("GET", "/manifest") => {
            serve_manifest(&mut stream, package_path).await?;
        }
        ("HEAD", "/") | ("HEAD", "/download") | ("HEAD", "/instance.kaizen") => {
            serve_file_head(&mut stream, package_path).await?;
        }
        _ => {
            send_response(&mut stream, 404, "Not Found", None).await?;
        }
    }

    Ok(())
}

/// Serve the ZIP file
async fn serve_file(
    stream: &mut TcpStream,
    package_path: &Path,
    range_header: Option<String>,
    share_id: &str,
    app: &AppHandle,
    download_count: Arc<RwLock<u32>>,
    uploaded_bytes: Arc<RwLock<u64>>,
) -> AppResult<()> {
    let mut file = tokio::fs::File::open(package_path)
        .await
        .map_err(|e| AppError::Io(format!("Failed to open file: {}", e)))?;

    let metadata = file
        .metadata()
        .await
        .map_err(|e| AppError::Io(format!("Failed to get metadata: {}", e)))?;

    let file_size = metadata.len();
    let filename = package_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("instance.kaizen");

    // Parse range if present
    let (start, end, status, content_length) = if let Some(range) = range_header {
        if let Some(range_str) = range.strip_prefix("bytes=") {
            let parts: Vec<&str> = range_str.split('-').collect();
            let start: u64 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
            let end: u64 = parts
                .get(1)
                .and_then(|s| if s.is_empty() { None } else { s.parse().ok() })
                .unwrap_or(file_size - 1)
                .min(file_size - 1);

            (start, end, 206, end - start + 1)
        } else {
            (0, file_size - 1, 200, file_size)
        }
    } else {
        (0, file_size - 1, 200, file_size)
    };

    // Build response headers
    let headers = if status == 206 {
        format!(
            "HTTP/1.1 206 Partial Content\r\n\
             Content-Type: application/zip\r\n\
             Content-Length: {}\r\n\
             Content-Range: bytes {}-{}/{}\r\n\
             Content-Disposition: attachment; filename=\"{}\"\r\n\
             Accept-Ranges: bytes\r\n\
             Connection: close\r\n\r\n",
            content_length, start, end, file_size, filename
        )
    } else {
        format!(
            "HTTP/1.1 200 OK\r\n\
             Content-Type: application/zip\r\n\
             Content-Length: {}\r\n\
             Content-Disposition: attachment; filename=\"{}\"\r\n\
             Accept-Ranges: bytes\r\n\
             Connection: close\r\n\r\n",
            file_size, filename
        )
    };

    stream
        .write_all(headers.as_bytes())
        .await
        .map_err(|e| AppError::Io(format!("Write headers error: {}", e)))?;

    // Seek to start position
    if start > 0 {
        file.seek(SeekFrom::Start(start))
            .await
            .map_err(|e| AppError::Io(format!("Seek error: {}", e)))?;
    }

    // Stream the file
    let mut remaining = content_length;
    let mut buffer = vec![0u8; 64 * 1024]; // 64KB chunks
    let mut total_sent: u64 = 0;

    while remaining > 0 {
        let to_read = (remaining as usize).min(buffer.len());
        let n = file
            .read(&mut buffer[..to_read])
            .await
            .map_err(|e| AppError::Io(format!("Read file error: {}", e)))?;

        if n == 0 {
            break;
        }

        stream
            .write_all(&buffer[..n])
            .await
            .map_err(|e| AppError::Io(format!("Write data error: {}", e)))?;

        remaining -= n as u64;
        total_sent += n as u64;
    }

    // Update stats
    {
        let mut bytes = uploaded_bytes.write().await;
        *bytes += total_sent;
    }

    // Only count as download if we sent the whole file
    if start == 0 && total_sent >= file_size {
        let mut count = download_count.write().await;
        *count += 1;

        // Emit download event
        let _ = app.emit(
            "share-download",
            ShareDownloadEvent {
                share_id: share_id.to_string(),
                download_count: *count,
                uploaded_bytes: *uploaded_bytes.read().await,
            },
        );

        info!("[SHARE] Download #{} completed ({} bytes)", *count, total_sent);
    }

    Ok(())
}

/// Serve file HEAD request
async fn serve_file_head(stream: &mut TcpStream, package_path: &Path) -> AppResult<()> {
    let metadata = tokio::fs::metadata(package_path)
        .await
        .map_err(|e| AppError::Io(format!("Failed to get metadata: {}", e)))?;

    let filename = package_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("instance.kaizen");

    let headers = format!(
        "HTTP/1.1 200 OK\r\n\
         Content-Type: application/zip\r\n\
         Content-Length: {}\r\n\
         Content-Disposition: attachment; filename=\"{}\"\r\n\
         Accept-Ranges: bytes\r\n\
         Connection: close\r\n\r\n",
        metadata.len(),
        filename
    );

    stream
        .write_all(headers.as_bytes())
        .await
        .map_err(|e| AppError::Io(format!("Write headers error: {}", e)))?;

    Ok(())
}

/// Serve the manifest JSON (for preview before download)
async fn serve_manifest(stream: &mut TcpStream, package_path: &Path) -> AppResult<()> {
    // Read manifest from ZIP
    let manifest = crate::sharing::import::validate_import_package(package_path).await?;
    let json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| AppError::Custom(format!("JSON error: {}", e)))?;

    let headers = format!(
        "HTTP/1.1 200 OK\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {}\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Connection: close\r\n\r\n",
        json.len()
    );

    stream
        .write_all(headers.as_bytes())
        .await
        .map_err(|e| AppError::Io(format!("Write headers error: {}", e)))?;

    stream
        .write_all(json.as_bytes())
        .await
        .map_err(|e| AppError::Io(format!("Write body error: {}", e)))?;

    Ok(())
}

/// Send a simple HTTP response
async fn send_response(
    stream: &mut TcpStream,
    status: u16,
    message: &str,
    body: Option<&str>,
) -> AppResult<()> {
    let body_content = body.unwrap_or(message);
    let response = format!(
        "HTTP/1.1 {} {}\r\n\
         Content-Type: text/plain\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\r\n{}",
        status,
        message,
        body_content.len(),
        body_content
    );

    stream
        .write_all(response.as_bytes())
        .await
        .map_err(|e| AppError::Io(format!("Write response error: {}", e)))?;

    Ok(())
}

/// Start bore tunnel for the HTTP server
async fn start_bore_tunnel(
    data_dir: &Path,
    local_port: u16,
    share_id: String,
    app: AppHandle,
) -> AppResult<(u32, tokio::sync::broadcast::Receiver<String>)> {
    let binary_path = get_agent_binary_path(data_dir, TunnelProvider::Bore);

    if !binary_path.exists() {
        return Err(AppError::Custom(
            "Bore agent not installed. Please install it from the Tunnel settings.".to_string(),
        ));
    }

    info!("[SHARE] Starting bore tunnel for port {}...", local_port);

    let mut cmd = Command::new(&binary_path);
    cmd.args(["local", &local_port.to_string(), "--to", "bore.pub"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| AppError::Io(format!("Failed to start bore: {}", e)))?;

    let pid = child.id().unwrap_or(0);
    info!("[SHARE] Bore started with PID: {}", pid);

    // Channel to send the public URL when found
    let (url_tx, url_rx) = tokio::sync::broadcast::channel::<String>(1);

    // Monitor stdout for URL
    if let Some(stdout) = child.stdout.take() {
        let share_id_clone = share_id.clone();
        let app_clone = app.clone();
        let url_tx_clone = url_tx.clone();

        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                tokio::task::yield_now().await;
                debug!("[SHARE BORE] {}", line);

                // Check for URL in the line
                let found_url = if let Some(captures) = BORE_URL_REGEX.captures(&line) {
                    captures.get(1).map(|m| m.as_str().to_string())
                } else {
                    BORE_HOST_PORT_REGEX.find(&line).map(|m| m.as_str().to_string())
                };

                if let Some(host_port) = found_url {
                    let public_url = format!("http://{}", host_port);
                    info!("[SHARE] Public URL: {}", public_url);

                    let _ = url_tx_clone.send(public_url.clone());

                    let _ = app_clone.emit(
                        "share-status",
                        ShareStatusEvent {
                            share_id: share_id_clone.clone(),
                            status: "connected".to_string(),
                            public_url: Some(public_url),
                            error: None,
                        },
                    );
                }

                // Check for errors
                if line.to_lowercase().contains("error") || line.to_lowercase().contains("failed") {
                    warn!("[SHARE BORE] Error: {}", line);
                    let _ = app_clone.emit(
                        "share-status",
                        ShareStatusEvent {
                            share_id: share_id_clone.clone(),
                            status: "error".to_string(),
                            public_url: None,
                            error: Some(line),
                        },
                    );
                }
            }
        });
    }

    // Monitor stderr
    if let Some(stderr) = child.stderr.take() {
        let share_id_clone = share_id.clone();
        let app_clone = app.clone();
        let url_tx_clone = url_tx;

        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                tokio::task::yield_now().await;
                debug!("[SHARE BORE STDERR] {}", line);

                // Check for URL in stderr too
                let found_url = if let Some(captures) = BORE_URL_REGEX.captures(&line) {
                    captures.get(1).map(|m| m.as_str().to_string())
                } else {
                    BORE_HOST_PORT_REGEX.find(&line).map(|m| m.as_str().to_string())
                };

                if let Some(host_port) = found_url {
                    let public_url = format!("http://{}", host_port);
                    let _ = url_tx_clone.send(public_url.clone());

                    let _ = app_clone.emit(
                        "share-status",
                        ShareStatusEvent {
                            share_id: share_id_clone.clone(),
                            status: "connected".to_string(),
                            public_url: Some(public_url),
                            error: None,
                        },
                    );
                }
            }
        });
    }

    // Wait for process exit in background
    let share_id_exit = share_id;
    let app_exit = app;
    tokio::spawn(async move {
        let _ = child.wait().await;
        info!("[SHARE] Bore tunnel exited");

        let _ = app_exit.emit(
            "share-status",
            ShareStatusEvent {
                share_id: share_id_exit,
                status: "disconnected".to_string(),
                public_url: None,
                error: None,
            },
        );
    });

    Ok((pid, url_rx))
}

/// Start sharing an instance package
pub async fn start_share(
    data_dir: &Path,
    package_path: &Path,
    instance_name: &str,
    app: AppHandle,
    running_shares: RunningShares,
) -> AppResult<ActiveShare> {
    let share_id = uuid::Uuid::new_v4().to_string();

    // Get file size
    let metadata = tokio::fs::metadata(package_path)
        .await
        .map_err(|e| AppError::Io(format!("Failed to get file metadata: {}", e)))?;

    // Find available port
    let port = find_available_port().await?;
    info!("[SHARE] Using port {} for share {}", port, share_id);

    // Create shutdown channel
    let (shutdown_tx, shutdown_rx) = tokio::sync::broadcast::channel(1);

    // Tracking stats
    let download_count = Arc::new(RwLock::new(0u32));
    let uploaded_bytes = Arc::new(RwLock::new(0u64));

    // Start HTTP server
    let server_path = package_path.to_path_buf();
    let server_share_id = share_id.clone();
    let server_app = app.clone();
    let server_download_count = download_count.clone();
    let server_uploaded_bytes = uploaded_bytes.clone();

    let server_handle = tokio::spawn(async move {
        if let Err(e) = start_http_server(
            server_path,
            port,
            server_share_id,
            server_app,
            shutdown_rx,
            server_download_count,
            server_uploaded_bytes,
        )
        .await
        {
            error!("[SHARE] HTTP server error: {}", e);
        }
    });

    // Start bore tunnel
    let (tunnel_pid, mut url_rx) =
        start_bore_tunnel(data_dir, port, share_id.clone(), app.clone()).await?;

    // Wait for public URL (with timeout)
    let public_url = tokio::time::timeout(std::time::Duration::from_secs(30), url_rx.recv())
        .await
        .ok()
        .and_then(|r| r.ok());

    if public_url.is_none() {
        warn!("[SHARE] Timeout waiting for public URL, tunnel may still be connecting");
    }

    let info = ActiveShare {
        share_id: share_id.clone(),
        instance_name: instance_name.to_string(),
        package_path: package_path.to_string_lossy().to_string(),
        local_port: port,
        public_url,
        download_count: 0,
        uploaded_bytes: 0,
        started_at: chrono::Utc::now().to_rfc3339(),
        file_size: metadata.len(),
    };

    // Store session
    {
        let mut shares = running_shares.write().await;
        shares.insert(
            share_id,
            ShareSession {
                info: info.clone(),
                server_handle,
                tunnel_pid: Some(tunnel_pid),
                shutdown_tx,
            },
        );
    }

    // Emit status
    let _ = app.emit(
        "share-status",
        ShareStatusEvent {
            share_id: info.share_id.clone(),
            status: if info.public_url.is_some() {
                "connected"
            } else {
                "connecting"
            }
            .to_string(),
            public_url: info.public_url.clone(),
            error: None,
        },
    );

    Ok(info)
}

/// Stop a share session
pub async fn stop_share(share_id: &str, running_shares: RunningShares) -> AppResult<()> {
    let session = {
        let mut shares = running_shares.write().await;
        shares.remove(share_id)
    };

    if let Some(session) = session {
        info!("[SHARE] Stopping share {}", share_id);

        // Send shutdown signal
        let _ = session.shutdown_tx.send(());

        // Kill tunnel process
        if let Some(pid) = session.tunnel_pid {
            #[cfg(unix)]
            {
                use std::process::Command;
                let _ = Command::new("kill").args(["-TERM", &pid.to_string()]).status();
            }

            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                use std::process::Command;

                let mut cmd = Command::new("taskkill");
                cmd.args(["/PID", &pid.to_string(), "/F"]);
                cmd.creation_flags(CREATE_NO_WINDOW);
                let _ = cmd.status();
            }
        }

        // Abort server task
        session.server_handle.abort();

        Ok(())
    } else {
        Err(AppError::Custom(format!("Share {} not found", share_id)))
    }
}

/// Get all active shares
pub async fn get_active_shares(running_shares: RunningShares) -> Vec<ActiveShare> {
    let shares = running_shares.read().await;
    shares.values().map(|s| s.info.clone()).collect()
}

/// Stop all shares
pub async fn stop_all_shares(running_shares: RunningShares) {
    let share_ids: Vec<String> = {
        let shares = running_shares.read().await;
        shares.keys().cloned().collect()
    };

    for share_id in share_ids {
        let _ = stop_share(&share_id, running_shares.clone()).await;
    }
}
