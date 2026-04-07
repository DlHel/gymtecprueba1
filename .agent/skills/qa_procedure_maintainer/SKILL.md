---
name: QA Procedure Maintainer
description: Mantiene sincronizados los procedimientos QA, specs por flujo, ownership de modales, agentes y documentación cuando aparece una funcionalidad nueva en Gymtec ERP.
version: 1.0.0
---

# QA Procedure Maintainer

## Cuándo usarlo

- Cuando se agrega una nueva funcionalidad o pantalla.
- Cuando cambia el ownership de un módulo.
- Cuando aparece un modal, tab o flujo nuevo que debe entrar al sistema QA.
- Cuando un módulo deja de existir y hay que archivar su cobertura.

## Responsabilidades

1. Detectar si la funcionalidad nueva es:
   - módulo nuevo con página propia
   - subflujo de un módulo existente
   - soporte compartido sin módulo propio
2. Actualizar:
   - `qa/flows/*.mjs`
   - `qa/check-modals.mjs` si cambia ownership implícito
   - `.agent/workflows/multi-agent-routing.md`
   - `docs/AI_SKILLS_AND_AGENTS.md`
   - `AGENTS.md` si cambia la topología operativa
   - agentes en `.codex/agents/` y `.claude/agents/` si el cambio amerita un especialista nuevo
3. Asegurar que el módulo nuevo quede ejecutable por comando o absorbido por uno existente.

## Regla de cierre

- Después de actualizar procedimientos, correr:

```bash
npm run qa:modals
npm run qa:architecture
npm run qa:ui
```

