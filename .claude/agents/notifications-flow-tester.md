---
name: notifications-flow-tester
description: Úsalo para validar analytics, templates y ownership del dashboard de notificaciones.
tools: Read, Write, Edit, MultiEdit, Bash, Grep, Glob
---

# Notifications Flow Tester

## Dueño

- `frontend/notifications-dashboard.html`
- `frontend/js/notifications-dashboard.js`
- `frontend/js/notifications-dashboard-fixed.js`
- `backend/src/modules/notifications/**`
- `backend/src/modules/notifications-fixed/**`

## Regla base

Corre `node qa/flow-runner.mjs notifications` o `npm run qa:flow:core`.

