-- ===================================================================
-- GYMTEC ERP - FASE 3: SISTEMA DE INVENTARIO INTELIGENTE Y REPORTES
-- Esquema de Base de Datos - 8 Nuevas Tablas
-- Fecha: 24 de agosto de 2025
-- ===================================================================

-- 1. CATEGORÍAS DE INVENTARIO
CREATE TABLE IF NOT EXISTS InventoryCategories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_category_id INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES InventoryCategories(id),
    INDEX idx_parent_category (parent_category_id),
    INDEX idx_active (is_active)
);

-- 2. PROVEEDORES
CREATE TABLE IF NOT EXISTS Suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    rating DECIMAL(3,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_supplier_code (supplier_code),
    INDEX idx_company_name (company_name),
    INDEX idx_active (is_active)
);

-- 3. INVENTARIO PRINCIPAL
CREATE TABLE IF NOT EXISTS Inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    unit_of_measure ENUM('unit', 'kg', 'meter', 'liter', 'box', 'set', 'pack') NOT NULL DEFAULT 'unit',
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    maximum_stock DECIMAL(10,2) DEFAULT 999999.99,
    reorder_point DECIMAL(10,2) DEFAULT 0.00,
    reorder_quantity DECIMAL(10,2) DEFAULT 0.00,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    average_cost DECIMAL(10,2) DEFAULT 0.00,
    last_cost DECIMAL(10,2) DEFAULT 0.00,
    location_id INT,
    primary_supplier_id INT,
    alternative_supplier_id INT,
    lead_time_days INT DEFAULT 0,
    shelf_life_days INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    is_critical BOOLEAN DEFAULT false,
    last_counted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES InventoryCategories(id),
    FOREIGN KEY (location_id) REFERENCES Locations(id),
    FOREIGN KEY (primary_supplier_id) REFERENCES Suppliers(id),
    FOREIGN KEY (alternative_supplier_id) REFERENCES Suppliers(id),
    INDEX idx_item_code (item_code),
    INDEX idx_category (category_id),
    INDEX idx_location (location_id),
    INDEX idx_stock_levels (current_stock, minimum_stock),
    INDEX idx_active (is_active),
    INDEX idx_critical (is_critical)
);

-- 4. MOVIMIENTOS DE INVENTARIO
CREATE TABLE IF NOT EXISTS InventoryMovements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    inventory_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'transfer', 'adjustment') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    stock_before DECIMAL(10,2) NOT NULL,
    stock_after DECIMAL(10,2) NOT NULL,
    reference_type ENUM('purchase', 'maintenance', 'transfer', 'adjustment', 'return', 'disposal', 'initial') NOT NULL,
    reference_id INT,
    location_from_id INT,
    location_to_id INT,
    batch_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES Inventory(id),
    FOREIGN KEY (performed_by) REFERENCES Users(id),
    FOREIGN KEY (location_from_id) REFERENCES Locations(id),
    FOREIGN KEY (location_to_id) REFERENCES Locations(id),
    INDEX idx_inventory_date (inventory_id, performed_at),
    INDEX idx_movement_type (movement_type, performed_at),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_performed_by (performed_by, performed_at)
);

-- 5. ÓRDENES DE COMPRA
CREATE TABLE IF NOT EXISTS PurchaseOrders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INT NOT NULL,
    status ENUM('draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'received', 'cancelled', 'closed') DEFAULT 'draft',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    order_date DATE NOT NULL,
    required_date DATE,
    expected_delivery DATE,
    actual_delivery DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    shipping_cost DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    notes TEXT,
    internal_notes TEXT,
    requested_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    cancelled_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(id),
    FOREIGN KEY (requested_by) REFERENCES Users(id),
    FOREIGN KEY (approved_by) REFERENCES Users(id),
    INDEX idx_po_number (po_number),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status_date (status, order_date),
    INDEX idx_priority (priority),
    INDEX idx_dates (order_date, required_date, expected_delivery)
);

-- 6. LÍNEAS DE ÓRDENES DE COMPRA
CREATE TABLE IF NOT EXISTS PurchaseOrderLines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_order_id INT NOT NULL,
    line_number INT NOT NULL,
    inventory_id INT NOT NULL,
    item_description TEXT,
    quantity_ordered DECIMAL(10,2) NOT NULL,
    quantity_received DECIMAL(10,2) DEFAULT 0.00,
    quantity_cancelled DECIMAL(10,2) DEFAULT 0.00,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL,
    expected_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES PurchaseOrders(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES Inventory(id),
    INDEX idx_purchase_order (purchase_order_id, line_number),
    INDEX idx_inventory (inventory_id),
    UNIQUE KEY unique_po_line (purchase_order_id, line_number)
);

-- 7. DEFINICIONES DE REPORTES
CREATE TABLE IF NOT EXISTS ReportDefinitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_code VARCHAR(50) NOT NULL UNIQUE,
    report_name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('inventory', 'maintenance', 'financial', 'operational', 'executive', 'procurement') NOT NULL,
    query_template TEXT NOT NULL,
    parameters JSON,
    output_formats JSON DEFAULT ('["pdf", "excel", "csv"]'),
    default_format ENUM('pdf', 'excel', 'csv') DEFAULT 'pdf',
    is_active BOOLEAN DEFAULT true,
    is_scheduled BOOLEAN DEFAULT false,
    schedule_cron VARCHAR(100),
    access_roles JSON DEFAULT ('["admin", "manager"]'),
    execution_timeout_minutes INT DEFAULT 30,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(id),
    INDEX idx_report_code (report_code),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_scheduled (is_scheduled)
);

-- 8. HISTORIAL DE REPORTES
CREATE TABLE IF NOT EXISTS ReportHistory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_definition_id INT NOT NULL,
    generated_by INT NOT NULL,
    parameters_used JSON,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size_bytes INT DEFAULT 0,
    file_format ENUM('pdf', 'excel', 'csv') NOT NULL,
    generation_time_ms INT DEFAULT 0,
    status ENUM('generating', 'completed', 'failed', 'expired') DEFAULT 'generating',
    error_message TEXT,
    expiry_date TIMESTAMP NULL,
    download_count INT DEFAULT 0,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_definition_id) REFERENCES ReportDefinitions(id),
    FOREIGN KEY (generated_by) REFERENCES Users(id),
    INDEX idx_report_date (report_definition_id, generated_at),
    INDEX idx_generated_by (generated_by, generated_at),
    INDEX idx_status (status),
    INDEX idx_expiry (expiry_date)
);

-- ===================================================================
-- DATOS INICIALES PARA FASE 3
-- ===================================================================

-- Categorías de inventario por defecto
INSERT IGNORE INTO InventoryCategories (name, description) VALUES
('Repuestos Mecánicos', 'Componentes mecánicos para equipos de gimnasio'),
('Repuestos Eléctricos', 'Componentes eléctricos y electrónicos'),
('Lubricantes y Aceites', 'Productos de lubricación y mantenimiento'),
('Herramientas', 'Herramientas para mantenimiento y reparación'),
('Consumibles', 'Materiales de consumo general'),
('Equipos de Seguridad', 'Elementos de protección personal'),
('Productos de Limpieza', 'Materiales de limpieza y desinfección');

-- Proveedor por defecto
INSERT IGNORE INTO Suppliers (supplier_code, company_name, contact_name, email, phone, address, payment_terms) VALUES
('SUP001', 'Repuestos Gym Tech', 'Carlos Rodriguez', 'ventas@repuestosgymtech.com', '+1-555-0123', '123 Industrial Ave, Miami, FL', '30 days'),
('SUP002', 'Fitness Parts International', 'Maria Lopez', 'orders@fitnessparts.com', '+1-555-0456', '456 Commerce St, Los Angeles, CA', '15 days'),
('SUP003', 'Equipment Solutions Inc', 'John Smith', 'sales@equipsolutions.com', '+1-555-0789', '789 Business Blvd, Chicago, IL', '45 days');

-- Definiciones de reportes predefinidos
INSERT IGNORE INTO ReportDefinitions (report_code, report_name, description, category, query_template, parameters, access_roles) VALUES
('INV001', 'Stock Status Report', 'Reporte de niveles actuales de inventario', 'inventory', 
'SELECT i.item_code, i.item_name, ic.name as category, i.current_stock, i.minimum_stock, l.name as location FROM Inventory i LEFT JOIN InventoryCategories ic ON i.category_id = ic.id LEFT JOIN Locations l ON i.location_id = l.id WHERE i.is_active = 1', 
'{"filters": ["category_id", "location_id", "low_stock_only"]}', 
'["admin", "manager", "inventory"]'),

('INV002', 'Low Stock Alert Report', 'Items que requieren reposición urgente', 'inventory',
'SELECT i.item_code, i.item_name, i.current_stock, i.minimum_stock, i.reorder_point, s.company_name as supplier FROM Inventory i LEFT JOIN Suppliers s ON i.primary_supplier_id = s.id WHERE i.current_stock <= i.minimum_stock AND i.is_active = 1',
'{"filters": ["urgency_level"]}',
'["admin", "manager", "inventory"]'),

('INV003', 'Inventory Valuation Report', 'Valorización total del inventario', 'inventory',
'SELECT i.item_code, i.item_name, i.current_stock, i.average_cost, (i.current_stock * i.average_cost) as total_value FROM Inventory i WHERE i.is_active = 1',
'{"filters": ["category_id", "location_id"]}',
'["admin", "manager"]'),

('INV004', 'Movement History Report', 'Historial de movimientos de inventario', 'inventory',
'SELECT im.performed_at, i.item_code, i.item_name, im.movement_type, im.quantity, im.stock_before, im.stock_after, u.username as performed_by FROM InventoryMovements im JOIN Inventory i ON im.inventory_id = i.id JOIN Users u ON im.performed_by = u.id',
'{"filters": ["date_from", "date_to", "inventory_id", "movement_type"]}',
'["admin", "manager", "inventory"]'),

('MAINT001', 'Maintenance Cost Analysis', 'Análisis de costos de mantenimiento por equipo', 'maintenance',
'SELECT e.code, e.name, COUNT(t.id) as total_tickets, SUM(COALESCE(t.estimated_cost, 0)) as total_cost FROM Equipment e LEFT JOIN Tickets t ON e.id = t.equipment_id WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY e.id',
'{"filters": ["date_from", "date_to", "location_id"]}',
'["admin", "manager"]'),

('MAINT002', 'Equipment Performance Report', 'Rendimiento y disponibilidad de equipos', 'maintenance',
'SELECT e.code, e.name, e.status, COUNT(t.id) as incidents, AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.completed_at)) as avg_resolution_hours FROM Equipment e LEFT JOIN Tickets t ON e.id = t.equipment_id GROUP BY e.id',
'{"filters": ["location_id", "date_from", "date_to"]}',
'["admin", "manager", "technician"]'),

('MAINT003', 'SLA Compliance Report', 'Cumplimiento de acuerdos de nivel de servicio', 'maintenance',
'SELECT c.name as client, cs.sla_response_hours, cs.sla_resolution_hours, COUNT(t.id) as total_tickets, SUM(CASE WHEN t.sla_compliance_status = ''met'' THEN 1 ELSE 0 END) as sla_met FROM Tickets t JOIN Equipment e ON t.equipment_id = e.id JOIN Locations l ON e.location_id = l.id JOIN Clients c ON l.client_id = c.id JOIN ContractSLA cs ON c.id = cs.client_id GROUP BY c.id',
'{"filters": ["client_id", "date_from", "date_to"]}',
'["admin", "manager"]'),

('FIN001', 'Purchase Orders Summary', 'Resumen de órdenes de compra por período', 'financial',
'SELECT po.po_number, s.company_name as supplier, po.order_date, po.status, po.total_amount, po.currency FROM PurchaseOrders po JOIN Suppliers s ON po.supplier_id = s.id',
'{"filters": ["date_from", "date_to", "supplier_id", "status"]}',
'["admin", "manager", "procurement"]'),

('FIN002', 'Cost Center Analysis', 'Análisis de costos por centro de costos', 'financial',
'SELECT l.name as location, SUM(t.estimated_cost) as maintenance_costs, COUNT(t.id) as ticket_count FROM Locations l LEFT JOIN Equipment e ON l.id = e.location_id LEFT JOIN Tickets t ON e.id = t.equipment_id GROUP BY l.id',
'{"filters": ["date_from", "date_to", "client_id"]}',
'["admin", "manager"]'),

('EXEC001', 'Executive Dashboard', 'KPIs ejecutivos del sistema', 'executive',
'SELECT ''Total Equipment'' as metric, COUNT(*) as value FROM Equipment WHERE is_active = 1 UNION SELECT ''Active Tickets'', COUNT(*) FROM Tickets WHERE status IN (''open'', ''in_progress'') UNION SELECT ''Monthly Revenue'', SUM(estimated_cost) FROM Tickets WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)',
'{"filters": ["date_from", "date_to"]}',
'["admin", "executive"]'),

('EXEC002', 'Operational Efficiency Report', 'Métricas de eficiencia operacional', 'executive',
'SELECT ''Avg Response Time (hours)'' as metric, AVG(TIMESTAMPDIFF(HOUR, created_at, first_response_at)) as value FROM Tickets WHERE first_response_at IS NOT NULL UNION SELECT ''Avg Resolution Time (hours)'', AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) FROM Tickets WHERE completed_at IS NOT NULL',
'{"filters": ["date_from", "date_to", "location_id"]}',
'["admin", "executive", "manager"]');

-- Configuraciones del sistema para Fase 3
INSERT IGNORE INTO SystemSettings (setting_key, setting_value, description) VALUES
('inventory_auto_reorder', 'false', 'Habilitar reorden automático de inventario'),
('inventory_low_stock_alert', 'true', 'Enviar alertas de stock bajo'),
('inventory_valuation_method', 'average', 'Método de valorización (fifo, lifo, average)'),
('purchase_approval_required', 'true', 'Requerir aprobación para órdenes de compra'),
('purchase_approval_limit', '1000.00', 'Límite de monto para aprobación automática'),
('reports_retention_days', '90', 'Días de retención de reportes generados'),
('reports_max_concurrent', '3', 'Máximo número de reportes concurrentes'),
('reports_default_format', 'pdf', 'Formato por defecto para reportes'),
('analytics_enable_predictions', 'true', 'Habilitar predicciones de demanda'),
('analytics_prediction_period', '90', 'Período en días para predicciones');

-- ===================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índices compuestos para consultas frecuentes
CREATE INDEX idx_inventory_stock_alert ON Inventory(current_stock, minimum_stock, is_active);
CREATE INDEX idx_movements_inventory_date ON InventoryMovements(inventory_id, performed_at DESC);
CREATE INDEX idx_po_supplier_status ON PurchaseOrders(supplier_id, status, order_date);
CREATE INDEX idx_po_lines_inventory ON PurchaseOrderLines(inventory_id, purchase_order_id);
CREATE INDEX idx_reports_category_active ON ReportDefinitions(category, is_active);
CREATE INDEX idx_report_history_status_date ON ReportHistory(status, generated_at DESC);

-- ===================================================================
-- TRIGGERS PARA AUTOMATIZACIÓN
-- ===================================================================

DELIMITER $$

-- Trigger para actualizar stock después de movimiento
CREATE TRIGGER update_inventory_stock_after_movement
AFTER INSERT ON InventoryMovements
FOR EACH ROW
BEGIN
    UPDATE Inventory 
    SET current_stock = NEW.stock_after,
        updated_at = NOW()
    WHERE id = NEW.inventory_id;
END$$

-- Trigger para calcular total de línea en órdenes de compra
CREATE TRIGGER calculate_po_line_total
BEFORE INSERT ON PurchaseOrderLines
FOR EACH ROW
BEGIN
    SET NEW.line_total = (NEW.quantity_ordered * NEW.unit_price) - NEW.discount_amount;
END$$

CREATE TRIGGER update_po_line_total
BEFORE UPDATE ON PurchaseOrderLines
FOR EACH ROW
BEGIN
    SET NEW.line_total = (NEW.quantity_ordered * NEW.unit_price) - NEW.discount_amount;
END$$

-- Trigger para actualizar total de orden de compra
CREATE TRIGGER update_po_total_after_line_insert
AFTER INSERT ON PurchaseOrderLines
FOR EACH ROW
BEGIN
    UPDATE PurchaseOrders 
    SET subtotal = (
        SELECT SUM(line_total) 
        FROM PurchaseOrderLines 
        WHERE purchase_order_id = NEW.purchase_order_id
    ),
    total_amount = subtotal + tax_amount + shipping_cost,
    updated_at = NOW()
    WHERE id = NEW.purchase_order_id;
END$$

CREATE TRIGGER update_po_total_after_line_update
AFTER UPDATE ON PurchaseOrderLines
FOR EACH ROW
BEGIN
    UPDATE PurchaseOrders 
    SET subtotal = (
        SELECT SUM(line_total) 
        FROM PurchaseOrderLines 
        WHERE purchase_order_id = NEW.purchase_order_id
    ),
    total_amount = subtotal + tax_amount + shipping_cost,
    updated_at = NOW()
    WHERE id = NEW.purchase_order_id;
END$$

CREATE TRIGGER update_po_total_after_line_delete
AFTER DELETE ON PurchaseOrderLines
FOR EACH ROW
BEGIN
    UPDATE PurchaseOrders 
    SET subtotal = (
        SELECT COALESCE(SUM(line_total), 0) 
        FROM PurchaseOrderLines 
        WHERE purchase_order_id = OLD.purchase_order_id
    ),
    total_amount = subtotal + tax_amount + shipping_cost,
    updated_at = NOW()
    WHERE id = OLD.purchase_order_id;
END$$

DELIMITER ;

-- ===================================================================
-- VISTAS PARA CONSULTAS FRECUENTES
-- ===================================================================

-- Vista de inventario con información extendida
CREATE OR REPLACE VIEW v_inventory_extended AS
SELECT 
    i.*,
    ic.name as category_name,
    l.name as location_name,
    ps.company_name as primary_supplier_name,
    as_sup.company_name as alternative_supplier_name,
    CASE 
        WHEN i.current_stock <= i.minimum_stock THEN 'Low Stock'
        WHEN i.current_stock >= i.maximum_stock THEN 'Overstock'
        ELSE 'Normal'
    END as stock_status,
    (i.current_stock * i.average_cost) as total_value
FROM Inventory i
LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
LEFT JOIN Locations l ON i.location_id = l.id
LEFT JOIN Suppliers ps ON i.primary_supplier_id = ps.id
LEFT JOIN Suppliers as_sup ON i.alternative_supplier_id = as_sup.id;

-- Vista de órdenes de compra con detalles
CREATE OR REPLACE VIEW v_purchase_orders_extended AS
SELECT 
    po.*,
    s.company_name as supplier_name,
    s.contact_name as supplier_contact,
    s.email as supplier_email,
    ur.username as requested_by_name,
    ua.username as approved_by_name,
    COUNT(pol.id) as line_count,
    CASE 
        WHEN po.status = 'draft' THEN '🟡 Draft'
        WHEN po.status = 'pending_approval' THEN '🟠 Pending Approval'
        WHEN po.status = 'approved' THEN '🟢 Approved'
        WHEN po.status = 'sent' THEN '📤 Sent'
        WHEN po.status = 'partially_received' THEN '📦 Partially Received'
        WHEN po.status = 'received' THEN '✅ Received'
        WHEN po.status = 'cancelled' THEN '❌ Cancelled'
        WHEN po.status = 'closed' THEN '🔒 Closed'
    END as status_display
FROM PurchaseOrders po
JOIN Suppliers s ON po.supplier_id = s.id
JOIN Users ur ON po.requested_by = ur.id
LEFT JOIN Users ua ON po.approved_by = ua.id
LEFT JOIN PurchaseOrderLines pol ON po.id = pol.purchase_order_id
GROUP BY po.id;

-- ===================================================================
-- COMENTARIOS FINALES
-- ===================================================================

-- Este esquema proporciona:
-- ✅ 8 nuevas tablas para inventario, compras y reportes
-- ✅ Relaciones completas con integridad referencial
-- ✅ Índices optimizados para consultas frecuentes
-- ✅ Triggers automáticos para cálculos
-- ✅ Vistas para simplificar consultas complejas
-- ✅ 11 definiciones de reportes predefinidos
-- ✅ Configuraciones del sistema para Fase 3
-- ✅ Datos iniciales para operación inmediata

-- Total de tablas en el sistema: 37+ (Fase 1) + 6 (Fase 2) + 8 (Fase 3) = 51+ tablas
