-- Insertar datos de prueba para el Planificador
USE gymtec_erp;

-- Insertar tareas de mantenimiento de ejemplo
INSERT INTO MaintenanceTasks 
    (title, description, type, scheduled_date, scheduled_time, priority, is_preventive, notes, status)
VALUES 
    ('Mantenimiento Preventivo Cinta Cardio', 'Revisión completa de cinta de correr', 'maintenance', '2026-01-20', '09:00:00', 'medium', TRUE, 'Incluye lubricación y calibración', 'pending'),
    ('Inspección Bicicletas Estáticas', 'Inspección semanal de seguridad', 'inspection', '2026-01-18', '14:00:00', 'high', TRUE, 'Verificar estado de cables y ajustes', 'pending'),
    ('Reparación Elíptica Sala 2', 'Reparar ruido en pedales', 'repair', '2026-01-25', '10:30:00', 'high', FALSE, 'Reporte de cliente: ruido extraño', 'pending'),
    ('Limpieza Profunda Equipos', 'Limpieza y desinfección mensual', 'cleaning', '2026-01-22', '16:00:00', 'medium', TRUE, 'Desinfección completa zona cardio', 'pending'),
    ('Mantenimiento Remo Concept2', 'Revisión cadena y monitor', 'maintenance', '2026-01-15', '11:00:00', 'medium', TRUE, 'Verificar tensión de cadena', 'in_progress'),
    ('Inspección Pesas y Mancuernas', 'Inspección mensual zona de fuerza', 'inspection', '2026-01-16', '08:30:00', 'medium', TRUE, 'Revisar estado de recubrimientos', 'scheduled');

SELECT 'Datos de prueba insertados exitosamente!' AS status;
SELECT COUNT(*) as total_tareas FROM MaintenanceTasks;
