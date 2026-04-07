# Multi-Agent Routing - Gymtec ERP

## Equipo experto

- `gymtec_orchestrator`: reparto de trabajo, ownership y consolidación.
- `backend_architect`: API Express, módulos, servicios y límites de arquitectura backend.
- `frontend_mpa_specialist`: MPA estática, Vanilla JS y compatibilidad Alpine.
- `mysql_schema_guardian`: queries, compatibilidad de esquema y riesgo de datos.
- `docker_deploy_engineer`: Docker Compose, Nginx, envs y runtime.
- `security_auditor`: auth, secretos, exposición, validación y superficie sensible.
- `qa_smoke_engineer`: smoke tests, health checks y regresiones locales.
- `monolith_refactorer`: extracción segura desde `server-clean.js`.

## Equipo QA por flujos

- `flow_test_orchestrator`: entrada por defecto para QA modular, secuencia prioritaria y consolidación de evidencia.
- `tickets_flow_tester`: dueño de `tickets`, `ticket-detail`, checklist, workflow, repuestos, informe técnico y handoff a inventario/reportes.
- `inventory_flow_tester`: dueño de `inventario`, órdenes de compra, asignación a técnicos y retorno a stock.
- `finance_flow_tester`: dueño de `finanzas`, cotizaciones, facturas, gastos y nómina.
- `dashboard_flow_tester`: dueño del dashboard.
- `clients_flow_tester`: dueño de clientes.
- `equipment_flow_tester`: dueño de equipos y modelos relacionados.
- `reports_flow_tester`: dueño de reportes e informes técnicos.
- `workforce_flow_tester`: dueño de asistencia/workforce.
- `contracts_flow_tester`: dueño de contratos.
- `planning_flow_tester`: dueño de planificación.
- `notifications_flow_tester`: dueño de notificaciones.
- `config_flow_tester`: dueño de configuración.
- `models_flow_tester`: dueño de modelos.
- `personal_flow_tester`: dueño de personal.
- `qa_procedure_maintainer`: dueño de la sincronización de procedimientos QA, specs, routing y documentación cuando entran funcionalidades nuevas.

## Flujos recomendados

### 1. Cambio full-stack

`gymtec_orchestrator -> backend_architect -> mysql_schema_guardian -> frontend_mpa_specialist -> security_auditor -> qa_smoke_engineer`

### 2. Incidente de runtime o deploy

`gymtec_orchestrator -> docker_deploy_engineer -> backend_architect -> qa_smoke_engineer`

### 3. Refactor del monolito

`gymtec_orchestrator -> monolith_refactorer -> backend_architect -> qa_smoke_engineer`

### 4. Cambio sensible de autenticación o permisos

`gymtec_orchestrator -> backend_architect -> security_auditor -> qa_smoke_engineer`

### 5. Bug de datos o consultas

`gymtec_orchestrator -> mysql_schema_guardian -> backend_architect -> qa_smoke_engineer`

### 6. QA profundo por flujos core

`flow_test_orchestrator -> tickets_flow_tester -> inventory_flow_tester -> finance_flow_tester -> qa_smoke_engineer`

### 7. QA modular del resto del sistema

`flow_test_orchestrator -> tester dueño del módulo -> qa_smoke_engineer`

Agregar `backend_architect`, `frontend_mpa_specialist`, `mysql_schema_guardian` o `security_auditor` solo si el flujo falla y el ownership sale del módulo.

### 8. Funcionalidad nueva que debe entrar al sistema QA

`gymtec_orchestrator -> qa_procedure_maintainer -> tester dueño del módulo -> qa_smoke_engineer`

## Criterios de coordinación

- `gymtec_orchestrator` es la entrada por defecto para tareas que crucen más de un dominio.
- `flow_test_orchestrator` es la entrada por defecto para QA modular, smoke profundo o revisión sistemática de botones/modales.
- Primer fan-out: máximo 3 especialistas.
- Un especialista dueño por riesgo principal.
- Un solo dueño por archivo editable o área de cambio.
- Hand-offs breves con archivos concretos, hipótesis y verificación esperada.
- `qa_smoke_engineer` valida el cierre funcional por defecto.
- `security_auditor` valida auth, secretos, permisos, uploads y exposición sensible.
- El revisor final de seguridad o QA no redefine la solución; valida el resultado integrado.
- Orden de prioridad QA: `tickets -> inventory -> finance` primero, luego el resto del core.
- Todo flujo debe dejar evidencia en `output/playwright/flows/<timestamp>/<module>/report.json`.
- `qa:modals` y `qa:architecture` son guardas previas a aceptar ownership o modularidad como cerrados.
- Si aparece un módulo o subflujo nuevo, `qa_procedure_maintainer` decide si se crea una spec/agente nuevos o si se amplía uno existente.
