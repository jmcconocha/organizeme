use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;

/// Application settings persisted to ~/.organizeme/config.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub projects_path: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            projects_path: String::new(),
        }
    }
}

/// Returns the path to the organizeMe configuration directory.
fn get_config_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".organizeme")
}

/// Returns the path to the config.json file.
fn get_config_file() -> PathBuf {
    get_config_dir().join("config.json")
}

/// Ensures the configuration directory exists.
async fn ensure_config_directory() -> Result<()> {
    let config_dir = get_config_dir();
    fs::create_dir_all(&config_dir).await?;
    Ok(())
}

/// Reads app settings from config.json, returning defaults if not found.
pub async fn get_app_settings() -> Result<AppSettings> {
    let config_file = get_config_file();

    match fs::read_to_string(&config_file).await {
        Ok(content) => {
            let settings: AppSettings = serde_json::from_str(&content)?;
            Ok(settings)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(AppSettings::default()),
        Err(e) => Err(e.into()),
    }
}

/// Saves app settings to config.json.
pub async fn save_app_settings(settings: &AppSettings) -> Result<()> {
    ensure_config_directory().await?;
    let config_file = get_config_file();
    let content = serde_json::to_string_pretty(settings)?;
    fs::write(&config_file, content).await?;
    Ok(())
}

/// Returns the projects directory path: config → env → default.
pub fn get_projects_path() -> String {
    // Try reading config synchronously from a blocking context
    let config_file = get_config_file();
    if let Ok(content) = std::fs::read_to_string(&config_file) {
        if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
            if !settings.projects_path.is_empty() {
                return settings.projects_path;
            }
        }
    }

    // Fall back to env var
    if let Ok(path) = std::env::var("PROJECTS_PATH") {
        return path;
    }

    // Fall back to default
    dirs::home_dir()
        .map(|h| {
            h.join("Documents")
                .join("Projects")
                .to_string_lossy()
                .to_string()
        })
        .unwrap_or_default()
}
