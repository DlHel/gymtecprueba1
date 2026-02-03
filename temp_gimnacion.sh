#!/bin/bash
# Ejecutar migración gimnación con manejo de errores

mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp -e "
-- Verificar si columna ticket_type ya existe
SET @exist_ticket_type := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='gymtec_erp' AND TABLE_NAME='Tickets' AND COLUMN_NAME='ticket_type');
SET @query1 := IF(@exist_ticket_type = 0, 'ALTER TABLE Tickets ADD COLUMN ticket_type VARCHAR(20) DEFAULT \"individual\" AFTER priority', 'SELECT \"ticket_type exists\"');
PREPARE stmt1 FROM @query1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Verificar si columna contract_id ya existe
SET @exist_contract_id := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='gymtec_erp' AND TABLE_NAME='Tickets' AND COLUMN_NAME='contract_id');
SET @query2 := IF(@exist_contract_id = 0, 'ALTER TABLE Tickets ADD COLUMN contract_id INT NULL AFTER ticket_type', 'SELECT \"contract_id exists\"');
PREPARE stmt2 FROM @query2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
"

# Crear tablas (IF NOT EXISTS ya está en el script)
mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp -e "
CREATE TABLE IF NOT EXISTS TicketEquipmentScope (
    id INT(11) NOT NULL AUTO_INCREMENT,
    ticket_id INT(11) NOT NULL,
    equipment_id INT(11) NOT NULL,
    is_included BOOLEAN DEFAULT true,
    exclusion_reason VARCHAR(255) NULL,
    assigned_technician_id INT(11) NULL,
    status ENUM('Pendiente', 'En Progreso', 'Completado', 'Omitido') DEFAULT 'Pendiente',
    completed_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_ticket_equipment (ticket_id, equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS GimnacionChecklistTemplates (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_by INT(11) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS GimnacionChecklistItems (
    id INT(11) NOT NULL AUTO_INCREMENT,
    template_id INT(11) NOT NULL,
    item_text TEXT NOT NULL,
    item_order INT(11) DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    category VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TicketGimnacionChecklist (
    id INT(11) NOT NULL AUTO_INCREMENT,
    ticket_id INT(11) NOT NULL,
    template_id INT(11) NULL,
    item_text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_by INT(11) NULL,
    completed_at TIMESTAMP NULL,
    notes TEXT NULL,
    item_order INT(11) DEFAULT 0,
    equipment_id INT(11) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TicketTechnicians (
    id INT(11) NOT NULL AUTO_INCREMENT,
    ticket_id INT(11) NOT NULL,
    technician_id INT(11) NOT NULL,
    role ENUM('Principal', 'Asistente', 'Especialista') DEFAULT 'Asistente',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT(11) NOT NULL,
    notes TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_ticket_technician (ticket_id, technician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"

# Insertar datos por defecto si no existen
mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp -e "
INSERT IGNORE INTO GimnacionChecklistTemplates (id, name, description, is_default, created_by) VALUES 
(1, 'Mantenimiento Preventivo General', 'Checklist estándar para mantenimiento preventivo de gimnación', true, 1);

INSERT IGNORE INTO GimnacionChecklistItems (template_id, item_text, item_order, is_required, category) VALUES 
(1, 'Verificar funcionamiento general del equipo', 1, true, 'General'),
(1, 'Inspeccionar cables y conexiones eléctricas', 2, true, 'General'),
(1, 'Lubricar partes móviles según especificaciones', 3, true, 'General'),
(1, 'Verificar calibración de sensores', 4, false, 'General'),
(1, 'Limpiar y desinfectar superficies', 5, true, 'General'),
(1, 'Verificar sistemas de seguridad', 6, true, 'General'),
(1, 'Actualizar software/firmware si aplica', 7, false, 'General'),
(1, 'Documentar observaciones y recomendaciones', 8, true, 'General');
"

echo "✅ Migración gimnación completada"
