# Skills y Multiagente

## Criterio de selección

No existe una métrica pública única de “skills más usados” por rol. Para este proyecto se tomó como base:

- documentación oficial de skills y subagentes
- colecciones comunitarias grandes y activas
- repetición de roles en proyectos web full-stack similares
- ajuste al stack real de Gymtec ERP

## Fuentes usadas

- [OpenAI Codex Skills](https://developers.openai.com/codex/skills)
- [OpenAI Codex Subagents](https://developers.openai.com/codex/subagents)
- [Anthropic Claude Code Subagents](https://docs.anthropic.com/fr/docs/claude-code/sub-agents)
- [vercel-labs/skills](https://github.com/vercel-labs/skills)
- [VoltAgent awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [lst97/claude-code-sub-agents](https://github.com/lst97/claude-code-sub-agents)

## Roles elegidos para Gymtec

| Rol | Motivo | Skill local | Agente Codex | Agente Claude |
|-----|--------|-------------|--------------|---------------|
| Orquestador | Coordinar tareas cross-domain sin fan-out excesivo | `.agent/skills/multiagent_orchestrator/` | `.codex/agents/gymtec-orchestrator.toml` | `.claude/agents/gymtec-orchestrator.md` |
| Backend Architect | Backend Express/MySQL y contratos API | `.agent/skills/backend_architect/` | `.codex/agents/backend-architect.toml` | `.claude/agents/backend-architect.md` |
| Frontend MPA Specialist | HTML, Vanilla JS y compatibilidad Alpine | `.agent/skills/frontend_mpa_specialist/` | `.codex/agents/frontend-mpa-specialist.toml` | `.claude/agents/frontend-mpa-specialist.md` |
| MySQL Schema Guardian | Queries, esquema y riesgos de datos | `.agent/skills/mysql_schema_guardian/` | `.codex/agents/mysql-schema-guardian.toml` | `.claude/agents/mysql-schema-guardian.md` |
| Docker Deploy Engineer | Docker Compose, Nginx, envs y runtime | `.agent/skills/docker_deploy_engineer/` | `.codex/agents/docker-deploy-engineer.toml` | `.claude/agents/docker-deploy-engineer.md` |
| Security Auditor | Auth, secretos, exposición y revisión | `.agent/skills/security_auditor/` | `.codex/agents/security-auditor.toml` | `.claude/agents/security-auditor.md` |
| QA Smoke Engineer | Smoke tests, lint y regresión mínima | `.agent/skills/qa_smoke_engineer/` | `.codex/agents/qa-smoke-engineer.toml` | `.claude/agents/qa-smoke-engineer.md` |
| Monolith Refactorer | Extracción segura desde `server-clean.js` | `.agent/skills/monolith_refactorer/` | `.codex/agents/monolith-refactorer.toml` | `.claude/agents/monolith-refactorer.md` |

## Topología recomendada

- Refactor backend grande: `gymtec_orchestrator -> monolith_refactorer -> backend_architect -> qa_smoke_engineer`
- Cambio full-stack: `gymtec_orchestrator -> backend_architect + frontend_mpa_specialist -> qa_smoke_engineer`
- Cambio sensible de auth: `gymtec_orchestrator -> backend_architect -> security_auditor -> qa_smoke_engineer`
- Incidente de entorno: `gymtec_orchestrator -> docker_deploy_engineer -> backend_architect -> qa_smoke_engineer`
- Problema de datos: `gymtec_orchestrator -> mysql_schema_guardian -> backend_architect -> qa_smoke_engineer`

## Configuración dejada en el repo

- Skills compartidas: `.agent/skills/`
- Playbook de routing: `.agent/workflows/multi-agent-routing.md`
- Configuración Codex: `.codex/config.toml` y `.codex/agents/`
- Configuración Claude: `.claude/project-config.json` y `.claude/agents/`

## Reglas del proyecto

- Entrada por defecto para tareas cross-domain: `gymtec-orchestrator`
- Fan-out inicial máximo: 3 especialistas
- Ownership exclusivo por archivo o área editable
- Validador final por defecto: `qa-smoke-engineer`
- Validador final para auth/secretos/exposición: `security-auditor`
- `monolith-refactorer` solo para extracción segura desde `server-clean.js`
