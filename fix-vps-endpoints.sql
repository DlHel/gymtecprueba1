-- ============================================================================
-- FIX VPS ENDPOINTS - Correcciones de endpoints fallidos
-- ============================================================================

USE gymtec_erp;

-- 1. Verificar y crear tabla TicketEquipmentScope si no existe
CREATE TABLE IF NOT EXISTS TicketEquipmentScope (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    equipment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES Equipment(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ticket_equipment (ticket_id, equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Verificar estructura de tabla Equipment
DESCRIBE Equipment;

-- 3. Verificar estructura de tabla EquipmentModels
DESCRIBE EquipmentModels;

-- 4. Verificar estructura de tabla EquipmentPhotos
DESCRIBE EquipmentPhotos;

-- 5. Verificar estructura de tabla EquipmentNotes
DESCRIBE EquipmentNotes;

-- 6. Verificar estructura de tabla Tickets
DESCRIBE Tickets;

-- 7. Verificar tabla ModelPhotos
CREATE TABLE IF NOT EXISTS ModelPhotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    photo_data LONGTEXT NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    filename VARCHAR(255),
    is_main BOOLEAN DEFAULT FALSE,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES EquipmentModels(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Asegurar que existe la columna 'activo' en Equipment (no 'status')
-- MySQL no tiene ALTER COLUMN IF NOT EXISTS, así que usamos procedimiento
DELIMITER $$

DROP PROCEDURE IF EXISTS AddActivoColumn$$
CREATE PROCEDURE AddActivoColumn()
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '42S21' BEGIN END;
    ALTER TABLE Equipment ADD COLUMN activo BOOLEAN DEFAULT TRUE;
END$$

CALL AddActivoColumn()$$
DROP PROCEDURE AddActivoColumn$$

DELIMITER ;

-- 9. Verificar datos de ejemplo
SELECT COUNT(*) as total_equipment FROM Equipment;
SELECT COUNT(*) as total_models FROM EquipmentModels;
SELECT COUNT(*) as total_tickets FROM Tickets;
SELECT COUNT(*) as total_equipment_photos FROM EquipmentPhotos;
SELECT COUNT(*) as total_equipment_notes FROM EquipmentNotes;

-- 10. Mostrar estructura final
SHOW TABLES;
