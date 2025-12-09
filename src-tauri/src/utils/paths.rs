use directories::ProjectDirs;
use std::path::PathBuf;

/// Get the application data directory
#[allow(dead_code)]
pub fn get_data_dir() -> anyhow::Result<PathBuf> {
    let proj_dirs = ProjectDirs::from("com", "kaizen", "launcher")
        .ok_or_else(|| anyhow::anyhow!("Could not determine data directory"))?;

    Ok(proj_dirs.data_dir().to_path_buf())
}

/// Get the instances directory
#[allow(dead_code)]
pub fn get_instances_dir() -> anyhow::Result<PathBuf> {
    Ok(get_data_dir()?.join("instances"))
}

/// Get the cache directory
#[allow(dead_code)]
pub fn get_cache_dir() -> anyhow::Result<PathBuf> {
    Ok(get_data_dir()?.join("cache"))
}

/// Get the versions directory
#[allow(dead_code)]
pub fn get_versions_dir() -> anyhow::Result<PathBuf> {
    Ok(get_data_dir()?.join("versions"))
}

/// Get the Java installations directory
#[allow(dead_code)]
pub fn get_java_dir() -> anyhow::Result<PathBuf> {
    Ok(get_data_dir()?.join("java"))
}

/// Get the assets directory (shared between instances)
#[allow(dead_code)]
pub fn get_assets_dir() -> anyhow::Result<PathBuf> {
    Ok(get_cache_dir()?.join("assets"))
}

/// Get the libraries directory (shared between instances)
#[allow(dead_code)]
pub fn get_libraries_dir() -> anyhow::Result<PathBuf> {
    Ok(get_cache_dir()?.join("libraries"))
}
