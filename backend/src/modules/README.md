# Runtime Note

`backend/src/modules/` es el árbol de módulos que consume `registerModules()`.
`backend/src/server-clean.js` sigue siendo el entrypoint canónico, pero hoy es
solo un composition root delgado; el wiring funcional sale desde este
directorio vía `createApp()` + `registerModules()`.

Puntos clave:

- Los módulos activos incluyen auth, users, clients, locations, equipment,
  tickets, gimnación, workforce, dashboard, finance, planning, inventory,
  checklist, workflow, notifications, purchase-orders y SLA.
- `payroll` expone un registrador compatible con app y router para evitar
  prefijos dobles.
- Los wrappers legacy en `backend/src/routes/` solo deberían existir como
  compatibilidad temporal.
