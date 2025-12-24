# Security Spec

## Authentication
- Local auth (email/password, Argon2id); optional GitHub OAuth.
- Session cookies (`HttpOnly`, `Secure`, `SameSite=Lax`) and JWT for API clients.

## Authorization
- RBAC roles: admin, member, viewer.
- Resource-level permissions (project owner, collaborators).

## Secrets Handling
- Encrypt tokens at rest (libsodium/Fernet); rotate keys; never log secrets.

## CSRF/CORS
- CSRF for cookie flows; CORS allowlist; deny wildcards in production.

## Rate Limiting & Abuse Prevention
- Sliding window per-IP/user; backoff; GitHub call quotas.

## Logging & Auditing
- Structured JSON logs; correlation IDs; audit sensitive actions; PII redaction.

## Transport Security
- TLS termination at reverse proxy; HSTS; secure cookies; Content-Security-Policy.

## Dependency & Runtime Security
- SCA scans; pinned versions; non-root containers; regular updates.
