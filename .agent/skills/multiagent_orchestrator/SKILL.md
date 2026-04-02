---
name: Multi-Agent Orchestrator
description: Orquestación pragmática de especialistas para tareas complejas en Gymtec ERP.
version: 1.0.0
---

# Multi-Agent Orchestrator

## Cuándo usarlo

- Refactors grandes o transversales.
- Bugs que cruzan frontend, backend, base de datos y deploy.
- Preparación de release o endurecimiento de seguridad.
- Tareas donde conviene repartir ownership entre 2-3 especialistas.

## Equipo disponible

- `backend_architect`: Express, módulos, servicios, `server-clean.js`.
- `frontend_mpa_specialist`: HTML, Vanilla JS, Alpine.js activo en `clientes` y `reportes`.
- `mysql_schema_guardian`: queries, esquema, contratos SQL y compatibilidad MySQL.
- `docker_deploy_engineer`: Docker Compose, Nginx, variables de entorno y healthchecks.
- `qa_smoke_engineer`: smoke tests, lint y regresiones visibles.
- `security_auditor`: secretos, auth, JWT, superficie expuesta, rutas protegidas.
- `monolith_refactorer`: extracción segura desde `server-clean.js`.
- `code_quality`: limpieza incremental fuera del monolito cuando no se necesita un especialista más estrecho.

## Reglas de orquestación

1. No levantar especialistas si la tarea es local y de un solo dominio.
2. Limitar el fan-out inicial a 3 especialistas.
3. Dar ownership explícito por área o archivos.
4. Evitar solapamiento entre agentes que editen los mismos archivos.
5. Pedir a cada especialista:
   - archivos dueños
   - hallazgos o cambios
   - validación ejecutada
   - riesgos abiertos
6. Esperar solo cuando el resultado bloquea el siguiente paso.

## Patrones recomendados

### Feature full-stack

`backend_architect -> frontend_mpa_specialist -> qa_smoke_engineer`

Agregar `security_auditor` si toca auth, uploads o datos sensibles.

### Bug transversal

`multiagent_orchestrator -> backend_architect + frontend_mpa_specialist`

Luego `qa_smoke_engineer` para reproducir/cerrar y `security_auditor` si la falla compromete integridad o acceso.

### Limpieza y refactor

`monolith_refactorer + especialista dueño del área`

Cerrar siempre con `qa_smoke_engineer`.

### Deploy o entorno

`docker_deploy_engineer -> qa_smoke_engineer`

Agregar `backend_architect` si el cambio afecta contrato de entorno o healthchecks.
