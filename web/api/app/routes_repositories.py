"""Repository endpoints for linking GitHub repos to projects"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Repository, Project, User, Activity
from app.schemas import Repository as RepositorySchema, RepositoryCreate, Activity as ActivitySchema
from app.dependencies import get_current_user
from app.github_client import GitHubClient, parse_repo_full_name
from app.security import decrypt_token
from app.services_sync import sync_repository
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/api/repositories", tags=["repositories"])


def _github_client_for(user: User) -> GitHubClient:
    """Return a GitHub client using the user's token if configured."""
    return GitHubClient(token=decrypt_token(user.github_token))

@router.post("", response_model=RepositorySchema)
async def link_repository(
    repo_data: RepositoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link a GitHub repository to a project"""
    # Verify project exists and belongs to current user
    project = db.query(Project).filter(
        Project.id == repo_data.project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Parse full_name
    try:
        owner, repo_name = parse_repo_full_name(repo_data.full_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Fetch repo info from GitHub
    github = _github_client_for(current_user)
    repo_info = await github.get_repository(owner, repo_name)
    if not repo_info:
        raise HTTPException(status_code=404, detail="Repository not found on GitHub")
    
    # Check if already linked
    existing = db.query(Repository).filter(
        Repository.github_id == str(repo_info["id"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Repository already linked")
    
    # Create repository record
    db_repo = Repository(
        project_id=repo_data.project_id,
        owner_id=current_user.id,
        github_id=str(repo_info["id"]),
        name=repo_info["name"],
        full_name=repo_info["full_name"],
        url=repo_info["html_url"],
        description=repo_info.get("description"),
        language=repo_info.get("language"),
        stars=repo_info.get("stargazers_count", 0),
        forks=repo_info.get("forks_count", 0),
        open_issues=repo_info.get("open_issues_count", 0),
        last_synced=datetime.utcnow()
    )
    db.add(db_repo)
    db.commit()
    db.refresh(db_repo)
    return db_repo

@router.get("/project/{project_id}", response_model=List[RepositorySchema])
async def list_project_repositories(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all repositories linked to a project"""
    # Verify project exists and belongs to current user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    repos = db.query(Repository).filter(
        Repository.project_id == project_id
    ).all()
    return repos

@router.delete("/{repo_id}")
async def unlink_repository(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unlink a repository from a project"""
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.owner_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    db.delete(repo)
    db.commit()
    return {"deleted": True}

@router.post("/{repo_id}/sync")
async def sync_repository(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync repository data from GitHub (commits, PRs, releases)"""
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.owner_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    await sync_repository(db, repo, current_user)
    return {"synced": True, "repository": repo}

@router.get("/{repo_id}/activities", response_model=List[ActivitySchema])
async def list_repository_activities(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50
):
    """List all activities for a repository"""
    repo = db.query(Repository).filter(
        Repository.id == repo_id,
        Repository.owner_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    activities = db.query(Activity).filter(
        Activity.repository_id == repo_id
    ).order_by(Activity.timestamp.desc()).limit(limit).all()
    return activities
