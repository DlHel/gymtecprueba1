# Análisis del Documento Maestro ERP Gymtec - Adaptación a Node.js + Express

## 🎯 **Objetivo**
Extraer reglas de negocio, ideas implementadas y funcionalidades del documento maestro LAMP para adaptarlas a nuestro proyecto Node.js + Express + MySQL existente.

---

## 📋 **REGLAS DE NEGOCIO PRINCIPALES**

### 1. **Sistema de Tickets con Workflow Validado**

**Regla Original (LAMP)**:
```
Estados: pendiente → en_progreso → completado → cerrado → cancelado
Guardias: No cerrar sin checklist completo + tiempos + nota final
```

**Adaptación Node.js + Express**:
```javascript
// Pseudocódigo - TicketService.js
class TicketService {
  static async updateStatus(ticketId, newStatus, userId) {
    const ticket = await TicketModel.findById(ticketId);
    
    // Validar transiciones permitidas
    const validTransitions = {
      'pendiente': ['en_progreso', 'cancelado'],
      'en_progreso': ['completado', 'pendiente', 'cancelado'],
      'completado': ['cerrado'],
      'cerrado': [], // Final
      'cancelado': [] // Final
    };
    
    if (!validTransitions[ticket.status].includes(newStatus)) {
      throw new Error(`Transición no válida: ${ticket.status} → ${newStatus}`);
    }
    
    // Guardia: No cerrar sin checklist completo
    if (newStatus === 'cerrado') {
      const checklist = await ChecklistModel.getByTicketId(ticketId);
      if (!checklist || !checklist.isComplete) {
        throw new Error('No se puede cerrar ticket sin checklist completo');
      }
      
      const timeEntries = await TimeEntryModel.getByTicketId(ticketId);
      if (!timeEntries.length) {
        throw new Error('No se puede cerrar ticket sin registro de tiempos');
      }
    }
    
    return await TicketModel.updateStatus(ticketId, newStatus, userId);
  }
}
```

### 2. **SLA Automático Basado en Contratos**

**Regla Original**:
```
Al crear ticket → cargar prioridad y deadline desde contrato vigente
SLA por prioridad: P1=4h, P2=8h, P3=24h, P4=72h
```

**Adaptación Node.js**:
```javascript
// Pseudocódigo - SLAService.js
class SLAService {
  static async calculateDeadline(equipmentId, priority) {
    // Obtener contrato vigente del equipo
    const equipment = await EquipmentModel.findWithContract(equipmentId);
    const contract = equipment.location.client.activeContract;
    
    if (!contract) {
      throw new Error('No hay contrato vigente para calcular SLA');
    }
    
    // SLA por prioridad desde contrato
    const slaHours = {
      'P1': contract.sla_p1_hours || 4,
      'P2': contract.sla_p2_hours || 8,
      'P3': contract.sla_p3_hours || 24,
      'P4': contract.sla_p4_hours || 72
    };
    
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + slaHours[priority]);
    
    return deadline;
  }
  
  static async checkSLABreaches() {
    const overdueTickets = await TicketModel.findOverdue();
    
    for (const ticket of overdueTickets) {
      await NotificationService.sendSLAAlert(ticket);
      await AuditService.log('sla_breach', 'ticket', ticket.id);
    }
  }
}
```

### 3. **Sistema de Checklist Obligatorio**

**Regla Original**:
```
Checklist por tipo de ticket
Items obligatorios antes de cerrar
Templates reutilizables
```

**Adaptación Node.js**:
```javascript
// Pseudocódigo - ChecklistService.js
class ChecklistService {
  static async createFromTemplate(ticketId, templateId) {
    const template = await ChecklistTemplateModel.findById(templateId);
    const items = template.items.map(item => ({
      ticket_id: ticketId,
      description: item.description,
      completed: false,
      required: item.required
    }));
    
    return await ChecklistItemModel.createMany(items);
  }
  
  static async validateCompletion(ticketId) {
    const items = await ChecklistItemModel.getByTicketId(ticketId);
    const requiredItems = items.filter(item => item.required);
    const completedRequired = requiredItems.filter(item => item.completed);
    
    return {
      isComplete: completedRequired.length === requiredItems.length,
      total: items.length,
      completed: items.filter(item => item.completed).length,
      requiredMissing: requiredItems.length - completedRequired.length
    };
  }
}
```

### 4. **Gestión de Inventario Inteligente**

**Regla Original**:
```
Stock mínimo → solicitudes automáticas
Consumo en tickets → actualización stock
Reservas → OC automática si no hay stock
```

**Adaptación Node.js**:
```javascript
// Pseudocódigo - InventoryService.js
class InventoryService {
  static async consumeFromTicket(ticketId, sparePartId, quantity) {
    const sparePart = await SparePartModel.findById(sparePartId);
    
    if (sparePart.stock_actual < quantity) {
      throw new Error(`Stock insuficiente. Disponible: ${sparePart.stock_actual}`);
    }
    
    // Consumir stock
    await SparePartModel.updateStock(sparePartId, -quantity);
    
    // Registrar transacción
    await InventoryTransactionModel.create({
      spare_part_id: sparePartId,
      type: 'salida',
      quantity: quantity,
      reference_type: 'ticket',
      reference_id: ticketId,
      reason: 'consumo_ticket'
    });
    
    // Verificar stock mínimo
    await this.checkMinimumStock(sparePartId);
  }
  
  static async checkMinimumStock(sparePartId) {
    const sparePart = await SparePartModel.findById(sparePartId);
    
    if (sparePart.stock_actual <= sparePart.stock_minimo) {
      // Crear solicitud automática
      await SparePartRequestModel.create({
        spare_part_id: sparePartId,
        quantity_requested: sparePart.stock_minimo * 2, // Reposición automática
        status: 'auto_generated',
        requested_by: 1, // Sistema
        reason: 'stock_minimo_alcanzado'
      });
      
      await NotificationService.sendLowStockAlert(sparePart);
    }
  }
}
```

### 5. **Sistema de Órdenes de Compra**

**Regla Original**:
```
Flujo: pendiente → recibido_parcial → recibido_total → cerrado/anulado
Recepción parcial permitida
Actualización de costo promedio
```

**Adaptación Node.js**:
```javascript
// Pseudocódigo - PurchaseOrderService.js
class PurchaseOrderService {
  static async receiveItems(orderId, receivedItems) {
    const order = await PurchaseOrderModel.findWithItems(orderId);
    
    for (const received of receivedItems) {
      const orderItem = order.items.find(item => item.id === received.item_id);
      
      if (received.quantity > (orderItem.quantity - orderItem.received_quantity)) {
        throw new Error(`Cantidad recibida excede la pendiente`);
      }
      
      // Actualizar item recibido
      await PurchaseOrderItemModel.updateReceived(received.item_id, received.quantity);
      
      // Actualizar stock y costo promedio
      await this.updateStockAndCost(orderItem.spare_part_id, received.quantity, received.unit_cost);
    }
    
    // Verificar si la orden está completa
    await this.checkOrderCompletion(orderId);
  }
  
  static async updateStockAndCost(sparePartId, quantity, unitCost) {
    const sparePart = await SparePartModel.findById(sparePartId);
    
    // Calcular nuevo costo promedio ponderado
    const totalValue = (sparePart.stock_actual * sparePart.unit_cost) + (quantity * unitCost);
    const totalQuantity = sparePart.stock_actual + quantity;
    const newAverageCost = totalValue / totalQuantity;
    
    await SparePartModel.update(sparePartId, {
      stock_actual: totalQuantity,
      unit_cost: newAverageCost
    });
  }
}
```

---

## 📊 **MÓDULOS Y FUNCIONALIDADES AVANZADAS**

### 1. **Sistema de Reportes Avanzado**

**Características**:
- Reportes predefinidos con filtros
- Exportación CSV/PDF/HTML
- Agendamiento por correo
- Caché inteligente
- Permisos granulares

**Adaptación Node.js**:
```javascript
// Pseudocódigo - ReportsService.js
class ReportsService {
  static async generateReport(reportCode, filters, format = 'json') {
    // Validar permisos
    await this.validateReportPermissions(reportCode, filters.userId);
    
    // Buscar en caché
    const cacheKey = this.generateCacheKey(reportCode, filters);
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;
    
    // Ejecutar reporte
    const reportData = await this.executeReport(reportCode, filters);
    
    // Cachear resultado
    await CacheService.set(cacheKey, reportData, 15 * 60); // 15 minutos
    
    // Formatear según requerimiento
    return await this.formatReport(reportData, format);
  }
  
  static predefinedReports = {
    'tickets-by-status': {
      query: `
        SELECT t.status, COUNT(*) as count, c.razon_social as cliente
        FROM tickets t
        JOIN equipment e ON e.id = t.equipment_id
        JOIN locations l ON l.id = e.location_id  
        JOIN clients c ON c.id = l.client_id
        WHERE 1=1
        {{date_filter}}
        {{client_filter}}
        GROUP BY t.status, c.id
        ORDER BY c.razon_social, t.status
      `,
      filters: ['date_range', 'client_id'],
      permissions: ['reports.tickets']
    },
    
    'sla-breaches': {
      query: `
        SELECT t.id, t.summary, c.razon_social, t.priority, 
               t.sla_deadline, TIMESTAMPDIFF(HOUR, t.sla_deadline, NOW()) as hours_overdue
        FROM tickets t
        JOIN equipment e ON e.id = t.equipment_id
        JOIN locations l ON l.id = e.location_id
        JOIN clients c ON c.id = l.client_id
        WHERE t.status IN ('pendiente', 'en_progreso')
        AND t.sla_deadline < NOW()
        ORDER BY hours_overdue DESC
      `,
      filters: ['priority'],
      permissions: ['reports.sla']
    }
  };
}
```

### 2. **Sistema de Auditoría Completo**

**Adaptación Node.js**:
```javascript
// Pseudocódigo - AuditService.js
class AuditService {
  static async log(action, entity, entityId, changes = {}, userId = null, req = null) {
    const auditEntry = {
      user_id: userId,
      action: action, // 'create', 'update', 'delete', 'login', etc.
      entity: entity, // 'ticket', 'equipment', 'user', etc.
      entity_id: entityId,
      changes_json: JSON.stringify(changes),
      ip_address: req?.ip || null,
      user_agent: req?.get('User-Agent') || null,
      created_at: new Date()
    };
    
    await AuditLogModel.create(auditEntry);
    
    // Notificaciones críticas
    if (this.isCriticalAction(action, entity)) {
      await NotificationService.sendAuditAlert(auditEntry);
    }
  }
  
  static isCriticalAction(action, entity) {
    const criticalActions = {
      'user': ['delete', 'role_change'],
      'equipment': ['delete'],
      'ticket': ['force_close'],
      'financial': ['delete', 'payment_reversal']
    };
    
    return criticalActions[entity]?.includes(action) || false;
  }
}
```

### 3. **CRON Jobs Inteligentes**

**Adaptación Node.js**:
```javascript
// Pseudocódigo - CronJobs con Express-Cron
const cron = require('node-cron');

// Job diario: mantenimiento preventivo
cron.schedule('0 6 * * *', async () => {
  console.log('🔧 Ejecutando mantenimiento preventivo...');
  
  try {
    const equipment = await EquipmentModel.findPreventiveMaintenanceDue();
    
    for (const eq of equipment) {
      await TicketService.createPreventive({
        equipment_id: eq.id,
        type: 'preventivo',
        summary: `Mantenimiento preventivo - ${eq.model.name}`,
        priority: 'P3',
        scheduled_date: new Date()
      });
    }
    
    console.log(`✅ Creados ${equipment.length} tickets preventivos`);
  } catch (error) {
    console.error('❌ Error en mantenimiento preventivo:', error);
  }
});

// Job cada 15 minutos: verificar SLA
cron.schedule('*/15 * * * *', async () => {
  await SLAService.checkSLABreaches();
});

// Job cada hora: enviar correos pendientes
cron.schedule('0 * * * *', async () => {
  await MailService.processPendingEmails();
});
```

---

## 🏗️ **MODELO DE DATOS MEJORADO**

### Tablas Principales Nuevas para Nuestro Proyecto:

```sql
-- SLA y Contratos
CREATE TABLE contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  contract_number VARCHAR(50) UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sla_p1_hours INT DEFAULT 4,
  sla_p2_hours INT DEFAULT 8,
  sla_p3_hours INT DEFAULT 24,
  sla_p4_hours INT DEFAULT 72,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Checklist Templates
CREATE TABLE checklist_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  ticket_type ENUM('servicio', 'preventivo') NOT NULL,
  equipment_model_id INT NULL,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (equipment_model_id) REFERENCES equipment_models(id)
);

CREATE TABLE checklist_template_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  description TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id)
);

-- Checklist de Tickets
CREATE TABLE ticket_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  description TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  completed_by INT NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- Inventario Avanzado
CREATE TABLE spare_parts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  part_number VARCHAR(50) UNIQUE,
  description TEXT,
  stock_actual INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  supplier_id INT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE inventory_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spare_part_id INT NOT NULL,
  type ENUM('entrada', 'salida', 'ajuste') NOT NULL,
  quantity INT NOT NULL,
  reference_type VARCHAR(20) NULL, -- 'ticket', 'purchase_order', 'adjustment'
  reference_id INT NULL,
  reason VARCHAR(200),
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spare_part_id) REFERENCES spare_parts(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Órdenes de Compra
CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE,
  supplier_id INT NOT NULL,
  status ENUM('pendiente', 'aprobado', 'recibido_parcial', 'recibido_total', 'cerrado', 'anulado') DEFAULT 'pendiente',
  order_date DATE NOT NULL,
  expected_date DATE NULL,
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by INT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Sistema de Reportes
CREATE TABLE report_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  query_template TEXT NOT NULL,
  allowed_filters JSON,
  required_permission VARCHAR(50),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE report_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  requested_by INT NOT NULL,
  status ENUM('queued', 'running', 'completed', 'failed') DEFAULT 'queued',
  filters_json JSON,
  output_format ENUM('json', 'csv', 'pdf', 'html') DEFAULT 'json',
  file_path VARCHAR(500) NULL,
  rows_count INT NULL,
  error_message TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  FOREIGN KEY (report_id) REFERENCES report_definitions(id),
  FOREIGN KEY (requested_by) REFERENCES users(id)
);

-- Auditoría Completa
CREATE TABLE audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  changes_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_date (created_at)
);
```

---

## 🎯 **PLAN DE IMPLEMENTACIÓN**

### Fase 1: Core Business Logic
1. **Workflow de Tickets** con guardias de estado
2. **Sistema SLA** automático
3. **Checklist** obligatorio por tipo de ticket
4. **Auditoría** completa de acciones

### Fase 2: Inventario Inteligente  
1. **Gestión de repuestos** con stock mínimo
2. **Transacciones** de inventario
3. **Solicitudes** automáticas por stock bajo
4. **Consumo** desde tickets

### Fase 3: Compras y Finanzas
1. **Órdenes de compra** con flujo completo
2. **Recepción parcial** de pedidos
3. **Costo promedio** automático
4. **Proveedores** y catálogo

### Fase 4: Reportes y Analytics
1. **Motor de reportes** con filtros
2. **Exportación** múltiple formato
3. **Agendamiento** automático
4. **Caché** inteligente

### Fase 5: Automatización
1. **CRON jobs** para mantenimiento preventivo
2. **Alertas SLA** automáticas
3. **Notificaciones** por correo
4. **Dashboards** en tiempo real

---

## 🔧 **INTEGRACIÓN CON NUESTRO PROYECTO ACTUAL**

### 1. Mantener Arquitectura Existente
- ✅ Node.js + Express + MySQL
- ✅ Vanilla JavaScript frontend
- ✅ Sistema @bitacora para documentación
- ✅ Configuración dual AI (GitHub Copilot + Claude CLI)

### 2. Adaptar Reglas de Negocio
- 🔄 Implementar workflow de tickets validado
- 🔄 Agregar sistema SLA automático
- 🔄 Crear checklist obligatorio
- 🔄 Implementar inventario inteligente
- 🔄 Agregar sistema de auditoría

### 3. Nuevas Funcionalidades
- ➕ Sistema de reportes avanzado
- ➕ Órdenes de compra
- ➕ CRON jobs automatizados
- ➕ Notificaciones inteligentes

---

**✅ ANÁLISIS COMPLETADO**

Este documento extrae todas las reglas de negocio e ideas valiosas del documento maestro LAMP y las adapta en pseudocódigo para nuestro proyecto Node.js + Express + MySQL, manteniendo nuestra arquitectura pero mejorando significativamente las funcionalidades empresariales.

*Análisis realizado: 23 de agosto de 2025*
