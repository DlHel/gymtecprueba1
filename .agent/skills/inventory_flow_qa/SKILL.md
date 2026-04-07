---
name: Inventory Flow QA
description: QA profundo del flujo de inventario, stock, órdenes de compra, movimientos, asignación a técnicos y retorno a bodega.
version: 1.0.0
---

# Inventory Flow QA

## Dueño

- `frontend/inventario.html`
- `frontend/js/inventario.js`
- `backend/src/modules/inventory/**`
- `backend/src/modules/purchase-orders/**`

## Flujo mínimo

1. Tabs `central`, `technicians`, `orders`, `transactions`.
2. Crear y editar repuesto.
3. Ajuste de stock y consulta de low-stock.
4. Crear orden de compra.
5. Recepción/cancelación.
6. Asignar a técnico.
7. Devolver a inventario central.
8. Reflejar solicitudes generadas desde tickets.

## Comando

```bash
npm run qa:flow:inventory
```

