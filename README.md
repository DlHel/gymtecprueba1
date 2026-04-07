# Gymtec ERP

Gymtec ERP es una MPA de mantenimiento técnico con frontend estático en `frontend/`, backend Node/Express en `backend/` y MySQL 8. Desde esta limpieza, la única vía de despliegue soportada es `docker compose` con `nginx + backend + mysql`.

Tambien existe un modo secundario preparado para separar frontend y backend en puertos distintos usando [`docker-compose.split.yml`](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/docker-compose.split.yml).

## Estado operativo

- Backend canónico: `backend/src/server-clean.js`
- App factory canónico: `backend/src/core/bootstrap/create-app.js`
- Bootstrap Express: `backend/src/core/bootstrap/configure-express.js`
- Registry modular: `backend/src/modules/index.js`
- Runtime de arranque/cierre: `backend/src/core/runtime/server-runtime.js`
- Uploads y directorios persistidos: `backend/src/core/http/uploads.js`
- Frontend activo: `frontend/*.html` + `frontend/js/*.js`
- Runtime frontend real: Vanilla JS con módulos legacy en Alpine.js (`clientes` y `reportes`)
- Deploy soportado: Docker Compose detrás de Nginx
- Deploy secundario: frontend y backend separados por puertos
- Tests automatizados vigentes: smoke local con Jest + Supertest

## Layout activo del repo

```text
gymtecprueba1/
├── backend/      # API Express + lógica de negocio
├── frontend/     # MPA estática
├── nginx/        # Proxy y servidor estático
├── docs/         # Documentación viva
└── archives/     # Legado fuera del árbol operativo
```

## Arranque rápido

1. Copia [`.env.example`](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/.env.example) a `.env` y ajusta credenciales.
2. Ejecuta `docker compose up --build`.
3. Abre `http://localhost:8082` o el puerto definido en `HTTP_PORT`.
4. Si necesitas el modo separado, ejecuta `docker compose -f docker-compose.split.yml up --build` y abre `http://localhost:8081`.

Rutas públicas esperadas:

- `/` sirve el frontend estático
- `/api/*` proxya al backend
- `/uploads/models/*` sirve archivos persistidos públicos
- `uploads/reports` solo se expone por endpoints autenticados
- En modo split, el frontend usa `window.API_URL` directo contra `http://localhost:3000/api` cuando se abre en `:8081`.

Notas de despliegue:

- El stack Docker valida secretos obligatorios al iniciar; no levanta en producción con `JWT_SECRET` placeholder.
- Las imágenes Docker ya empaquetan backend y frontend; el modo `split` no depende de bind mounts del repo.
- Si el VPS ya tiene otro sistema en `80/443`, deja Gymtec publicado en `HTTP_PORT=8082` y enrútalo desde tu proxy existente.
- El usuario admin inicial solo se crea si defines `APP_ADMIN_USERNAME` y `APP_ADMIN_PASSWORD_HASH` en `.env`.
- Para separar frontend y API en otro dominio o puerto, usa `gymtec_api_url_override` o `apiBase` y ajusta `CORS_ORIGIN` al origen del frontend.

## Desarrollo local

- Backend: `cd backend && npm start`
- Frontend estático: `cd frontend && python -m http.server 8080`
- Tests backend: `cd backend && npm test`
- Lint backend activo: `cd backend && npm run lint`
- Lint repo activo: `npm run lint`

## Documentación viva

- Arquitectura y estado: [docs/ARCHITECTURE_MAP.md](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/docs/ARCHITECTURE_MAP.md)
- Deploy Docker: [docs/DEPLOY_DOCKER.md](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/docs/DEPLOY_DOCKER.md)
- Superficie API: [docs/API_DOCUMENTATION.md](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/docs/API_DOCUMENTATION.md)
- Skills y multiagente: [docs/AI_SKILLS_AND_AGENTS.md](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/docs/AI_SKILLS_AND_AGENTS.md)
- Reglas para agentes: [AGENTS.md](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/AGENTS.md)

## Notas de saneamiento

- El material VPS/manual, el deploy legacy y la documentación histórica fueron movidos a `archives/cleanup-2026-03-30/`.
- Los scripts, SQL y parches sueltos de la raíz fueron consolidados en `archives/cleanup-2026-03-30/repo-root-legacy/`.
- `scripts/`, `planning/`, logs locales y artefactos E2E quedaron archivados fuera de la raíz activa.
- El árbol `src/` de React/CRA fue archivado como legado no operativo.
- `backend/config.env` dejó de versionarse; usa los archivos de ejemplo.
