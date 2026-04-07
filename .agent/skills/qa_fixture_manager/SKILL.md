---
name: QA Fixture Manager
description: Gestión de fixtures QA idempotentes para Gymtec ERP, reutilizando usuarios locales y creando datos canónicos de negocio.
version: 1.0.0
---

# QA Fixture Manager

## Objetivo

- Garantizar un set canónico y repetible de datos QA.
- Evitar dependencia de IDs mágicos o tickets históricos.
- Reutilizar usuarios existentes cuando sea posible.

## Datos mínimos

- ticket QA
- repuesto QA
- orden de compra QA
- cotización QA
- factura QA
- gasto QA

## Comando

```bash
npm run qa:seed
```

## Artefactos

- `output/playwright/qa-fixtures.json`

