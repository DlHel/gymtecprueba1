-- Script para corregir duplicidades de tablas por case-sensitivity
-- Gymtec ERP - VPS Fix

-- 1. Verificar datos en tablas duplicadas
SELECT 'ticketnotes count' as tabla, COUNT(*) as registros FROM ticketnotes
UNION ALL
SELECT 'TicketNotes count', COUNT(*) FROM TicketNotes;

-- 2. Si ticketnotes tiene datos, migrarlos a TicketNotes
INSERT INTO TicketNotes (ticket_id, note, note_type, author, is_internal, created_at)
SELECT ticket_id, note, note_type, author, is_internal, created_at FROM ticketnotes
WHERE NOT EXISTS (SELECT 1 FROM TicketNotes tn WHERE tn.id = ticketnotes.id);

-- 3. Eliminar tabla duplicada ticketnotes
DROP TABLE IF EXISTS ticketnotes;

-- 4. Crear tabla ticketspareparts (minúsculas) como alias o renombrarla
-- Opción: Crear VIEW para mantener compatibilidad
CREATE OR REPLACE VIEW ticketspareparts AS SELECT * FROM TicketSpareParts;

-- 5. Verificar
SELECT 'TicketNotes final count' as tabla, COUNT(*) as registros FROM TicketNotes;
