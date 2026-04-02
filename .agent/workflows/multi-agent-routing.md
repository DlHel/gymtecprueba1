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

## Criterios de coordinación

- `gymtec_orchestrator` es la entrada por defecto para tareas que crucen más de un dominio.
- Primer fan-out: máximo 3 especialistas.
- Un especialista dueño por riesgo principal.
- Un solo dueño por archivo editable o área de cambio.
- Hand-offs breves con archivos concretos, hipótesis y verificación esperada.
- `qa_smoke_engineer` valida el cierre funcional por defecto.
- `security_auditor` valida auth, secretos, permisos, uploads y exposición sensible.
- El revisor final de seguridad o QA no redefine la solución; valida el resultado integrado.
