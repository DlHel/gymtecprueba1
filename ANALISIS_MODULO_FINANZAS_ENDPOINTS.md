# 📊 Análisis Completo: Módulo Finanzas y Sus Ramificaciones

**Fecha**: 17 de octubre de 2025  
**Sistema**: Gymtec ERP v3.1  
**Alcance**: Endpoints financieros y sus conexiones con otros módulos

---

## 🎯 Resumen Ejecutivo

El módulo de **Finanzas** en Gymtec ERP es un sistema complejo que maneja 3 subsistemas principales:
1. **Gastos (Expenses)** - Sistema de registro y aprobación de gastos
2. **Cotizaciones (Quotes)** - Generación de presupuestos para clientes
3. **Facturas (Invoices)** - Facturación y seguimiento de pagos

**CRÍTICO**: Estos endpoints se comparten y ramifican con otros módulos a través de:
- `reference_type` y `reference_id` - Vinculación con Tickets, Equipos, Contratos
- `client_id` - Conexión con módulo de Clientes
- `category_id` - Sistema de categorización compartido

---

## 📋 Estructura de Endpoints

### 1. GASTOS (Expenses) - 8 Endpoints

#### 1.1 GET `/api/expenses`
**Ubicación**: `server-clean.js` línea 3691  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: Todos los autenticados  

**Funcionalidad**:
- Obtiene lista de gastos con filtros avanzados
- JOIN con `ExpenseCategories` y `Users` (created_by, approved_by)
- Filtros: status, category, date_from, date_to, limit, offset

**Parámetros Query**:
```javascript
{
    status: 'Pendiente|Aprobado|Rechazado|Pagado',
    category: 'nombre_categoria',
    date_from: 'YYYY-MM-DD',
    date_to: 'YYYY-MM-DD',
    limit: 50,
    offset: 0
}
```

**Response**:
```javascript
{
    message: 'success',
    data: [
        {
            id, category_id, category, description, amount, date,
            supplier, receipt_number, payment_method,
            reference_type, reference_id,  // ⚠️ RAMIFICACIÓN
            notes, receipt_file, status,
            created_by, approved_by, created_at, updated_at,
            category_name, created_by_name, approved_by_name
        }
    ],
    total, offset, limit
}
```

**🔗 Ramificaciones**:
- `reference_type`: 'Ticket' | 'Equipment' | 'Contract' | 'General'
- `reference_id`: ID del registro relacionado
- `created_by`, `approved_by`: FK a tabla `Users`
- `category_id`: FK a tabla `ExpenseCategories`

---

#### 1.2 POST `/api/expenses`
**Ubicación**: `server-clean.js` línea 3756  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: Todos los autenticados  

**Funcionalidad**:
- Crear nuevo gasto
- Status inicial: 'Pendiente'
- Vinculación automática con módulos externos vía reference_type/reference_id

**Body Required**:
```javascript
{
    description: string,     // REQUERIDO
    amount: number,          // REQUERIDO > 0
    date: 'YYYY-MM-DD',      // REQUERIDO
    category: string,        // Opcional, default 'Otros'
    category_id: number,     // Opcional
    supplier: string,        // Opcional
    receipt_number: string,  // Opcional
    payment_method: string,  // Opcional
    reference_type: 'Ticket|Equipment|Contract|General',  // ⚠️ CRÍTICO
    reference_id: number,    // ⚠️ ID del registro relacionado
    notes: text,
    receipt_file: string     // Base64 o path
}
```

**Validaciones**:
- ✅ description, amount, date son requeridos
- ✅ amount debe ser > 0
- ✅ created_by se asigna automáticamente del token JWT

**🔗 Uso en Otros Módulos**:
```javascript
// Desde módulo Tickets - crear gasto relacionado
{
    description: "Repuesto para ticket #123",
    amount: 150000,
    date: "2025-10-17",
    reference_type: "Ticket",
    reference_id: 123,
    category: "Repuestos"
}

// Desde módulo Equipos - gasto de mantenimiento
{
    description: "Mantenimiento preventivo Cinta X2000",
    amount: 80000,
    date: "2025-10-17",
    reference_type: "Equipment",
    reference_id: 45,
    category: "Mantenimiento"
}

// Desde módulo Contratos - gasto asociado a SLA
{
    description: "Servicio mensual contrato Gimnasio ABC",
    amount: 500000,
    date: "2025-10-17",
    reference_type: "Contract",
    reference_id: 12,
    category: "Servicios"
}
```

---

#### 1.3 PUT `/api/expenses/:id`
**Ubicación**: `server-clean.js` línea 3854  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: Todos los autenticados (solo creador o admin)  

**Funcionalidad**:
- Actualizar gasto existente
- Permite cambiar reference_type y reference_id (reasignar)
- Validación de permisos por rol

**Body**: Todos los campos opcionales (solo enviar lo que cambia)

**SQL Pattern**:
```sql
UPDATE Expenses SET
    category = COALESCE(?, category),
    description = COALESCE(?, description),
    amount = COALESCE(?, amount),
    reference_type = COALESCE(?, reference_type),  -- ⚠️ Puede cambiar vinculación
    reference_id = COALESCE(?, reference_id),
    ...
WHERE id = ? AND (created_by = ? OR ? IN ('Admin', 'Manager'))
```

---

#### 1.4 PUT `/api/expenses/:id/approve`
**Ubicación**: `server-clean.js` línea 3983  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: ⚠️ **SOLO Admin y Manager** (`requireRole(['Admin', 'Manager'])`)  

**Funcionalidad**:
- Aprobar gasto pendiente
- Cambia status: 'Pendiente' → 'Aprobado'
- Registra `approved_by` (user_id del token)
- Registra `approved_at` (timestamp actual)

**SQL**:
```sql
UPDATE Expenses 
SET status = 'Aprobado',
    approved_by = ?,
    approved_at = NOW()
WHERE id = ? AND status = 'Pendiente'
```

**🔗 Impacto en Módulos**:
- **Tickets**: Si reference_type='Ticket', el gasto aprobado puede actualizar costo del ticket
- **Contratos**: Si reference_type='Contract', suma al costo total del contrato
- **Reportes**: Las estadísticas solo consideran gastos aprobados

---

#### 1.5 PUT `/api/expenses/:id/reject`
**Ubicación**: `server-clean.js` línea 4026  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: ⚠️ **SOLO Admin y Manager**  

**Funcionalidad**:
- Rechazar gasto pendiente
- Cambia status: 'Pendiente' → 'Rechazado'
- Opcional: razón del rechazo en `notes`

**Body**:
```javascript
{
    rejection_reason: string  // Opcional pero recomendado
}
```

---

#### 1.6 PUT `/api/expenses/:id/pay`
**Ubicación**: `server-clean.js` línea 4076  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: ⚠️ **SOLO Admin y Manager**  

**Funcionalidad**:
- Marcar gasto como pagado
- Cambia status: 'Aprobado' → 'Pagado'
- Registra `paid_at` timestamp

**SQL**:
```sql
UPDATE Expenses 
SET status = 'Pagado',
    paid_at = NOW(),
    payment_reference = ?
WHERE id = ? AND status = 'Aprobado'
```

**🔗 Integración Contable**:
- Este cambio podría trigger notificaciones
- Actualiza flujo de caja en reportes financieros

---

#### 1.7 DELETE `/api/expenses/:id`
**Ubicación**: `server-clean.js` línea 4122  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: Todos (con validaciones)  

**Funcionalidad**:
- Eliminar gasto (soft o hard delete)
- Validación: Solo creador o Admin puede eliminar
- Restricción: No se puede eliminar si status='Pagado'

**Validaciones**:
```javascript
if (expense.status === 'Pagado') {
    return res.status(403).json({
        error: 'No se puede eliminar un gasto pagado'
    });
}

if (expense.created_by !== req.user.id && req.user.role !== 'Admin') {
    return res.status(403).json({
        error: 'No tienes permisos para eliminar este gasto'
    });
}
```

---

#### 1.8 GET `/api/expenses/stats`
**Ubicación**: `server-clean.js` línea 4258  
**Autenticación**: ✅ `authenticateToken`  
**Roles**: Todos los autenticados  

**Funcionalidad**:
- Estadísticas de gastos por período
- Agrupaciones: por status, por categoría, por mes

**Parámetros Query**:
```javascript
{
    period: 'week|month|quarter|year'  // Default: 'month'
}
```

**Response**:
```javascript
{
    message: 'success',
    data: {
        by_status: [
            { status: 'Pendiente', count: 5, total_amount: 250000 },
            { status: 'Aprobado', count: 12, total_amount: 1800000 },
            { status: 'Pagado', count: 8, total_amount: 960000 }
        ],
        by_category: [
            { category: 'Repuestos', count: 10, total_amount: 1200000 },
            { category: 'Mantenimiento', count: 8, total_amount: 800000 }
        ],
        by_month: [
            { month: '2025-10', count: 15, total_amount: 1950000 },
            { month: '2025-09', count: 20, total_amount: 2400000 }
        ],
        total_pending: 250000,
        total_approved: 1800000,
        total_paid: 960000,
        grand_total: 3010000
    }
}
```

---

### 2. COTIZACIONES (Quotes) - 5 Endpoints

#### 2.1 GET `/api/quotes`
**Ubicación**: `server-clean.js` línea 4376  
**Autenticación**: ✅ `authenticateToken`  

**Funcionalidad**:
- Lista todas las cotizaciones
- JOIN con `Clients` y `Locations`
- Filtros por status, client_id, date_range

**Response Structure**:
```javascript
{
    id, quote_number, title, description,
    client_id, location_id,
    total_amount, status,
    valid_until, items: JSON,
    created_at, updated_at,
    client_name, location_name
}
```

**Status Enum**: 'Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Expirada'

**🔗 Ramificación**:
- `client_id` → tabla `Clients`
- `location_id` → tabla `Locations`
- `items` (JSON) → puede contener equipment_ids, service_ids

---

#### 2.2 POST `/api/quotes`
**Ubicación**: `server-clean.js` línea 4439  

**Body**:
```javascript
{
    client_id: number,       // REQUERIDO - FK a Clients
    location_id: number,     // Opcional - FK a Locations
    title: string,           // REQUERIDO
    description: text,
    total_amount: decimal,   // REQUERIDO
    valid_until: date,
    items: [                 // Array de items
        {
            description: string,
            quantity: number,
            unit_price: decimal,
            total: decimal,
            equipment_id: number,     // ⚠️ Opcional - vincula con Equipos
            service_type: string
        }
    ]
}
```

**Auto-generación**:
- `quote_number`: formato "Q-YYYY-MM-XXXXX"
- `status`: 'Borrador' por defecto

---

#### 2.3 GET `/api/quotes/:id`
**Ubicación**: `server-clean.js` línea 4622  

**Funcionalidad**:
- Obtener cotización específica con detalles completos
- Incluye información de cliente y location

---

#### 2.4 PUT `/api/quotes/:id`
**Ubicación**: `server-clean.js` línea 4512  

**Funcionalidad**:
- Actualizar cotización
- Permite cambiar items, amounts, status

**Transición de Status**:
```
Borrador → Enviada → Aprobada/Rechazada
                   ↘ Expirada (si valid_until < hoy)
```

---

#### 2.5 DELETE `/api/quotes/:id`
**Ubicación**: `server-clean.js` línea 4590  

**Validación**:
- No se puede eliminar si status='Aprobada' (ya generó factura)

---

### 3. FACTURAS (Invoices) - 6 Endpoints

#### 3.1 GET `/api/invoices`
**Ubicación**: `server-clean.js` línea 4679  

**Funcionalidad**:
- Lista facturas con filtros
- JOIN con Clients, Locations, Quotes

**Response Structure**:
```javascript
{
    id, invoice_number, title, description,
    client_id, location_id, quote_id,    // ⚠️ Vincula con Quote
    total_amount, status, due_date,
    paid_at, items: JSON,
    created_at, updated_at,
    client_name, location_name, quote_number
}
```

**Status Enum**: 'Pendiente', 'Enviada', 'Pagada', 'Vencida', 'Cancelada'

---

#### 3.2 POST `/api/invoices`
**Ubicación**: `server-clean.js` línea 4742  

**Body**:
```javascript
{
    client_id: number,       // REQUERIDO
    quote_id: number,        // ⚠️ Opcional - vincula con cotización
    title: string,
    description: text,
    total_amount: decimal,
    due_date: date,
    items: JSON              // Si quote_id existe, copia items de la Quote
}
```

**Auto-generación**:
- `invoice_number`: formato "INV-YYYY-MM-XXXXX"
- Si `quote_id` existe, cambia status de Quote a 'Aprobada'

**🔗 Flujo Quote → Invoice**:
```javascript
// 1. Cliente aprueba cotización
PUT /api/quotes/123 { status: 'Aprobada' }

// 2. Sistema genera factura automática
POST /api/invoices {
    quote_id: 123,
    client_id: quote.client_id,
    title: quote.title,
    total_amount: quote.total_amount,
    items: quote.items  // Copia items
}
```

---

#### 3.3 GET `/api/invoices/:id`
**Ubicación**: `server-clean.js` línea 4936  

---

#### 3.4 PUT `/api/invoices/:id`
**Ubicación**: `server-clean.js` línea 4817  

---

#### 3.5 PUT `/api/invoices/:id/mark-paid`
**Ubicación**: `server-clean.js` línea 4992  
**Roles**: ⚠️ **SOLO Admin y Manager**  

**Funcionalidad**:
- Marcar factura como pagada
- Registra `paid_at` timestamp
- Cambia status: 'Pendiente|Enviada' → 'Pagada'

**Body**:
```javascript
{
    payment_method: string,
    payment_reference: string,
    payment_notes: text
}
```

---

#### 3.6 DELETE `/api/invoices/:id`
**Ubicación**: `server-clean.js` línea 4904  

---

## 🔗 Mapa de Ramificaciones

### Conexiones con Otros Módulos

```
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULO FINANZAS                          │
│  (Expenses, Quotes, Invoices)                               │
└───────────┬─────────────┬──────────────┬────────────────────┘
            │             │              │
            ▼             ▼              ▼
    ┌───────────┐  ┌──────────┐  ┌─────────────┐
    │  CLIENTS  │  │ TICKETS  │  │  CONTRACTS  │
    │           │  │          │  │             │
    │ client_id │  │ reference│  │  reference  │
    │           │  │ _type/id │  │  _type/id   │
    └───────────┘  └──────────┘  └─────────────┘
            │             │              │
            ▼             ▼              ▼
    ┌───────────┐  ┌──────────┐  ┌─────────────┐
    │ LOCATIONS │  │ EQUIPMENT│  │    USERS    │
    │           │  │          │  │             │
    │location_id│  │reference │  │ created_by  │
    │           │  │ _type/id │  │ approved_by │
    └───────────┘  └──────────┘  └─────────────┘
```

### Tabla de Referencias

| Módulo Finanzas | Campo           | Módulo Destino | Descripción |
|-----------------|-----------------|----------------|-------------|
| Expenses        | `reference_type`/`reference_id` | Tickets/Equipment/Contracts | Vincula gasto con origen |
| Expenses        | `created_by`    | Users          | Usuario que creó el gasto |
| Expenses        | `approved_by`   | Users          | Usuario que aprobó el gasto |
| Expenses        | `category_id`   | ExpenseCategories | Categoría del gasto |
| Quotes          | `client_id`     | Clients        | Cliente de la cotización |
| Quotes          | `location_id`   | Locations      | Sede del cliente |
| Quotes          | `items[].equipment_id` | Equipment | Equipos cotizados |
| Invoices        | `client_id`     | Clients        | Cliente facturado |
| Invoices        | `quote_id`      | Quotes         | Cotización origen |
| Invoices        | `location_id`   | Locations      | Sede facturada |

---

## 🚨 Consideraciones Críticas

### 1. Integridad Referencial
```javascript
// ⚠️ PROBLEMA: Si se elimina un Ticket, ¿qué pasa con Expenses asociados?
// SOLUCIÓN ACTUAL: No hay FK constraint, solo referencia lógica
// RECOMENDACIÓN: Implementar ON DELETE SET NULL o CASCADE
```

### 2. Performance con reference_type/reference_id
```sql
-- ⚠️ Sin índices en reference_type/reference_id
-- IMPACTO: Queries lentas al buscar gastos por ticket/equipo

-- SOLUCIÓN RECOMENDADA:
ALTER TABLE Expenses 
ADD INDEX idx_expenses_reference (reference_type, reference_id);
```

### 3. Validación de Referencias
```javascript
// ⚠️ PROBLEMA: No se valida que reference_id exista
// POST /api/expenses puede aceptar reference_id=999999 (no existe)

// SOLUCIÓN RECOMENDADA:
if (reference_type && reference_id) {
    const table = {
        'Ticket': 'Tickets',
        'Equipment': 'Equipment',
        'Contract': 'Contracts'
    }[reference_type];
    
    const exists = await db.getAsync(
        `SELECT id FROM ${table} WHERE id = ?`, 
        [reference_id]
    );
    
    if (!exists) {
        return res.status(400).json({
            error: `${reference_type} con ID ${reference_id} no existe`
        });
    }
}
```

### 4. Permisos y Seguridad

**Matriz de Permisos**:

| Endpoint | Technician | Manager | Admin |
|----------|-----------|---------|-------|
| GET /expenses | ✅ Solo propios | ✅ Todos | ✅ Todos |
| POST /expenses | ✅ | ✅ | ✅ |
| PUT /expenses/:id | ✅ Solo propios | ✅ Todos | ✅ Todos |
| PUT /expenses/:id/approve | ❌ | ✅ | ✅ |
| PUT /expenses/:id/reject | ❌ | ✅ | ✅ |
| PUT /expenses/:id/pay | ❌ | ✅ | ✅ |
| DELETE /expenses/:id | ✅ Solo propios | ✅ Todos | ✅ Todos |

**⚠️ PROBLEMA DETECTADO**: Falta implementación de filtro por rol en GET /expenses
```javascript
// IMPLEMENTACIÓN ACTUAL:
app.get('/api/expenses', authenticateToken, (req, res) => {
    // ⚠️ Retorna TODOS los gastos sin filtrar por usuario
    db.all('SELECT * FROM Expenses ...', ...);
});

// SOLUCIÓN RECOMENDADA:
app.get('/api/expenses', authenticateToken, (req, res) => {
    let sql = 'SELECT * FROM Expenses WHERE 1=1';
    const params = [];
    
    // Technicians solo ven sus propios gastos
    if (req.user.role === 'Technician') {
        sql += ' AND created_by = ?';
        params.push(req.user.id);
    }
    
    db.all(sql, params, ...);
});
```

---

## 📊 Análisis de Uso en Frontend

### finanzas.js (1035 líneas)

**Estructura**:
```javascript
// 3 Vistas (tabs)
- quotes-view       → Gestión de Cotizaciones
- invoices-view     → Gestión de Facturas
- expenses-view     → Gestión de Gastos

// APIs utilizadas:
api.quotes.getAll()        → GET /api/quotes
api.quotes.create()        → POST /api/quotes
api.quotes.update()        → PUT /api/quotes/:id
api.quotes.delete()        → DELETE /api/quotes/:id

api.invoices.getAll()      → GET /api/invoices
api.invoices.create()      → POST /api/invoices
api.invoices.markPaid()    → PUT /api/invoices/:id/mark-paid
api.invoices.delete()      → DELETE /api/invoices/:id

api.expenses.getAll()      → GET /api/expenses
api.expenses.create()      → POST /api/expenses
api.expenses.update()      → PUT /api/expenses/:id
api.expenses.approve()     → PUT /api/expenses/:id/approve
api.expenses.reject()      → PUT /api/expenses/:id/reject
api.expenses.delete()      → DELETE /api/expenses/:id
api.expenses.getStats()    → GET /api/expenses/stats
```

**⚠️ PROBLEMA DETECTADO**: No usa authenticatedFetch del authManager
```javascript
// LÍNEA ~99:
const api = {
    quotes: {
        getAll: async (params = {}) => {
            // ⚠️ Usa authenticatedFetch() pero sin window.authManager
            const response = await authenticatedFetch(`${API_URL}/quotes?${queryString}`);
        }
    }
}

// SOLUCIÓN: Cambiar a window.authManager.authenticatedFetch()
```

---

## 🔧 Recomendaciones de Mejora

### Alta Prioridad

1. **Agregar Validación de Referencias**
   ```javascript
   // En POST /api/expenses
   if (reference_type && reference_id) {
       await validateReference(reference_type, reference_id);
   }
   ```

2. **Implementar Filtros por Rol en GET /api/expenses**
   ```javascript
   if (req.user.role === 'Technician') {
       sql += ' AND created_by = ?';
       params.push(req.user.id);
   }
   ```

3. **Agregar Índices de Performance**
   ```sql
   ALTER TABLE Expenses ADD INDEX idx_expenses_reference (reference_type, reference_id);
   ALTER TABLE Expenses ADD INDEX idx_expenses_status (status);
   ALTER TABLE Expenses ADD INDEX idx_expenses_date (date);
   ```

### Media Prioridad

4. **Implementar Soft Delete**
   ```javascript
   // Agregar columna deleted_at
   // En DELETE, hacer UPDATE deleted_at = NOW() en lugar de DELETE
   ```

5. **Webhook/Event System**
   ```javascript
   // Cuando se aprueba un gasto relacionado con Ticket:
   if (expense.reference_type === 'Ticket') {
       await updateTicketCost(expense.reference_id, expense.amount);
       await triggerNotification('expense_approved', expense);
   }
   ```

6. **Logs de Auditoría**
   ```javascript
   // Tabla ExpenseAuditLog
   // Registrar: quién, cuándo, qué cambió
   CREATE TABLE ExpenseAuditLog (
       id INT PRIMARY KEY,
       expense_id INT,
       user_id INT,
       action ENUM('created', 'updated', 'approved', 'rejected', 'paid', 'deleted'),
       old_values JSON,
       new_values JSON,
       created_at TIMESTAMP
   );
   ```

### Baja Prioridad

7. **Dashboard Financiero**
   - Gráficos de gastos por mes/categoría
   - Proyección de gastos
   - Alertas de presupuesto

8. **Export a PDF/Excel**
   - Cotizaciones con logo de la empresa
   - Facturas con formato SII (Chile)
   - Reportes de gastos exportables

9. **Integración Contable**
   - Export a formato de software contable
   - API para sistemas externos

---

## 📝 Checklist de Verificación

- [x] Endpoints documentados
- [x] Ramificaciones identificadas
- [ ] Validación de referencias implementada
- [ ] Filtros por rol implementados
- [ ] Índices de performance agregados
- [ ] Tests de integración creados
- [ ] Documentación de API actualizada

---

## 🎯 Conclusión

El módulo de Finanzas está **funcionalmente completo** pero tiene **áreas de mejora críticas**:

1. **Seguridad**: Falta filtrado por rol en GET endpoints
2. **Performance**: Sin índices en reference_type/reference_id
3. **Integridad**: No valida que reference_id exista
4. **Frontend**: No usa correctamente authManager.authenticatedFetch()

**Prioridad Recomendada**: Implementar validaciones de referencias y filtros por rol antes de producción.

---

**Documento generado**: 17/10/2025  
**Autor**: GitHub Copilot AI  
**Versión**: 1.0
