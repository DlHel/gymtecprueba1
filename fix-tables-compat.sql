-- Script para crear VIEWs y tablas faltantes para compatibilidad
-- Gymtec ERP - VPS Fix

-- 1. Crear VIEW ticketnotes apuntando a TicketNotes para compatibilidad con INSERT
-- Las VIEWs no soportan INSERT, así que necesitamos crear un procedimiento almacenado
-- En lugar de eso, creamos la tabla como alias

-- Opción 1: Crear ticketnotes como tabla real (sync con TicketNotes)
-- Mejor opción: Configurar MySQL para no ser case-sensitive

-- Temporal: Recrear ticketnotes con el mismo esquema que TicketNotes
CREATE TABLE IF NOT EXISTS ticketnotes LIKE TicketNotes;

-- 2. Crear tabla spare_part_requests si no existe
CREATE TABLE IF NOT EXISTS spare_part_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    spare_part_id INT,
    quantity INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    requested_by INT,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_status (status),
    CONSTRAINT fk_sparepart_requests_ticket FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE
);

-- Verificar creación
SHOW TABLES LIKE 'ticket%';
