-- Migración: Agregar campos de aprobación a PayrollPeriods
-- Fecha: 2025-11-21

-- Agregar nuevas columnas para flujo de aprobación
ALTER TABLE PayrollPeriods
ADD COLUMN IF NOT EXISTS total_employees INT DEFAULT 0 AFTER status,
ADD COLUMN IF NOT EXISTS total_days_worked DECIMAL(10,2) DEFAULT 0 AFTER total_employees,
ADD COLUMN IF NOT EXISTS total_hours_worked DECIMAL(10,2) DEFAULT 0 AFTER total_days_worked,
ADD COLUMN IF NOT EXISTS total_overtime_hours DECIMAL(10,2) DEFAULT 0 AFTER total_hours_worked,
ADD COLUMN IF NOT EXISTS total_absences INT DEFAULT 0 AFTER total_overtime_hours,
ADD COLUMN IF NOT EXISTS total_late_arrivals INT DEFAULT 0 AFTER total_absences,
ADD COLUMN IF NOT EXISTS closed_by INT AFTER total_late_arrivals,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL AFTER closed_by,
ADD COLUMN IF NOT EXISTS approved_by INT AFTER closed_at,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT AFTER approved_at,
ADD COLUMN IF NOT EXISTS notes TEXT AFTER rejection_reason;

-- Modificar ENUM de status para incluir nuevos estados
ALTER TABLE PayrollPeriods 
MODIFY COLUMN status ENUM('draft', 'closed', 'approved', 'rejected', 'open', 'processing', 'paid') DEFAULT 'draft';

-- Agregar foreign keys
ALTER TABLE PayrollPeriods
ADD CONSTRAINT IF NOT EXISTS fk_closed_by FOREIGN KEY (closed_by) REFERENCES Users(id) ON DELETE SET NULL,
ADD CONSTRAINT IF NOT EXISTS fk_approved_by FOREIGN KEY (approved_by) REFERENCES Users(id) ON DELETE SET NULL;

-- Agregar columna payroll_period_id a Attendance si no existe
ALTER TABLE Attendance
ADD COLUMN IF NOT EXISTS payroll_period_id INT NULL AFTER status,
ADD CONSTRAINT IF NOT EXISTS fk_attendance_period FOREIGN KEY (payroll_period_id) REFERENCES PayrollPeriods(id) ON DELETE SET NULL;

-- Agregar columna payroll_period_id a Overtime si no existe  
ALTER TABLE Overtime
ADD COLUMN IF NOT EXISTS payroll_period_id INT NULL AFTER status,
ADD CONSTRAINT IF NOT EXISTS fk_overtime_period FOREIGN KEY (payroll_period_id) REFERENCES PayrollPeriods(id) ON DELETE SET NULL;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_attendance_period ON Attendance(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_overtime_period ON Overtime(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON PayrollPeriods(status);

-- Comentarios
COMMENT ON COLUMN PayrollPeriods.closed_by IS 'Usuario que cerró el período';
COMMENT ON COLUMN PayrollPeriods.approved_by IS 'Usuario que aprobó el período';
COMMENT ON COLUMN PayrollPeriods.rejection_reason IS 'Razón del rechazo si aplica';
