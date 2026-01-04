-- Fix SOLO para agregar columna ticket_type
ALTER TABLE Tickets ADD COLUMN ticket_type VARCHAR(50) DEFAULT 'individual';
SELECT 'ticket_type column added successfully' as status;
