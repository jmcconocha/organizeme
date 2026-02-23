use crate::scanner::{GitInfoData, Project};
use git2::Repository;

/// Converts a git remote URL (SSH or HTTPS) to an HTTPS URL for browser opening.
fn convert_remote_url(url: &str) -> String {
    if url.starts_with("git@") {
        // git@github.com:user/repo.git -> https://github.com/user/repo
        let url = url.strip_prefix("git@").unwrap_or(url);
        let url = url.replace(':', "/");
        let url = format!("https://{}", url);
        url.trim_end_matches(".git").to_string()
    } else {
        url.trim_end_matches(".git").to_string()
    }
}

/// Determines the project status based on git info and last modified date.
pub fn determine_project_status(git_info: Option<&GitInfoData>, last_modified: &str) -> String {
    if let Some(info) = git_info {
        if info.is_dirty {
            return "dirty".to_string();
        }

        // Use last commit date or last_modified for activity check
        let reference_date = info
            .last_commit_date
            .as_deref()
            .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
            .map(|d| d.with_timezone(&chrono::Utc));

        let fallback_date = chrono::DateTime::parse_from_rfc3339(last_modified)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc));

        let ref_date = reference_date.or(fallback_date);

        if let Some(date) = ref_date {
            let days = (chrono::Utc::now() - date).num_days();
            if days <= 7 {
                return "active".to_string();
            } else if days > 30 {
                return "stale".to_string();
            }
        }

        return "clean".to_string();
    }

    // No git info - use last_modified
    if let Ok(date) = chrono::DateTime::parse_from_rfc3339(last_modified) {
        let days = (chrono::Utc::now() - date.with_timezone(&chrono::Utc)).num_days();
        if days <= 7 {
            return "active".to_string();
        } else if days > 30 {
            return "stale".to_string();
        }
    }

    "unknown".to_string()
}

/// Gets git status for a project directory asynchronously.
pub async fn get_git_status(project_path: &str) -> Option<GitInfoData> {
    let path = project_path.to_string();

    // Run git2 operations in a blocking task since git2 is synchronous
    tokio::task::spawn_blocking(move || get_git_status_sync(&path))
        .await
        .ok()
        .flatten()
}

/// Synchronous implementation of git status retrieval using libgit2.
fn get_git_status_sync(project_path: &str) -> Option<GitInfoData> {
    let repo = Repository::open(project_path).ok()?;

    // Get current branch
    let head = repo.head().ok()?;
    let branch = head.shorthand().unwrap_or("HEAD").to_string();

    // Get status
    let statuses = repo.statuses(None).ok()?;
    let uncommitted_changes = statuses.len();
    let is_dirty = uncommitted_changes > 0;

    // Get ahead/behind
    let (ahead_by, behind_by) = get_ahead_behind(&repo, &head);

    // Get last commit
    let (last_commit_date, last_commit_message) = get_last_commit_info(&repo);

    Some(GitInfoData {
        branch,
        is_dirty,
        uncommitted_changes,
        ahead_by,
        behind_by,
        last_commit_date,
        last_commit_message,
    })
}

/// Gets the ahead/behind count relative to the upstream branch.
fn get_ahead_behind(repo: &Repository, head: &git2::Reference) -> (usize, usize) {
    let head_oid = match head.target() {
        Some(oid) => oid,
        None => return (0, 0),
    };

    // Try to find the upstream branch
    let branch_name = match head.shorthand() {
        Some(name) => name.to_string(),
        None => return (0, 0),
    };

    let upstream_name = format!("refs/remotes/origin/{}", branch_name);
    let upstream_oid = match repo.refname_to_id(&upstream_name) {
        Ok(oid) => oid,
        Err(_) => return (0, 0),
    };

    repo.graph_ahead_behind(head_oid, upstream_oid)
        .unwrap_or((0, 0))
}

/// Gets the last commit date and message from the repository.
fn get_last_commit_info(repo: &Repository) -> (Option<String>, Option<String>) {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return (None, None),
    };

    let commit = match head.peel_to_commit() {
        Ok(c) => c,
        Err(_) => return (None, None),
    };

    let time = commit.time();
    let secs = time.seconds();
    let date = chrono::DateTime::from_timestamp(secs, 0).map(|d| d.to_rfc3339());

    let message = commit.message().map(|m| m.trim().to_string());

    (date, message)
}

/// Enriches a list of projects with git information concurrently.
pub async fn enrich_projects_with_git_info(projects: &mut Vec<Project>) {
    let futures: Vec<_> = projects
        .iter()
        .map(|p| {
            let path = p.path.clone();
            let last_modified = p.last_modified.clone();
            async move {
                let git_info = get_git_status(&path).await;
                let status = determine_project_status(git_info.as_ref(), &last_modified);
                (git_info, status)
            }
        })
        .collect();

    let results: Vec<_> = futures::future::join_all(futures).await;

    for (project, (git_info, status)) in projects.iter_mut().zip(results) {
        if git_info.is_some() {
            project.git_info = git_info;
            project.status = status;
        }
    }
}

/// Gets the git remote URL for a project directory asynchronously.
pub async fn get_git_remote_url(project_path: &str) -> Option<String> {
    let path = project_path.to_string();

    tokio::task::spawn_blocking(move || get_git_remote_url_sync(&path))
        .await
        .ok()
        .flatten()
}

/// Synchronous implementation of git remote URL retrieval.
fn get_git_remote_url_sync(project_path: &str) -> Option<String> {
    let repo = Repository::open(project_path).ok()?;
    let remote = repo.find_remote("origin").ok()?;
    let url = remote.url()?.to_string();

    Some(convert_remote_url(&url))
}
