// ===================================================================
// NUEVOS ENDPOINTS PARA DASHBOARD CONSOLIDADO
// Agregar estos endpoints después de /api/dashboard/activity en server-clean.js
// ===================================================================

// Endpoint 1: Resumen de Recursos Humanos
app.get('/api/dashboard/resources-summary', authenticateToken, (req, res) => {
    console.log('👥 Solicitando resumen de recursos humanos...');
    
    const queries = [
        // Total de personal activo
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role IN ('Technician', 'Manager', 'Admin')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_staff', value: rows[0].total });
            });
        }),
        
        // Técnicos activos
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role = 'Technician'`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_technicians', value: rows[0].total });
            });
        }),
        
        // Asistencias hoy
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(DISTINCT user_id) as total 
                FROM Attendance 
                WHERE DATE(check_in) = CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'attendance_today', value: rows[0].total });
            });
        }),
        
        // Horas extras este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COALESCE(SUM(hours), 0) as total 
                FROM Overtime 
                WHERE DATE(date) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                AND status = 'Approved'
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'overtime_hours_month', value: Math.round(rows[0].total * 10) / 10 });
            });
        }),
        
        // Carga de trabajo por técnico
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(t.id) as ticket_count,
                    SUM(CASE WHEN t.priority = 'Crítica' THEN 1 ELSE 0 END) as critical_count
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role = 'Technician'
                GROUP BY u.id, u.username, u.email
                ORDER BY ticket_count DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'technician_workload', value: rows });
            });
        }),
        
        // Utilización de recursos (% de técnicos con tickets)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN u.id END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT u.id), 0) as utilization_percentage
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role = 'Technician'
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'resource_utilization', 
                    value: Math.round((rows[0].utilization_percentage || 0) * 10) / 10 
                });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('✅ Resumen de recursos calculado:', summary);
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando resumen de recursos:', error);
            res.status(500).json({ 
                error: 'Error obteniendo resumen de recursos',
                details: error.message 
            });
        });
});

// Endpoint 2: Resumen Financiero
app.get('/api/dashboard/financial-summary', authenticateToken, (req, res) => {
    console.log('💰 Solicitando resumen financiero...');
    
    const queries = [
        // Total gastos este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM Expenses 
                WHERE DATE(expense_date) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expenses_this_month', value: Math.round(rows[0].total) });
            });
        }),
        
        // Gastos pendientes de aprobación
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount
                FROM Expenses 
                WHERE approval_status = 'Pending'
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'pending_expenses', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Facturas pendientes de pago
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as total_amount
                FROM Invoices 
                WHERE payment_status = 'Pending'
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'pending_invoices', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Cotizaciones en proceso
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as total_amount
                FROM Quotes 
                WHERE status IN ('Draft', 'Sent')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'active_quotes', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Gastos por categoría (top 5)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    ec.name as category_name,
                    COUNT(e.id) as expense_count,
                    COALESCE(SUM(e.amount), 0) as total_amount
                FROM ExpenseCategories ec
                LEFT JOIN Expenses e ON e.category_id = ec.id 
                    AND DATE(e.expense_date) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                GROUP BY ec.id, ec.name
                ORDER BY total_amount DESC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expenses_by_category', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('✅ Resumen financiero calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando resumen financiero:', error);
            res.status(500).json({ 
                error: 'Error obteniendo resumen financiero',
                details: error.message 
            });
        });
});

// Endpoint 3: Resumen de Inventario
app.get('/api/dashboard/inventory-summary', authenticateToken, (req, res) => {
    console.log('📦 Solicitando resumen de inventario...');
    
    const queries = [
        // Items con stock bajo
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Inventory 
                WHERE current_stock <= minimum_stock
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'low_stock_items', value: rows[0].total });
            });
        }),
        
        // Items con stock crítico (0 unidades)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Inventory 
                WHERE current_stock = 0
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'critical_stock_items', value: rows[0].total });
            });
        }),
        
        // Movimientos hoy
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM InventoryMovements 
                WHERE DATE(movement_date) = CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'movements_today', value: rows[0].total });
            });
        }),
        
        // Órdenes de compra pendientes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as total_amount
                FROM PurchaseOrders 
                WHERE status IN ('Pending', 'Approved')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'pending_purchase_orders', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Top 5 repuestos más usados este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    i.sku,
                    i.name,
                    SUM(CASE WHEN im.type = 'Salida' THEN im.quantity ELSE 0 END) as usage_count,
                    i.current_stock
                FROM Inventory i
                LEFT JOIN InventoryMovements im ON im.inventory_id = i.id 
                    AND DATE(im.movement_date) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                GROUP BY i.id, i.sku, i.name, i.current_stock
                ORDER BY usage_count DESC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'top_used_parts', value: rows });
            });
        }),
        
        // Detalles de items críticos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sku,
                    name,
                    current_stock,
                    minimum_stock,
                    0 as unit_cost
                FROM Inventory 
                WHERE current_stock <= minimum_stock
                ORDER BY current_stock ASC
                LIMIT 10
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'critical_items_detail', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('✅ Resumen de inventario calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando resumen de inventario:', error);
            res.status(500).json({ 
                error: 'Error obteniendo resumen de inventario',
                details: error.message 
            });
        });
});

// Endpoint 4: Resumen de Contratos & SLA
app.get('/api/dashboard/contracts-sla-summary', authenticateToken, (req, res) => {
    console.log('📋 Solicitando resumen de contratos y SLA...');
    
    const queries = [
        // Contratos activos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Contracts 
                WHERE status = 'Active' AND end_date >= CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_contracts', value: rows[0].total });
            });
        }),
        
        // Contratos próximos a vencer (30 días)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total
                FROM Contracts 
                WHERE status = 'Active' 
                AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'contracts_expiring_soon', value: rows[0].total });
            });
        }),
        
        // Contratos vencidos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Contracts 
                WHERE end_date < CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expired_contracts', value: rows[0].total });
            });
        }),
        
        // Tickets fuera de SLA
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE sla_status = 'Violated' 
                AND status NOT IN ('Cerrado', 'Completado')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'tickets_outside_sla', value: rows[0].total });
            });
        }),
        
        // Tickets en riesgo de SLA
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE sla_status = 'At Risk' 
                AND status NOT IN ('Cerrado', 'Completado')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'tickets_at_risk_sla', value: rows[0].total });
            });
        }),
        
        // Cumplimiento SLA promedio (últimos 30 días)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(*) as total_tickets,
                    SUM(CASE WHEN sla_status = 'Met' THEN 1 ELSE 0 END) as met_sla,
                    (SUM(CASE WHEN sla_status = 'Met' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as compliance_percentage
                FROM Tickets 
                WHERE status IN ('Cerrado', 'Completado')
                AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'sla_compliance', 
                    value: {
                        percentage: Math.round((rows[0].compliance_percentage || 0) * 10) / 10,
                        total_tickets: rows[0].total_tickets,
                        met_sla: rows[0].met_sla
                    }
                });
            });
        }),
        
        // Detalles de contratos próximos a vencer
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    c.id,
                    c.contract_number,
                    c.start_date,
                    c.end_date,
                    DATEDIFF(c.end_date, CURDATE()) as days_remaining,
                    cl.name as client_name
                FROM Contracts c
                LEFT JOIN Clients cl ON c.client_id = cl.id
                WHERE c.status = 'Active' 
                AND c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                ORDER BY c.end_date ASC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expiring_contracts_detail', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const summary = {};
            results.forEach(result => {
                summary[result.metric] = result.value;
            });
            
            console.log('✅ Resumen de contratos y SLA calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando resumen de contratos y SLA:', error);
            res.status(500).json({ 
                error: 'Error obteniendo resumen de contratos y SLA',
                details: error.message 
            });
        });
});

// Endpoint 5: Alertas Críticas Consolidadas
app.get('/api/dashboard/critical-alerts', authenticateToken, (req, res) => {
    console.log('🚨 Solicitando alertas críticas...');
    
    const queries = [
        // Tickets sin asignar > 24 horas
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    id,
                    title,
                    priority,
                    created_at,
                    TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_unassigned
                FROM Tickets 
                WHERE assigned_technician_id IS NULL 
                AND status = 'Abierto'
                AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY priority DESC, created_at ASC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'unassigned_tickets_24h', value: rows });
            });
        }),
        
        // SLA en riesgo AHORA (próximas 2 horas)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    t.id,
                    t.title,
                    t.priority,
                    t.sla_deadline,
                    TIMESTAMPDIFF(MINUTE, NOW(), t.sla_deadline) as minutes_remaining,
                    c.name as client_name
                FROM Tickets t
                LEFT JOIN Equipment e ON t.equipment_id = e.id
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Clients c ON l.client_id = c.id
                WHERE t.sla_status = 'At Risk'
                AND t.status NOT IN ('Cerrado', 'Completado')
                AND t.sla_deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR)
                ORDER BY t.sla_deadline ASC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'sla_critical_2h', value: rows });
            });
        }),
        
        // Stock en 0 (crítico)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sku,
                    name,
                    minimum_stock,
                    0 as unit_cost
                FROM Inventory 
                WHERE current_stock = 0
                ORDER BY minimum_stock DESC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'zero_stock_items', value: rows });
            });
        }),
        
        // Contratos venciendo esta semana
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    c.id,
                    c.contract_number,
                    c.end_date,
                    DATEDIFF(c.end_date, CURDATE()) as days_remaining,
                    cl.name as client_name
                FROM Contracts c
                LEFT JOIN Clients cl ON c.client_id = cl.id
                WHERE c.status = 'Active'
                AND c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                ORDER BY c.end_date ASC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'contracts_expiring_week', value: rows });
            });
        }),
        
        // Equipos fuera de servicio
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    e.id,
                    e.name,
                    e.serial_number,
                    l.name as location_name,
                    c.name as client_name
                FROM Equipment e
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Clients c ON l.client_id = c.id
                WHERE e.activo = 0
                LIMIT 10
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'equipment_out_of_service', value: rows });
            });
        }),
        
        // Gastos pendientes de aprobación > 7 días
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    e.id,
                    e.description,
                    e.amount,
                    e.expense_date,
                    DATEDIFF(CURDATE(), e.expense_date) as days_pending,
                    u.username as submitted_by
                FROM Expenses e
                LEFT JOIN Users u ON e.user_id = u.id
                WHERE e.approval_status = 'Pending'
                AND e.expense_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                ORDER BY e.expense_date ASC
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expenses_pending_7days', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const alerts = {};
            results.forEach(result => {
                alerts[result.metric] = result.value;
            });
            
            // Calcular total de alertas
            const totalAlerts = 
                (alerts.unassigned_tickets_24h?.length || 0) +
                (alerts.sla_critical_2h?.length || 0) +
                (alerts.zero_stock_items?.length || 0) +
                (alerts.contracts_expiring_week?.length || 0) +
                (alerts.equipment_out_of_service?.length || 0) +
                (alerts.expenses_pending_7days?.length || 0);
            
            console.log(`✅ Alertas críticas calculadas: ${totalAlerts} alertas totales`);
            res.json({
                message: 'success',
                data: alerts,
                total_alerts: totalAlerts,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando alertas críticas:', error);
            res.status(500).json({ 
                error: 'Error obteniendo alertas críticas',
                details: error.message 
            });
        });
});

// Endpoint 6: KPIs Mejorados (actualización del existente)
app.get('/api/dashboard/kpis-enhanced', authenticateToken, (req, res) => {
    console.log('📊 Solicitando KPIs mejorados del dashboard...');
    
    const queries = [
        // KPIs originales
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Clients', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_clients', value: rows[0].total });
            });
        }),
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Equipment', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_equipment', value: rows[0].total });
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE status NOT IN ('Cerrado', 'Completado')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_tickets', value: rows[0].total });
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE priority = 'Crítica' AND status NOT IN ('Cerrado', 'Completado')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'critical_tickets', value: rows[0].total });
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Inventory WHERE current_stock <= minimum_stock`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'low_stock_items', value: rows[0].total });
            });
        }),
        
        // Nuevos KPIs
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Contracts WHERE status = 'Active' AND end_date >= CURDATE()`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_contracts', value: rows[0].total });
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role IN ('Technician', 'Manager', 'Admin')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_staff', value: rows[0].total });
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(DISTINCT user_id) as total FROM Attendance WHERE DATE(check_in) = CURDATE()`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'attendance_today', value: rows[0].total });
            });
        }),
        
        // Datos para gráficos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM Tickets
                GROUP BY status
                ORDER BY count DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'tickets_by_status', value: rows });
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    priority,
                    COUNT(*) as count
                FROM Tickets
                WHERE status NOT IN ('Cerrado', 'Completado')
                GROUP BY priority
                ORDER BY FIELD(priority, 'Crítica', 'Alta', 'Media', 'Baja')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'tickets_by_priority', value: rows });
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id,
                    u.username,
                    COUNT(t.id) as ticket_count
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role = 'Technician'
                GROUP BY u.id, u.username
                ORDER BY ticket_count DESC
                LIMIT 10
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'technician_workload', value: rows });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const kpis = {};
            results.forEach(result => {
                kpis[result.metric] = result.value;
            });
            
            console.log('✅ KPIs mejorados calculados:', Object.keys(kpis).length, 'métricas');
            res.json({
                message: 'success',
                data: kpis,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando KPIs mejorados:', error);
            res.status(500).json({ 
                error: 'Error obteniendo KPIs mejorados',
                details: error.message 
            });
        });
});
