# Deploy Docker

## Requisitos

- Docker Desktop o Docker Engine con Compose.
- Un archivo `.env` en la raíz basado en [`.env.example`](/C:/Users/felip/Desktop/desa/g/gymtecprueba1/.env.example).

## Modo principal: same-origin

```env
DB_USER=gymtec_user
DB_PASSWORD=change-this-app-password
DB_NAME=gymtec_erp
MYSQL_ROOT_PASSWORD=change-this-root-password
JWT_SECRET=change-this-jwt-secret
NODE_ENV=production
CORS_ORIGIN=http://localhost:8082
HTTP_PORT=8082
FRONTEND_PORT=8081
BACKEND_PORT=3000
FRONTEND_ORIGIN=http://localhost:8081
APP_ADMIN_USERNAME=admin
APP_ADMIN_PASSWORD_HASH=$2b$12$replace-with-bcrypt-hash
APP_ADMIN_EMAIL=admin@gymtec.local
APP_ADMIN_ROLE=Admin
```

Las variables `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` y `JWT_SECRET` son obligatorias. `docker compose` ahora falla temprano si faltan.

## Levantar el stack same-origin

```bash
docker compose up --build
```

Este modo usa:

- `nginx` como reverse proxy y servidor estático.
- `backend` sin puerto público.
- `mysql` con datos persistidos.

## Modo secundario: front/api separados

Usa este modo si quieres servir frontend y backend en puertos distintos sin reverse proxy compartido:

```bash
docker compose -f docker-compose.split.yml up --build
```

En este modo:

- `frontend` se publica en `FRONTEND_PORT` desde una imagen Nginx propia.
- `backend` se publica en `BACKEND_PORT`.
- `CORS_ORIGIN` debe apuntar al origen del frontend.
- `frontend/js/config.js` detecta `FRONTEND_PORT=8081` y resuelve la API como `http://<host>:3000/api`.
- Si usas otro dominio o puerto, define `gymtec_api_url_override` o `apiBase` en la URL.

## Servicios

- `nginx`: sirve frontend y proxya `/api/*`.
- `backend`: ejecuta `backend/src/server-clean.js`.
- `mysql`: persiste datos en `mysql_data`.
- `frontend` en modo split: sirve la MPA desde una imagen Nginx separada.

Bootstrap de base al primer arranque:

- `01-mysql-schema.sql`: schema base legacy.
- `02-docker-bootstrap-compat.sql`: compatibilidad con `Inventory`, `InventoryMovements`, `spare_part_requests` y columnas activas del runtime.
- `03-docker-patches.sql`: parches de `InformesTecnicos`.
- `04-docker-seed-admin.sh`: crea o actualiza un admin inicial solo si defines `APP_ADMIN_USERNAME` y `APP_ADMIN_PASSWORD_HASH` con un hash bcrypt.

## Persistencia

- `mysql_data`: datos de MySQL.
- `uploads_data`: archivos de `/uploads`.

## Checks esperados

- `GET /api/health` responde `200`.
- `GET /` entrega `frontend/index.html` en `http://localhost:8082` por defecto.
- `GET /uploads/models/*` sirve assets públicos persistidos.
- Los PDFs e informes en `uploads/reports` no son públicos; salen por endpoints autenticados.
- `GET /healthz` responde `200` en los contenedores Nginx.
- En modo split, `http://localhost:8081` sirve el frontend y `http://localhost:3000/api/health` responde la API.

## Notas

- No hay soporte oficial para deploy manual con PM2/VPS dentro del árbol activo.
- Si ya tienes otro sistema escuchando en el VPS, deja Gymtec en `HTTP_PORT=8082` o el puerto libre que uses y publícalo detrás de tu proxy principal.
- Si quieres separar frontend y backend en producción, usa `docker-compose.split.yml` y conserva `CORS_ORIGIN` restringido al origen del frontend.
- Si Docker no está instalado en la máquina actual, valida al menos `npm test` y `npm run lint` antes de mover el cambio.
