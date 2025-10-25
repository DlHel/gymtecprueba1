-- ============================================================================
-- MEJORAS PARA NÓMINA CHILE - Gymtec ERP (Versión Simplificada)
-- Sistema completo de remuneraciones con descuentos legales chilenos
-- ============================================================================

-- ===========================================================================
-- AMPLIAR PayrollDetails con descuentos legales chilenos
-- ===========================================================================
ALTER TABLE PayrollDetails 
ADD COLUMN IF NOT EXISTS afp_percentage DECIMAL(5,2) DEFAULT 12.89 COMMENT 'AFP (Promedio Chile)',
ADD COLUMN IF NOT EXISTS afp_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS salud_percentage DECIMAL(5,2) DEFAULT 7.00 COMMENT 'Salud obligatoria 7%',
ADD COLUMN IF NOT EXISTS salud_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seguro_cesantia_percentage DECIMAL(5,2) DEFAULT 0.60 COMMENT 'Seguro cesantía trabajador',
ADD COLUMN IF NOT EXISTS seguro_cesantia_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS impuesto_unico_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Impuesto único segunda categoría',
ADD COLUMN IF NOT EXISTS anticipo_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Anticipos otorgados',
ADD COLUMN IF NOT EXISTS otros_descuentos DECIMAL(10,2) DEFAULT 0 COMMENT 'Otros descuentos',
ADD COLUMN IF NOT EXISTS gratificacion_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Gratificación legal',
ADD COLUMN IF NOT EXISTS bono_asistencia DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bono_produccion DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS colacion_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Bonificación colación',
ADD COLUMN IF NOT EXISTS movilizacion_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Bonificación movilización',
ADD COLUMN IF NOT EXISTS total_haberes DECIMAL(10,2) DEFAULT 0 COMMENT 'Total imponible',
ADD COLUMN IF NOT EXISTS total_descuentos DECIMAL(10,2) DEFAULT 0 COMMENT 'Total descuentos legales',
ADD COLUMN IF NOT EXISTS liquido_a_pagar DECIMAL(10,2) DEFAULT 0 COMMENT 'Líquido a pagar',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CLP' COMMENT 'CLP, UTM o UF',
ADD COLUMN IF NOT EXISTS exchange_rate_utm DECIMAL(10,2) DEFAULT NULL COMMENT 'Valor UTM del período',
ADD COLUMN IF NOT EXISTS exchange_rate_uf DECIMAL(10,2) DEFAULT NULL COMMENT 'Valor UF del período',
ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'processed', 'paid', 'error') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL COMMENT 'Transferencia, cheque, efectivo',
ADD COLUMN IF NOT EXISTS payment_date DATETIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_by INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_at DATETIME DEFAULT NULL;

-- ===========================================================================
-- TABLA: PayrollSettings - Configuración de Nómina Chile
-- ===========================================================================
CREATE TABLE IF NOT EXISTS PayrollSettings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value VARCHAR(255) NOT NULL,
    setting_type ENUM('percentage', 'amount', 'boolean', 'text') DEFAULT 'text',
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (setting_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: CurrencyRates - Tasas de Conversión CLP/UTM/UF
-- ===========================================================================
CREATE TABLE IF NOT EXISTS CurrencyRates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    utm_value DECIMAL(12,2) NOT NULL COMMENT 'Valor UTM en pesos',
    uf_value DECIMAL(12,2) NOT NULL COMMENT 'Valor UF en pesos',
    source VARCHAR(100) DEFAULT 'SII' COMMENT 'Fuente: SII, Banco Central',
    is_official TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: TaxBrackets - Tramos Impuesto Único Segunda Categoría
-- ===========================================================================
CREATE TABLE IF NOT EXISTS TaxBrackets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    min_utm DECIMAL(10,2) NOT NULL COMMENT 'Desde UTM',
    max_utm DECIMAL(10,2) DEFAULT NULL COMMENT 'Hasta UTM (NULL = infinito)',
    tax_rate DECIMAL(5,2) NOT NULL COMMENT 'Tasa %',
    deduction_utm DECIMAL(10,2) DEFAULT 0 COMMENT 'Rebaja en UTM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_year (year),
    INDEX idx_range (year, min_utm, max_utm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- TABLA: EmployeePayrollSettings - Configuración por Empleado
-- ===========================================================================
CREATE TABLE IF NOT EXISTS EmployeePayrollSettings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    salary_type ENUM('hourly', 'monthly', 'fixed') DEFAULT 'monthly',
    contract_type ENUM('indefinido', 'plazo_fijo', 'honorarios', 'part_time') DEFAULT 'indefinido',
    start_date DATE,
    end_date DATE DEFAULT NULL,
    afp VARCHAR(100) DEFAULT NULL COMMENT 'AFP específica del trabajador',
    afp_custom_percentage DECIMAL(5,2) DEFAULT NULL COMMENT 'Porcentaje personalizado',
    salud_plan VARCHAR(100) DEFAULT NULL COMMENT 'Isapre o Fonasa',
    salud_custom_percentage DECIMAL(5,2) DEFAULT NULL,
    cargas_familiares INT DEFAULT 0,
    tax_exemption TINYINT(1) DEFAULT 0 COMMENT 'Exento de impuestos',
    colacion_mensual DECIMAL(10,2) DEFAULT 0,
    movilizacion_mensual DECIMAL(10,2) DEFAULT 0,
    overtime_multiplier DECIMAL(3,1) DEFAULT 1.5 COMMENT 'Multiplicador horas extras',
    overtime_enabled TINYINT(1) DEFAULT 1,
    payment_method VARCHAR(50) DEFAULT 'transferencia',
    bank_name VARCHAR(100) DEFAULT NULL,
    bank_account VARCHAR(50) DEFAULT NULL,
    account_type VARCHAR(20) DEFAULT NULL COMMENT 'cuenta corriente, vista, rut',
    notes TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================================
-- DATOS INICIALES: Configuración de Nómina Chile
-- ===========================================================================
INSERT IGNORE INTO PayrollSettings (setting_name, setting_value, setting_type, description) VALUES
('afp_default_percentage', '12.89', 'percentage', 'Porcentaje AFP promedio Chile 2025'),
('salud_min_percentage', '7.00', 'percentage', 'Cotización salud mínima obligatoria'),
('seguro_cesantia_worker', '0.60', 'percentage', 'Seguro cesantía trabajador'),
('seguro_cesantia_employer', '2.40', 'percentage', 'Seguro cesantía empleador'),
('gratificacion_enabled', 'true', 'boolean', 'Habilitar cálculo gratificación legal'),
('gratificacion_percentage', '25.00', 'percentage', 'Tope gratificación 25% de ventas'),
('min_wage_chile', '500000', 'amount', 'Sueldo mínimo Chile 2025'),
('working_days_month', '30', 'text', 'Días trabajados por mes'),
('working_hours_week', '45', 'text', 'Horas semanales ley Chile'),
('currency_default', 'CLP', 'text', 'Moneda por defecto');

-- ===========================================================================
-- DATOS INICIALES: Tasas de Conversión (Octubre 2025)
-- ===========================================================================
INSERT IGNORE INTO CurrencyRates (date, utm_value, uf_value, source) VALUES
('2025-10-01', 66098, 38320.15, 'SII'),
('2025-10-15', 66098, 38420.50, 'SII'),
('2025-10-24', 66098, 38500.00, 'SII');

-- ===========================================================================
-- DATOS INICIALES: Tramos Impuesto Único 2025
-- ===========================================================================
INSERT IGNORE INTO TaxBrackets (year, min_utm, max_utm, tax_rate, deduction_utm) VALUES
(2025, 0.00, 13.50, 0.00, 0.00),
(2025, 13.50, 30.00, 4.00, 0.54),
(2025, 30.00, 50.00, 8.00, 1.74),
(2025, 50.00, 70.00, 13.50, 4.49),
(2025, 70.00, 90.00, 23.00, 11.14),
(2025, 90.00, 120.00, 30.40, 17.80),
(2025, 120.00, 150.00, 35.50, 23.92),
(2025, 150.00, NULL, 40.00, 30.67);

-- ===========================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_payroll_details_status ON PayrollDetails(payment_status);
CREATE INDEX IF NOT EXISTS idx_payroll_details_period_user ON PayrollDetails(payroll_period_id, user_id);
CREATE INDEX IF NOT EXISTS idx_employee_settings_active ON EmployeePayrollSettings(is_active, user_id);

-- ===========================================================================
-- FIN DE SCRIPT
-- ===========================================================================
