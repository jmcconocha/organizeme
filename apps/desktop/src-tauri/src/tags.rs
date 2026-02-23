use anyhow::Result;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use tokio::fs;

/// Returns the path to the organizeMe configuration directory.
fn get_config_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".organizeme")
}

/// Returns the path to the project tags JSON file.
fn get_tags_file() -> PathBuf {
    get_config_dir().join("project-tags.json")
}

/// Maps project IDs to their array of tags.
type ProjectTagsData = HashMap<String, Vec<String>>;

/// Ensures the configuration directory exists, creating it if necessary.
async fn ensure_config_directory() -> Result<()> {
    let config_dir = get_config_dir();
    fs::create_dir_all(&config_dir).await?;
    Ok(())
}

/// Loads all project tags from the storage file.
async fn load_project_tags() -> Result<ProjectTagsData> {
    let tags_file = get_tags_file();

    match fs::read_to_string(&tags_file).await {
        Ok(content) => {
            let data: ProjectTagsData = serde_json::from_str(&content)?;
            Ok(data)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(HashMap::new()),
        Err(e) => Err(e.into()),
    }
}

/// Saves all project tags to the storage file.
async fn save_project_tags(data: &ProjectTagsData) -> Result<()> {
    ensure_config_directory().await?;
    let tags_file = get_tags_file();
    let content = serde_json::to_string_pretty(data)?;
    fs::write(&tags_file, content).await?;
    Ok(())
}

/// Gets the tags for a specific project.
pub async fn get_project_tags(project_id: &str) -> Result<Vec<String>> {
    let all_tags = load_project_tags().await?;
    Ok(all_tags.get(project_id).cloned().unwrap_or_default())
}

/// Gets all unique tags across all projects, sorted alphabetically.
pub async fn get_all_tags() -> Result<Vec<String>> {
    let all_tags = load_project_tags().await?;
    let mut tag_set = HashSet::new();

    for tags in all_tags.values() {
        for tag in tags {
            tag_set.insert(tag.clone());
        }
    }

    let mut tags: Vec<String> = tag_set.into_iter().collect();
    tags.sort();
    Ok(tags)
}

/// Adds a tag to a project. Does not duplicate if already present.
pub async fn add_tag_to_project(project_id: &str, tag: &str) -> Result<()> {
    let mut all_tags = load_project_tags().await?;
    let project_tags = all_tags
        .entry(project_id.to_string())
        .or_insert_with(Vec::new);

    if !project_tags.contains(&tag.to_string()) {
        project_tags.push(tag.to_string());
    }

    save_project_tags(&all_tags).await
}

/// Removes a tag from a project.
pub async fn remove_tag_from_project(project_id: &str, tag: &str) -> Result<()> {
    let mut all_tags = load_project_tags().await?;

    if let Some(project_tags) = all_tags.get_mut(project_id) {
        project_tags.retain(|t| t != tag);

        if project_tags.is_empty() {
            all_tags.remove(project_id);
        }
    }

    save_project_tags(&all_tags).await
}
