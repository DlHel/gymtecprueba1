---
name: GymTec ERP Development
description: Guía operativa del stack real de Gymtec ERP después del saneamiento Docker.
version: 2.0.0
---

# Gymtec ERP Developer Guide

Este skill es la base generalista del proyecto. Para trabajo por dominio, delega en los especialistas de `.agent/skills/` y sigue `.agent/workflows/multi-agent-routing.md`.

## 1. Stack real

- Backend: Node.js + Express + MySQL.
- Servidor canónico: `backend/src/server-clean.js`.
- Frontend activo: HTML + JavaScript Vanilla + TailwindCSS.
- Legacy frontend activo: Alpine.js solo en `clientes` y `reportes`.
- Infraestructura soportada: Docker Compose con `nginx + backend + mysql`.

## 2. Reglas de implementación

- Nuevos cambios backend: preferir `backend/src/modules/` y `backend/src/services/`.
- Nuevos cambios frontend: preferir Vanilla JS; no introducir frameworks.
- En archivos Alpine activos, mantener el patrón existente hasta que haya una migración explícita.
- No crear nuevas rutas o scripts `*-vps*`, `server.js`, deploy manual o documentación de hosting legacy.

## 3. Seguridad y entorno

- Variables estándar: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`.
- Nunca dejar IPs, contraseñas o secretos en archivos versionados.
- `backend/config.env` ya no debe versionarse; usar ejemplos y `.env` raíz para Docker.

## 4. Verificación mínima

- `cd backend && npm test`
- `cd backend && npm run lint`
- `npm run lint`

## 5. Documentación viva

- `README.md`
- `AGENTS.md`
- `docs/ARCHITECTURE_MAP.md`
- `docs/DEPLOY_DOCKER.md`
- `docs/API_DOCUMENTATION.md`
