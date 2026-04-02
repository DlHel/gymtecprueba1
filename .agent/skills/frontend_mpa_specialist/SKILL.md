---
name: Frontend MPA Specialist
description: Especialista en frontend estático de Gymtec ERP con Vanilla JS y compatibilidad Alpine.
version: 1.0.0
---

# Frontend MPA Specialist

## Cuándo usarlo

- Cambios en `frontend/*.html` o `frontend/js/*.js`.
- Corrección de flujos UI que dependen de `/api/*`.
- Ajustes de interacción, render, navegación o formularios.

## Alcance principal

- `frontend/*.html`
- `frontend/js/*.js`
- `frontend/css/`

## Reglas de trabajo

- Mantener el patrón MPA estático.
- Para código nuevo, preferir Vanilla JS.
- En `clientes` y `reportes`, preservar compatibilidad con Alpine.js.
- No introducir frameworks nuevos ni reactivar CRA/React archivado.
- Mantener las rutas públicas vigentes: `/`, `/api/*`, `/uploads/*`.

## Validación mínima

- `npm run lint`
- Verificar el flujo visible afectado y dependencias con backend.

## Entregable esperado

- Cambios de UI acotados al flujo real.
- Compatibilidad explícita cuando el archivo use Alpine.
- Handoff a `qa_smoke_guard` si cambia comportamiento visible o navegación.
