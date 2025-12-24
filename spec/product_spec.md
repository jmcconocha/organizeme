# Project Portfolio Manager — Product Spec

## Overview
- Purpose: Centralize tracking of diverse software projects (domains, tech stacks, git state, activity, notes, AI tool usage) with a fast web UI and CLI.
- Audience: Individual developer and small teams managing multiple repos across domains.
- Value: Rapid context recovery, metadata-rich filtering, PR/branch visibility, and cross-project insights.

## Goals
- Track key metadata per project: domain, tech stack, git state (branch/PR), activity timeline, notes, AI tools used.
- Provide fast portfolio dashboard with powerful filters and search.
- Integrate with GitHub (optional OAuth) to fetch PRs/branches and recent activity.
- Share the same SQLite schema with the existing CLI; background scanning jobs keep data fresh.

## Personas
- Developer: Needs quick status, last activity, and notes to resume work.
- Tech Lead: Monitors active feature branches/PRs across repos.
- Project Manager: Views progress, phase (MVP/Production), and activity trends.
- Admin/Security: Ensures tokens and permissions are handled correctly.

## Success Metrics
- MAU of dashboard; average time-to-context < 10s.
- % projects with tech/domain tags; % projects linked to repos.
- Scan freshness: 90% repos updated within 60 minutes.
- Error rate < 0.5% on API; p95 read latency < 300 ms.

## Core Features
- Project registry with CRUD and repo linking.
- Tech stack + domain tagging; filters and search.
- Git state view (branch, PRs, ahead/behind, last commit).
- Activity timeline (commits/PR events/scans).
- Notes per project; AI tool usage records per project.
- Background scanning jobs; manual refresh triggers.
- Per-user dashboard and settings.

## Non-Functional Requirements
- Performance: p95 < 300 ms on common reads; pagination on lists.
- Reliability: Job retries with backoff; health checks; backups.
- Security: OAuth tokens encrypted; RBAC; CSRF/CORS; audit logging.
- Accessibility: WCAG 2.2 AA; keyboard navigation and ARIA.
- Operability: Metrics, logs, alerts; simple Docker deployment.

## Out of Scope (Initial)
- Non-Git providers beyond GitHub.
- Issue/task tracking; CI orchestration.
- Billing/multi-tenant SaaS.

## Glossary
- Domain, Tech Stack, Git State, Activity, Notes, AI Tool, Scan, RBAC, OAuth, WAL, SLO/SLA.
