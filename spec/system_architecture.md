# System Architecture

## High-Level
- React/Vite SPA → FastAPI REST → SQLite (WAL) shared with CLI.
- Background worker (APScheduler) performing scans and PR/branch sync.
- Optional GitHub OAuth integration for per-user tokens.

## Components
- Frontend: React/Vite SPA, React Router, fetch API.
- Backend: FastAPI, SQLAlchemy, Pydantic; httpx for GitHub.
- Worker: APScheduler or dedicated process; idempotent jobs.
- Database: SQLite with WAL; Alembic migrations shared with CLI.
- CLI: Existing tool writing/reading same DB.

## Data Flows
- UI requests → API → DB; cached responses for hot endpoints.
- OAuth login → provider → token stored encrypted → used for GitHub calls.
- Scheduled scans → fetch repo/PR state → normalize → persist.
- CLI updates → reflected in UI via shared DB.

## Concurrency & Consistency
- WAL mode enabled; short transactions; single-writer discipline.
- API write queue for heavy mutations; backoff/retry on contention.
- Idempotent job design; deduplicate by project+scope.

## Migrations Sharing
- Alembic migrations in one directory; `schema_version` table.
- API applies pending migrations on startup; CLI respects version.

## Integrations
- GitHub REST/GraphQL via httpx; rate-limited.
- Optional notifications (future); webhooks later.

## Configuration
- Env-driven: `DATABASE_URL`, `SESSION_SECRET`, OAuth client IDs, rate limits, scan cadence.
