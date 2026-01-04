# 🚨 CATASTRO DE ENDPOINTS CON ERRORES - GYMTEC ERP VPS

**Fecha:** 2025-12-29  
**Servidor:** http://91.107.237.159  
**Total Errores:** 9 endpoints

---

## 📋 LISTADO COMPLETO DE ERRORES

### 🔴 ERRORES HTTP 500 (8 endpoints)

| # | Endpoint | Módulo | Error | Prioridad |
|---|----------|--------|-------|-----------|
| 1 | GET /api/dashboard/activity | Dashboard | SQL Query | Media |
| 2 | GET /api/tickets | Tickets | SQL Query | **CRÍTICA** |
| 3 | GET /api/tickets/:id | Tickets | Sin probar | **CRÍTICA** |
| 4 | GET /api/inventory | Inventario | SQL Query | Alta |
| 5 | GET /api/inventory/categories | Inventario | SQL Query | Alta |
| 6 | GET /api/purchase-orders | Finanzas | SQL Query | Alta |
| 7 | GET /api/quotes | Finanzas | SQL Query | Alta |
| 8 | GET /api/invoices | Finanzas | SQL Query | Alta |

### 🔴 ERRORES HTTP 404 (2 endpoints)

| # | Endpoint | Módulo | Error | Prioridad |
|---|----------|--------|-------|-----------|
| 9 | GET /api/attendance/shift-types | Asistencia | No existe | Media |
| 10 | GET /api/attendance/schedules | Asistencia | No existe | Media |

---

## 🔍 DETALLE POR ERROR

### ERROR #1: Dashboard Activity
```
Endpoint: GET /api/dashboard/activity
HTTP Code: 500
Error: Incorrect arguments to mysqld_stmt_execute
Ubicación: backend/src/server-clean.js línea ~8320
Causa: Parámetro LIMIT mal formateado
Prioridad: 🟡 Media (no crítico)
```

**Error Stack:**
```javascript
code: 'ER_WRONG_ARGUMENTS'
errno: 1210
sqlState: 'HY000'
sqlMessage: 'Incorrect arguments to mysqld_stmt_execute'
```

**Query Problemática:**
```javascript
const sql = `SELECT ... LIMIT ?`;
db.all(sql, [limit], callback);
```

---

### ERROR #2: Tickets List
```
Endpoint: GET /api/tickets
HTTP Code: 500
Error: SQL Query con parámetros
Ubicación: backend/src/server-clean.js línea ~2000-2100
Causa: Query compleja con JOINs y parámetros
Prioridad: 🔴 CRÍTICA (módulo core)
```

**Impacto:** Todo el módulo de tickets inutilizable

**Query Problemática:**
```javascript
const sql = `
    SELECT t.*, l.name as location_name, c.name as client_name
    FROM Tickets t
    LEFT JOIN Locations l ON t.location_id = l.id
    LEFT JOIN Clients c ON l.client_id = c.id
    WHERE ... LIMIT ?
`;
db.all(sql, params, callback);
```

---

### ERROR #3: Ticket Individual
```
Endpoint: GET /api/tickets/:id
HTTP Code: No probado (depende de #2)
Causa: Mismo problema que #2
Prioridad: 🔴 CRÍTICA
```

---

### ERROR #4: Inventory List
```
Endpoint: GET /api/inventory
HTTP Code: 500
Error: SQL Query
Ubicación: backend/src/server-clean.js o routes/inventory.js
Causa: Similar a Tickets
Prioridad: 🔴 Alta (gestión stock)
```

---

### ERROR #5: Inventory Categories
```
Endpoint: GET /api/inventory/categories
HTTP Code: 500
Error: SQL Query
Causa: Similar a otros endpoints
Prioridad: 🔴 Alta
```

---

### ERROR #6: Purchase Orders
```
Endpoint: GET /api/purchase-orders
HTTP Code: 500
Error: SQL Query
Ubicación: Módulo de finanzas
Causa: Queries con parámetros incorrectos
Prioridad: 🔴 Alta (módulo financiero)
```

---

### ERROR #7: Quotes
```
Endpoint: GET /api/quotes
HTTP Code: 500
Error: SQL Query
Módulo: Finanzas
Prioridad: 🔴 Alta
```

---

### ERROR #8: Invoices
```
Endpoint: GET /api/invoices
HTTP Code: 500
Error: SQL Query
Módulo: Finanzas
Prioridad: 🔴 Alta
```

---

### ERROR #9: Shift Types
```
Endpoint: GET /api/attendance/shift-types
HTTP Code: 404
Error: Endpoint no encontrado
Causa: Posible ruta incorrecta
Prioridad: 🟡 Media
```

**Posible solución:**
- Verificar si existe como `/api/shift-types`
- Revisar si módulo de asistencia está migrado

---

### ERROR #10: Schedules
```
Endpoint: GET /api/attendance/schedules
HTTP Code: 404
Error: Endpoint no encontrado
Causa: Posible ruta incorrecta
Prioridad: 🟡 Media
```

**Posible solución:**
- Verificar si existe como `/api/schedules`

---

## 🎯 CLASIFICACIÓN POR PRIORIDAD

### 🔴 CRÍTICA (Bloqueantes de producción)
1. GET /api/tickets
2. GET /api/tickets/:id

**Tiempo estimado:** 2 horas  
**Impacto:** Sistema core no funciona

---

### 🔴 ALTA (Funcionalidad importante)
3. GET /api/inventory
4. GET /api/inventory/categories
5. GET /api/purchase-orders
6. GET /api/quotes
7. GET /api/invoices

**Tiempo estimado:** 3 horas  
**Impacto:** Módulos completos inutilizables

---

### 🟡 MEDIA (Puede esperar)
8. GET /api/dashboard/activity
9. GET /api/attendance/shift-types
10. GET /api/attendance/schedules

**Tiempo estimado:** 1.5 horas  
**Impacto:** Funcionalidades complementarias

---

## 🔧 ESTRATEGIA DE CORRECCIÓN

### Paso 1: Identificar Patrón
✅ Ya identificado: Problema en `db-adapter.js` con MySQL2

### Paso 2: Solución Global
Corregir el método `all()` en db-adapter.js para manejar correctamente:
```javascript
// Opción A: Sin parámetros en LIMIT
const sql = `SELECT ... LIMIT ${limit}`;
db.all(sql, [], callback);

// Opción B: Verificar tipos de parámetros
all(sql, params, callback) {
    // Asegurar que params sea array
    if (!Array.isArray(params)) params = [];
    
    // Log para debugging
    console.log('SQL:', sql);
    console.log('Params:', params);
    
    // Ejecutar
    this.db.query(sql, params, callback);
}
```

### Paso 3: Testing Incremental
- Arreglar un endpoint
- Probar
- Aplicar solución a los demás
- Re-testing completo

---

## 📊 ESTADÍSTICAS

```
Total Endpoints con Error: 10
├─ HTTP 500 (SQL): 8 (80%)
└─ HTTP 404 (No existe): 2 (20%)

Por Módulo:
├─ Tickets: 2 errores (CRÍTICO)
├─ Finanzas: 3 errores (ALTO)
├─ Inventario: 2 errores (ALTO)
├─ Asistencia: 2 errores (MEDIO)
└─ Dashboard: 1 error (MEDIO)

Por Causa:
├─ Queries SQL mal formateadas: 8
├─ Endpoints no existentes: 2
└─ Problema en db-adapter.js: Probable

Tiempo Total Estimado: 6-7 horas
```

---

## 🗂️ TRACKING DE CORRECCIONES

### Estado Actual

| Endpoint | Estado | Asignado | Completado |
|----------|--------|----------|------------|
| /api/dashboard/activity | ⏳ Pendiente | - | - |
| /api/tickets | ⏳ Pendiente | - | - |
| /api/tickets/:id | ⏳ Pendiente | - | - |
| /api/inventory | ⏳ Pendiente | - | - |
| /api/inventory/categories | ⏳ Pendiente | - | - |
| /api/purchase-orders | ⏳ Pendiente | - | - |
| /api/quotes | ⏳ Pendiente | - | - |
| /api/invoices | ⏳ Pendiente | - | - |
| /api/attendance/shift-types | ⏳ Pendiente | - | - |
| /api/attendance/schedules | ⏳ Pendiente | - | - |

**Última actualización:** 2025-12-29 12:15 UTC

---

## 📝 NOTAS PARA CORRECCIÓN

### Antes de Comenzar:
- [ ] Hacer backup de server-clean.js
- [ ] Hacer backup de db-adapter.js
- [ ] Tener logs abiertos: `pm2 logs gymtec-backend`
- [ ] MySQL client listo para testing

### Durante Corrección:
- [ ] Probar cada query en MySQL primero
- [ ] Agregar console.log para debugging
- [ ] Verificar estructura de tablas
- [ ] Reiniciar PM2 después de cambios

### Después de Corrección:
- [ ] Re-testing del endpoint
- [ ] Actualizar este documento
- [ ] Documentar solución aplicada
- [ ] Marcar como ✅ completado

---

## 🔗 REFERENCIAS

- **Server:** `/var/www/gymtec/backend/src/server-clean.js`
- **DB Adapter:** `/var/www/gymtec/backend/src/db-adapter.js`
- **Logs PM2:** `~/.pm2/logs/gymtec-backend-error.log`
- **Testing:** `PLAN-DEBUGGING-ENDPOINTS.md`
- **Resultados:** `TESTING-RESULTADOS-VPS.md`

---

**Este documento será actualizado conforme se corrijan los errores**

**Próximo paso:** Continuar con testing de frontend y luego ejecutar correcciones
