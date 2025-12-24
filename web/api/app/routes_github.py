"""GitHub OAuth endpoints for connecting user accounts"""

import os
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.security import create_access_token, verify_token, encrypt_token

router = APIRouter(prefix="/api/github", tags=["github"])

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv(
    "GITHUB_OAUTH_REDIRECT_URI",
    "http://localhost:8000/api/github/oauth/callback",
)
GITHUB_OAUTH_SCOPES = os.getenv("GITHUB_OAUTH_SCOPES", "read:user repo")


def _require_oauth_config():
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth is not configured (missing client id/secret)",
        )


@router.get("/oauth/start")
async def github_oauth_start(
    return_to: str = Query(None, description="URL to redirect to after success"),
    current_user: User = Depends(get_current_user),
):
    """Return GitHub OAuth authorize URL with signed state."""
    _require_oauth_config()

    state = create_access_token(
        {"user_id": current_user.id, "action": "github_oauth", "return_to": return_to},
        expires_delta=timedelta(minutes=10),
    )

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": GITHUB_OAUTH_SCOPES,
        "state": state,
        "allow_signup": "false",
    }
    authorize_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return {"authorization_url": authorize_url, "state": state}


@router.get("/oauth/callback")
async def github_oauth_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """Handle GitHub OAuth callback, exchange code for token, and store it."""
    _require_oauth_config()

    payload = verify_token(state)
    if not payload or payload.get("action") != "github_oauth":
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="State missing user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            timeout=10,
        )
    if token_resp.status_code >= 400:
        raise HTTPException(status_code=400, detail="Failed to exchange code")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token returned")

    # Fetch GitHub user info to store username
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Accept": "application/vnd.github.v3+json",
                "Authorization": f"token {access_token}",
            },
            timeout=10,
        )
    if user_resp.status_code >= 400:
        raise HTTPException(status_code=400, detail="Failed to fetch GitHub user")

    gh_user = user_resp.json()
    user.github_username = gh_user.get("login")
    user.github_token = encrypt_token(access_token)
    db.commit()
    db.refresh(user)

    return_to = payload.get("return_to")
    if return_to:
        redirect_url = f"{return_to}{'&' if '?' in return_to else '?'}github_connected=1&github_username={user.github_username or ''}"
        return RedirectResponse(url=redirect_url)

    return {
        "connected": True,
        "github_username": user.github_username,
        "scope": token_data.get("scope", ""),
        "token_type": token_data.get("token_type", ""),
    }
