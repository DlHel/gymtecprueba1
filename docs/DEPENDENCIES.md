# Gymtec ERP - Dependencias Compartidas y Precauciones

## ⚠️ Propósito
Este documento identifica las dependencias compartidas entre módulos para evitar que arreglar un módulo rompa otros.

---

## 🔗 Dependencias Críticas

### 1. mysql-database.js (CRÍTICO - Afecta TODO)
**Ubicación:** `backend/src/mysql-database.js`

| Cambio | Impacto |
|--------|---------|
| `pool.execute()` → `pool.query()` | ✅ OK - query() es más flexible |
| Cambios en configuración | Afecta TODAS las queries |
| Cambios en charset/encoding | Afecta TODAS las tablas |

**Usado por:**
- `db-adapter.js` → Todos los módulos

---

### 2. Tabla Equipment (Afecta 5+ módulos)
**Ubicación:** Tabla MySQL `Equipment`

| Columna | Usada por |
|---------|-----------|
| `e.brand`, `e.model`, `e.type` | Clientes, Tickets, Equipos |
| `e.location_id` | Clientes, Sedes, Tickets |
| `e.serial_number` | Tickets gimnación, Equipos |

**⚠️ NO hacer JOIN a EquipmentModels** - No todos los equipos tienen `model_id`

```sql
-- ❌ INCORRECTO (falla si no hay model_id)
LEFT JOIN EquipmentModels em ON e.model_id = em.id

-- ✅ CORRECTO (usa columnas directas)
SELECT e.brand, e.model, e.type FROM Equipment e
```

---

### 3. Endpoints compartidos en server-clean.js

| Endpoint | Usado por módulos |
|----------|-------------------|
| `/api/locations/:id/equipment` | Clientes, Contratos, Equipos |
| `/api/tickets/:id/equipment-scope` | Tickets, Tickets Gimnación |
| `/api/tickets/:id/spare-parts/*` | Tickets, Inventario |
| `/api/users` | Personal, Tickets (asignación), Asistencia |
| `/api/clients` | Clientes, Dashboard, Tickets, Contratos |

---

## 📋 Checklist Antes de Modificar

### Al modificar server-clean.js:
- [ ] ¿El endpoint es usado por otros módulos? (ver tabla arriba)
- [ ] ¿Estás usando JOIN a tablas que podrían no tener datos?
- [ ] Después de deploy, probar TODOS los módulos que usan el endpoint

### Al modificar mysql-database.js o db-adapter.js:
- [ ] Probar Dashboard, Tickets, Clientes, Inventario, Personal
- [ ] Estos archivos afectan TODO el sistema

### Al modificar tablas SQL:
- [ ] Buscar en server-clean.js y routes/ qué endpoints usan la tabla
- [ ] Verificar que todos los endpoints siguen funcionando

---

## 🧪 Test Rápido Post-Deploy

```bash
# Ejecutar después de cualquier deploy:
curl -s http://91.107.237.159/api/health  # Si existe
# O verificar manualmente:
# 1. Dashboard carga
# 2. Tickets lista
# 3. Clientes lista + expandir sede
# 4. Inventario lista
```

---

## 📁 Archivos que NO están montados (routes/ orphans)
Estos archivos existen pero NO se usan:
- `routes/locations.js` - Endpoints en server-clean.js directamente
- `routes/notifications-test.js` - Solo testing

---

*Actualizado: 2026-01-02*
