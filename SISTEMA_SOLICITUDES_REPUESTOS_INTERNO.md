# 📦 Sistema de Solicitudes de Repuestos - Confidencial

## 🎯 Objetivo

Sistema de solicitud de compra de repuestos que **mantiene la información de costos y cotizaciones completamente interna**, sin exponer datos financieros en los tickets visibles al técnico o cliente.

---

## 🔒 Principios de Confidencialidad

### ✅ LO QUE VE EL TÉCNICO (Público)
- Botón "Solicitar Compra" en el ticket
- Modal simple para describir el repuesto necesario
- Confirmación de que la solicitud fue enviada
- **NO ve costos, cotizaciones ni presupuestos**

### 🔐 LO QUE SE MANEJA INTERNAMENTE (Privado)
- Solicitud completa en tabla `spare_part_requests`
- Vinculación con ticket para referencia interna
- Cotizaciones y costos en módulo de finanzas
- Órdenes de compra y aprobaciones
- Historial de precios y proveedores

---

## 📋 Flujo de Trabajo

### 1️⃣ **Técnico Solicita Repuesto**
```
Ticket Detail → Botón "Solicitar Compra" → Modal de Solicitud
```

**Información requerida:**
- ✏️ Nombre del repuesto
- 🔢 Cantidad necesaria
- ⚡ Prioridad (baja/media/alta/urgente)
- 📝 Descripción/especificaciones técnicas
- 💬 Justificación (¿por qué es necesario?)

**Lo que NO se pide al técnico:**
- ❌ Costo estimado
- ❌ Proveedor sugerido
- ❌ Presupuesto
- ❌ Información financiera

### 2️⃣ **Sistema Registra Solicitud (Interno)**
```sql
INSERT INTO spare_part_requests (
    ticket_id,              -- Referencia interna (nullable)
    spare_part_name,        -- Visible para técnico
    quantity_needed,        -- Visible para técnico
    priority,               -- Visible para técnico
    description,            -- Visible para técnico
    justification,          -- Visible para técnico
    requested_by,           -- Usuario que solicita
    status                  -- 'pendiente' inicial
) VALUES (...)
```

**Estado inicial:** `pendiente`

### 3️⃣ **Departamento de Inventario Evalúa**
```
Módulo Inventario → Solicitudes Pendientes → Evaluar → Cotizar
```

**Acciones del departamento:**
- 🔍 Revisar especificaciones
- 💰 Solicitar cotizaciones a proveedores
- 📊 Comparar precios
- ✅ Aprobar o rechazar
- 🛒 Generar orden de compra

**Estados del flujo:**
- `pendiente` → `aprobada` → `comprada` → `recibida`
- `pendiente` → `rechazada` (con justificación interna)

### 4️⃣ **Integración con Finanzas**
```
Finanzas → Gastos → Categoría "Repuestos Solicitados"
```

**Cuando se aprueba la compra:**
- Se crea un gasto en `Expenses`
- Categoría: "Repuestos Solicitados"
- Referencia: `spare_part_request_id`
- Estado: "Pendiente de Pago"
- **Esta información NO se muestra en el ticket**

---

## 🗂️ Estructura de Datos

### Tabla: `spare_part_requests`

```sql
CREATE TABLE spare_part_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Referencia interna (NO visible en ticket público)
    ticket_id INT NULL,
    
    -- Información del repuesto (visible para técnico)
    spare_part_name VARCHAR(255) NOT NULL,
    quantity_needed INT NOT NULL,
    priority ENUM('baja','media','alta','urgente') DEFAULT 'media',
    description TEXT NULL,
    justification TEXT NULL,
    requested_by VARCHAR(255) NULL,
    
    -- Flujo de aprobación (INTERNO - solo inventario/finanzas)
    status ENUM('pendiente','aprobada','rechazada','comprada','recibida'),
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    purchase_order_id INT NULL,
    notes TEXT NULL,  -- Notas internas del departamento
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL
);
```

### Relación con Expenses

```sql
-- Cuando se aprueba la compra, se crea un gasto
INSERT INTO Expenses (
    amount,
    description,
    category_id,
    status,
    reference_type,
    reference_id,
    date
) VALUES (
    {costo_total},  -- INTERNO - no visible en ticket
    'Compra de repuesto: {spare_part_name}',
    (SELECT id FROM ExpenseCategories WHERE name = 'Repuestos Solicitados'),
    'Pendiente',
    'spare_part_request',
    {spare_part_request_id},
    NOW()
);
```

---

## 🛠️ Implementación Frontend

### Archivo: `frontend/js/ticket-detail.js`

#### Función: `showRequestSparePartModal()`

```javascript
async function showRequestSparePartModal() {
    // Modal limpio SIN campos de costo
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="base-modal-content">
            <div class="base-modal-header">
                <h3>Solicitar Compra de Repuesto</h3>
            </div>
            <div class="base-modal-body">
                <!-- Aviso de confidencialidad -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p class="text-sm text-blue-800">
                        <strong>Confidencial:</strong> La información de costos 
                        se maneja internamente. Esta solicitud no aparecerá 
                        en el ticket público.
                    </p>
                </div>
                
                <!-- Formulario simple -->
                <form id="request-spare-part-form">
                    <input type="text" name="spare_part_name" required>
                    <input type="number" name="quantity_needed" required>
                    <select name="priority" required>...</select>
                    <textarea name="description"></textarea>
                    <textarea name="justification"></textarea>
                </form>
            </div>
        </div>
    `;
    
    // Submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitSparePartRequest(form, modal);
    });
}
```

#### Función: `submitSparePartRequest()`

```javascript
async function submitSparePartRequest(form, modal) {
    const requestData = {
        ticket_id: state.currentTicket.id,
        spare_part_name: formData.get('spare_part_name'),
        quantity_needed: parseInt(formData.get('quantity_needed')),
        priority: formData.get('priority'),
        description: formData.get('description'),
        justification: formData.get('justification'),
        requested_by: getCurrentUser().name,
        status: 'pendiente'
    };
    
    const response = await authenticatedFetch(
        `${API_URL}/inventory/spare-part-requests`, 
        {
            method: 'POST',
            body: JSON.stringify(requestData)
        }
    );
    
    if (response.ok) {
        closeModal(modal);
        showNotification(
            '✅ Solicitud enviada al departamento de inventario', 
            'success'
        );
        
        // NO agregar notas visibles al ticket
        // La solicitud es completamente interna
    }
}
```

**⚠️ IMPORTANTE:** La función `addSparePartRequestNote()` fue **REMOVIDA INTENCIONALMENTE** para evitar que aparezca información de solicitudes en el ticket público.

---

## 🔌 Implementación Backend

### Archivo: `backend/src/routes/inventory.js`

#### Endpoint: `POST /api/inventory/spare-part-requests`

```javascript
router.post('/spare-part-requests', authenticateToken, (req, res) => {
    const {
        ticket_id,
        spare_part_name,
        quantity_needed,
        priority,
        description,
        justification,
        requested_by
    } = req.body;
    
    // Validación
    if (!spare_part_name || !quantity_needed) {
        return res.status(400).json({ 
            error: 'Datos incompletos' 
        });
    }
    
    // Insertar solicitud (SIN información de costos)
    const sql = `
        INSERT INTO spare_part_requests (
            ticket_id, spare_part_name, quantity_needed,
            priority, description, justification,
            requested_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')
    `;
    
    db.run(sql, [
        ticket_id,
        spare_part_name,
        quantity_needed,
        priority,
        description,
        justification,
        requested_by
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al crear solicitud' });
        }
        
        res.status(201).json({
            message: 'Solicitud creada exitosamente',
            id: this.lastID
        });
    });
});
```

#### Endpoint: `GET /api/inventory/spare-part-requests` (Solo Admin/Inventario)

```javascript
router.get('/spare-part-requests', 
    authenticateToken, 
    requireRole(['admin', 'manager']),
    (req, res) => {
    
    const { status } = req.query;
    
    let sql = `
        SELECT 
            spr.*,
            t.ticket_number,
            t.title as ticket_title,
            u.username as approved_by_name
        FROM spare_part_requests spr
        LEFT JOIN Tickets t ON spr.ticket_id = t.id
        LEFT JOIN Users u ON spr.approved_by = u.id
    `;
    
    if (status) {
        sql += ` WHERE spr.status = ?`;
    }
    
    sql += ` ORDER BY spr.created_at DESC`;
    
    const params = status ? [status] : [];
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener solicitudes' });
        }
        
        res.json({
            message: 'success',
            data: rows
        });
    });
});
```

---

## 📊 Módulo de Inventario - Vista de Solicitudes

### Archivo: `frontend/inventario.html` (Sección nueva)

```html
<div class="solicitudes-repuestos-section" style="display: none;" id="solicitudes-section">
    <div class="section-header">
        <h2>📦 Solicitudes de Repuestos Pendientes</h2>
        <div class="filters">
            <select id="status-filter">
                <option value="">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
                <option value="comprada">Compradas</option>
                <option value="recibida">Recibidas</option>
            </select>
        </div>
    </div>
    
    <table class="solicitudes-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Repuesto</th>
                <th>Cantidad</th>
                <th>Prioridad</th>
                <th>Ticket</th>
                <th>Solicitado Por</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody id="solicitudes-tbody">
            <!-- Filas generadas dinámicamente -->
        </tbody>
    </table>
</div>
```

### Acciones disponibles por estado:

| Estado | Acciones Disponibles |
|--------|---------------------|
| `pendiente` | 👁️ Ver Detalles, ✅ Aprobar, ❌ Rechazar, 💰 Cotizar |
| `aprobada` | 🛒 Generar Orden de Compra, 💰 Ver Cotizaciones |
| `comprada` | 📦 Marcar como Recibida, 🧾 Ver Factura |
| `recibida` | ✅ Ingresar a Inventario, 📊 Ver Historial |
| `rechazada` | 👁️ Ver Razón de Rechazo |

---

## 💰 Integración con Módulo de Finanzas

### Vista: Gastos por Solicitudes de Repuestos

```javascript
// frontend/js/finanzas.js

async function loadSparePartExpenses() {
    const response = await authenticatedFetch(
        `${API_URL}/expenses?category=Repuestos Solicitados`
    );
    
    const expenses = await response.json();
    
    // Mostrar gastos con referencia a spare_part_request_id
    expenses.data.forEach(expense => {
        if (expense.reference_type === 'spare_part_request') {
            // Obtener detalles de la solicitud
            const requestId = expense.reference_id;
            // Mostrar información financiera SOLO en módulo de finanzas
        }
    });
}
```

### Reporte: Costos por Solicitudes

```sql
-- Query para reporte financiero (SOLO visible en módulo finanzas)
SELECT 
    spr.id,
    spr.spare_part_name,
    spr.quantity_needed,
    spr.priority,
    e.amount as costo_total,
    e.status as estado_pago,
    t.ticket_number,
    spr.created_at,
    spr.approved_at,
    DATEDIFF(spr.approved_at, spr.created_at) as dias_aprobacion
FROM spare_part_requests spr
LEFT JOIN Expenses e ON e.reference_type = 'spare_part_request' 
    AND e.reference_id = spr.id
LEFT JOIN Tickets t ON spr.ticket_id = t.id
WHERE spr.status IN ('aprobada', 'comprada', 'recibida')
ORDER BY spr.created_at DESC;
```

---

## ✅ Checklist de Implementación

### Frontend
- [x] Modal de solicitud SIN campos de costo
- [x] Mensaje de confidencialidad en modal
- [x] Función `submitSparePartRequest()` sin agregar notas al ticket
- [x] Función `addSparePartRequestNote()` REMOVIDA
- [ ] Sección de solicitudes en módulo inventario (para admin/manager)
- [ ] Filtros por estado en vista de solicitudes
- [ ] Botones de acción según estado

### Backend
- [x] Tabla `spare_part_requests` creada
- [x] Endpoint `POST /api/inventory/spare-part-requests`
- [x] Endpoint `GET /api/inventory/spare-part-requests` con filtros
- [ ] Endpoint `PUT /api/inventory/spare-part-requests/:id/approve`
- [ ] Endpoint `PUT /api/inventory/spare-part-requests/:id/reject`
- [ ] Endpoint `POST /api/inventory/spare-part-requests/:id/purchase-order`
- [ ] Integración con `Expenses` al aprobar compra

### Base de Datos
- [x] Tabla `spare_part_requests` con índices
- [ ] Trigger para crear gasto al aprobar
- [ ] Vista para reportes financieros
- [ ] Procedimiento almacenado para workflow completo

---

## 🔐 Seguridad y Permisos

### Roles y Accesos

| Rol | Ver Solicitudes | Aprobar | Rechazar | Ver Costos | Generar OC |
|-----|----------------|---------|----------|------------|------------|
| **Técnico** | ❌ No (solo crea) | ❌ | ❌ | ❌ | ❌ |
| **Manager** | ✅ Sí | ✅ | ✅ | ✅ | ❌ |
| **Admin** | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| **Finanzas** | ✅ Sí | ❌ | ❌ | ✅ | ✅ |

### Middleware de Autorización

```javascript
// Verificar que solo admin/manager puedan ver solicitudes
router.get('/spare-part-requests', 
    authenticateToken,
    requireRole(['admin', 'manager', 'finanzas']),
    getSparePartRequests
);

// Verificar que solo admin/manager puedan aprobar
router.put('/spare-part-requests/:id/approve',
    authenticateToken,
    requireRole(['admin', 'manager']),
    approveSparePartRequest
);
```

---

## 📈 Métricas y Reportes (Solo Administración)

### KPIs de Solicitudes

1. **Tiempo Promedio de Aprobación**
   - Desde `created_at` hasta `approved_at`
   - Meta: < 24 horas para prioridad "urgente"

2. **Costo Promedio por Solicitud**
   - Total gastado / Número de solicitudes aprobadas
   - Tendencia mensual

3. **Tasa de Aprobación**
   - Aprobadas / Total de solicitudes
   - Meta: > 80%

4. **Solicitudes por Técnico**
   - Ranking de técnicos que más solicitan
   - Análisis de patrones

### Dashboard Financiero

```javascript
// Resumen ejecutivo (SOLO para admin/finanzas)
{
    "solicitudes_pendientes": 12,
    "solicitudes_mes_actual": 45,
    "costo_total_mes": 15420.50,
    "costo_promedio_solicitud": 342.68,
    "tiempo_promedio_aprobacion_dias": 1.8,
    "tasa_aprobacion": 0.87  // 87%
}
```

---

## 🎯 Próximos Pasos

### Fase 1: Core Funcional (Actual)
- [x] Sistema de solicitudes básico
- [x] Confidencialidad de costos
- [x] Modal de técnico sin información financiera

### Fase 2: Gestión Completa
- [ ] Vista de solicitudes pendientes para inventario
- [ ] Workflow de aprobación/rechazo
- [ ] Integración automática con gastos

### Fase 3: Cotizaciones
- [ ] Sistema de cotizaciones múltiples por solicitud
- [ ] Comparación de proveedores
- [ ] Historial de precios

### Fase 4: Órdenes de Compra
- [ ] Generación automática de OC
- [ ] Seguimiento de entregas
- [ ] Notificaciones de llegada

### Fase 5: Analytics
- [ ] Dashboard ejecutivo
- [ ] Reportes de costos por cliente
- [ ] Predicción de necesidades

---

## 📞 Soporte

Para preguntas sobre el sistema de solicitudes internas:
- 📧 Email: soporte@gymtec.com
- 📱 WhatsApp: +569 XXXX XXXX
- 💬 Slack: #desarrollo-gymtec

---

**Última actualización:** 2 de octubre de 2025  
**Versión:** 1.0  
**Autor:** Equipo de Desarrollo GymTec
