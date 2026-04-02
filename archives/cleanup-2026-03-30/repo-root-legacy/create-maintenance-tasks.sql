-- =====================================================
-- GYMTEC ERP - Crear Tabla MaintenanceTasks
-- Migración para módulo de Planificador
-- =====================================================

USE gymtec_erp;

-- Crear tabla MaintenanceTasks
CREATE TABLE IF NOT EXISTS MaintenanceTasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL COMMENT 'Título de la tarea',
    description TEXT COMMENT 'Descripción detallada de la tarea',
    type ENUM('maintenance', 'inspection', 'repair', 'cleaning') NOT NULL DEFAULT 'maintenance' COMMENT 'Tipo de tarea',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled', 'scheduled') NOT NULL DEFAULT 'pending' COMMENT 'Estado de la tarea',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium' COMMENT 'Prioridad de la tarea',
    
    -- Relaciones
    equipment_id INT COMMENT 'ID del equipo asociado',
    technician_id INT COMMENT 'ID del técnico asignado',
    client_id INT COMMENT 'ID del cliente propietario del equipo',
    location_id INT COMMENT 'ID de la ubicación',
    ticket_id INT COMMENT 'ID del ticket relacionado (opcional)',
    
    -- Programación
    scheduled_date DATE NOT NULL COMMENT 'Fecha programada',
    scheduled_time TIME COMMENT 'Hora programada (opcional)',
    estimated_duration INT COMMENT 'Duración estimada en minutos',
    
    -- Tracking
    started_at TIMESTAMP NULL COMMENT 'Fecha/hora de inicio real',
    completed_at TIMESTAMP NULL COMMENT 'Fecha/hora de finalización',
    actual_duration INT COMMENT 'Duración real en minutos',
    
    -- Información adicional
    notes TEXT COMMENT 'Notas adicionales',
    checklist_template_id INT COMMENT 'ID de plantilla de checklist',
    is_preventive BOOLEAN DEFAULT FALSE COMMENT 'Es mantenimiento preventivo',
    recurrence_pattern VARCHAR(100) COMMENT 'Patrón de recurrencia (CRON-like)',
    next_occurrence DATE COMMENT 'Próxima ocurrencia si es recurrente',
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT COMMENT 'ID del usuario que creó la tarea',
    
    -- Índices y claves foráneas
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_technician_id (technician_id),
    INDEX idx_equipment_id (equipment_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_client_id (client_id),
    
    FOREIGN KEY (equipment_id) REFERENCES Equipment(id) ON DELETE SET NULL,
    FOREIGN KEY (technician_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES Clients(id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE SET NULL,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Tabla de tareas de mantenimiento programadas y ejecutadas';

-- Crear tabla de recurrencias (opcional, para futuro)
CREATE TABLE IF NOT EXISTS MaintenanceRecurrence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL COMMENT 'ID de la tarea padre',
    recurrence_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom') NOT NULL COMMENT 'Tipo de recurrencia',
    interval_value INT DEFAULT 1 COMMENT 'Intervalo (ej: cada 2 semanas)',
    days_of_week SET('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') COMMENT 'Días de la semana',
    day_of_month INT COMMENT 'Día del mes (1-31)',
    month_of_year INT COMMENT 'Mes del año (1-12)',
    cron_expression VARCHAR(100) COMMENT 'Expresión CRON personalizada',
    
    start_date DATE NOT NULL COMMENT 'Fecha de inicio de recurrencia',
    end_date DATE COMMENT 'Fecha de fin (opcional)',
    max_occurrences INT COMMENT 'Máximo número de ocurrencias',
    current_occurrences INT DEFAULT 0 COMMENT 'Ocurrencias actuales',
    
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Recurrencia activa',
    last_generated TIMESTAMP NULL COMMENT 'Última vez que se generó una tarea',
    next_due DATE COMMENT 'Próxima fecha programada',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES MaintenanceTasks(id) ON DELETE CASCADE,
    INDEX idx_next_due (next_due),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Configuración de recurrencia para tareas de mantenimiento';

-- Insertar datos de prueba
INSERT INTO MaintenanceTasks 
    (title, description, type, scheduled_date, scheduled_time, priority, is_preventive, notes, status)
VALUES 
    ('Mantenimiento Preventivo Mensual', 'Revisión general de equipos cardio', 'maintenance', '2026-02-15', '09:00:00', 'medium', TRUE, 'Incluye lubricación y calibración', 'pending'),
    ('Inspección de Seguridad', 'Inspección semanal de equipos', 'inspection', '2026-01-20', '14:00:00', 'high', TRUE, 'Verificar estado de cables y ajustes', 'pending'),
    ('Reparación Equipo', 'Reparar cinta de correr modelo X', 'repair', '2026-01-25', '10:30:00', 'high', FALSE, 'Reporte de cliente: ruido en motor', 'pending'),
    ('Limpieza Profunda', 'Limpieza y desinfección semanal', 'cleaning', '2026-01-23', '16:00:00', 'medium', TRUE, 'Desinfección completa', 'pending');

-- Verificar las tablas creadas
SELECT 'MaintenanceTasks table created successfully!' AS status;
SELECT COUNT(*) AS sample_tasks_inserted FROM MaintenanceTasks;
