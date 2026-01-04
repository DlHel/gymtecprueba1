-- Script para expandir SpareParts con columnas faltantes
ALTER TABLE SpareParts
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

-- Crear tabla de asignaciones a técnicos si no existe (probablemente TechnicianInventory)
CREATE TABLE IF NOT EXISTS TechnicianInventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    spare_part_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (spare_part_id) REFERENCES SpareParts(id),
    FOREIGN KEY (technician_id) REFERENCES Users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de categorías si vamos a usarlas relacionalmente (opcional pero bueno para futuro)
CREATE TABLE IF NOT EXISTS InventoryCategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
