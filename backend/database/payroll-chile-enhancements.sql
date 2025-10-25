-- ============================================================================
-- MEJORAS PARA NÓMINA CHILE - Gymtec ERP
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

-- Bonos habituales
ADD COLUMN IF NOT EXISTS gratificacion_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Gratificación legal',
ADD COLUMN IF NOT EXISTS bono_asistencia DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bono_produccion DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS colacion_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Bonificación colación',
ADD COLUMN IF NOT EXISTS movilizacion_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Bonificación movilización',

-- Totales
ADD COLUMN IF NOT EXISTS total_haberes DECIMAL(10,2) DEFAULT 0 COMMENT 'Total imponible',
ADD COLUMN IF NOT EXISTS total_descuentos DECIMAL(10,2) DEFAULT 0 COMMENT 'Total descuentos legales',
ADD COLUMN IF NOT EXISTS liquido_a_pagar DECIMAL(10,2) DEFAULT 0 COMMENT 'Líquido a pagar',

-- Metadata
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
    
    -- Valores oficiales Chile
    utm_value DECIMAL(12,2) NOT NULL COMMENT 'Valor UTM en pesos',
    uf_value DECIMAL(12,2) NOT NULL COMMENT 'Valor UF en pesos',
    
    -- Metadata
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
    
    -- Salario base
    base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    salary_type ENUM('hourly', 'monthly', 'fixed') DEFAULT 'monthly',
    
    -- Contrato
    contract_type ENUM('indefinido', 'plazo_fijo', 'honorarios', 'part_time') DEFAULT 'indefinido',
    start_date DATE,
    end_date DATE DEFAULT NULL,
    
    -- Previsión
    afp VARCHAR(100) DEFAULT NULL COMMENT 'AFP específica del trabajador',
    afp_custom_percentage DECIMAL(5,2) DEFAULT NULL COMMENT 'Porcentaje personalizado',
    salud_plan VARCHAR(100) DEFAULT NULL COMMENT 'Isapre o Fonasa',
    salud_custom_percentage DECIMAL(5,2) DEFAULT NULL,
    
    -- Tramo tributario (para cálculo impuesto único)
    cargas_familiares INT DEFAULT 0,
    tax_exemption TINYINT(1) DEFAULT 0 COMMENT 'Exento de impuestos',
    
    -- Bonos fijos mensuales
    colacion_mensual DECIMAL(10,2) DEFAULT 0,
    movilizacion_mensual DECIMAL(10,2) DEFAULT 0,
    
    -- Horas extras
    overtime_multiplier DECIMAL(3,1) DEFAULT 1.5 COMMENT 'Multiplicador horas extras',
    overtime_enabled TINYINT(1) DEFAULT 1,
    
    -- Pago
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
-- Fuente: SII Chile - Impuesto Único Segunda Categoría
-- ===========================================================================
INSERT IGNORE INTO TaxBrackets (year, min_utm, max_utm, tax_rate, deduction_utm) VALUES
(2025, 0.00, 13.50, 0.00, 0.00),          -- Exento hasta 13.5 UTM
(2025, 13.50, 30.00, 4.00, 0.54),         -- 4% sobre exceso
(2025, 30.00, 50.00, 8.00, 1.74),         -- 8%
(2025, 50.00, 70.00, 13.50, 4.49),        -- 13.5%
(2025, 70.00, 90.00, 23.00, 11.14),       -- 23%
(2025, 90.00, 120.00, 30.40, 17.80),      -- 30.4%
(2025, 120.00, 150.00, 35.50, 23.92),     -- 35.5%
(2025, 150.00, NULL, 40.00, 30.67);       -- 40% sobre 150 UTM en adelante

-- ===========================================================================
-- VISTA: v_payroll_summary - Resumen consolidado de nómina
-- ===========================================================================
CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT 
    pp.id as period_id,
    pp.period_name,
    pp.start_date,
    pp.end_date,
    pp.payment_date,
    pp.status as period_status,
    COUNT(pd.id) as total_employees,
    SUM(pd.total_haberes) as total_haberes,
    SUM(pd.total_descuentos) as total_descuentos,
    SUM(pd.liquido_a_pagar) as total_liquido,
    SUM(pd.overtime_hours) as total_overtime_hours,
    SUM(pd.overtime_amount) as total_overtime_amount
FROM PayrollPeriods pp
LEFT JOIN PayrollDetails pd ON pp.id = pd.payroll_period_id
GROUP BY pp.id, pp.period_name, pp.start_date, pp.end_date, pp.payment_date, pp.status;

-- ===========================================================================
-- VISTA: v_employee_payroll - Detalle completo por empleado
-- ===========================================================================
CREATE OR REPLACE VIEW v_employee_payroll AS
SELECT 
    pd.*,
    u.username,
    u.email,
    u.role,
    pp.period_name,
    pp.start_date as period_start,
    pp.end_date as period_end,
    eps.contract_type,
    eps.afp as afp_name,
    eps.salud_plan,
    eps.bank_name,
    eps.bank_account
FROM PayrollDetails pd
JOIN Users u ON pd.user_id = u.id
JOIN PayrollPeriods pp ON pd.payroll_period_id = pp.id
LEFT JOIN EmployeePayrollSettings eps ON pd.user_id = eps.user_id;

-- ===========================================================================
-- FUNCIÓN: calculate_impuesto_unico - Calcular impuesto único
-- ===========================================================================
DELIMITER $$

CREATE FUNCTION IF NOT EXISTS calculate_impuesto_unico(
    base_imponible DECIMAL(10,2),
    utm_value DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE base_utm DECIMAL(10,2);
    DECLARE tax_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE tax_rate_value DECIMAL(5,2);
    DECLARE deduction_value DECIMAL(10,2);
    
    -- Convertir base imponible a UTM
    SET base_utm = base_imponible / utm_value;
    
    -- Buscar tramo correspondiente (año actual)
    SELECT tax_rate, deduction_utm INTO tax_rate_value, deduction_value
    FROM TaxBrackets
    WHERE year = YEAR(CURDATE())
      AND base_utm >= min_utm
      AND (max_utm IS NULL OR base_utm < max_utm)
    LIMIT 1;
    
    -- Calcular impuesto
    IF tax_rate_value > 0 THEN
        SET tax_amount = (base_utm * tax_rate_value / 100) - deduction_value;
        SET tax_amount = tax_amount * utm_value; -- Convertir a pesos
        
        -- No puede ser negativo
        IF tax_amount < 0 THEN
            SET tax_amount = 0;
        END IF;
    END IF;
    
    RETURN ROUND(tax_amount, 0);
END$$

DELIMITER ;

-- ===========================================================================
-- PROCEDIMIENTO: generate_payroll_period - Generar período de nómina
-- ===========================================================================
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS generate_payroll_period(
    IN p_period_name VARCHAR(100),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_payment_date DATE
)
BEGIN
    DECLARE v_period_id INT;
    DECLARE v_utm_value DECIMAL(12,2);
    DECLARE v_uf_value DECIMAL(12,2);
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_user_id INT;
    DECLARE v_base_salary DECIMAL(10,2);
    DECLARE v_regular_hours DECIMAL(10,2);
    DECLARE v_overtime_hours DECIMAL(10,2);
    DECLARE v_overtime_amount DECIMAL(10,2);
    
    -- Cursor para empleados activos
    DECLARE emp_cursor CURSOR FOR
        SELECT DISTINCT u.id, COALESCE(eps.base_salary, 0)
        FROM Users u
        LEFT JOIN EmployeePayrollSettings eps ON u.id = eps.user_id AND eps.is_active = 1
        WHERE u.role IN ('Technician', 'Manager', 'Admin')
          AND u.id NOT IN (SELECT user_id FROM PayrollDetails WHERE payroll_period_id = v_period_id);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Crear período
    INSERT INTO PayrollPeriods (period_name, start_date, end_date, payment_date, status)
    VALUES (p_period_name, p_start_date, p_end_date, p_payment_date, 'processing');
    
    SET v_period_id = LAST_INSERT_ID();
    
    -- Obtener tasa de cambio del día
    SELECT utm_value, uf_value INTO v_utm_value, v_uf_value
    FROM CurrencyRates
    WHERE date <= p_end_date
    ORDER BY date DESC
    LIMIT 1;
    
    -- Iterar sobre empleados
    OPEN emp_cursor;
    
    read_loop: LOOP
        FETCH emp_cursor INTO v_user_id, v_base_salary;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Calcular horas regulares del período
        SELECT COALESCE(SUM(worked_hours), 0) INTO v_regular_hours
        FROM Attendance
        WHERE user_id = v_user_id
          AND date BETWEEN p_start_date AND p_end_date;
        
        -- Calcular horas extras aprobadas
        SELECT 
            COALESCE(SUM(hours), 0),
            COALESCE(SUM(total_amount), 0)
        INTO v_overtime_hours, v_overtime_amount
        FROM Overtime
        WHERE user_id = v_user_id
          AND date BETWEEN p_start_date AND p_end_date
          AND status = 'approved';
        
        -- Insertar detalle inicial (cálculos completos se harán después)
        INSERT INTO PayrollDetails (
            payroll_period_id, user_id,
            regular_hours, overtime_hours, total_hours,
            base_salary, overtime_amount,
            exchange_rate_utm, exchange_rate_uf,
            currency, payment_status
        ) VALUES (
            v_period_id, v_user_id,
            v_regular_hours, v_overtime_hours, v_regular_hours + v_overtime_hours,
            v_base_salary, v_overtime_amount,
            v_utm_value, v_uf_value,
            'CLP', 'pending'
        );
    END LOOP;
    
    CLOSE emp_cursor;
    
    -- Retornar ID del período creado
    SELECT v_period_id as period_id, 'Período de nómina generado exitosamente' as message;
END$$

DELIMITER ;

-- ===========================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_payroll_details_status ON PayrollDetails(payment_status);
CREATE INDEX IF NOT EXISTS idx_payroll_details_period_user ON PayrollDetails(payroll_period_id, user_id);
CREATE INDEX IF NOT EXISTS idx_employee_settings_active ON EmployeePayrollSettings(is_active, user_id);

-- ===========================================================================
-- FIN DE SCRIPT - Mejoras Nómina Chile
-- ===========================================================================
