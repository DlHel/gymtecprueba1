# Claude Configuration for Gymtec ERP

Este directorio define la capa multiagente para Claude sobre el estado real del proyecto.

## Archivos activos

- `project-config.json`: contexto del proyecto y equipo multiagente.
- `agents/`: especialistas por dominio para delegación automática o explícita.

## Equipo multiagente

- `gymtec-orchestrator`
- `backend-architect`
- `frontend-mpa-specialist`
- `mysql-schema-guardian`
- `docker-deploy-engineer`
- `security-auditor`
- `qa-smoke-engineer`
- `monolith-refactorer`

## Source of truth compartida

- Skills del proyecto: `../.agent/skills/`
- Playbook de orquestación: `../.agent/workflows/multi-agent-routing.md`
- Contexto operativo: `../AGENTS.md`
- Documentación viva: `../README.md`, `../docs/ARCHITECTURE_MAP.md`, `../docs/DEPLOY_DOCKER.md`, `../docs/API_DOCUMENTATION.md`

## Uso recomendado

```bash
claude chat --project . --config .claude/project-config.json
```

Invocaciones explícitas de ejemplo:

```text
Usa gymtec-orchestrator para coordinar un refactor backend + QA + seguridad
Usa backend-architect para extraer una ruta desde server-clean.js
Usa mysql-schema-guardian para revisar compatibilidad de una query
Usa qa-smoke-engineer para validar el cambio antes de cerrar
```
