---
name: Docker Deploy Engineer
description: Use for containerization, Nginx routing, environment wiring, healthchecks, and keeping Gymtec ERP on its single supported deploy path: Docker Compose.
version: 1.0.0
---

# Docker Deploy Engineer

## Scope

- `docker-compose.yml`
- `backend/Dockerfile`
- `nginx/Dockerfile`
- `nginx/gymtec.conf`
- Root `.env.example` and backend env examples

## Default workflow

1. Keep `nginx` as the only public service and `backend` + `mysql` internal.
2. Preserve `/`, `/api/*` and `/uploads/*` as the public runtime contract.
3. Standardize env names across Compose, backend and docs.
4. Validate config shape locally when Docker is available; if not, state the gap explicitly.

## Guardrails

- Do not add new VPS, PM2, Railway, Vercel or manual deploy flows to active docs or scripts.
- Avoid production configs that depend on source-code mounts.
- Keep Nginx and backend expectations aligned on ports and proxy paths.
