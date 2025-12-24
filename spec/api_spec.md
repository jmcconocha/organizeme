# API Spec

## Auth
- Local sessions (cookie) and optional GitHub OAuth.
- JWT for API clients; session cookies for SPA; CSRF protection.

## Pagination & Filtering
- Cursor-based pagination: `limit`, `cursor`; filters: `status`, `domain`, `tech`, `tags`, `owner`, `updatedAfter/Before`.

## Errors
- `application/problem+json` with fields: `type`, `title`, `status`, `detail`, `instance`, `code`.

## Endpoints (v1)
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/github/callback`.
- Projects: `GET /api/projects`, `POST /api/projects`, `GET /api/projects/{id}`, `PATCH /api/projects/{id}`, `DELETE /api/projects/{id}`.
- Repos: `GET /api/projects/{id}/repos`, `POST /api/projects/{id}/repos`.
- Git State: `GET /api/projects/{id}/git`, `POST /api/projects/{id}/git/refresh`.
- PRs: `GET /api/projects/{id}/prs`, `POST /api/projects/{id}/prs/refresh`.
- Tech Stack & Domain: `GET/PUT /api/projects/{id}/tech-stack`, `GET/PUT /api/projects/{id}/domain`.
- Notes: `GET /api/projects/{id}/notes`, `POST /api/projects/{id}/notes`, `PATCH /api/notes/{noteId}`, `DELETE /api/notes/{noteId}`.
- Activity: `GET /api/projects/{id}/activity`, `GET /api/activity`.
- Scans: `POST /api/scan`, `POST /api/projects/{id}/scan`, `GET /api/scans`.
- Tokens: `GET /api/tokens/github`, `POST /api/tokens/github`, `DELETE /api/tokens/github/{id}`.
- Users/Settings: `GET /api/users/me`, `GET/PUT /api/settings`.

## DTOs
- Project: `id`, `name`, `domain`, `phase`, `complexity`, `tags`, `owner`, `createdAt`, `updatedAt`.
- Repo: `provider`, `slug`, `defaultBranch`, `linkedAt`.
- GitState: `branch`, `ahead`, `behind`, `dirty`, `lastCommitAt`.
- PR: `number`, `title`, `state`, `createdAt`, `updatedAt`, `url`.
- TechStack: `language`, `framework`, `database`, `cloud`, `libraries`.
- Activity: `type`, `actor`, `occurredAt`, `payload`.

## Versioning & Caching
- Media type: `application/vnd.ppm.v1+json`; ETags for GET; idempotency keys for POST.

## Rate Limiting
- Per-IP and per-user; `429` with `Retry-After` header.
