# Runtime Note

`backend/src/modules/` no es hoy la fuente de verdad del runtime productivo.

El backend activo sigue entrando por:

- `backend/src/server-clean.js`
- `backend/src/core/bootstrap/register-advanced-routes.js`
- `backend/src/routes/`

Este árbol modular se conserva como trabajo de extracción parcial y referencia
para refactor futuro. Antes de mover lógica aquí, primero hay que cablear el
bootstrap real o retirar el duplicado legacy en `routes/`.
