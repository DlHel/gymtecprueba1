-- ============================================================================
-- SISTEMA DE ASISTENCIA Y CONTROL HORARIO - Gymtec ERP (MySQL/MariaDB)
-- Módulo completo de gestión de asistencia, horarios y horas extras
-- ============================================================================

-- ===========================================================================
-- TABLA: ShiftTypes - Tipos de Turnos
-- ===========================================================================
CREATE TABLE IF NOT EXISTS ShiftTypes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: WorkSchedules - Horarios de Trabajo
-- ===========================================================================
CREATE TABLE IF NOT EXISTS WorkSchedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    shift_type_id INT,
    
    -- Lunes
    monday_enabled TINYINT(1) DEFAULT 0,
    monday_start TIME,
    monday_end TIME,
    monday_break_duration INT DEFAULT 0,
    
    -- Martes
    tuesday_enabled TINYINT(1) DEFAULT 0,
    tuesday_start TIME,
    tuesday_end TIME,
    tuesday_break_duration INT DEFAULT 0,
    
    -- Miércoles
    wednesday_enabled TINYINT(1) DEFAULT 0,
    wednesday_start TIME,
    wednesday_end TIME,
    wednesday_break_duration INT DEFAULT 0,
    
    -- Jueves
    thursday_enabled TINYINT(1) DEFAULT 0,
    thursday_start TIME,
    thursday_end TIME,
    thursday_break_duration INT DEFAULT 0,
    
    -- Viernes
    friday_enabled TINYINT(1) DEFAULT 0,
    friday_start TIME,
    friday_end TIME,
    friday_break_duration INT DEFAULT 0,
    
    -- Sábado
    saturday_enabled TINYINT(1) DEFAULT 0,
    saturday_start TIME,
    saturday_end TIME,
    saturday_break_duration INT DEFAULT 0,
    
    -- Domingo
    sunday_enabled TINYINT(1) DEFAULT 0,
    sunday_start TIME,
    sunday_end TIME,
    sunday_break_duration INT DEFAULT 0,
    
    -- Configuración general
    weekly_hours DECIMAL(5,2) DEFAULT 0,
    tolerance_minutes INT DEFAULT 15,
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shift_type_id) REFERENCES ShiftTypes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: EmployeeSchedules - Asignación de Horarios a Empleados
-- ===========================================================================
CREATE TABLE IF NOT EXISTS EmployeeSchedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    schedule_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active TINYINT(1) DEFAULT 1,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES WorkSchedules(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_schedule (user_id, start_date, schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: Attendance - Registro de Asistencia Diaria
-- ===========================================================================
CREATE TABLE IF NOT EXISTS Attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    
    -- Entrada
    check_in_time DATETIME,
    check_in_location VARCHAR(255),
    check_in_notes TEXT,
    check_in_ip VARCHAR(45),
    
    -- Salida
    check_out_time DATETIME,
    check_out_location VARCHAR(255),
    check_out_notes TEXT,
    check_out_ip VARCHAR(45),
    
    -- Cálculos
    worked_hours DECIMAL(5,2),
    scheduled_hours DECIMAL(5,2),
    is_late TINYINT(1) DEFAULT 0,
    late_minutes INT DEFAULT 0,
    status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_date (date),
    INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: Overtime - Registro de Horas Extras
-- ===========================================================================
CREATE TABLE IF NOT EXISTS Overtime (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    attendance_id INT,
    date DATE NOT NULL,
    
    -- Horario
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    
    -- Tipo y cálculo
    type ENUM('regular', 'night', 'holiday', 'sunday') DEFAULT 'regular',
    multiplier DECIMAL(3,1) DEFAULT 1.5,
    hourly_rate DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    
    -- Justificación
    description TEXT,
    reason TEXT,
    
    -- Aprobación
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_by INT,
    approved_by INT,
    approved_at DATETIME,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (attendance_id) REFERENCES Attendance(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL,
    INDEX idx_date (date),
    INDEX idx_user_date (user_id, date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: LeaveRequests - Solicitudes de Permisos y Vacaciones
-- ===========================================================================
CREATE TABLE IF NOT EXISTS LeaveRequests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Fechas
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL,
    
    -- Tipo de permiso
    type ENUM('vacation', 'sick', 'personal', 'unpaid') NOT NULL,
    reason TEXT,
    
    -- Documentación
    has_documentation TINYINT(1) DEFAULT 0,
    documentation_file VARCHAR(500),
    
    -- Reemplazo
    replacement_user_id INT,
    
    -- Aprobación
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (replacement_user_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, start_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: Holidays - Días Festivos
-- ===========================================================================
CREATE TABLE IF NOT EXISTS Holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL UNIQUE,
    type VARCHAR(20) DEFAULT 'national',
    is_paid TINYINT(1) DEFAULT 1,
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: AttendanceNotes - Notas de Asistencia
-- ===========================================================================
CREATE TABLE IF NOT EXISTS AttendanceNotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_id INT NOT NULL,
    user_id INT NOT NULL,
    note TEXT NOT NULL,
    note_type ENUM('justification', 'observation', 'correction') DEFAULT 'observation',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attendance_id) REFERENCES Attendance(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: PayrollPeriods - Períodos de Nómina
-- ===========================================================================
CREATE TABLE IF NOT EXISTS PayrollPeriods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_date DATE,
    status ENUM('open', 'processing', 'closed', 'paid') DEFAULT 'open',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: PayrollDetails - Detalles de Nómina por Empleado
-- ===========================================================================
CREATE TABLE IF NOT EXISTS PayrollDetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payroll_period_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Horas
    regular_hours DECIMAL(10,2) DEFAULT 0,
    overtime_hours DECIMAL(10,2) DEFAULT 0,
    total_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Montos
    base_salary DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    bonuses DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payroll_period_id) REFERENCES PayrollPeriods(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_period_user (payroll_period_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- DATOS INICIALES: Tipos de Turno
-- ===========================================================================
INSERT INTO ShiftTypes (name, description, color) VALUES
('Diurno', 'Turno diurno estándar 06:00-14:00', '#60A5FA'),
('Vespertino', 'Turno vespertino 14:00-22:00', '#F59E0B'),
('Nocturno', 'Turno nocturno 22:00-06:00', '#6366F1'),
('Rotativo', 'Horario rotativo semanal', '#10B981'),
('Flexible', 'Horario flexible a demanda', '#8B5CF6')
ON DUPLICATE KEY UPDATE name=name;

-- ===========================================================================
-- DATOS INICIALES: Horarios de Trabajo Predefinidos
-- ===========================================================================
INSERT INTO WorkSchedules (
    name, description, shift_type_id,
    monday_enabled, monday_start, monday_end, monday_break_duration,
    tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
    wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
    thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
    friday_enabled, friday_start, friday_end, friday_break_duration,
    saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
    sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
    weekly_hours, tolerance_minutes
) VALUES
('Administrativo Estándar', 'Horario administrativo de oficina', 1,
1, '09:00', '18:00', 60,
1, '09:00', '18:00', 60,
1, '09:00', '18:00', 60,
1, '09:00', '18:00', 60,
1, '09:00', '18:00', 60,
0, NULL, NULL, 0,
0, NULL, NULL, 0,
44, 15)
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO WorkSchedules (
    name, description, shift_type_id,
    monday_enabled, monday_start, monday_end, monday_break_duration,
    tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
    wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
    thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
    friday_enabled, friday_start, friday_end, friday_break_duration,
    saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
    sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
    weekly_hours, tolerance_minutes
) VALUES
('Operativo', 'Horario operativo con sábado', 1,
1, '08:00', '17:00', 60,
1, '08:00', '17:00', 60,
1, '08:00', '17:00', 60,
1, '08:00', '17:00', 60,
1, '08:00', '17:00', 60,
1, '08:00', '13:00', 0,
0, NULL, NULL, 0,
49, 15)
ON DUPLICATE KEY UPDATE name=name;

-- ===========================================================================
-- DATOS INICIALES: Días Festivos Chile 2025
-- ===========================================================================
INSERT INTO Holidays (name, date, type) VALUES
('Año Nuevo', '2025-01-01', 'national'),
('Viernes Santo', '2025-04-18', 'national'),
('Sábado Santo', '2025-04-19', 'national'),
('Día del Trabajo', '2025-05-01', 'national'),
('Día de las Glorias Navales', '2025-05-21', 'national'),
('Día Nacional de los Pueblos Indígenas', '2025-06-20', 'national'),
('San Pedro y San Pablo', '2025-06-29', 'national'),
('Día de la Virgen del Carmen', '2025-07-16', 'national'),
('Asunción de la Virgen', '2025-08-15', 'national'),
('Independencia de Chile', '2025-09-18', 'national'),
('Día de las Glorias del Ejército', '2025-09-19', 'national'),
('Día de la Unidad Nacional', '2025-09-20', 'national'),
('Encuentro de Dos Mundos', '2025-10-12', 'national'),
('Día de las Iglesias Evangélicas y Protestantes', '2025-10-31', 'national'),
('Día de Todos los Santos', '2025-11-01', 'national'),
('Navidad', '2025-12-25', 'national')
ON DUPLICATE KEY UPDATE name=name;

-- ===========================================================================
-- VISTAS: v_attendance_details - Vista consolidada de asistencia
-- ===========================================================================
CREATE OR REPLACE VIEW v_attendance_details AS
SELECT 
    a.*,
    u.username,
    u.email,
    ws.name as schedule_name,
    ws.weekly_hours
FROM Attendance a
JOIN Users u ON a.user_id = u.id
LEFT JOIN EmployeeSchedules es ON es.user_id = u.id 
    AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
    AND es.is_active = 1
LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id;

-- ===========================================================================
-- VISTAS: v_overtime_pending - Horas extras pendientes de aprobación
-- ===========================================================================
CREATE OR REPLACE VIEW v_overtime_pending AS
SELECT 
    o.*,
    u.username,
    requester.username as requested_by_name
FROM Overtime o
JOIN Users u ON o.user_id = u.id
LEFT JOIN Users requester ON o.requested_by = requester.id
WHERE o.status = 'pending'
ORDER BY o.date DESC;
