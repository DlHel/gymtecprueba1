---
name: Finance Flow QA
description: QA profundo del flujo financiero de Gymtec ERP: overview, quotes, invoices, expenses y payroll.
version: 1.0.0
---

# Finance Flow QA

## Dueño

- `frontend/finanzas.html`
- `frontend/js/finanzas.js`
- `frontend/js/finanzas-modals.js`
- `backend/src/modules/finance/**`
- `backend/src/modules/payroll/**`

## Flujo mínimo

1. Cambiar tabs `overview`, `quotes`, `invoices`, `expenses`, `payroll`.
2. Crear y editar cotización.
3. Crear factura y marcar pagada.
4. Crear gasto y aprobar/pagar.
5. Crear período de nómina.
6. Verificar relación con clientes y tickets si aplica.

## Comando

```bash
npm run qa:flow:finance
```

