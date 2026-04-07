# Gymtec ERP - Contexto Operativo para IA

## Stack real

| Capa | Tecnología |
|------|------------|
| Frontend | HTML + JavaScript Vanilla + TailwindCSS |
| Runtime legacy frontend | Alpine.js en `clientes` y `reportes` |
| Backend | Node.js + Express |
| Servidor canónico | `backend/src/server-clean.js` |
| Base de Datos | MySQL 8 |
| Deploy soportado | Docker Compose + Nginx |
| Testing | Jest + Supertest local |

## Estructura activa

```text
gymtecprueba1/
├── backend/
│   ├── src/
│   │   ├── server-clean.js
│   │   ├── db-adapter.js
│   │   ├── mysql-database.js
│   │   ├── modules/
│   │   └── services/
│   └── tests/smoke/
├── frontend/
│   ├── *.html
│   └── js/
├── nginx/
│   ├── Dockerfile
│   └── gymtec.conf
├── docker-compose.yml
└── docs/
```

## Contrato de entorno

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`

## Reglas críticas

1. Responder y documentar en español.
2. No volver a introducir secretos, IPs operativas ni credenciales en archivos versionados.
3. El único despliegue vigente es Docker Compose con `nginx + backend + mysql`.
4. Los tests deben correr localmente; no usar ningún entorno remoto por defecto.
5. `backend/src/server-clean.js` es el entrypoint canónico. Cualquier variante `*-vps*`, `server.js` o similar es legado archivado.
6. No forzar migración de Alpine.js mientras `frontend/clientes.html`, `frontend/reportes.html`, `frontend/js/clientes.js` y `frontend/js/reportes.js` sigan activos.
7. Para frontend nuevo, preferir Vanilla JS; para frontend existente, respetar el patrón real del archivo.
8. No pasar JWT por query string. Los tokens se envían por header `Authorization` y la sesión del navegador debe priorizar `sessionStorage`.
9. `uploads/reports` no es público. Los informes técnicos y PDFs solo se descargan por endpoints autenticados con validación de permisos.
10. El bootstrap Docker no acepta contraseñas planas para el admin inicial: usar `APP_ADMIN_PASSWORD_HASH`.
11. Las páginas soporte `login.html` y `menu.html` no son módulos de negocio, pero cualquier cambio allí debe mantener compatibilidad con el runner QA y el flujo de autenticación.
12. `test-clientes.html` es una página de apoyo; no debe considerarse fuente de verdad funcional salvo instrucción explícita.

## Equipo multiagente

- `gymtec-orchestrator`: reparto del trabajo y handoffs.
- `backend-architect`: backend Express/MySQL, módulos, servicios y contratos API.
- `frontend-mpa-specialist`: HTML, Vanilla JS, Tailwind y compatibilidad Alpine.
- `mysql-schema-guardian`: queries, esquema y compatibilidad de datos.
- `docker-deploy-engineer`: Docker Compose, Nginx y wiring de entorno.
- `security-auditor`: secretos, auth, exposición y revisión de riesgo.
- `qa-smoke-engineer`: smoke tests, lint y regresión local.
- `monolith-refactorer`: extracción segura desde `backend/src/server-clean.js`.
- `qa-procedure-maintainer`: mantiene specs QA, agentes, playbooks y ownership cuando entra una funcionalidad nueva.

### Equipo QA por flujos

- `flow-test-orchestrator`: orquesta QA profundo por flujo y reparte tickets, inventario y finanzas primero.
- `tickets-flow-tester`: dueño del flujo tickets, detalle, checklist, workflow, repuestos y reportes ligados al ticket.
- `inventory-flow-tester`: dueño del flujo inventario, asignaciones, movimientos y órdenes de compra.
- `finance-flow-tester`: dueño del flujo finanzas, cotizaciones, facturas, gastos y nómina.
- `dashboard-flow-tester`: smoke y ownership de dashboard.
- `clients-flow-tester`: smoke y ownership de clientes.
- `equipment-flow-tester`: smoke y ownership de equipos/modelos relacionados.
- `reports-flow-tester`: smoke y ownership de reportes e informes técnicos.
- `workforce-flow-tester`: smoke y ownership de asistencia y workforce.
- `contracts-flow-tester`: smoke y ownership de contratos.
- `planning-flow-tester`: smoke y ownership de planificación.
- `notifications-flow-tester`: smoke y ownership de notificaciones.
- `config-flow-tester`: smoke y ownership de configuración.
- `models-flow-tester`: smoke y ownership de modelos.
- `personal-flow-tester`: smoke y ownership de personal.
- `qa-procedure-maintainer`: sincroniza procedimientos, specs, routing y documentación del sistema QA.

Fuente local de verdad:

- Skills: `.agent/skills/`
- Playbook: `.agent/workflows/multi-agent-routing.md`
- Agentes Codex: `.codex/agents/`
- Subagentes Claude: `.claude/agents/`
- Configuración de referencia: `docs/AI_SKILLS_AND_AGENTS.md`

## Reglas multiagente

1. Si la tarea cruza backend, frontend, base de datos, deploy, seguridad o QA, entrar por `gymtec-orchestrator`.
2. Si la tarea es simple y de un solo dominio, usar directamente al especialista dueño.
3. El fan-out inicial no debe superar 3 especialistas.
4. Un solo agente debe ser dueño de cada archivo editable o área de cambio.
5. `qa-smoke-engineer` debe cerrar cualquier cambio funcional o de refactor con validación local.
6. `security-auditor` debe revisar cambios de auth, secretos, permisos, uploads o exposición de endpoints.
7. `monolith-refactorer` se usa solo para extraer o limpiar `backend/src/server-clean.js`.
8. Los nombres canónicos del equipo son los listados arriba; los aliases legacy existen solo por compatibilidad.
9. Para QA manual o automatizado por módulo, entrar por `flow-test-orchestrator` y ejecutar primero `tickets -> inventario -> finanzas`.
10. Cada agente de flujo es dueño de su HTML/JS, endpoints backend, tablas implicadas, botones, tabs, modales y checks cross-module.
11. `qa:modals` debe quedar verde antes de aceptar refactors de UI o ownership.
12. `qa:architecture` debe quedar verde antes de aceptar refactors backend o de modularización.
13. Si entra una funcionalidad nueva, pasar por `qa-procedure-maintainer` para actualizar specs, agentes y playbooks antes de cerrar.
14. El preflight QA puede levantar backend y frontend local automáticamente; no asumir que esos procesos ya están corriendo.
15. `QA_EVIDENCE_LEVEL` controla la evidencia del runner: `min`, `medium` o `max`.

## Comandos útiles

```bash
docker compose up --build
cd backend && npm test
cd backend && npm run lint
npm run lint
npm run qa:seed
npm run qa:flow:tickets
npm run qa:flow:inventory
npm run qa:flow:finance
npm run qa:flow:core
npm run qa:flow:all
npm run qa:modals
npm run qa:architecture
npm run qa:ui
```

## Qué quedó archivado

- Deploy manual/VPS
- Documentación histórica y reportes de sesión
- Árbol React/CRA legado
- Servidores duplicados y rutas `*-test.js` fuera del flujo activo
