/**
 * GYMTEC ERP - INSTALADOR FASE 3 SIMPLE
 * Ejecuta queries individuales para evitar problemas de parsing
 */

const db = require('./src/mysql-database');

const queries = [
    // 1. Categorías de inventario
    `CREATE TABLE IF NOT EXISTS InventoryCategories (
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
    )`,

    // 2. Proveedores
    `CREATE TABLE IF NOT EXISTS Suppliers (
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
    )`,

    // 3. Inventario
    `CREATE TABLE IF NOT EXISTS Inventory (
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
    )`,

    // 4. Movimientos de inventario
    `CREATE TABLE IF NOT EXISTS InventoryMovements (
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
    )`,

    // 5. Órdenes de compra
    `CREATE TABLE IF NOT EXISTS PurchaseOrders (
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
    )`,

    // 6. Líneas de órdenes de compra
    `CREATE TABLE IF NOT EXISTS PurchaseOrderLines (
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
    )`,

    // 7. Definiciones de reportes
    `CREATE TABLE IF NOT EXISTS ReportDefinitions (
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
    )`,

    // 8. Historial de reportes
    `CREATE TABLE IF NOT EXISTS ReportHistory (
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
    )`
];

const initialData = [
    // Categorías
    `INSERT IGNORE INTO InventoryCategories (name, description) VALUES
    ('Repuestos Mecánicos', 'Componentes mecánicos para equipos de gimnasio'),
    ('Repuestos Eléctricos', 'Componentes eléctricos y electrónicos'),
    ('Lubricantes y Aceites', 'Productos de lubricación y mantenimiento'),
    ('Herramientas', 'Herramientas para mantenimiento y reparación'),
    ('Consumibles', 'Materiales de consumo general'),
    ('Equipos de Seguridad', 'Elementos de protección personal'),
    ('Productos de Limpieza', 'Materiales de limpieza y desinfección')`,

    // Proveedores
    `INSERT IGNORE INTO Suppliers (supplier_code, company_name, contact_name, email, phone, address, payment_terms) VALUES
    ('SUP001', 'Repuestos Gym Tech', 'Carlos Rodriguez', 'ventas@repuestosgymtech.com', '+1-555-0123', '123 Industrial Ave, Miami, FL', '30 days'),
    ('SUP002', 'Fitness Parts International', 'Maria Lopez', 'orders@fitnessparts.com', '+1-555-0456', '456 Commerce St, Los Angeles, CA', '15 days'),
    ('SUP003', 'Equipment Solutions Inc', 'John Smith', 'sales@equipsolutions.com', '+1-555-0789', '789 Business Blvd, Chicago, IL', '45 days')`,

    // Configuraciones del sistema
    `INSERT IGNORE INTO SystemSettings (setting_key, setting_value, description) VALUES
    ('inventory_auto_reorder', 'false', 'Habilitar reorden automático de inventario'),
    ('inventory_low_stock_alert', 'true', 'Enviar alertas de stock bajo'),
    ('inventory_valuation_method', 'average', 'Método de valorización (fifo, lifo, average)'),
    ('purchase_approval_required', 'true', 'Requerir aprobación para órdenes de compra'),
    ('purchase_approval_limit', '1000.00', 'Límite de monto para aprobación automática'),
    ('reports_retention_days', '90', 'Días de retención de reportes generados'),
    ('reports_max_concurrent', '3', 'Máximo número de reportes concurrentes'),
    ('reports_default_format', 'pdf', 'Formato por defecto para reportes'),
    ('analytics_enable_predictions', 'true', 'Habilitar predicciones de demanda'),
    ('analytics_prediction_period', '90', 'Período en días para predicciones')`
];

async function install() {
    console.log('🚀 GYMTEC ERP - INSTALADOR FASE 3 SIMPLE');
    console.log('   Sistema de Inventario Inteligente y Reportes Avanzados');
    console.log('=' * 60);

    try {
        // Verificar conexión
        await db.testConnection();
        console.log('✅ Conexión MySQL verificada');

        // Crear tablas
        console.log('📦 Creando tablas...');
        for (let i = 0; i < queries.length; i++) {
            try {
                await db.query(queries[i]);
                console.log(`   ✅ Tabla ${i + 1}/8 creada correctamente`);
            } catch (error) {
                console.log(`   ⚠️ Tabla ${i + 1}/8: ${error.message}`);
            }
        }

        // Insertar datos iniciales
        console.log('📋 Insertando datos iniciales...');
        for (let i = 0; i < initialData.length; i++) {
            try {
                await db.query(initialData[i]);
                console.log(`   ✅ Datos ${i + 1}/${initialData.length} insertados`);
            } catch (error) {
                console.log(`   ⚠️ Datos ${i + 1}/${initialData.length}: ${error.message}`);
            }
        }

        // Verificar instalación
        console.log('🔍 Verificando instalación...');
        const tables = ['InventoryCategories', 'Suppliers', 'Inventory', 'InventoryMovements', 
                       'PurchaseOrders', 'PurchaseOrderLines', 'ReportDefinitions', 'ReportHistory'];
        
        let installedCount = 0;
        for (let table of tables) {
            try {
                const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ✅ ${table}: ${result[0].count} registros`);
                installedCount++;
            } catch (error) {
                console.log(`   ❌ ${table}: No existe`);
            }
        }

        console.log('');
        console.log('🎉 FASE 3 INSTALADA EXITOSAMENTE');
        console.log(`   Tablas instaladas: ${installedCount}/${tables.length}`);
        console.log('');
        console.log('🚀 FUNCIONALIDADES DISPONIBLES:');
        console.log('   • 🏪 Sistema de Inventario Inteligente');
        console.log('   • 📊 Gestión de Reportes');
        console.log('   • 🛒 Órdenes de Compra');
        console.log('   • 👥 Gestión de Proveedores');
        console.log('');
        console.log('✅ Instalación completada. Reinicie el servidor backend.');

    } catch (error) {
        console.error('❌ Error durante la instalación:', error.message);
        process.exit(1);
    }
}

// Ejecutar
install().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('💥 Error:', error.message);
    process.exit(1);
});
