# Gymtec ERP - Instrucciones para asistentes

## Estado actual

- Backend activo: `backend/src/server-clean.js`
- Frontend activo: `frontend/*.html` y `frontend/js/*.js`
- Deploy soportado: `docker compose` con `nginx + backend + mysql`
- Tests vigentes: `backend/tests/smoke`
- Documentación histórica: `archives/cleanup-2026-03-30/`

## Reglas obligatorias

1. No referenciar ni usar el VPS histórico como entorno por defecto.
2. No versionar secretos, contraseñas, IPs operativas ni comandos con credenciales embebidas.
3. Tratar `src/` de la raíz como React/CRA legado archivado, no como frontend activo.
4. Mantener `/`, `/api/*` y `/uploads/*` como interfaz pública del despliegue.
5. Si editas frontend, documenta si el archivo sigue un patrón Vanilla o Alpine antes de proponer migraciones.

## Comandos útiles

```bash
docker compose up --build
cd backend && npm test
cd backend && npm run lint
npm run lint
```

## Convenciones

- Español en respuestas y textos visibles.
- `const` por defecto; `let` solo si muta.
- `async/await` y queries parametrizadas.
- No añadir rutas, scripts o documentación de deploy que compitan con Docker Compose.

## Especialistas locales

- Skills compartidas: `.agent/skills/`
- Playbook multiagente: `.agent/workflows/multi-agent-routing.md`
- Agentes Codex: `.codex/agents/`
- Subagentes Claude: `.claude/agents/`

Roles activos:

- `gymtec-orchestrator`
- `backend-architect`
- `frontend-mpa-specialist`
- `mysql-schema-guardian`
- `docker-deploy-engineer`
- `security-auditor`
- `qa-smoke-engineer`
- `monolith-refactorer`

## Política de coordinación

1. Para trabajo cross-domain, enrutar primero a `gymtec-orchestrator`.
2. No abrir más de 3 especialistas en el primer fan-out.
3. Mantener ownership exclusivo por archivo o área editable.
4. Usar `qa-smoke-engineer` como validador final por defecto.
5. Usar `security-auditor` como validador final cuando haya auth, secretos, permisos, uploads o endpoints sensibles.
6. Usar nombres canónicos del equipo; los aliases antiguos existen solo por compatibilidad.
