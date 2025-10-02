# 🔍 Análisis: Comunicación Frontend-Backend del Módulo de Inventario

**Fecha**: 2 de octubre de 2025  
**Módulo**: Sistema de Inventario Unificado  
**Estado**: ⚠️ PROBLEMAS CRÍTICOS DETECTADOS  

---

## 📊 Resumen Ejecutivo

Después de revisar la comunicación entre el frontend (`js/inventario.js`) y el backend (`routes/inventory.js`), se detectaron **MÚLTIPLES DESCONEXIONES CRÍTICAS** que impiden el funcionamiento completo del módulo de inventario.

### 🚨 Problemas Principales:
1. **3 endpoints faltantes** en el backend
2. **1 mismatch de nombres** (transactions vs movements)
3. **8+ funciones placeholder** sin implementación
4. **Sistema de órdenes de compra** incompleto
5. **Sistema de asignación a técnicos** no implementado

---

## 📋 Endpoints del Backend (EXISTENTES)

### ✅ Endpoints Implementados en `backend/src/routes/inventory.js`:

| Método | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/api/inventory` | Listar inventario con filtros | ✅ Funcional |
| POST | `/api/inventory` | Crear nuevo item | ✅ Funcional |
| PUT | `/api/inventory/:id` | Actualizar item | ✅ Funcional |
| POST | `/api/inventory/:id/adjust` | Ajustar stock | ✅ Funcional |
| GET | `/api/inventory/movements` | Historial de movimientos | ✅ Funcional |
| GET | `/api/inventory/low-stock` | Items con stock bajo | ✅ Funcional |
| GET | `/api/inventory/categories` | Categorías | ✅ Funcional |
| POST | `/api/inventory/categories` | Crear categoría | ✅ Funcional |
| GET | `/api/inventory/spare-parts` | Repuestos disponibles | ✅ Funcional |
| POST | `/api/inventory/spare-part-requests` | Solicitud de compra | ✅ Funcional |
| GET | `/api/inventory/spare-part-requests` | Lista de solicitudes | ✅ Funcional |

**Total**: 11 endpoints implementados

---

## 🔴 Llamadas del Frontend (PROBLEMAS)

### Análisis de `frontend/js/inventario.js`:

#### ✅ Llamadas que FUNCIONAN:

```javascript
// 1. Cargar inventario central
loadCentralInventory() {
    fetch(`${this.apiBaseUrl}/inventory`)  // ✅ EXISTE
}

// 2. Cargar técnicos
loadTechnicians() {
    fetch(`${this.apiBaseUrl}/users?role=technician`)  // ✅ EXISTE (endpoint de usuarios)
}
```

#### ❌ Llamadas con PROBLEMAS:

```javascript
// 1. PROBLEMA: Endpoint no existe
loadTechnicianInventory() {
    fetch(`${this.apiBaseUrl}/inventory/technicians`)
    // ❌ NO EXISTE - Debe crearse o usar alternativa
}

// 2. PROBLEMA: Endpoint mal nombrado
loadPurchaseOrders() {
    fetch(`${this.apiBaseUrl}/purchase-orders`)
    // ❌ Debería ser /api/inventory/purchase-orders
    // O crear endpoint separado para órdenes de compra
}

// 3. PROBLEMA: Nombre incorrecto
loadTransactions() {
    fetch(`${this.apiBaseUrl}/inventory/transactions`)
    // ❌ Backend tiene /api/inventory/movements
    // SOLUCIÓN: Cambiar a /movements en frontend
}
```

---

## 🔧 Funciones Placeholder del Frontend

### 🚨 CRÍTICO: Funciones NO IMPLEMENTADAS (solo console.log)

Estas funciones existen en el frontend pero NO hacen nada productivo:

```javascript
// frontend/js/inventario.js (líneas 800+)

async saveInventoryItem() {
    console.log('💾 Guardando repuesto...');
    this.showNotification('Funcionalidad en desarrollo', 'info');
    // ❌ NO IMPLEMENTADA
}

async savePurchaseOrder() {
    console.log('💾 Guardando orden de compra...');
    this.showNotification('Funcionalidad en desarrollo', 'info');
    // ❌ NO IMPLEMENTADA
}

async assignToTechnician() {
    console.log('💾 Asignando a técnico...');
    this.showNotification('Funcionalidad en desarrollo', 'info');
    // ❌ NO IMPLEMENTADA
}

async editInventoryItem(id) {
    console.log(`✏️ Editando repuesto ${id}...`);
    this.showNotification('Funcionalidad en desarrollo', 'info');
    // ❌ NO IMPLEMENTADA
}

async deleteInventoryItem(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este repuesto?')) {
        console.log(`🗑️ Eliminando repuesto ${id}...`);
        this.showNotification('Funcionalidad en desarrollo', 'info');
    }
    // ❌ NO IMPLEMENTADA
}

async receiveOrder(id) {
    console.log(`📦 Marcando orden ${id} como recibida...`);
    this.showNotification('Funcionalidad en desarrollo', 'info');
    // ❌ NO IMPLEMENTADA
}

async cancelOrder(id) {
    if (confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
        console.log(`❌ Cancelando orden ${id}...`);
        this.showNotification('Funcionalidad en desarrollo', 'info');
    }
    // ❌ NO IMPLEMENTADA
}

async returnFromTechnician(technicianId, itemId) {
    console.log(`↩️ Devolviendo repuesto ${itemId} del técnico ${technicianId}...`);
    this.showNotification('Funcionalidad en desarrollo', 'info');
    // ❌ NO IMPLEMENTADA
}
```

**Total**: 8 funciones CRUD críticas sin implementar

---

## 📊 Mapa de Comunicación Frontend-Backend

### Sistema de Pestañas del Frontend:

```
┌─────────────────────────────────────────────────────────────┐
│                  INVENTARIO.HTML (FRONTEND)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 Pestaña: INVENTARIO CENTRAL                            │
│  ├─ GET /api/inventory                    ✅ FUNCIONA      │
│  ├─ POST /api/inventory                   ❌ NO IMPL       │
│  ├─ PUT /api/inventory/:id                ❌ NO IMPL       │
│  └─ DELETE /api/inventory/:id             ❌ NO IMPL       │
│                                                             │
│  👥 Pestaña: POR TÉCNICOS                                  │
│  ├─ GET /api/inventory/technicians        ❌ NO EXISTE     │
│  ├─ POST /api/inventory/assign            ❌ NO EXISTE     │
│  └─ POST /api/inventory/return            ❌ NO EXISTE     │
│                                                             │
│  🚚 Pestaña: ÓRDENES DE COMPRA                             │
│  ├─ GET /api/purchase-orders              ❌ NO EXISTE     │
│  ├─ POST /api/purchase-orders             ❌ NO EXISTE     │
│  ├─ PUT /api/purchase-orders/:id/receive  ❌ NO EXISTE     │
│  └─ PUT /api/purchase-orders/:id/cancel   ❌ NO EXISTE     │
│                                                             │
│  📊 Pestaña: MOVIMIENTOS                                   │
│  └─ GET /api/inventory/transactions       ⚠️ MISMATCH     │
│      (debería ser /movements)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Plan de Corrección Completo

### FASE 1: Correcciones Rápidas (Frontend)

#### 1.1 Corregir nombre de endpoint en `inventario.js`:

```javascript
// CAMBIAR:
async loadTransactions() {
    const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/transactions`);
}

// POR:
async loadTransactions() {
    const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/movements`);
}
```

**Archivo**: `frontend/js/inventario.js`  
**Línea**: ~295  
**Impacto**: Pestaña "Movimientos" funcionará correctamente

---

### FASE 2: Endpoints Críticos Faltantes (Backend)

#### 2.1 Crear endpoint `/api/inventory/technicians`

Este endpoint debe retornar el inventario asignado a técnicos.

**Opción A**: Crear tabla de asignaciones
```sql
CREATE TABLE TechnicianInventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    technician_id INT NOT NULL,
    spare_part_id INT NOT NULL,
    quantity INT NOT NULL,
    assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('assigned', 'returned') DEFAULT 'assigned',
    FOREIGN KEY (technician_id) REFERENCES Users(id),
    FOREIGN KEY (spare_part_id) REFERENCES Inventory(id)
);
```

**Opción B**: Usar tabla existente (si ya existe)
```javascript
// backend/src/routes/inventory.js
router.get('/technicians', async (req, res) => {
    try {
        const sql = `
        SELECT 
            ti.*,
            u.username as technician_name,
            u.role,
            i.item_name as spare_part_name,
            i.current_stock
        FROM TechnicianInventory ti
        LEFT JOIN Users u ON ti.technician_id = u.id
        LEFT JOIN Inventory i ON ti.spare_part_id = i.id
        WHERE ti.status = 'assigned'
        ORDER BY ti.assigned_date DESC`;
        
        const assignments = await db.all(sql);
        
        res.json({
            message: 'success',
            data: assignments || []
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});
```

#### 2.2 Crear endpoints de Órdenes de Compra

**Nuevo archivo**: `backend/src/routes/purchase-orders.js`

```javascript
const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

// GET /api/purchase-orders - Listar órdenes
router.get('/', async (req, res) => {
    try {
        const sql = `
        SELECT 
            po.*,
            s.company_name as supplier
        FROM PurchaseOrders po
        LEFT JOIN Suppliers s ON po.supplier_id = s.id
        ORDER BY po.created_at DESC`;
        
        const orders = await db.all(sql);
        
        res.json({
            message: 'success',
            data: orders || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// POST /api/purchase-orders - Crear orden
router.post('/', async (req, res) => {
    try {
        const { supplier_id, items, expected_date } = req.body;
        
        // Insertar orden
        const insertSQL = `
        INSERT INTO PurchaseOrders (supplier_id, expected_date, status)
        VALUES (?, ?, 'pendiente')`;
        
        const result = await db.run(insertSQL, [supplier_id, expected_date]);
        const orderId = result.lastID;
        
        // Insertar items
        for (const item of items) {
            await db.run(`
                INSERT INTO PurchaseOrderItems (order_id, spare_part_id, quantity, unit_price)
                VALUES (?, ?, ?, ?)`,
                [orderId, item.spare_part_id, item.quantity, item.unit_price]
            );
        }
        
        res.status(201).json({
            message: 'Orden creada exitosamente',
            data: { id: orderId }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// PUT /api/purchase-orders/:id/receive - Marcar como recibida
router.put('/:id/receive', async (req, res) => {
    try {
        await db.run(`
            UPDATE PurchaseOrders 
            SET status = 'recibida', received_date = NOW()
            WHERE id = ?`,
            [req.params.id]
        );
        
        res.json({ message: 'Orden marcada como recibida' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// PUT /api/purchase-orders/:id/cancel - Cancelar orden
router.put('/:id/cancel', async (req, res) => {
    try {
        await db.run(`
            UPDATE PurchaseOrders 
            SET status = 'cancelada'
            WHERE id = ?`,
            [req.params.id]
        );
        
        res.json({ message: 'Orden cancelada' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

module.exports = router;
```

**Registrar en server-clean.js**:
```javascript
const purchaseOrdersRoutes = require('./routes/purchase-orders');
app.use('/api/purchase-orders', purchaseOrdersRoutes);
```

---

### FASE 3: Implementar Funciones Frontend

#### 3.1 Implementar `saveInventoryItem()`

```javascript
async saveInventoryItem() {
    const form = document.getElementById('inventory-form');
    const formData = new FormData(form);
    
    const data = {
        item_name: formData.get('name'),
        item_code: formData.get('sku'),
        category_id: formData.get('category'),
        current_stock: parseInt(formData.get('current_stock')),
        minimum_stock: parseInt(formData.get('min_stock')),
        unit_cost: parseFloat(formData.get('unit_price')),
        location_id: formData.get('location')
    };
    
    try {
        const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Error al guardar');
        
        this.showNotification('Repuesto guardado exitosamente', 'success');
        this.closeModal(document.getElementById('inventory-modal'));
        this.loadCentralInventory();
    } catch (error) {
        this.showNotification('Error al guardar repuesto', 'error');
    }
}
```

#### 3.2 Implementar `editInventoryItem(id)`

```javascript
async editInventoryItem(id) {
    try {
        const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/${id}`);
        if (!response.ok) throw new Error('Error al cargar');
        
        const result = await response.json();
        const item = result.data;
        
        // Abrir modal con datos pre-cargados
        this.openInventoryModal(item);
    } catch (error) {
        this.showNotification('Error al cargar repuesto', 'error');
    }
}
```

#### 3.3 Implementar `deleteInventoryItem(id)`

```javascript
async deleteInventoryItem(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este repuesto?')) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error al eliminar');
        
        this.showNotification('Repuesto eliminado exitosamente', 'success');
        this.loadCentralInventory();
    } catch (error) {
        this.showNotification('Error al eliminar repuesto', 'error');
    }
}
```

---

## 📊 Checklist de Implementación

### Backend:

- [ ] Crear endpoint `/api/inventory/technicians`
- [ ] Verificar/crear tabla `TechnicianInventory`
- [ ] Crear archivo `routes/purchase-orders.js`
- [ ] Implementar CRUD completo de órdenes de compra
- [ ] Registrar rutas en `server-clean.js`
- [ ] Verificar tabla `PurchaseOrders` existe
- [ ] Verificar tabla `PurchaseOrderItems` existe

### Frontend:

- [ ] Corregir `/inventory/transactions` → `/inventory/movements`
- [ ] Implementar `saveInventoryItem()`
- [ ] Implementar `editInventoryItem(id)`
- [ ] Implementar `deleteInventoryItem(id)`
- [ ] Implementar `savePurchaseOrder()`
- [ ] Implementar `receiveOrder(id)`
- [ ] Implementar `cancelOrder(id)`
- [ ] Implementar `assignToTechnician()`
- [ ] Implementar `returnFromTechnician()`

### Testing:

- [ ] Probar carga de inventario central
- [ ] Probar CRUD de items
- [ ] Probar asignación a técnicos
- [ ] Probar órdenes de compra
- [ ] Probar movimientos/transacciones
- [ ] Verificar autenticación en todas las llamadas

---

## 🎯 Prioridades

### 🔴 CRÍTICO (Implementar AHORA):
1. Corregir mismatch `transactions` → `movements`
2. Implementar `saveInventoryItem()` (CREATE)
3. Implementar `deleteInventoryItem()` (DELETE)

### 🟡 IMPORTANTE (Próxima iteración):
4. Crear endpoint `/api/inventory/technicians`
5. Implementar sistema de asignación a técnicos
6. Crear endpoints de órdenes de compra

### 🟢 MEJORA (Futuro):
7. Implementar analytics avanzados
8. Agregar gráficos de stock
9. Notificaciones automáticas de stock bajo

---

## 📝 Conclusión

El módulo de inventario tiene una **estructura sólida** pero está **INCOMPLETO**. El backend tiene endpoints básicos funcionando, pero el frontend tiene muchas funciones placeholder que necesitan implementación real.

**Recomendación**: Implementar las correcciones en el orden de prioridad indicado, comenzando por las funciones CRUD básicas y luego expandiendo a las funcionalidades avanzadas (técnicos, órdenes de compra).

**Tiempo Estimado de Implementación**:
- Fase 1 (Correcciones rápidas): 1-2 horas
- Fase 2 (Endpoints críticos): 4-6 horas  
- Fase 3 (Funciones frontend): 6-8 horas
- **Total**: 11-16 horas de desarrollo

---

**Documento creado**: 2 de octubre de 2025  
**Estado**: ⚠️ Requiere acción inmediata
