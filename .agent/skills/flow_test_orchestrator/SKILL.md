---
name: Flow Test Orchestrator
description: Orquestación de QA por flujos para Gymtec ERP con prioridad tickets -> inventario -> finanzas y handoff mínimo al resto del core.
version: 1.0.0
---

# Flow Test Orchestrator

## Cuándo usarlo

- QA profundo por módulo o por release.
- Revisión sistemática de comunicación frontend/backend.
- Validación repetible antes de despliegue o revisión manual.

## Dependencias globales recomendadas

- `playwright`
- `vercel:agent-browser`
- `vercel:agent-browser-verify`
- `vercel:verification`
- `webapp-testing` como referencia adicional de Playwright

## Secuencia obligatoria

1. `npm run qa:seed`
2. `npm run qa:flow:tickets`
3. `npm run qa:flow:inventory`
4. `npm run qa:flow:finance`
5. `npm run qa:flow:core`
6. `npm run qa:modals`
7. `npm run qa:architecture`
8. `npm run qa:ui`

## Comportamiento del runner

- Si `backend` o `frontend` local no están arriba, el preflight intenta levantarlos automáticamente.
- Logs de autoarranque QA: `output/playwright/runtime/`.

## Reglas

- No saltes `tickets -> inventory -> finance`; ese orden valida los cruces críticos.
- Si un flujo falla, deriva solo al especialista dueño del módulo o al especialista técnico necesario.
- Exige siempre evidencia en `output/playwright/flows/<timestamp>/<module>/report.json`.
- Usa `qa-smoke-engineer` para cierre final.
