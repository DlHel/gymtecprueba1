CREATE TABLE IF NOT EXISTS SparePartsMovements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spare_part_id INT NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT, -- ID usuario
    FOREIGN KEY (spare_part_id) REFERENCES SpareParts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
