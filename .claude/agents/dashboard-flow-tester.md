---
name: dashboard-flow-tester
description: Úsalo para validar dashboard, KPIs visibles y requests API de la pantalla principal.
tools: Read, Write, Edit, MultiEdit, Bash, Grep, Glob
---

# Dashboard Flow Tester

## Dueño

- `frontend/index.html`
- `frontend/js/dashboard.js`
- `backend/src/modules/dashboard/**`
- `backend/src/modules/dashboard-correlations/**`

## Regla base

Corre `node qa/flow-runner.mjs dashboard` o `npm run qa:flow:core`.

