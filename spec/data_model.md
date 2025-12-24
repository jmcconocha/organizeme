# Data Model

## Tables
- users(id, email, name, role, created_at, last_login_at)
- projects(id, name, domain, phase, complexity, tags_json, owner_id, visibility, created_at, updated_at)
- repos(id, project_id, provider, repo_slug, default_branch, linked_at)
- git_state(id, project_id, branch, ahead, behind, dirty, last_commit_at, updated_at)
- pull_requests(id, project_id, number, title, state, url, created_at, updated_at)
- tech_stack(id, project_id, language, framework, database, cloud, libraries_json)
- notes(id, project_id, author_id, content, tags_json, created_at, updated_at)
- activity(id, project_id, type, actor, source, occurred_at, payload_json)
- api_tokens(id, user_id, provider, token_encrypted, scopes, expires_at, created_at, last_used_at)
- scans(id, initiator, scope, status, started_at, completed_at, summary_json)
- settings(id, user_id, preferences_json, timezone)

## Relationships
- users 1..* projects; projects 1..* repos/notes/activity/tech_stack/pull_requests/git_state.

## Indexes
- FKs; activity(project_id, occurred_at);
- git_state(project_id, branch) unique; repos(project_id, provider, repo_slug) unique.
- notes FTS on content and tags.

## Constraints
- Not-null ownership; unique project names per owner; enum validation on `phase`, `state`.

## Migration Strategy
- Alembic migrations shared between CLI and API; `schema_version` table.
- Backward-compatible changes; pre-migration backups; rollback plans.

## SQLite Settings
- WAL enabled; vacuum periodically; short transactions; connection pooling tuned for SQLite.
