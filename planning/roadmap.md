# Roadmap de Modularización - GymTec ERP

## Estado Actual
- ✅ **Respaldo GitHub**: Commit `42a67a2` en `origin/master`
- ✅ **Documentación**: `planning/api_architecture.md` con reglas
- ✅ **Reglas AI**: `.cursorrules` actualizado con arquitectura modular

---

## Flujo de Trabajo (Supervisado)

```
┌─────────────────────────────────────────────────────────────┐
│  Por cada GRUPO de cambio:                                  │
│  1. Gemini propone cambios específicos                      │
│  2. Usuario revisa y da OK                                  │
│  3. Gemini implementa                                       │
│  4. Usuario verifica en VPS                                 │
│  5. Si OK → siguiente grupo | Si NO → rollback y corregir  │
└─────────────────────────────────────────────────────────────┘
```

---

## FASE 0: Limpieza (Pre-requisito)

### Grupo 0.1: Eliminar Archivos Duplicados
**Objetivo**: Definir UN SOLO `server-clean.js` oficial.

| Acción | Archivo | Razón |
|--------|---------|-------|
| 🗑️ Eliminar | `server-clean-vps.js` | Duplicado |
| 🗑️ Eliminar | `server-clean-vps-sync.js` | Duplicado |
| 🗑️ Eliminar | `server-clean-vps-updated.js` | Duplicado |
| 🗑️ Eliminar | `server-clean-final.js` | Duplicado |
| ✅ Mantener | `server-clean.js` | Archivo oficial |

**Verificación**: 
- [ ] `npm start` funciona
- [ ] Login funciona
- [ ] Dashboard carga

---

### Grupo 0.2: Crear Core (Sin tocar lógica)
**Objetivo**: Crear estructura de carpetas y archivos vacíos.

| Archivo a Crear | Contenido |
|-----------------|-----------|
| `core/config/env.js` | Exporta JWT_SECRET desde process.env |
| `core/middleware/auth.middleware.js` | Copia de authenticateToken oficial |
| `core/events/event-bus.js` | EventEmitter básico |

**Verificación**:
- [ ] `require('./core/config/env')` funciona
- [ ] NO se modifica `server-clean.js` todavía

---

## FASE 1: Migración Segura (Un módulo a la vez)

### Grupo 1.1: Migrar Inventory (Ya es semi-modular)
**Objetivo**: Mover `routes/inventory.js` a `modules/inventory/`.

| Paso | Acción |
|------|--------|
| 1 | Crear `modules/inventory/inventory.routes.js` |
| 2 | Actualizar imports para usar `core/` |
| 3 | Actualizar mount en `server-clean.js` |
| 4 | Ejecutar tests de inventory |

**Verificación**:
- [ ] `GET /api/inventory` responde igual
- [ ] `POST /api/inventory` funciona
- [ ] Tests pasan: `npm test -- --grep inventory`

---

### Grupo 1.2: Migrar Purchase-Orders
(Similar a 1.1)

---

### Grupo 1.3: Extraer Planificador
**Objetivo**: Corregir el calendario que no muestra tickets.

| Paso | Acción |
|------|--------|
| 1 | Crear `modules/planning/planning.routes.js` |
| 2 | Crear `modules/planning/planning.repository.js` con query UNION |
| 3 | Montar en `server-clean.js` |
| 4 | Verificar calendario |

**Verificación**:
- [ ] Calendario muestra tareas de mantenimiento
- [ ] Calendario muestra tickets con fecha
- [ ] Crear tarea funciona

---

## FASE 2: Despertar Módulos Dormidos

### Grupo 2.1: Activar Contratos
- Conectar `contracts-sla.js` 
- Crear `frontend/js/contratos.js`

### Grupo 2.2: Activar Nómina
- Conectar `payroll-chile.js`
- Verificar frontend existente

---

## FASE 3: Reconstruir Finanzas

### Grupo 3.1: Arreglar Backend
- Corregir bug SQL de LIMIT

### Grupo 3.2: Completar Frontend
- Implementar `createExpense()` en modal

---

## Próximo Paso Inmediato

**→ Ejecutar Grupo 0.1: Eliminar archivos duplicados**

Usuario debe aprobar antes de continuar.
