# Arquitectura y Estado

## Topología soportada

```text
Internet/Usuario
      |
    nginx
      |
  /api -> backend (Express)
      |
    mysql
```

`nginx` es el único servicio expuesto. `backend` y `mysql` quedan internos a Compose.

## Código activo

- `backend/src/server-clean.js`: entrypoint canónico.
- `backend/src/core/bootstrap/configure-express.js`: wiring base de Express, CORS, static y healthcheck.
- `backend/src/core/bootstrap/register-advanced-routes.js`: bootstrap de rutas opcionales y servicios de background.
- `backend/src/core/http/uploads.js`: uploads persistidos y política de archivos.
- `backend/src/core/runtime/server-runtime.js`: arranque y apagado ordenado del servidor.
- `backend/src/core/utils/datetime.js`: utilidades transversales de fecha/hora para MySQL.
- `backend/src/modules/`: rutas y lógica modular nueva.
- `backend/src/services/`: servicios compartidos.
- `frontend/*.html`: páginas de la MPA.
- `frontend/js/*.js`: módulos del frontend.

## Layout operativo

```text
repo/
├── backend/   -> aplicación Node/Express
├── frontend/  -> frontend estático
├── nginx/     -> reverse proxy y static hosting
├── docs/      -> documentación viva
└── archives/  -> legado fuera del runtime
```

La raíz debe contener solo archivos de configuración global y entrada del proyecto. Los artefactos ad hoc, parches, SQL manual y utilidades temporales quedaron fuera del árbol operativo en `archives/cleanup-2026-03-30/repo-root-legacy/`.
El material de apoyo que no participa del runtime (`scripts`, `planning`, logs locales y artefactos E2E) también fue movido a `archives/cleanup-2026-03-30/`.

## Deuda conocida

- `server-clean.js` sigue siendo un monolito grande; ya no concentra bootstrap/runtime, pero aún mezcla demasiados dominios.
- El frontend es mixto: la mayor parte es Vanilla JS, pero `clientes` y `reportes` dependen de Alpine.js.
- El árbol React/CRA original fue archivado como legado no operativo.
- `backend/src/routes/` y `backend/src/modules/` todavía conviven; la migración a módulos no está terminada.

## Criterio de despliegue

- Frontend estático servido por Nginx.
- Backend Node/Express en `/api/*`.
- Uploads persistidos en volumen y expuestos por `/uploads/*`.

## Baseline de calidad

- Tests vigentes: `backend/tests/smoke`.
- Lint backend: código activo con errores reales corregidos.
- Lint repo: backend activo + subconjunto frontend estable.
