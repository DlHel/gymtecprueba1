-- GYMTEC ERP - Fase 1 Core Business SQL (Simplificado)
-- Ejecutar paso a paso para depurar problemas

USE gymtec_erp;

-- 1. Crear tabla Contracts
CREATE TABLE IF NOT EXISTS Contracts (
    id INT(11) NOT NULL AUTO_INCREMENT,
    client_id INT(11) NOT NULL,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    contract_name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('activo', 'vencido', 'suspendido', 'cancelado') DEFAULT 'activo',
    sla_p1_hours INT(11) DEFAULT 4,
    sla_p2_hours INT(11) DEFAULT 8,
    sla_p3_hours INT(11) DEFAULT 24,
    sla_p4_hours INT(11) DEFAULT 72,
    monthly_fee DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'CLP',
    payment_terms TEXT,
    service_description TEXT,
    special_conditions TEXT,
    created_by INT(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (client_id) REFERENCES Clients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_contracts_client (client_id),
    INDEX idx_contracts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Actualizar tabla Tickets
ALTER TABLE Tickets 
    ADD COLUMN IF NOT EXISTS sla_deadline DATETIME NULL,
    ADD COLUMN IF NOT EXISTS sla_status ENUM('cumplido', 'vencido', 'en_riesgo') NULL,
    ADD COLUMN IF NOT EXISTS resolution_time_minutes INT(11) NULL,
    ADD COLUMN IF NOT EXISTS workflow_stage ENUM('creado', 'asignado', 'en_progreso', 'esperando_repuestos', 'esperando_cliente', 'en_revision', 'completado', 'cerrado') DEFAULT 'creado',
    ADD COLUMN IF NOT EXISTS checklist_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_close BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS contract_id INT(11) NULL;

-- 3. Crear índices para Tickets
ALTER TABLE Tickets 
    ADD INDEX IF NOT EXISTS idx_tickets_workflow (workflow_stage),
    ADD INDEX IF NOT EXISTS idx_tickets_sla (sla_status);

-- 4. Agregar Foreign Key para contract_id
ALTER TABLE Tickets 
    ADD CONSTRAINT fk_tickets_contract 
    FOREIGN KEY (contract_id) REFERENCES Contracts (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Crear tabla ChecklistTemplates
CREATE TABLE IF NOT EXISTS ChecklistTemplates (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    ticket_type ENUM('preventivo', 'correctivo', 'instalacion', 'desinstalacion', 'actualizacion', 'capacitacion', 'emergencia') NOT NULL,
    equipment_category ENUM('Cardio', 'Fuerza', 'Funcional', 'Accesorios') NULL,
    equipment_model_id INT(11) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_by INT(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (equipment_model_id) REFERENCES EquipmentModels (id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_checklist_templates_type (ticket_type),
    INDEX idx_checklist_templates_category (equipment_category),
    INDEX idx_checklist_templates_model (equipment_model_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Crear tabla ChecklistTemplateItems
CREATE TABLE IF NOT EXISTS ChecklistTemplateItems (
    id INT(11) NOT NULL AUTO_INCREMENT,
    template_id INT(11) NOT NULL,
    item_text TEXT NOT NULL,
    item_order INT(11) DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    expected_result TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (template_id) REFERENCES ChecklistTemplates (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_checklist_items_template (template_id),
    INDEX idx_checklist_items_order (item_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Crear tabla SystemSettings
CREATE TABLE IF NOT EXISTS SystemSettings (
    id INT(11) NOT NULL AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    setting_type ENUM('string', 'integer', 'boolean', 'json', 'email') DEFAULT 'string',
    description TEXT NULL,
    category VARCHAR(50) DEFAULT 'general',
    is_editable BOOLEAN DEFAULT TRUE,
    updated_by INT(11) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_system_settings_key (setting_key),
    INDEX idx_system_settings_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Insertar configuraciones básicas
INSERT IGNORE INTO SystemSettings (setting_key, setting_value, setting_type, description, category) VALUES
('sla_default_p1_hours', '4', 'integer', 'SLA por defecto para prioridad critica (horas)', 'sla'),
('sla_default_p2_hours', '8', 'integer', 'SLA por defecto para prioridad alta (horas)', 'sla'),
('sla_default_p3_hours', '24', 'integer', 'SLA por defecto para prioridad media (horas)', 'sla'),
('sla_default_p4_hours', '72', 'integer', 'SLA por defecto para prioridad baja (horas)', 'sla'),
('checklist_mandatory_for_closure', 'true', 'boolean', 'Checklist obligatorio para cerrar tickets', 'workflow');

-- 9. Insertar templates básicos
INSERT IGNORE INTO ChecklistTemplates (name, description, ticket_type, equipment_category, is_mandatory) VALUES
('Mantenimiento Preventivo Cardio', 'Checklist estándar para mantenimiento preventivo de equipos cardiovasculares', 'preventivo', 'Cardio', TRUE),
('Servicio Correctivo General', 'Checklist para servicios correctivos generales', 'correctivo', NULL, TRUE);
