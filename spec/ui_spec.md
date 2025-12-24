# UI Spec

## Pages
- Dashboard: portfolio overview, quick filters, recent activity.
- Projects List: filters (domain, tech, status), pagination.
- Project Detail: tabs (Overview, Git State, PRs, Activity, Notes, AI Tools, Settings).
- Auth: Login, OAuth callback.
- Settings: User preferences and token management.
- Admin: Metrics and health.

## Components
- ProjectCard, FiltersBar, TechStackEditor, DomainTag, BranchPRTable,
  ActivityTimeline, NotesEditor, AIToolsList, TokenManager, ScanStatusBadge,
  Pagination, SortDropdown, Toast, Modal, ConfirmDialog.

## States
- Loading, empty, error; optimistic updates; background scan states (queued/running/success/failure).

## Routing
- React Router: `/`, `/projects`, `/projects/:id`, `/settings`, `/admin`; protected routes.

## UX Flows
- Create project; link repo; OAuth flow; trigger scan; edit tech/domain;
  add notes and AI tools; filter/sort lists; view activity timeline.

## Accessibility
- WCAG 2.2 AA; keyboard navigation; ARIA roles; focus management;
  high-contrast theme; form labels and error summaries.
