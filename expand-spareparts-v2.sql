-- Script seguro para expandir SpareParts
-- Intentamos agregar columnas una por una. Si falla porque existe, no importa (el script podria fallar pero queremos que ejecute las siguientes).
-- Sin embargo, mysql cliente parara en error.
-- Usaremos un bloque anonimo si fuera posible, pero mejor comandos directos simples.

DROP PROCEDURE IF EXISTS upgrade_spareparts;

DELIMITER $$

CREATE PROCEDURE upgrade_spareparts()
BEGIN
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'gymtec_erp' AND TABLE_NAME = 'SpareParts' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE SpareParts ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'gymtec_erp' AND TABLE_NAME = 'SpareParts' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE SpareParts ADD COLUMN category VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'gymtec_erp' AND TABLE_NAME = 'SpareParts' AND COLUMN_NAME = 'brand') THEN
        ALTER TABLE SpareParts ADD COLUMN brand VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'gymtec_erp' AND TABLE_NAME = 'SpareParts' AND COLUMN_NAME = 'unit_price') THEN
        ALTER TABLE SpareParts ADD COLUMN unit_price DECIMAL(10, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'gymtec_erp' AND TABLE_NAME = 'SpareParts' AND COLUMN_NAME = 'location') THEN
        ALTER TABLE SpareParts ADD COLUMN location VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'gymtec_erp' AND TABLE_NAME = 'SpareParts' AND COLUMN_NAME = 'image_url') THEN
        ALTER TABLE SpareParts ADD COLUMN image_url VARCHAR(255);
    END IF;
END $$

DELIMITER ;

CALL upgrade_spareparts();
DROP PROCEDURE upgrade_spareparts;

-- Crear tablas satélite
CREATE TABLE IF NOT EXISTS TechnicianInventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    spare_part_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (spare_part_id) REFERENCES SpareParts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS InventoryCategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
