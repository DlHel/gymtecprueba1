-- Script para crear tablas faltantes del módulo de tickets
-- Gymtec ERP - VPS Fix

-- Crear tabla TicketNotes si no existe
CREATE TABLE IF NOT EXISTS ticketnotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    note TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'General',
    author VARCHAR(100),
    is_internal TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    CONSTRAINT fk_ticketnotes_ticket FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE
);

-- Crear tabla TicketPhotos si no existe
CREATE TABLE IF NOT EXISTS TicketPhotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    photo_data LONGTEXT,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT,
    description TEXT,
    photo_type VARCHAR(50) DEFAULT 'Otros',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    CONSTRAINT fk_ticketphotos_ticket FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE
);

-- Crear tabla TicketChecklist si no existe  
CREATE TABLE IF NOT EXISTS TicketChecklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_completed TINYINT(1) DEFAULT 0,
    order_index INT DEFAULT 0,
    completed_at TIMESTAMP NULL,
    completed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    CONSTRAINT fk_ticketchecklist_ticket FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE
);

-- Crear tabla TicketSpareParts si no existe
CREATE TABLE IF NOT EXISTS TicketSpareParts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    spare_part_id INT,
    quantity INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pendiente',
    notes TEXT,
    requested_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    CONSTRAINT fk_ticketspareparts_ticket FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE
);

-- Mostrar tablas creadas
SHOW TABLES LIKE 'Ticket%';
