---
name: Cross Module Regression
description: Regresión modular del core de Gymtec ERP con foco en cruces tickets -> inventario -> reportes y tickets/clientes -> finanzas.
version: 1.0.0
---

# Cross Module Regression

## Objetivo

- Probar el core de forma repetible sin depender de IDs accidentales.
- Confirmar comunicación browser -> API -> data -> response.
- Revisar módulos base después de cambios estructurales.

## Secuencia recomendada

```bash
npm run qa:flow:core
npm run qa:ui
npm run lint
npm run test
```

## Cruces obligatorios

- `tickets -> inventory`
- `tickets -> reports`
- `tickets/clientes -> finance`

