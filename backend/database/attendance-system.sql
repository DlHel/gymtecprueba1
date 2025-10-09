-- ============================================================================
-- SISTEMA DE ASISTENCIA Y CONTROL HORARIO - Gymtec ERP
-- Módulo completo de gestión de asistencia, horarios y horas extras
-- ============================================================================

-- ===========================================================================
-- TABLA: ShiftTypes - Tipos de Turnos
-- ===========================================================================
CREATE TABLE IF NOT EXISTS ShiftTypes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================================
-- TABLA: WorkSchedules - Horarios de Trabajo
-- ===========================================================================
CREATE TABLE IF NOT EXISTS WorkSchedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    shift_type_id INTEGER,
    
    -- Lunes
    monday_enabled BOOLEAN DEFAULT 0,
    monday_start TIME,
    monday_end TIME,
    monday_break_duration INTEGER DEFAULT 0, -- minutos
    
    -- Martes
    tuesday_enabled BOOLEAN DEFAULT 0,
    tuesday_start TIME,
    tuesday_end TIME,
    tuesday_break_duration INTEGER DEFAULT 0,
    
    -- Miércoles
    wednesday_enabled BOOLEAN DEFAULT 0,
    wednesday_start TIME,
    wednesday_end TIME,
    wednesday_break_duration INTEGER DEFAULT 0,
    
    -- Jueves
    thursday_enabled BOOLEAN DEFAULT 0,
    thursday_start TIME,
    thursday_end TIME,
    thursday_break_duration INTEGER DEFAULT 0,
    
    -- Viernes
    friday_enabled BOOLEAN DEFAULT 0,
    friday_start TIME,
    friday_end TIME,
    friday_break_duration INTEGER DEFAULT 0,
    
    -- Sábado
    saturday_enabled BOOLEAN DEFAULT 0,
    saturday_start TIME,
    saturday_end TIME,
    saturday_break_duration INTEGER DEFAULT 0,
    
    -- Domingo
    sunday_enabled BOOLEAN DEFAULT 0,
    sunday_start TIME,
    sunday_end TIME,
    sunday_break_duration INTEGER DEFAULT 0,
    
    -- Configuración general
    weekly_hours DECIMAL(5,2) DEFAULT 0,
    tolerance_minutes INTEGER DEFAULT 15, -- Tolerancia entrada/salida
    is_active BOOLEAN DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shift_type_id) REFERENCES ShiftTypes(id) ON DELETE SET NULL
);

-- ===========================================================================
-- TABLA: EmployeeSchedules - Asignación de Horarios a Empleados
-- ===========================================================================
CREATE TABLE IF NOT EXISTS EmployeeSchedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES WorkSchedules(id) ON DELETE CASCADE,
    
    UNIQUE(user_id, start_date, schedule_id)
);

-- ===========================================================================
-- TABLA: Attendance - Registro de Asistencia
-- ===========================================================================
CREATE TABLE IF NOT EXISTS Attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    
    -- Entrada
    check_in_time TIMESTAMP,
    check_in_location VARCHAR(255),
    check_in_notes TEXT,
    check_in_ip VARCHAR(45),
    
    -- Salida
    check_out_time TIMESTAMP,
    check_out_location VARCHAR(255),
    check_out_notes TEXT,
    check_out_ip VARCHAR(45),
    
    -- Cálculos
    scheduled_hours DECIMAL(5,2) DEFAULT 0,
    worked_hours DECIMAL(5,2) DEFAULT 0,
    break_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Estado
    status VARCHAR(50) DEFAULT 'present', -- present, absent, late, early_departure, half_day, leave
    is_late BOOLEAN DEFAULT 0,
    late_minutes INTEGER DEFAULT 0,
    is_early_departure BOOLEAN DEFAULT 0,
    early_departure_minutes INTEGER DEFAULT 0,
    
    -- Justificación
    is_justified BOOLEAN DEFAULT 0,
    justification_type VARCHAR(50), -- sick_leave, personal, vacation, authorized
    justification_notes TEXT,
    justification_file VARCHAR(255),
    approved_by INTEGER,
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL,
    
    UNIQUE(user_id, date)
);

-- ===========================================================================
-- TABLA: Overtime - Horas Extras
-- ===========================================================================
CREATE TABLE IF NOT EXISTS Overtime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    attendance_id INTEGER,
    date DATE NOT NULL,
    
    -- Detalles
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    
    -- Tipo
    type VARCHAR(50) DEFAULT 'regular', -- regular, night, holiday, sunday
    multiplier DECIMAL(3,2) DEFAULT 1.5, -- 1.5x, 2.0x, etc
    
    -- Descripción
    description TEXT,
    reason VARCHAR(255),
    
    -- Aprobación
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, paid
    requested_by INTEGER NOT NULL,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Financiero
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    paid_in_payroll_id INTEGER,
    paid_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (attendance_id) REFERENCES Attendance(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL
);

-- ===========================================================================
-- TABLA: LeaveRequests - Solicitudes de Permiso/Vacaciones
-- ===========================================================================
CREATE TABLE IF NOT EXISTS LeaveRequests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Fechas
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(4,1) NOT NULL,
    
    -- Tipo
    type VARCHAR(50) NOT NULL, -- vacation, sick_leave, personal, maternity, paternity, unpaid
    reason TEXT,
    
    -- Documentación
    has_documentation BOOLEAN DEFAULT 0,
    documentation_file VARCHAR(255),
    
    -- Aprobación
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Notificaciones
    notify_team BOOLEAN DEFAULT 1,
    replacement_user_id INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (replacement_user_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- ===========================================================================
-- TABLA: Holidays - Días Festivos
-- ===========================================================================
CREATE TABLE IF NOT EXISTS Holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL UNIQUE,
    type VARCHAR(50) DEFAULT 'national', -- national, regional, company
    is_paid BOOLEAN DEFAULT 1,
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================================
-- TABLA: AttendanceNotes - Notas de Asistencia
-- ===========================================================================
CREATE TABLE IF NOT EXISTS AttendanceNotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attendance_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attendance_id) REFERENCES Attendance(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
);

-- ===========================================================================
-- TABLA: PayrollPeriods - Períodos de Nómina (integración con finanzas)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS PayrollPeriods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_date DATE,
    
    -- Estado
    status VARCHAR(50) DEFAULT 'draft', -- draft, calculated, approved, paid, closed
    
    -- Totales
    total_regular_hours DECIMAL(10,2) DEFAULT 0,
    total_overtime_hours DECIMAL(10,2) DEFAULT 0,
    total_gross_amount DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    total_net_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Aprobación
    calculated_by INTEGER,
    calculated_at TIMESTAMP,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    closed_by INTEGER,
    closed_at TIMESTAMP,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (calculated_by) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by) REFERENCES Users(id) ON DELETE SET NULL
);

-- ===========================================================================
-- TABLA: PayrollDetails - Detalle de Nómina por Empleado
-- ===========================================================================
CREATE TABLE IF NOT EXISTS PayrollDetails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payroll_period_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    
    -- Horas
    regular_hours DECIMAL(8,2) DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    absence_hours DECIMAL(8,2) DEFAULT 0,
    
    -- Montos
    base_salary DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonuses DECIMAL(10,2) DEFAULT 0,
    gross_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Deducciones
    tax_deductions DECIMAL(10,2) DEFAULT 0,
    social_security DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    
    -- Neto
    net_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Estado
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid
    payment_method VARCHAR(50), -- bank_transfer, cash, check
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payroll_period_id) REFERENCES PayrollPeriods(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    
    UNIQUE(payroll_period_id, user_id)
);

-- ===========================================================================
-- INDICES PARA OPTIMIZACIÓN
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON Attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON Attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON Attendance(status);

CREATE INDEX IF NOT EXISTS idx_overtime_user_date ON Overtime(user_id, date);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON Overtime(status);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_user ON EmployeeSchedules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_dates ON EmployeeSchedules(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON LeaveRequests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON LeaveRequests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON LeaveRequests(status);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON Holidays(date);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates ON PayrollPeriods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_details_period ON PayrollDetails(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_user ON PayrollDetails(user_id);

-- ===========================================================================
-- DATOS INICIALES
-- ===========================================================================

-- Tipos de turno predefinidos
INSERT OR IGNORE INTO ShiftTypes (name, description, color) VALUES
('Diurno', 'Turno de día (8:00 - 17:00)', '#3B82F6'),
('Nocturno', 'Turno de noche (22:00 - 06:00)', '#6366F1'),
('Partido', 'Turno partido con descanso al mediodía', '#8B5CF6'),
('Flexible', 'Horario flexible', '#10B981'),
('Administrativo', 'Horario administrativo estándar', '#F59E0B');

-- Horario estándar de oficina (Lunes a Viernes 9:00-18:00)
INSERT OR IGNORE INTO WorkSchedules (
    name, description, shift_type_id,
    monday_enabled, monday_start, monday_end, monday_break_duration,
    tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
    wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
    thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
    friday_enabled, friday_start, friday_end, friday_break_duration,
    weekly_hours, tolerance_minutes
) VALUES (
    'Horario Oficina Estándar',
    'Lunes a Viernes de 9:00 a 18:00 con 1 hora de almuerzo',
    5, -- Administrativo
    1, '09:00:00', '18:00:00', 60,
    1, '09:00:00', '18:00:00', 60,
    1, '09:00:00', '18:00:00', 60,
    1, '09:00:00', '18:00:00', 60,
    1, '09:00:00', '18:00:00', 60,
    40, -- 40 horas semanales
    15  -- 15 minutos de tolerancia
);

-- Horario turno mañana
INSERT OR IGNORE INTO WorkSchedules (
    name, description, shift_type_id,
    monday_enabled, monday_start, monday_end, monday_break_duration,
    tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
    wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
    thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
    friday_enabled, friday_start, friday_end, friday_break_duration,
    saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
    weekly_hours, tolerance_minutes
) VALUES (
    'Turno Mañana (Gimnasio)',
    'Lunes a Sábado de 6:00 a 14:00',
    1, -- Diurno
    1, '06:00:00', '14:00:00', 30,
    1, '06:00:00', '14:00:00', 30,
    1, '06:00:00', '14:00:00', 30,
    1, '06:00:00', '14:00:00', 30,
    1, '06:00:00', '14:00:00', 30,
    1, '06:00:00', '14:00:00', 30,
    45, -- 45 horas semanales
    10  -- 10 minutos de tolerancia
);

-- Días festivos Chile 2025 (ejemplos)
INSERT OR IGNORE INTO Holidays (name, date, type) VALUES
('Año Nuevo', '2025-01-01', 'national'),
('Viernes Santo', '2025-04-18', 'national'),
('Sábado Santo', '2025-04-19', 'national'),
('Día del Trabajador', '2025-05-01', 'national'),
('Glorias Navales', '2025-05-21', 'national'),
('San Pedro y San Pablo', '2025-06-29', 'national'),
('Día de la Virgen del Carmen', '2025-07-16', 'national'),
('Asunción de la Virgen', '2025-08-15', 'national'),
('Independencia Nacional', '2025-09-18', 'national'),
('Glorias del Ejército', '2025-09-19', 'national'),
('Encuentro de Dos Mundos', '2025-10-12', 'national'),
('Día de las Iglesias Evangélicas', '2025-10-31', 'national'),
('Día de Todos los Santos', '2025-11-01', 'national'),
('Inmaculada Concepción', '2025-12-08', 'national'),
('Navidad', '2025-12-25', 'national');

-- ===========================================================================
-- VISTAS ÚTILES
-- ===========================================================================

-- Vista de asistencia con información del empleado
CREATE VIEW IF NOT EXISTS v_attendance_details AS
SELECT 
    a.*,
    u.username,
    u.role_id,
    ws.name as schedule_name,
    CASE 
        WHEN a.status = 'present' THEN 'Presente'
        WHEN a.status = 'absent' THEN 'Ausente'
        WHEN a.status = 'late' THEN 'Tardanza'
        WHEN a.status = 'early_departure' THEN 'Salida Anticipada'
        WHEN a.status = 'half_day' THEN 'Medio Día'
        WHEN a.status = 'leave' THEN 'Permiso'
        ELSE a.status
    END as status_label
FROM Attendance a
JOIN Users u ON a.user_id = u.id
LEFT JOIN EmployeeSchedules es ON es.user_id = u.id 
    AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
    AND es.is_active = 1
LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id;

-- Vista de horas extras pendientes
CREATE VIEW IF NOT EXISTS v_overtime_pending AS
SELECT 
    o.*,
    u.username,
    u.role_id
FROM Overtime o
JOIN Users u ON o.user_id = u.id
WHERE o.status = 'pending';

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================

-- Actualizar fecha de modificación en Attendance
CREATE TRIGGER IF NOT EXISTS update_attendance_timestamp 
AFTER UPDATE ON Attendance
FOR EACH ROW
BEGIN
    UPDATE Attendance SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Actualizar fecha de modificación en Overtime
CREATE TRIGGER IF NOT EXISTS update_overtime_timestamp 
AFTER UPDATE ON Overtime
FOR EACH ROW
BEGIN
    UPDATE Overtime SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Actualizar fecha de modificación en WorkSchedules
CREATE TRIGGER IF NOT EXISTS update_work_schedules_timestamp 
AFTER UPDATE ON WorkSchedules
FOR EACH ROW
BEGIN
    UPDATE WorkSchedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
