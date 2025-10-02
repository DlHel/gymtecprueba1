-- Script para crear tabla spare_part_requests
-- Sistema de Solicitudes de Compra de Repuestos

USE gymtec_erp;

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS spare_part_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id INT NULL,
    spare_part_name VARCHAR(255) NOT NULL,
    quantity_needed INT NOT NULL,
    priority ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
    description TEXT NULL,
    justification TEXT NULL,
    requested_by VARCHAR(255) NULL,
    status ENUM('pendiente', 'aprobada', 'rechazada', 'comprada', 'recibida') DEFAULT 'pendiente',
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    purchase_order_id INT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL,
    
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar creación
SELECT 'Tabla spare_part_requests creada exitosamente' AS resultado;
