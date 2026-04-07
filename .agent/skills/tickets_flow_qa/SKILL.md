---
name: Tickets Flow QA
description: QA profundo del flujo de tickets, ticket detail, checklist, workflow, repuestos, reportes y notificaciones asociadas.
version: 1.0.0
---

# Tickets Flow QA

## Dueño

- `frontend/tickets.html`
- `frontend/ticket-detail.html`
- `frontend/js/tickets.js`
- `frontend/js/ticket-detail.js`
- `frontend/js/ticket-detail-modals.js`
- `backend/src/modules/tickets/**`
- `backend/src/modules/checklist/**`
- `backend/src/modules/workflow/**`
- `backend/src/modules/reports/**`
- `backend/src/modules/notifications/**`

## Flujo mínimo

1. Listado y filtros.
2. Crear y editar ticket.
3. Abrir detalle.
4. Nota y checklist.
5. Workflow y asignación.
6. Solicitud de repuesto.
7. Generación/descarga autenticada de PDF.
8. Verificación de handoff a inventario y reportes.

## Comando

```bash
npm run qa:flow:tickets
```

