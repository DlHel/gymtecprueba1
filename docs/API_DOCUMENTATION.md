# Superficie API Crítica

## Salud y auth

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/verify`
- `POST /api/auth/change-password`

## Entidades principales

- `GET|POST /api/clients`
- `GET|PUT|DELETE /api/clients/:id`
- `GET|POST /api/equipment`
- `GET|POST /api/tickets`
- `GET|POST /api/inventory`
- `GET|POST /api/purchase-orders`

## Comportamiento esperado

- Las rutas protegidas deben responder `401` sin token.
- `POST /api/auth/login` debe responder `400` si faltan credenciales.
- `GET /api/health` debe permanecer apto para healthcheck y smoke test.

## Observaciones

- Esta referencia es operativa, no exhaustiva.
- La documentación histórica detallada fue movida a `archives/cleanup-2026-03-30/`.
