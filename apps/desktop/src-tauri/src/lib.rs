mod config;
mod git;
mod scanner;
mod shell;
mod tags;

use scanner::ScanOptions;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectListResponse {
    pub projects: Vec<scanner::Project>,
    pub total: usize,
    pub scanned_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshResult {
    pub success: bool,
    pub message: String,
    pub project_count: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagResult {
    pub success: bool,
    pub message: String,
    pub tags: Option<Vec<String>>,
}

#[tauri::command]
async fn get_projects() -> Result<ProjectListResponse, String> {
    let projects_path = config::get_projects_path();
    let options = ScanOptions::default();

    match scanner::scan_directory(&projects_path, &options).await {
        Ok(mut projects) => {
            // Enrich with git info
            git::enrich_projects_with_git_info(&mut projects).await;

            // Load tags for each project
            for project in &mut projects {
                if let Ok(project_tags) = tags::get_project_tags(&project.id).await {
                    project.tags = Some(project_tags);
                }
            }

            // Sort by last_modified descending
            projects.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));

            let total = projects.len();
            Ok(ProjectListResponse {
                projects,
                total,
                scanned_at: chrono::Utc::now().to_rfc3339(),
            })
        }
        Err(e) => Err(format!("Failed to scan projects: {}", e)),
    }
}

#[tauri::command]
async fn get_project(id: String) -> Result<Option<scanner::Project>, String> {
    let projects_path = config::get_projects_path();
    let options = ScanOptions::default();

    match scanner::scan_directory(&projects_path, &options).await {
        Ok(projects) => {
            if let Some(mut project) = projects.into_iter().find(|p| p.id == id) {
                // Enrich with git info
                if let Some(git_info) = git::get_git_status(&project.path).await {
                    project.status = git::determine_project_status(
                        Some(&git_info),
                        &project.last_modified,
                    );
                    project.git_info = Some(git_info);
                }

                // Load tags
                if let Ok(project_tags) = tags::get_project_tags(&project.id).await {
                    project.tags = Some(project_tags);
                }

                // Load README
                if let Ok(readme) = scanner::get_readme_content(&project.path).await {
                    project.readme_content = readme;
                }

                // Get remote URL
                if let Some(url) = git::get_git_remote_url(&project.path).await {
                    project.git_remote_url = Some(url);
                }

                Ok(Some(project))
            } else {
                Ok(None)
            }
        }
        Err(e) => Err(format!("Failed to find project: {}", e)),
    }
}

#[tauri::command]
async fn refresh_projects() -> RefreshResult {
    let projects_path = config::get_projects_path();
    let options = ScanOptions::default();

    match scanner::scan_directory(&projects_path, &options).await {
        Ok(mut projects) => {
            git::enrich_projects_with_git_info(&mut projects).await;
            let count = projects.len();
            RefreshResult {
                success: true,
                message: format!("Successfully refreshed {} projects", count),
                project_count: Some(count),
            }
        }
        Err(e) => RefreshResult {
            success: false,
            message: format!("Failed to refresh: {}", e),
            project_count: None,
        },
    }
}

#[tauri::command]
async fn open_in_finder(path: String) -> AppResult {
    shell::open_in_finder(&path).await
}

#[tauri::command]
async fn open_in_terminal(path: String) -> AppResult {
    shell::open_in_terminal(&path).await
}

#[tauri::command]
async fn open_in_vscode(path: String) -> AppResult {
    shell::open_in_vscode(&path).await
}

#[tauri::command]
async fn open_in_browser(url: String) -> AppResult {
    shell::open_in_browser(&url).await
}

#[tauri::command]
async fn add_project_tag(project_id: String, tag: String) -> TagResult {
    match tags::add_tag_to_project(&project_id, &tag).await {
        Ok(()) => match tags::get_project_tags(&project_id).await {
            Ok(updated_tags) => TagResult {
                success: true,
                message: format!("Tag \"{}\" added to project", tag),
                tags: Some(updated_tags),
            },
            Err(e) => TagResult {
                success: true,
                message: format!("Tag added but failed to get updated tags: {}", e),
                tags: None,
            },
        },
        Err(e) => TagResult {
            success: false,
            message: format!("Failed to add tag: {}", e),
            tags: None,
        },
    }
}

#[tauri::command]
async fn remove_project_tag(project_id: String, tag: String) -> TagResult {
    match tags::remove_tag_from_project(&project_id, &tag).await {
        Ok(()) => match tags::get_project_tags(&project_id).await {
            Ok(updated_tags) => TagResult {
                success: true,
                message: format!("Tag \"{}\" removed from project", tag),
                tags: Some(updated_tags),
            },
            Err(e) => TagResult {
                success: true,
                message: format!("Tag removed but failed to get updated tags: {}", e),
                tags: None,
            },
        },
        Err(e) => TagResult {
            success: false,
            message: format!("Failed to remove tag: {}", e),
            tags: None,
        },
    }
}

#[tauri::command]
async fn get_all_tags() -> Result<Vec<String>, String> {
    tags::get_all_tags().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_readme_content(project_path: String) -> Result<Option<String>, String> {
    scanner::get_readme_content(&project_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_git_remote_url(project_path: String) -> Option<String> {
    git::get_git_remote_url(&project_path).await
}

#[tauri::command]
async fn get_app_settings() -> Result<config::AppSettings, String> {
    config::get_app_settings().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_app_settings(projects_path: Option<String>) -> Result<config::AppSettings, String> {
    let mut settings = config::get_app_settings()
        .await
        .map_err(|e| e.to_string())?;

    if let Some(path) = projects_path {
        settings.projects_path = path;
    }

    config::save_app_settings(&settings)
        .await
        .map_err(|e| e.to_string())?;

    Ok(settings)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_projects,
            get_project,
            refresh_projects,
            open_in_finder,
            open_in_terminal,
            open_in_vscode,
            open_in_browser,
            add_project_tag,
            remove_project_tag,
            get_all_tags,
            get_readme_content,
            get_git_remote_url,
            get_app_settings,
            update_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
