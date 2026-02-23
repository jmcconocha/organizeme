use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

const IGNORED_DIRECTORIES: &[&str] = &[
    "node_modules",
    ".git",
    ".next",
    ".cache",
    ".pnpm",
    "dist",
    "build",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
    ".idea",
    ".vscode",
];

const PROJECT_INDICATORS: &[&str] = &[
    "package.json",
    ".git",
    "README.md",
    "README.txt",
    "README",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "Makefile",
];

const README_FILES: &[&str] = &[
    "README.md",
    "README.txt",
    "README",
    "readme.md",
    "Readme.md",
];

const MAX_README_LENGTH: usize = 50000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitInfoData {
    pub branch: String,
    pub is_dirty: bool,
    pub uncommitted_changes: usize,
    pub ahead_by: usize,
    pub behind_by: usize,
    pub last_commit_date: Option<String>,
    pub last_commit_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub status: String,
    pub last_modified: String,
    pub git_info: Option<GitInfoData>,
    pub has_package_json: bool,
    pub has_readme: bool,
    pub readme_content: Option<String>,
    pub git_remote_url: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug)]
pub struct ScanOptions {
    pub include_hidden: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self {
            include_hidden: false,
        }
    }
}

/// Creates a URL-safe identifier from a project name.
fn create_project_id(name: &str) -> String {
    let mapped: String = name
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();

    mapped
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Determines initial project status based on last modified time.
fn determine_initial_status(last_modified: &chrono::DateTime<chrono::Utc>) -> String {
    let now = chrono::Utc::now();
    let days = (now - *last_modified).num_days();

    if days <= 7 {
        "active".to_string()
    } else if days <= 30 {
        "unknown".to_string()
    } else {
        "stale".to_string()
    }
}

/// Checks if a directory appears to be a project based on common indicators.
async fn is_project_directory(dir_path: &Path) -> bool {
    for indicator in PROJECT_INDICATORS {
        if dir_path.join(indicator).exists() {
            return true;
        }
    }
    false
}

/// Extracts the project description from package.json if available.
async fn get_project_description(dir_path: &Path) -> Option<String> {
    let package_json_path = dir_path.join("package.json");
    if let Ok(content) = fs::read_to_string(&package_json_path).await {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            return json
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
    }
    None
}

/// Scans a single directory and creates a Project struct.
async fn scan_project(dir_path: &Path, name: &str) -> Result<Project> {
    let metadata = fs::metadata(dir_path).await?;
    let last_modified: chrono::DateTime<chrono::Utc> = metadata.modified()?.into();
    let project_id = create_project_id(name);

    let has_package_json = dir_path.join("package.json").exists();
    let has_readme = README_FILES.iter().any(|f| dir_path.join(f).exists());
    let description = get_project_description(dir_path).await;

    Ok(Project {
        id: project_id,
        name: name.to_string(),
        path: dir_path.to_string_lossy().to_string(),
        description,
        status: determine_initial_status(&last_modified),
        last_modified: last_modified.to_rfc3339(),
        git_info: None,
        has_package_json,
        has_readme,
        readme_content: None,
        git_remote_url: None,
        tags: None,
    })
}

/// Scans a directory for project subdirectories.
pub async fn scan_directory(projects_path: &str, options: &ScanOptions) -> Result<Vec<Project>> {
    let path = Path::new(projects_path);

    if !path.is_dir() {
        return Err(anyhow::anyhow!(
            "Path is not a directory: {}",
            projects_path
        ));
    }

    let mut entries = fs::read_dir(path).await?;
    let mut projects = Vec::new();

    while let Some(entry) = entries.next_entry().await? {
        let file_type = entry.file_type().await?;
        if !file_type.is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();

        if IGNORED_DIRECTORIES.contains(&name.as_str()) {
            continue;
        }

        if !options.include_hidden && name.starts_with('.') {
            continue;
        }

        let full_path = entry.path();

        match scan_project(&full_path, &name).await {
            Ok(mut project) => {
                if !is_project_directory(&full_path).await {
                    project.status = "unknown".to_string();
                }
                projects.push(project);
            }
            Err(_) => continue,
        }
    }

    Ok(projects)
}

/// Reads README content from a project directory.
pub async fn get_readme_content(project_path: &str) -> Result<Option<String>> {
    let path = Path::new(project_path);

    for file_name in README_FILES {
        let file_path = path.join(file_name);
        if let Ok(content) = fs::read_to_string(&file_path).await {
            if content.len() > MAX_README_LENGTH {
                return Ok(Some(format!(
                    "{}\n\n... (truncated)",
                    &content[..MAX_README_LENGTH]
                )));
            }
            return Ok(Some(content));
        }
    }

    Ok(None)
}
