-- Fix para columna photo_type en TicketPhotos
-- Agregar valores faltantes al ENUM

ALTER TABLE TicketPhotos MODIFY COLUMN photo_type ENUM('Problema','Proceso','Solución','Otros','Evidencia','General') DEFAULT 'Otros';

-- Verificar el cambio
DESCRIBE TicketPhotos;
