---
name: Module Modal Auditor
description: Auditoría de ownership de modales, botones disparadores y mezcla de controladores en el frontend activo de Gymtec ERP.
version: 1.0.0
---

# Module Modal Auditor

## Objetivo

- Verificar que cada botón que abre modal tenga dueño explícito.
- Detectar modales mezclados entre controladores.
- Fallar si un selector de modal aparece fuera de sus ownerFiles declarados.

## Comando

```bash
npm run qa:modals
```

## Guardrails

- No aceptes “funciona visualmente” como criterio suficiente.
- Si un modal pertenece a dos controladores, define un dueño único o un módulo compartido explícito.

