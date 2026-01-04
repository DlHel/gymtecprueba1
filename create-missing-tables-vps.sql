-- Script para crear tablas faltantes en VPS
-- Ejecutar después de fix-tables-vps.sh

USE gymtec_erp;

-- ==================================
-- TABLA: equipmentphotos (Fotos de equipos)
-- ==================================

CREATE TABLE IF NOT EXISTS equipmentphotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    photo_data LONGTEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT DEFAULT 0,
    description TEXT,
    photo_type VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    INDEX idx_equipment_id (equipment_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================
-- TABLA: equipmentnotes (Notas de equipos)
-- ==================================

CREATE TABLE IF NOT EXISTS equipmentnotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    note TEXT NOT NULL,
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    INDEX idx_equipment_id (equipment_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================
-- TABLA: ticket_equipment_scope (Equipos en tickets de gimnasiación)
-- ==================================

CREATE TABLE IF NOT EXISTS ticket_equipment_scope (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    equipment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ticket_equipment (ticket_id, equipment_id),
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_equipment_id (equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================
-- Verificar creación de tablas
-- ==================================

SELECT '=== TABLAS CREADAS ===' AS status;

SELECT 
    TABLE_NAME,
    TABLE_ROWS as 'Registros',
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as 'Tamaño (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'gymtec_erp'
AND TABLE_NAME IN ('equipmentphotos', 'equipmentnotes', 'ticket_equipment_scope')
ORDER BY TABLE_NAME;

-- ==================================
-- Verificar estructura
-- ==================================

SELECT '=== ESTRUCTURA equipmentphotos ===' AS status;
DESC equipmentphotos;

SELECT '=== ESTRUCTURA equipmentnotes ===' AS status;
DESC equipmentnotes;

SELECT '=== ESTRUCTURA ticket_equipment_scope ===' AS status;
DESC ticket_equipment_scope;

-- ==================================
-- Datos de prueba (opcional)
-- ==================================

-- Agregar nota de prueba si hay equipos
INSERT IGNORE INTO equipmentnotes (equipment_id, note, author)
SELECT id, 'Nota de prueba - Sistema migrado a VPS', 'Sistema'
FROM equipment
LIMIT 1;

SELECT '=== VERIFICACIÓN COMPLETA ===' AS status;
SELECT 'equipmentphotos' as tabla, COUNT(*) as registros FROM equipmentphotos
UNION ALL
SELECT 'equipmentnotes', COUNT(*) FROM equipmentnotes
UNION ALL
SELECT 'ticket_equipment_scope', COUNT(*) FROM ticket_equipment_scope;
