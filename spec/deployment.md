# Deployment

## Topology (Docker Compose)
- Services: `frontend` (React/Vite), `api` (FastAPI), `worker` (scanner), `reverse-proxy`, `db` (SQLite via volume).
- Shared DB volume; network isolation; health checks.

## Env Vars
- `APP_ENV`, `DATABASE_URL`, `SESSION_SECRET`, `OAUTH_CLIENT_ID/SECRET`, `RATE_LIMIT_*`, `SCAN_INTERVAL_MINUTES`, `CORS_ORIGIN`.

## Health & Readiness
- API: `/healthz`, `/readyz`; frontend asset check; worker heartbeat.

## TLS & Secrets
- Reverse proxy with Let’s Encrypt; automatic renewals; Docker secrets/volumes; strict permissions.

## Scaling & Resilience
- Horizontal scale for frontend and API reads; single-writer pattern for SQLite.
- Graceful shutdown; blue/green upgrades; migration checks at startup.

## Observability
- Metrics (requests, job latency), tracing, logs; alerts on SLO violations.

## Backup & Restore
- Nightly SQLite backup (WAL-safe); retention policy; restore runbook and verification.

## Postgres Path (Phase 4)
- Document migration steps to Postgres for higher write concurrency.

---

## Docker Compose Specification (Detailed)

### Compose Goals
- Containerize `api`, `frontend`, and `worker` with a reverse proxy and a shared SQLite data volume.
- Enforce health checks, environment configuration, secrets management, and WAL-enabled SQLite access.
- Ensure migrations run at `api` startup; background scans run in `worker` with bounded concurrency.

### Directory Layout (planned)
- [web/api](web/api): FastAPI app, Alembic migrations, Dockerfile
- [web/ui](web/ui): React/Vite app, Dockerfile
- [web/api/worker](web/api/worker): scanner entrypoint
- [compose/](compose): reverse proxy config (Traefik or Nginx), TLS certs (mounted), optional scripts
- [data/ppm.db](data/ppm.db): SQLite DB file (mounted as a volume)

### Example docker-compose.yml (spec example)
```yaml
version: "3.9"

services:
	api:
		build:
			context: ./web/api
			dockerfile: Dockerfile
		image: ppm-api:latest
		container_name: ppm_api
		environment:
			APP_ENV: production
			# SQLite path inside container; WAL enabled by app config
			DATABASE_URL: sqlite:////app/data/ppm.db
			SESSION_SECRET: ${SESSION_SECRET}
			CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:5173}
			SCAN_INTERVAL_MINUTES: ${SCAN_INTERVAL_MINUTES:-60}
			RATE_LIMIT_PER_MINUTE: ${RATE_LIMIT_PER_MINUTE:-120}
			OAUTH_CLIENT_ID: ${OAUTH_CLIENT_ID:-}
			OAUTH_CLIENT_SECRET: ${OAUTH_CLIENT_SECRET:-}
		volumes:
			- ppm_data:/app/data
		depends_on:
			- reverse-proxy
		ports:
			- "8000:8000"
		healthcheck:
			test: ["CMD", "curl", "-fsS", "http://localhost:8000/healthz"]
			interval: 20s
			timeout: 5s
			retries: 5
		command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
		restart: unless-stopped

	worker:
		build:
			context: ./web/api
			dockerfile: Dockerfile
		image: ppm-worker:latest
		container_name: ppm_worker
		environment:
			APP_ENV: production
			DATABASE_URL: sqlite:////app/data/ppm.db
			SESSION_SECRET: ${SESSION_SECRET}
			RATE_LIMIT_PER_MINUTE: ${RATE_LIMIT_PER_MINUTE:-120}
		volumes:
			- ppm_data:/app/data
		depends_on:
			- api
		healthcheck:
			test: ["CMD", "python", "-c", "import sys; sys.exit(0)"]
			interval: 60s
			timeout: 5s
			retries: 3
		command: ["python", "-m", "worker.scanner"]
		restart: unless-stopped

	frontend:
		build:
			context: ./web/ui
			dockerfile: Dockerfile
		image: ppm-frontend:latest
		container_name: ppm_frontend
		environment:
			VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8000}
		depends_on:
			- api
		ports:
			- "5173:5173"
		healthcheck:
			test: ["CMD", "curl", "-fsS", "http://localhost:5173"]
			interval: 20s
			timeout: 5s
			retries: 5
		restart: unless-stopped

	reverse-proxy:
		image: traefik:2.11
		container_name: ppm_proxy
		command:
			- "--api.insecure=true"
			- "--providers.docker=true"
			- "--entrypoints.web.address=:80"
			- "--entrypoints.websecure.address=:443"
			- "--certificatesresolvers.le.acme.httpChallenge.entryPoint=web"
			- "--certificatesresolvers.le.acme.email=${LETSENCRYPT_EMAIL:-dev@example.com}"
			- "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json"
		ports:
			- "80:80"
			- "443:443"
		volumes:
			- "/var/run/docker.sock:/var/run/docker.sock:ro"
			- "traefik_letsencrypt:/letsencrypt"
		restart: unless-stopped

volumes:
	ppm_data:
		name: ppm_data
	traefik_letsencrypt:
		name: traefik_letsencrypt
```

Notes:
- SQLite is a file, not a server; `ppm_data` mounts the DB file into both `api` and `worker`.
- For macOS dev, you may prefer a bind mount: `./data:/app/data` instead of a named volume.
- Traefik is shown; Nginx can be used instead. In dev, you can omit `reverse-proxy`.

### Service Responsibilities
- `api`: Runs FastAPI, applies pending Alembic migrations on startup, serves `/healthz` and `/readyz`.
- `worker`: Runs background scans (APScheduler or loop), respects rate limits and WAL constraints.
- `frontend`: Serves Vite dev server in development; for production, consider pre-building and serving via Nginx.
- `reverse-proxy`: Terminates TLS, routes `/api` to `api` and `/` to `frontend` (labels or config as needed).

### Environment Variables (expanded)
- `APP_ENV`: `development|production` — toggles debug/log levels.
- `DATABASE_URL`: `sqlite:////app/data/ppm.db` — path to shared SQLite DB.
- `SESSION_SECRET`: random base64 secret for signing sessions/JWT.
- `CORS_ORIGIN`: allowed origin for SPA (e.g., `http://localhost:5173`).
- `SCAN_INTERVAL_MINUTES`: default scan cadence (e.g., `60`).
- `RATE_LIMIT_PER_MINUTE`: API per-user/ip limit.
- `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET`: GitHub OAuth credentials.
- `LETSENCRYPT_EMAIL`: email for ACME certs when Traefik is used.
- `VITE_API_BASE_URL`: SPA env pointing to API base URL.

### Secrets Management
- Use Docker secrets or mounted files for `SESSION_SECRET`, `OAUTH_*`. Example (Compose v3 secrets):
	- Define secrets in Compose and mount into `api` at `/run/secrets/session_secret`, read on startup.
- Never bake secrets into images; avoid plaintext in env during production.

### Health Checks & Graceful Shutdown
- `api` exposes `/healthz` (basic) and `/readyz` (DB reachable, migrations applied).
- `worker` sets a heartbeat (e.g., writes timestamp to `job_runs` table); shutdown drains in-flight scans.
- `frontend` basic HTTP check; consider static asset preflight in production.

### Networking & Routing
- In dev, access `api` on `localhost:8000`, `frontend` on `localhost:5173`.
- In prod, reverse proxy routes `https://host/` → `frontend`, `https://host/api` → `api`.
- Configure Traefik labels or Nginx location blocks accordingly.

### Build & Dockerfiles (spec outline)
- [web/api/Dockerfile](web/api/Dockerfile):
	- Base: `python:3.12-slim`
	- Install system deps (curl), copy app, install `requirements.txt`, set `PYTHONUNBUFFERED=1`
	- Enable SQLite WAL via app config; run `uvicorn` or `gunicorn` entrypoint
- [web/ui/Dockerfile](web/ui/Dockerfile):
	- Base: `node:22-alpine`
	- Install deps, `npm run dev` (dev) or `npm run build` + serve (prod)
- Worker uses the same `api` image with a different command: `python -m worker.scanner`

### Migrations
- Alembic migrations directory shared; `api` applies migrations on startup if pending.
- Pre-migration backup (`.backup` or file snapshot) to prevent accidental corruption.

### Backup & Restore (implementation notes)
- Backup: `sqlite3 /app/data/ppm.db ".backup '/app/data/backups/ppm-$(date +%F).db'"`
- Restore: Stop services, replace `ppm.db` with backup, ensure WAL files (`-wal`, `-shm`) consistency.

### Scaling & Limits
- SQLite single-writer: keep writes short, batch in `worker` where possible.
- Horizontal scale `frontend`; `api` scales reads, but writes must be coordinated (consider Postgres in Phase 4).

### Dev vs Prod Modes
- Dev: Run without proxy; bind mounts; Vite dev server; hot reload.
- Prod: Pre-build frontend; serve behind proxy; enable TLS; configure secrets via Docker secrets.
