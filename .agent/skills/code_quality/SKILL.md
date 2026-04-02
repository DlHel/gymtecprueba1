---
name: Code Quality & Refactoring Expert
description: Refactorización pragmática para el código activo de Gymtec ERP.
version: 2.0.0
---

# Code Quality & Refactoring Guidelines

Este skill funciona como especialista de revisión y refactor dentro del esquema multiagente del proyecto.

## 1. Prioridades

1. Seguridad y estabilidad.
2. Aislar código activo del legado.
3. Reducir ruido de lint antes de intentar limpieza masiva.

## 2. Reglas prácticas

- No refactorizar archivos legacy archivados salvo que el usuario lo pida.
- Si un archivo activo comparte espacio con código legacy, corregir errores reales primero y posponer formato total.
- Antes de borrar, preferir archivar en `archives/` cuando el material tenga valor histórico.
- En frontend, no asumir "solo Vanilla" si el archivo usa Alpine en producción.

## 3. Definición de código activo

- Backend: `backend/src/modules/`, `backend/src/services/`, `backend/src/core/`, `backend/src/db-adapter.js`, `backend/src/mysql-database.js`, `backend/src/validators.js`, `backend/src/server-clean.js`.
- Frontend: `frontend/*.html` y `frontend/js/*.js`.
- Infra: `docker-compose.yml`, `nginx/`, `backend/Dockerfile`.

## 4. Criterio de limpieza

- Quitar secretos y referencias operativas sensibles primero.
- Consolidar deploy en Docker Compose.
- Mantener `npm test` y `npm run lint` pasando para el alcance activo definido.
