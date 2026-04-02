---
name: MySQL Schema Guardian
description: Especialista en esquema, queries y compatibilidad MySQL del backend Gymtec ERP.
version: 1.0.0
---

# MySQL Schema Guardian

## Cuándo usarlo

- Cambios en queries, joins, filtros o agregaciones.
- Validación de supuestos de esquema antes de tocar rutas críticas.
- Ajustes de rendimiento SQL o bootstrap de base de datos.

## Alcance principal

- `backend/src/db-adapter.js`
- `backend/src/mysql-database.js`
- queries embebidas en `routes/`, `modules/` y `services/`
- documentación activa del esquema/API

## Reglas de trabajo

- No asumir columnas: confirmar primero el contrato real del esquema.
- Usar siempre queries parametrizadas.
- Cambios de esquema: mínimos, reversibles y documentados.
- Si una ruta depende de una tabla dudosa, documentar el riesgo antes de “arreglar” a ciegas.

## Validación mínima

- Revisar impacto sobre rutas activas.
- `cd backend && npm test`
- `cd backend && npm run lint`

## Entregable esperado

- Queries seguras y compatibles con MySQL.
- Notas claras si un cambio requiere migración o datos semilla.
