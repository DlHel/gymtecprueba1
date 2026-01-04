# 🔧 PLAN DE DEBUGGING - ENDPOINTS CON ERROR

**Fecha:** 2025-12-29  
**Prioridad:** Alta  
**Endpoints Afectados:** 2

---

## 📋 ENDPOINTS CON ERROR 500

### 1. GET /api/dashboard/activity

**Estado:** ❌ HTTP 500  
**Severidad:** Media  
**Impacto:** Dashboard no muestra actividad reciente  
**Ubicación:** `backend/src/server-clean.js` línea ~8320

#### Pasos de Debugging:

**PASO 1: Revisar Logs**
```bash
# En VPS
pm2 logs gymtec-backend --lines 100 | grep -A 10 "dashboard/activity"
```

**PASO 2: Verificar Query SQL**
```bash
# Buscar el endpoint
grep -n "app.get.*dashboard/activity" /var/www/gymtec/backend/src/server-clean.js
sed -n '8320,8340p' /var/www/gymtec/backend/src/server-clean.js
```

**PASO 3: Probar Query en MySQL**
```sql
-- Conectar a MySQL
mysql -u gymtec_user -p gymtec_erp

-- Ejecutar query manualmente
SELECT 'ticket' as type, id, title as description, created_at as date, created_by as user
FROM Tickets ORDER BY created_at DESC LIMIT 10;
```

**PASO 4: Verificar Estructura de Tabla**
```sql
DESCRIBE Tickets;
SELECT COUNT(*) FROM Tickets;
```

**PASO 5: Verificar db-adapter.js**
```bash
# Ver método all()
sed -n '30,50p' /var/www/gymtec/backend/src/db-adapter.js
```

#### Soluciones Posibles:

**Opción A: Problema con LIMIT**
```javascript
// ANTES (problemático)
const limit = parseInt(req.query.limit) || 10;
db.all(sql, [limit], callback);

// DESPUÉS (corregido)
const limit = parseInt(req.query.limit) || 10;
const sql = `... LIMIT ${limit}`; // Sin parámetro
db.all(sql, [], callback);
```

**Opción B: Problema con Columnas**
```javascript
// Verificar que todas las columnas existan
// Simplificar query para testing
const sql = `SELECT * FROM Tickets LIMIT 10`;
db.all(sql, [], callback);
```

**Opción C: Problema con db-adapter**
```javascript
// En db-adapter.js
all(sql, params, callback) {
    console.log('SQL:', sql);
    console.log('Params:', params);
    // Verificar que params sea array
    if (!Array.isArray(params)) params = [];
    //...
}
```

---

### 2. GET /api/tickets

**Estado:** ❌ HTTP 500  
**Severidad:** Crítica  
**Impacto:** Módulo completo de tickets no funciona  
**Ubicación:** `backend/src/server-clean.js` línea ~2000-2100

#### Pasos de Debugging:

**PASO 1: Revisar Logs del Error**
```bash
# En VPS
pm2 logs gymtec-backend --err --lines 50 | grep -A 20 "tickets"

# O ver log completo
tail -100 ~/.pm2/logs/gymtec-backend-error.log
```

**PASO 2: Localizar Endpoint**
```bash
grep -n "app.get.*'/api/tickets'" /var/www/gymtec/backend/src/server-clean.js | head -5
```

**PASO 3: Ver Código del Endpoint**
```bash
# Extraer código completo del endpoint
sed -n '2000,2100p' /var/www/gymtec/backend/src/server-clean.js
```

**PASO 4: Verificar Tabla Tickets**
```sql
-- En MySQL
DESCRIBE Tickets;

-- Ver datos de ejemplo
SELECT * FROM Tickets LIMIT 3;

-- Verificar joins
SELECT t.*, l.name as location_name, c.name as client_name
FROM Tickets t
LEFT JOIN Locations l ON t.location_id = l.id
LEFT JOIN Clients c ON l.client_id = c.id
LIMIT 5;
```

**PASO 5: Probar Query Simplificada**
```javascript
// Versión simple para testing
app.get('/api/tickets', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM Tickets LIMIT 10`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'success', data: rows });
    });
});
```

#### Soluciones Posibles:

**Opción A: Query Compleja con Parámetros**
```javascript
// PROBLEMA: Parámetros mal formateados
const sql = `
    SELECT t.*, l.name as location_name 
    FROM Tickets t 
    LEFT JOIN Locations l ON t.location_id = l.id
    WHERE t.status = ?
    LIMIT ?
`;
db.all(sql, [status, limit], callback); // Puede fallar

// SOLUCIÓN: Verificar tipos
const status = String(req.query.status || 'open');
const limit = Number(req.query.limit || 10);
```

**Opción B: Columnas Faltantes**
```javascript
// Verificar que todas las columnas existan
const sql = `
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.created_at,
        -- Verificar cada columna individualmente
        l.name as location_name
    FROM Tickets t
    LEFT JOIN Locations l ON t.location_id = l.id
`;
```

**Opción C: Problema con WHERE Dinámico**
```javascript
// ANTES (puede tener bugs)
let sql = 'SELECT * FROM Tickets WHERE 1=1';
if (status) sql += ' AND status = ?';
if (priority) sql += ' AND priority = ?';
const params = [status, priority].filter(Boolean);

// DESPUÉS (más seguro)
const conditions = [];
const params = [];

if (status) {
    conditions.push('status = ?');
    params.push(status);
}
if (priority) {
    conditions.push('priority = ?');
    params.push(priority);
}

const whereClause = conditions.length > 0 
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

const sql = `SELECT * FROM Tickets ${whereClause}`;
```

---

## 🔬 METODOLOGÍA DE DEBUGGING

### Para Cada Endpoint:

1. **Capturar Error Exacto**
   - Ver logs de PM2
   - Identificar línea exacta
   - Copiar stack trace completo

2. **Aislar Problema**
   - Comentar código complejo
   - Empezar con query simple
   - Agregar complejidad gradualmente

3. **Verificar Base de Datos**
   - Probar query directo en MySQL
   - Verificar estructura de tablas
   - Comprobar datos de prueba

4. **Testing Incremental**
   - Probar sin parámetros
   - Agregar parámetros uno por uno
   - Verificar tipos de datos

5. **Documentar Solución**
   - Anotar causa raíz
   - Documentar cambios
   - Agregar comentarios en código

---

## 📝 SCRIPT DE DEBUGGING AUTOMATIZADO

```bash
#!/bin/bash
# Guardar como: /tmp/debug-endpoints.sh

echo "🔍 DEBUGGING ENDPOINTS PROBLEMÁTICOS"
echo "===================================="
echo ""

# 1. Verificar backend corriendo
echo "1️⃣ Estado del Backend:"
pm2 list | grep gymtec-backend

echo ""
echo "2️⃣ Últimos Errores (últimos 50):"
pm2 logs gymtec-backend --err --lines 50 --nostream | tail -20

echo ""
echo "3️⃣ Verificando Tabla Tickets:"
mysql -u gymtec_user -p'PASSWORD' gymtec_erp -e "
    SELECT COUNT(*) as total FROM Tickets;
    SELECT id, title, status FROM Tickets LIMIT 3;
"

echo ""
echo "4️⃣ Verificando Query Dashboard Activity:"
mysql -u gymtec_user -p'PASSWORD' gymtec_erp -e "
    SELECT 'ticket' as type, id, title as description 
    FROM Tickets 
    ORDER BY created_at DESC 
    LIMIT 10;
"

echo ""
echo "5️⃣ Testeando Endpoints:"

# Obtener token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token obtenido: ${TOKEN:0:30}..."

# Test dashboard/activity
echo ""
echo "Test: GET /api/dashboard/activity"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard/activity)

echo "$RESPONSE" | tail -1
if echo "$RESPONSE" | grep -q "HTTP_CODE:200"; then
    echo "✅ OK"
else
    echo "❌ FALLO"
    echo "$RESPONSE" | head -10
fi

# Test tickets
echo ""
echo "Test: GET /api/tickets"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tickets)

echo "$RESPONSE" | tail -1
if echo "$RESPONSE" | grep -q "HTTP_CODE:200"; then
    echo "✅ OK"
else
    echo "❌ FALLO"
    echo "$RESPONSE" | head -10
fi

echo ""
echo "🎯 Debugging completado"
echo "Ver logs completos con: pm2 logs gymtec-backend"
```

---

## 📊 CHECKLIST DE FIXES

### Dashboard Activity:
- [ ] Identificar error exacto en logs
- [ ] Verificar tabla Tickets existe
- [ ] Probar query en MySQL
- [ ] Verificar columnas en SELECT
- [ ] Corregir parámetros LIMIT
- [ ] Testing con curl
- [ ] Testing desde frontend
- [ ] Documentar solución

### Tickets Endpoint:
- [ ] Identificar error exacto en logs
- [ ] Verificar estructura de tabla
- [ ] Probar joins en MySQL
- [ ] Simplificar query para testing
- [ ] Verificar parámetros WHERE
- [ ] Agregar manejo de errores
- [ ] Testing con diferentes filtros
- [ ] Testing desde frontend
- [ ] Documentar solución

---

## 🎯 TIMELINE ESTIMADO

**Tiempo Total:** 2-3 horas

- **Fase 1:** Diagnóstico (30 min)
  - Revisar logs
  - Identificar causas
  
- **Fase 2:** Fix Dashboard (45 min)
  - Corregir código
  - Testing
  - Documentar
  
- **Fase 3:** Fix Tickets (1 hora)
  - Corregir código
  - Testing completo
  - Documentar
  
- **Fase 4:** Validación (30 min)
  - Re-testing todos los endpoints
  - Testing desde frontend
  - Actualizar documentación

---

## 📌 NOTAS IMPORTANTES

1. **Backup antes de cambios**
   ```bash
   cp /var/www/gymtec/backend/src/server-clean.js \
      /var/www/gymtec/backend/src/server-clean.js.backup
   ```

2. **Testing incremental**
   - No hacer múltiples cambios a la vez
   - Probar después de cada cambio
   - Usar `pm2 restart` después de modificaciones

3. **Logs detallados**
   - Agregar console.log temporales
   - Ver logs en tiempo real: `pm2 logs gymtec-backend`
   - Guardar errores importantes

4. **Rollback si es necesario**
   ```bash
   mv /var/www/gymtec/backend/src/server-clean.js.backup \
      /var/www/gymtec/backend/src/server-clean.js
   pm2 restart gymtec-backend
   ```

---

**Estado:** 📋 PLAN CREADO - LISTO PARA EJECUTAR  
**Prioridad:** Alta  
**Responsable:** A definir  
**Fecha Límite:** 2025-12-30

---

## 🔗 REFERENCIAS

- Logs PM2: `~/.pm2/logs/gymtec-backend-error.log`
- Server: `/var/www/gymtec/backend/src/server-clean.js`
- DB Adapter: `/var/www/gymtec/backend/src/db-adapter.js`
- MySQL: `gymtec_erp` database

**Siguiente paso:** Continuar testing de módulos restantes mientras se deja este plan para debugging posterior.
