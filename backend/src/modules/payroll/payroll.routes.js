// ============================================================================
// ENDPOINTS - NÓMINA CHILE
// Sistema completo de remuneraciones con legislación chilena
// ============================================================================

/**
 * Endpoints de Nómina para Gymtec ERP (Chile)
 * 
 * Características:
 * - Cálculo automático de descuentos legales (AFP, Salud, Seguro Cesantía)
 * - Impuesto Único Segunda Categoría con tramos 2025
 * - Integración con módulo de asistencia (horas trabajadas + horas extras)
 * - Soporte para CLP, UTM y UF
 * - Bonos (gratificación, asistencia, producción, colación, movilización)
 * - Exportación de liquidaciones de sueldo
 * 
 * @requires express
 * @requires db-adapter
 */

module.exports = function(app, db, authenticateToken, requireRole, toMySQLDateTime) {

// ===================================================================
// UTILIDADES - CÁLCULOS NÓMINA CHILE
// ===================================================================

/**
 * Obtiene valor actual de UTM y UF
 */
async function getCurrentCurrencyRates() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT utm_value, uf_value, date
            FROM CurrencyRates
            ORDER BY date DESC
            LIMIT 1
        `;
        
        db.get(sql, [], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                // Valores por defecto si no hay datos
                resolve({ utm_value: 66098, uf_value: 38500, date: new Date() });
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Calcula impuesto único segunda categoría
 */
async function calculateImpuestoUnico(baseImponible, utmValue) {
    const baseUTM = baseImponible / utmValue;
    
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT tax_rate, deduction_utm
            FROM TaxBrackets
            WHERE year = YEAR(CURDATE())
              AND ? >= min_utm
              AND (max_utm IS NULL OR ? < max_utm)
            LIMIT 1
        `;
        
        db.get(sql, [baseUTM, baseUTM], (err, bracket) => {
            if (err) return reject(err);
            
            if (!bracket || bracket.tax_rate === 0) {
                return resolve(0);
            }
            
            // (baseUTM * tasa%) - rebaja
            let impuesto = (baseUTM * bracket.tax_rate / 100) - bracket.deduction_utm;
            impuesto = impuesto * utmValue; // Convertir a pesos
            
            resolve(Math.max(0, Math.round(impuesto)));
        });
    });
}

/**
 * Calcula todos los componentes de una liquidación de sueldo
 */
async function calculatePayrollDetail(userId, periodStart, periodEnd, baseSalary, currencyRates) {
    // 1. Obtener configuración del empleado
    const empSettings = await new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM EmployeePayrollSettings WHERE user_id = ? AND is_active = 1';
        db.get(sql, [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row || {});
        });
    });

    // 2. Calcular horas regulares trabajadas
    const attendance = await new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                COALESCE(SUM(worked_hours), 0) as regular_hours,
                COUNT(*) as days_worked
            FROM Attendance
            WHERE user_id = ? AND date BETWEEN ? AND ?
        `;
        db.get(sql, [userId, periodStart, periodEnd], (err, row) => {
            if (err) return reject(err);
            resolve(row || { regular_hours: 0, days_worked: 0 });
        });
    });

    // 3. Calcular horas extras aprobadas
    const overtime = await new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                COALESCE(SUM(hours), 0) as overtime_hours,
                COALESCE(SUM(total_amount), 0) as overtime_amount
            FROM Overtime
            WHERE user_id = ? AND date BETWEEN ? AND ?
              AND status = 'approved'
        `;
        db.get(sql, [userId, periodStart, periodEnd], (err, row) => {
            if (err) return reject(err);
            resolve(row || { overtime_hours: 0, overtime_amount: 0 });
        });
    });

    // 4. HABERES (Ingresos)
    const totalHoras = attendance.regular_hours + overtime.overtime_hours;
    const colacion = empSettings.colacion_mensual || 0;
    const movilizacion = empSettings.movilizacion_mensual || 0;
    
    const totalHaberes = baseSalary + overtime.overtime_amount + colacion + movilizacion;

    // 5. DESCUENTOS LEGALES
    const baseImponible = baseSalary + overtime.overtime_amount; // Colación y movilización NO son imponibles
    
    // AFP
    const afpPercentage = empSettings.afp_custom_percentage || 12.89;
    const afpAmount = Math.round(baseImponible * afpPercentage / 100);
    
    // Salud
    const saludPercentage = empSettings.salud_custom_percentage || 7.00;
    const saludAmount = Math.round(baseImponible * saludPercentage / 100);
    
    // Seguro Cesantía
    const seguroCesantiaPercentage = 0.60;
    const seguroCesantiaAmount = Math.round(baseImponible * seguroCesantiaPercentage / 100);
    
    // Impuesto Único (sobre base imponible - descuentos previsionales)
    const baseAfterDescuentos = baseImponible - afpAmount - saludAmount - seguroCesantiaAmount;
    const impuestoUnico = await calculateImpuestoUnico(baseAfterDescuentos, currencyRates.utm_value);
    
    const totalDescuentos = afpAmount + saludAmount + seguroCesantiaAmount + impuestoUnico;
    
    // 6. LÍQUIDO A PAGAR
    const liquidoAPagar = totalHaberes - totalDescuentos;

    return {
        regular_hours: attendance.regular_hours,
        overtime_hours: overtime.overtime_hours,
        total_hours: totalHoras,
        
        base_salary: baseSalary,
        overtime_amount: overtime.overtime_amount,
        colacion_amount: colacion,
        movilizacion_amount: movilizacion,
        
        afp_percentage: afpPercentage,
        afp_amount: afpAmount,
        salud_percentage: saludPercentage,
        salud_amount: saludAmount,
        seguro_cesantia_percentage: seguroCesantiaPercentage,
        seguro_cesantia_amount: seguroCesantiaAmount,
        impuesto_unico_amount: impuestoUnico,
        
        total_haberes: totalHaberes,
        total_descuentos: totalDescuentos,
        liquido_a_pagar: liquidoAPagar,
        
        exchange_rate_utm: currencyRates.utm_value,
        exchange_rate_uf: currencyRates.uf_value
    };
}

// ===================================================================
// ENDPOINTS - PERÍODOS DE NÓMINA
// ===================================================================

/**
 * GET /api/payroll/periods - Listar períodos de nómina
 */
app.get('/api/payroll/periods', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { status, year } = req.query;
    
    let sql = `
        SELECT 
            pp.*,
            COUNT(pd.id) as employee_count,
            COALESCE(SUM(pd.liquido_a_pagar), 0) as total_payroll
        FROM PayrollPeriods pp
        LEFT JOIN PayrollDetails pd ON pp.id = pd.payroll_period_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        sql += ' AND pp.status = ?';
        params.push(status);
    }
    
    if (year) {
        sql += ' AND YEAR(pp.start_date) = ?';
        params.push(year);
    }
    
    sql += ' GROUP BY pp.id ORDER BY pp.start_date DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo períodos de nómina:', err);
            return res.status(500).json({ error: 'Error al obtener períodos' });
        }
        res.json({ message: 'success', data: rows });
    });
});

/**
 * GET /api/payroll/periods/:id - Detalle de un período
 */
app.get('/api/payroll/periods/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const sql = `
        SELECT pp.*, 
               COUNT(pd.id) as employee_count,
               COALESCE(SUM(pd.total_haberes), 0) as total_haberes,
               COALESCE(SUM(pd.total_descuentos), 0) as total_descuentos,
               COALESCE(SUM(pd.liquido_a_pagar), 0) as total_liquido
        FROM PayrollPeriods pp
        LEFT JOIN PayrollDetails pd ON pp.id = pd.payroll_period_id
        WHERE pp.id = ?
        GROUP BY pp.id
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo período:', err);
            return res.status(500).json({ error: 'Error al obtener período' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Período no encontrado' });
        }
        res.json({ message: 'success', data: row });
    });
});

/**
 * POST /api/payroll/periods - Crear nuevo período de nómina
 */
app.post('/api/payroll/periods', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
    const { period_name, start_date, end_date, payment_date } = req.body;
    
    if (!period_name || !start_date || !end_date) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    try {
        // Crear período
        const insertPeriod = `
            INSERT INTO PayrollPeriods (period_name, start_date, end_date, payment_date, status)
            VALUES (?, ?, ?, ?, 'open')
        `;
        
        db.run(insertPeriod, [period_name, start_date, end_date, payment_date || null], function(err) {
            if (err) {
                console.error('Error creando período:', err);
                return res.status(500).json({ error: 'Error al crear período' });
            }
            
            res.json({ 
                message: 'Período de nómina creado exitosamente',
                data: { id: this.lastID, period_name, start_date, end_date }
            });
        });
    } catch (error) {
        console.error('Error en creación de período:', error);
        res.status(500).json({ error: 'Error al crear período' });
    }
});

/**
 * POST /api/payroll/periods/:id/generate - Generar nómina para todos los empleados
 */
app.post('/api/payroll/periods/:id/generate', authenticateToken, requireRole(['Admin']), async (req, res) => {
    const periodId = req.params.id;
    
    try {
        // 1. Obtener datos del período
        const period = await new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM PayrollPeriods WHERE id = ?';
            db.get(sql, [periodId], (err, row) => {
                if (err) return reject(err);
                if (!row) return reject(new Error('Período no encontrado'));
                resolve(row);
            });
        });

        // 2. Obtener tasas de cambio
        const currencyRates = await getCurrentCurrencyRates();

        // 3. Obtener empleados activos con configuración
        const employees = await new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT u.id, u.username, 
                       COALESCE(eps.base_salary, 0) as base_salary
                FROM Users u
                LEFT JOIN EmployeePayrollSettings eps ON u.id = eps.user_id AND eps.is_active = 1
                WHERE u.role IN ('Technician', 'Manager', 'Admin')
                  AND u.id NOT IN (
                      SELECT user_id FROM PayrollDetails WHERE payroll_period_id = ?
                  )
            `;
            db.all(sql, [periodId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        if (employees.length === 0) {
            return res.json({ message: 'No hay empleados pendientes para calcular nómina', data: { employees_processed: 0 } });
        }

        // 4. Calcular nómina para cada empleado
        let processedCount = 0;
        let errors = [];

        for (const emp of employees) {
            try {
                const payrollData = await calculatePayrollDetail(
                    emp.id,
                    period.start_date,
                    period.end_date,
                    emp.base_salary,
                    currencyRates
                );

                // Insertar detalle de nómina
                const insertSql = `
                    INSERT INTO PayrollDetails (
                        payroll_period_id, user_id,
                        regular_hours, overtime_hours, total_hours,
                        base_salary, overtime_amount, colacion_amount, movilizacion_amount,
                        afp_percentage, afp_amount,
                        salud_percentage, salud_amount,
                        seguro_cesantia_percentage, seguro_cesantia_amount,
                        impuesto_unico_amount,
                        total_haberes, total_descuentos, liquido_a_pagar,
                        exchange_rate_utm, exchange_rate_uf,
                        currency, payment_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLP', 'pending')
                `;

                await new Promise((resolve, reject) => {
                    db.run(insertSql, [
                        periodId, emp.id,
                        payrollData.regular_hours, payrollData.overtime_hours, payrollData.total_hours,
                        payrollData.base_salary, payrollData.overtime_amount, 
                        payrollData.colacion_amount, payrollData.movilizacion_amount,
                        payrollData.afp_percentage, payrollData.afp_amount,
                        payrollData.salud_percentage, payrollData.salud_amount,
                        payrollData.seguro_cesantia_percentage, payrollData.seguro_cesantia_amount,
                        payrollData.impuesto_unico_amount,
                        payrollData.total_haberes, payrollData.total_descuentos, payrollData.liquido_a_pagar,
                        payrollData.exchange_rate_utm, payrollData.exchange_rate_uf
                    ], function(err) {
                        if (err) return reject(err);
                        resolve(this.lastID);
                    });
                });

                processedCount++;
            } catch (empError) {
                console.error(`Error procesando empleado ${emp.username}:`, empError);
                errors.push({ employee: emp.username, error: empError.message });
            }
        }

        // 5. Actualizar estado del período
        await new Promise((resolve, reject) => {
            const sql = 'UPDATE PayrollPeriods SET status = ? WHERE id = ?';
            db.run(sql, ['processing', periodId], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        res.json({
            message: 'Nómina generada exitosamente',
            data: {
                period_id: periodId,
                employees_processed: processedCount,
                employees_total: employees.length,
                errors: errors
            }
        });

    } catch (error) {
        console.error('Error generando nómina:', error);
        res.status(500).json({ error: 'Error al generar nómina: ' + error.message });
    }
});

// ===================================================================
// ENDPOINTS - DETALLES DE NÓMINA
// ===================================================================

/**
 * GET /api/payroll/details - Listar detalles de nómina
 */
app.get('/api/payroll/details', authenticateToken, (req, res) => {
    const { period_id, user_id } = req.query;
    
    // Si es empleado normal, solo puede ver su propia nómina
    const isAdminOrManager = ['Admin', 'Manager'].includes(req.user.role);
    
    let sql = `
        SELECT 
            pd.*,
            u.username, u.email, u.role,
            pp.period_name, pp.start_date, pp.end_date,
            eps.afp as afp_name, eps.salud_plan
        FROM PayrollDetails pd
        JOIN Users u ON pd.user_id = u.id
        JOIN PayrollPeriods pp ON pd.payroll_period_id = pp.id
        LEFT JOIN EmployeePayrollSettings eps ON pd.user_id = eps.user_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (period_id) {
        sql += ' AND pd.payroll_period_id = ?';
        params.push(period_id);
    }
    
    if (user_id) {
        sql += ' AND pd.user_id = ?';
        params.push(user_id);
    } else if (!isAdminOrManager) {
        // Empleado normal solo ve su propia nómina
        sql += ' AND pd.user_id = ?';
        params.push(req.user.id);
    }
    
    sql += ' ORDER BY pp.start_date DESC, u.username ASC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo detalles de nómina:', err);
            return res.status(500).json({ error: 'Error al obtener detalles' });
        }
        res.json({ message: 'success', data: rows });
    });
});

/**
 * GET /api/payroll/details/:id - Detalle individual de liquidación
 */
app.get('/api/payroll/details/:id', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            pd.*,
            u.username, u.email, u.role, u.rut,
            pp.period_name, pp.start_date, pp.end_date, pp.payment_date,
            eps.afp as afp_name, eps.salud_plan, eps.bank_name, eps.bank_account, eps.account_type
        FROM PayrollDetails pd
        JOIN Users u ON pd.user_id = u.id
        JOIN PayrollPeriods pp ON pd.payroll_period_id = pp.id
        LEFT JOIN EmployeePayrollSettings eps ON pd.user_id = eps.user_id
        WHERE pd.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo detalle:', err);
            return res.status(500).json({ error: 'Error al obtener detalle' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Detalle no encontrado' });
        }
        
        // Verificar permisos
        const isAdminOrManager = ['Admin', 'Manager'].includes(req.user.role);
        if (!isAdminOrManager && row.user_id !== req.user.id) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        res.json({ message: 'success', data: row });
    });
});

/**
 * PATCH /api/payroll/details/:id - Actualizar detalle de nómina
 */
app.patch('/api/payroll/details/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { 
        bonuses, deductions, otros_descuentos, anticipo_amount,
        bono_asistencia, bono_produccion, gratificacion_amount,
        notes
    } = req.body;
    
    // Recalcular totales
    const sql = `
        UPDATE PayrollDetails SET
            bonuses = COALESCE(?, bonuses),
            deductions = COALESCE(?, deductions),
            otros_descuentos = COALESCE(?, otros_descuentos),
            anticipo_amount = COALESCE(?, anticipo_amount),
            bono_asistencia = COALESCE(?, bono_asistencia),
            bono_produccion = COALESCE(?, bono_produccion),
            gratificacion_amount = COALESCE(?, gratificacion_amount),
            notes = COALESCE(?, notes),
            
            total_haberes = base_salary + overtime_amount + colacion_amount + movilizacion_amount +
                           COALESCE(?, bonuses) + COALESCE(?, bono_asistencia) + 
                           COALESCE(?, bono_produccion) + COALESCE(?, gratificacion_amount),
            
            total_descuentos = afp_amount + salud_amount + seguro_cesantia_amount + impuesto_unico_amount +
                              COALESCE(?, deductions) + COALESCE(?, otros_descuentos) + COALESCE(?, anticipo_amount),
            
            liquido_a_pagar = (base_salary + overtime_amount + colacion_amount + movilizacion_amount +
                              COALESCE(?, bonuses) + COALESCE(?, bono_asistencia) + 
                              COALESCE(?, bono_produccion) + COALESCE(?, gratificacion_amount)) -
                             (afp_amount + salud_amount + seguro_cesantia_amount + impuesto_unico_amount +
                              COALESCE(?, deductions) + COALESCE(?, otros_descuentos) + COALESCE(?, anticipo_amount))
        WHERE id = ?
    `;
    
    db.run(sql, [
        bonuses, deductions, otros_descuentos, anticipo_amount,
        bono_asistencia, bono_produccion, gratificacion_amount, notes,
        // Repetir para cálculos
        bonuses, bono_asistencia, bono_produccion, gratificacion_amount,
        deductions, otros_descuentos, anticipo_amount,
        bonuses, bono_asistencia, bono_produccion, gratificacion_amount,
        deductions, otros_descuentos, anticipo_amount,
        req.params.id
    ], function(err) {
        if (err) {
            console.error('Error actualizando detalle:', err);
            return res.status(500).json({ error: 'Error al actualizar' });
        }
        res.json({ message: 'Detalle actualizado exitosamente', data: { id: req.params.id } });
    });
});

/**
 * PUT /api/payroll/details/:id/approve - Aprobar liquidación
 */
app.put('/api/payroll/details/:id/approve', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = `
        UPDATE PayrollDetails SET
            payment_status = 'processed',
            approved_by = ?,
            approved_at = NOW()
        WHERE id = ?
    `;
    
    db.run(sql, [req.user.id, req.params.id], function(err) {
        if (err) {
            console.error('Error aprobando liquidación:', err);
            return res.status(500).json({ error: 'Error al aprobar' });
        }
        res.json({ message: 'Liquidación aprobada exitosamente' });
    });
});

// ===================================================================
// ENDPOINTS - CONFIGURACIÓN DE EMPLEADOS
// ===================================================================

/**
 * GET /api/payroll/employee-settings/:userId - Configuración de empleado
 */
app.get('/api/payroll/employee-settings/:userId', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const sql = 'SELECT * FROM EmployeePayrollSettings WHERE user_id = ?';
    
    db.get(sql, [req.params.userId], (err, row) => {
        if (err) {
            console.error('Error obteniendo configuración:', err);
            return res.status(500).json({ error: 'Error al obtener configuración' });
        }
        res.json({ message: 'success', data: row || {} });
    });
});

/**
 * POST /api/payroll/employee-settings - Crear/actualizar configuración
 */
app.post('/api/payroll/employee-settings', authenticateToken, requireRole(['Admin']), (req, res) => {
    const {
        user_id, base_salary, salary_type, contract_type,
        afp, afp_custom_percentage, salud_plan, salud_custom_percentage,
        colacion_mensual, movilizacion_mensual,
        overtime_multiplier, overtime_enabled,
        payment_method, bank_name, bank_account, account_type
    } = req.body;
    
    const sql = `
        INSERT INTO EmployeePayrollSettings (
            user_id, base_salary, salary_type, contract_type,
            afp, afp_custom_percentage, salud_plan, salud_custom_percentage,
            colacion_mensual, movilizacion_mensual,
            overtime_multiplier, overtime_enabled,
            payment_method, bank_name, bank_account, account_type,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            base_salary = VALUES(base_salary),
            salary_type = VALUES(salary_type),
            contract_type = VALUES(contract_type),
            afp = VALUES(afp),
            afp_custom_percentage = VALUES(afp_custom_percentage),
            salud_plan = VALUES(salud_plan),
            salud_custom_percentage = VALUES(salud_custom_percentage),
            colacion_mensual = VALUES(colacion_mensual),
            movilizacion_mensual = VALUES(movilizacion_mensual),
            overtime_multiplier = VALUES(overtime_multiplier),
            overtime_enabled = VALUES(overtime_enabled),
            payment_method = VALUES(payment_method),
            bank_name = VALUES(bank_name),
            bank_account = VALUES(bank_account),
            account_type = VALUES(account_type)
    `;
    
    db.run(sql, [
        user_id, base_salary, salary_type, contract_type,
        afp, afp_custom_percentage, salud_plan, salud_custom_percentage,
        colacion_mensual, movilizacion_mensual,
        overtime_multiplier, overtime_enabled,
        payment_method, bank_name, bank_account, account_type
    ], function(err) {
        if (err) {
            console.error('Error guardando configuración:', err);
            return res.status(500).json({ error: 'Error al guardar configuración' });
        }
        res.json({ message: 'Configuración guardada exitosamente', data: { user_id } });
    });
});

// ===================================================================
// ENDPOINTS - TASAS DE CAMBIO (CLP/UTM/UF)
// ===================================================================

/**
 * GET /api/currency/rates - Obtener tasas actuales
 */
app.get('/api/currency/rates', authenticateToken, (req, res) => {
    const { date } = req.query;
    
    let sql = 'SELECT * FROM CurrencyRates';
    const params = [];
    
    if (date) {
        sql += ' WHERE date = ?';
        params.push(date);
    } else {
        sql += ' ORDER BY date DESC LIMIT 1';
    }
    
    db.get(sql, params, (err, row) => {
        if (err) {
            console.error('Error obteniendo tasas:', err);
            return res.status(500).json({ error: 'Error al obtener tasas' });
        }
        
        if (!row) {
            // Valores por defecto
            return res.json({
                message: 'success',
                data: { utm_value: 66098, uf_value: 38500, date: new Date().toISOString().split('T')[0] }
            });
        }
        
        res.json({ message: 'success', data: row });
    });
});

/**
 * POST /api/currency/rates - Actualizar tasas (Admin)
 */
app.post('/api/currency/rates', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { date, utm_value, uf_value, source } = req.body;
    
    if (!date || !utm_value || !uf_value) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const sql = `
        INSERT INTO CurrencyRates (date, utm_value, uf_value, source, is_official)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            utm_value = VALUES(utm_value),
            uf_value = VALUES(uf_value),
            source = VALUES(source)
    `;
    
    db.run(sql, [date, utm_value, uf_value, source || 'Manual'], function(err) {
        if (err) {
            console.error('Error guardando tasas:', err);
            return res.status(500).json({ error: 'Error al guardar tasas' });
        }
        res.json({ message: 'Tasas actualizadas exitosamente', data: { date, utm_value, uf_value } });
    });
});

/**
 * GET /api/currency/convert - Convertir montos
 */
app.get('/api/currency/convert', authenticateToken, async (req, res) => {
    const { amount, from, to } = req.query;
    
    if (!amount || !from || !to) {
        return res.status(400).json({ error: 'Parámetros incompletos' });
    }
    
    try {
        const rates = await getCurrentCurrencyRates();
        const amountNum = parseFloat(amount);
        
        let result = amountNum;
        
        // Convertir a CLP primero
        if (from === 'UTM') {
            result = amountNum * rates.utm_value;
        } else if (from === 'UF') {
            result = amountNum * rates.uf_value;
        }
        
        // Luego convertir a moneda destino
        if (to === 'UTM') {
            result = result / rates.utm_value;
        } else if (to === 'UF') {
            result = result / rates.uf_value;
        }
        
        res.json({
            message: 'success',
            data: {
                original: amountNum,
                from,
                to,
                result: Math.round(result * 100) / 100,
                rates: {
                    utm: rates.utm_value,
                    uf: rates.uf_value
                }
            }
        });
    } catch (error) {
        console.error('Error en conversión:', error);
        res.status(500).json({ error: 'Error al convertir moneda' });
    }
});

// ===================================================================
// FIN DE ENDPOINTS - NÓMINA CHILE
// ===================================================================

console.log('✅ Endpoints de Nómina Chile cargados correctamente');

}; // module.exports
