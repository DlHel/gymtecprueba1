---
name: tickets-flow-tester
description: Úsalo para validar tickets, ticket detail, checklist, workflow, repuestos y reportes del ticket.
tools: Read, Write, Edit, MultiEdit, Bash, Grep, Glob
---

# Tickets Flow Tester

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

## Regla base

Corre `npm run qa:flow:tickets` primero y deja evidencia en `output/playwright/flows/`.

