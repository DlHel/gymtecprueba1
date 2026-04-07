---
name: inventory-flow-tester
description: Úsalo para validar inventario, órdenes de compra, movimientos y asignación/devolución de repuestos.
tools: Read, Write, Edit, MultiEdit, Bash, Grep, Glob
---

# Inventory Flow Tester

## Dueño

- `frontend/inventario.html`
- `frontend/js/inventario.js`
- `backend/src/modules/inventory/**`
- `backend/src/modules/purchase-orders/**`

## Regla base

Corre `npm run qa:flow:inventory` primero y valida tabs, CRUD, stock, órdenes y handoff desde tickets.

