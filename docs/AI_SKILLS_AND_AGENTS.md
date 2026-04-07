# Skills, Agentes y QA Modular

## Criterio de selección

No existe una métrica pública única de “skills más usados” por rol. Para este proyecto se tomó como base:

- documentación oficial de skills y subagentes
- colecciones comunitarias grandes y activas
- repetición de roles en proyectos web full-stack similares
- ajuste al stack real de Gymtec ERP

Revalidado con fuentes web y documentación oficial el 5 de abril de 2026.

## Fuentes usadas

- [OpenAI Codex Skills](https://developers.openai.com/codex/skills)
- [OpenAI Codex Subagents](https://developers.openai.com/codex/subagents)
- [Anthropic Claude Code Subagents](https://docs.anthropic.com/fr/docs/claude-code/sub-agents)
- [vercel-labs/skills](https://github.com/vercel-labs/skills)
- [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)
- [VoltAgent awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [lst97/claude-code-sub-agents](https://github.com/lst97/claude-code-sub-agents)
- [MoizIbnYousaf/Ai-Agent-Skills](https://github.com/MoizIbnYousaf/Ai-Agent-Skills)

## Skills globales adoptadas para QA por flujos

Estas viven fuera del repo y se usan como dependencia global del entorno Codex:

| Skill global | Estado | Uso en Gymtec |
|-----|--------|-------------|
| `playwright` | disponible | fallback de browser automation y depuración UI |
| `vercel:agent-browser` | disponible | navegación con refs compactos y chequeos visuales |
| `vercel:agent-browser-verify` | disponible | verificación visual rápida del estado base |
| `vercel:verification` | disponible | validación browser -> API -> data -> response |
| `webapp-testing` | instalada como referencia global | patrones reutilizables de Playwright y lifecycle de servidores locales |

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
| QA Procedure Maintainer | Sincronizar specs, routing y agentes cuando aparece funcionalidad nueva | `.agent/skills/qa_procedure_maintainer/` | `.codex/agents/qa-procedure-maintainer.toml` | `.claude/agents/qa-procedure-maintainer.md` |

## Skills locales de QA por flujos

| Skill local | Foco | Comando base |
|-----|------|--------------|
| `.agent/skills/flow_test_orchestrator/` | Secuencia QA modular y handoffs | `npm run qa:flow:core` |
| `.agent/skills/tickets_flow_qa/` | Tickets, detalle, checklist, workflow y repuestos | `npm run qa:flow:tickets` |
| `.agent/skills/inventory_flow_qa/` | Inventario, órdenes y asignaciones | `npm run qa:flow:inventory` |
| `.agent/skills/finance_flow_qa/` | Cotizaciones, facturas, gastos y nómina | `npm run qa:flow:finance` |
| `.agent/skills/module_modal_auditor/` | Ownership y mezcla de modales | `npm run qa:modals` |
| `.agent/skills/cross_module_regression/` | Regresión core y cruces entre módulos | `npm run qa:flow:core` + `npm run qa:ui` |
| `.agent/skills/qa_fixture_manager/` | Fixtures QA idempotentes y datos canónicos | `npm run qa:seed` |
| `.agent/skills/qa_procedure_maintainer/` | Sincronización de specs, agentes y playbooks ante funcionalidad nueva | `npm run qa:modals` + `npm run qa:architecture` + `npm run qa:ui` |

Notas operativas QA:

- El preflight del runner QA intenta levantar `backend` y `frontend` local cuando detecta que no están disponibles.
- Logs del runtime QA: `output/playwright/runtime/`.

## Agentes QA por módulo

| Agente | Dueño principal | Cobertura mínima |
|-----|-----------------|------------------|
| `flow-test-orchestrator` | orden y handoffs | `tickets -> inventory -> finance` primero |
| `tickets-flow-tester` | tickets y detalle | listado, filtros, crear, editar, notas, checklist, workflow, repuestos, PDF |
| `inventory-flow-tester` | inventario | tabs, CRUD, stock, órdenes, asignar/devolver, low-stock |
| `finance-flow-tester` | finanzas | overview, quotes, invoices, expenses, payroll |
| `dashboard-flow-tester` | dashboard | carga, KPIs y requests core |
| `clients-flow-tester` | clientes | carga, tabs, formularios y filtros |
| `equipment-flow-tester` | equipos | vistas, drawer, formularios y relación con modelos |
| `reports-flow-tester` | reportes | informe técnico, PDF y permisos |
| `workforce-flow-tester` | asistencia | tabs schedule/overtime/leave y requests |
| `contracts-flow-tester` | contratos | tabs y modal principal |
| `planning-flow-tester` | planificación | tableros y modal de tarea |
| `notifications-flow-tester` | notificaciones | analytics/templates y requests |
| `config-flow-tester` | configuración | tabs security/notifications/maintenance |
| `models-flow-tester` | modelos | carga, filtros y CRUD base |
| `personal-flow-tester` | personal | carga, filtros y métricas |

## Topología recomendada

- Refactor backend grande: `gymtec_orchestrator -> monolith_refactorer -> backend_architect -> qa_smoke_engineer`
- Cambio full-stack: `gymtec_orchestrator -> backend_architect + frontend_mpa_specialist -> qa_smoke_engineer`
- Cambio sensible de auth: `gymtec_orchestrator -> backend_architect -> security_auditor -> qa_smoke_engineer`
- Incidente de entorno: `gymtec_orchestrator -> docker_deploy_engineer -> backend_architect -> qa_smoke_engineer`
- Problema de datos: `gymtec_orchestrator -> mysql_schema_guardian -> backend_architect -> qa_smoke_engineer`
- QA modular profundo: `flow_test_orchestrator -> tickets_flow_tester -> inventory_flow_tester -> finance_flow_tester -> qa_smoke_engineer`
- QA modular del resto: `flow_test_orchestrator -> tester dueño del módulo -> qa_smoke_engineer`
- Funcionalidad nueva: `gymtec_orchestrator -> qa_procedure_maintainer -> tester dueño del módulo -> qa_smoke_engineer`

## Configuración dejada en el repo

- Skills compartidas: `.agent/skills/`
- Playbook de routing: `.agent/workflows/multi-agent-routing.md`
- Configuración Codex: `.codex/config.toml` y `.codex/agents/`
- Configuración Claude: `.claude/project-config.json` y `.claude/agents/`

## Reglas del proyecto

- Entrada por defecto para tareas cross-domain: `gymtec-orchestrator`
- Entrada por defecto para QA modular: `flow-test-orchestrator`
- Entrada para sincronizar el sistema QA tras nuevas funcionalidades: `qa-procedure-maintainer`
- Fan-out inicial máximo: 3 especialistas
- Ownership exclusivo por archivo o área editable
- Validador final por defecto: `qa-smoke-engineer`
- Validador final para auth/secretos/exposición: `security-auditor`
- `monolith-refactorer` solo para extracción segura desde `server-clean.js`
- Prioridad QA por flujos: `tickets`, `inventario`, `finanzas`
- Evidencia por flujo: `output/playwright/flows/<timestamp>/<module>/report.json`
