# Roadmap

## Phase 1 – Foundations
- Shared schema/migrations; minimal FastAPI; Projects/Notes CRUD; basic SPA pages; local auth.
- Acceptance: CRUD works; migrations shared; p95 read < 300 ms.
- Tests: Unit tests for models/DTOs; API contract; UI components; auth flow.

## Phase 2 – Git Integrations
- Repo linking; OAuth; background scans; activity timeline; git state and PRs.
- Acceptance: Repo connect via OAuth; scan populates activity/git state; tokens encrypted.
- Tests: Mocked GitHub integration; scheduler; rate limiting; RBAC.

## Phase 3 – Portfolio Insights
- Tech/domain editor; filters; dashboards; AI tools per project; admin metrics; accessibility.
- Acceptance: Filter by domain/tech; view AI tools; AA audit passes.
- Tests: E2E flows; performance of lists; accessibility checks; pagination.

## Phase 4 – Operability & Scale
- Observability, backups, security hardening; Postgres migration path; webhooks (optional).
- Acceptance: Health checks/alerts/backups; CSP/CSRF; worker stability; migration guide.
- Tests: Resiliency; backup/restore drills; security scans; load tests.

## Risks & Mitigations
- SQLite write contention → single-writer + WAL; Postgres path.
- Provider rate limits → batching/backoff; caching; quotas.
- Token security → encryption, rotation, access controls.
- Schema drift between CLI/API → shared migrations and version checks.
