const express = require('express');

const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

// RUTAS DEL DASHBOARD - KPIs Y ACTIVIDAD
// ===================================================================

// Endpoint para obtener KPIs del dashboard
router.get('/dashboard/kpis', authenticateToken, (req, res) => {
    console.log('📊 Solicitando KPIs del dashboard...');
    
    // Realizar múltiples consultas para obtener KPIs
    const queries = [
        // Total de clientes
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Clients', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_clients', value: rows[0].total });
            });
        }),
        
        // Total de equipos
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Equipment', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_equipment', value: rows[0].total });
            });
        }),
        
        // Tickets abiertos
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE status IN ('Abierto', 'En Progreso')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'open_tickets', value: rows[0].total });
            });
        }),
        
        // Tickets completados este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE status = 'Completado' 
                AND DATE(updated_at) >= DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE())-1 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'completed_tickets_month', value: rows[0].total });
            });
        }),
        
        // Tiempo promedio de resolución (en días)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT AVG(DATEDIFF(updated_at, created_at)) as avg_resolution_time
                FROM Tickets 
                WHERE status = 'Completado'
                AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'avg_resolution_time', 
                    value: rows[0].avg_resolution_time ? Math.round(rows[0].avg_resolution_time * 10) / 10 : 0 
                });
            });
        }),
        
        // Ubicaciones activas
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Locations', [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'total_locations', value: rows[0].total });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const kpis = {};
            results.forEach(result => {
                kpis[result.metric] = result.value;
            });
            
            console.log('✅ KPIs calculados:', kpis);
            res.json({
                message: 'success',
                data: kpis,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando KPIs:', error);
            res.status(500).json({ 
                error: 'Error obteniendo KPIs',
                details: error.message 
            });
        });
});

// Endpoint para obtener actividad reciente
router.get('/dashboard/activity', authenticateToken, (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    console.log(`📋 Solicitando actividad reciente (límite: ${limit})...`);
    
    const sql = `
        SELECT 
            'ticket' as type,
            t.id as reference_id,
            CONCAT('Ticket #', t.id, ': ', t.title) as description,
            t.status,
            t.priority,
            t.updated_at as timestamp,
            c.name as client_name,
            l.name as location_name
        FROM Tickets t
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        WHERE t.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        UNION ALL
        
        SELECT 
            'equipment' as type,
            e.id as reference_id,
            CONCAT('Equipo registrado: ', e.name) as description,
            'activo' as status,
            'Normal' as priority,
            e.created_at as timestamp,
            c.name as client_name,
            l.name as location_name
        FROM Equipment e
        LEFT JOIN Locations l ON e.location_id = l.id
        LEFT JOIN Clients c ON l.client_id = c.id
        WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        ORDER BY timestamp DESC
        LIMIT 10
    `;
    
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo actividad:', err);
            res.status(500).json({ 
                error: 'Error obteniendo actividad',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ Actividad obtenida: ${rows.length} registros`);
        res.json({
            message: 'success',
            data: rows,
            count: rows.length,
            timestamp: new Date().toISOString()
        });
    });
});

// ===================================================================

// ===================================================================
// DASHBOARD CONSOLIDADO - NUEVOS ENDPOINTS
// ===================================================================

// Endpoint 1: Resumen de Recursos Humanos
router.get('/dashboard/resources-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen de recursos humanos...');
    
    const queries = [
        // Total de personal activo
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role IN ('Technician', 'technician', 'Tecnico', 'Técnico', 'Manager', 'Admin', 'Supervisor')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_staff', value: rows[0].total });
            });
        }),
        
        // T�cnicos activos
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role IN ('Technician', 'technician', 'Tecnico', 'Técnico')`, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'active_technicians', value: rows[0].total });
            });
        }),
        
        // Asistencias hoy
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(DISTINCT user_id) as total 
                FROM Attendance 
                WHERE date = CURDATE()
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
        
        // Carga de trabajo por t�cnico
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(t.id) as ticket_count,
                    SUM(CASE WHEN t.priority = 'Cr�tica' THEN 1 ELSE 0 END) as critical_count
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role IN ('Technician', 'technician', 'Tecnico', 'Técnico')
                GROUP BY u.id, u.username, u.email
                ORDER BY ticket_count DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'technician_workload', value: rows });
            });
        }),
        
        // Utilizaci�n de recursos (% de t�cnicos con tickets)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN u.id END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT u.id), 0) as utilization_percentage
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Completado')
                WHERE u.role IN ('Technician', 'technician', 'Tecnico', 'Técnico')
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
            
            console.log('? Resumen de recursos calculado:', summary);
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen de recursos (dashboard) - se devolverán valores por defecto:', error && error.message || error);
            // Devolver datos por defecto para evitar 500 en frontend cuando faltan tablas/columnas
            const defaultSummary = {
                active_staff: 0,
                active_technicians: 0,
                attendance_today: 0,
                overtime_hours_month: 0,
                technician_workload: [],
                resource_utilization: 0
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos parciales - algunas tablas/columnas no disponibles en la base de datos',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 2: Resumen Financiero
router.get('/dashboard/financial-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen financiero...');
    
    const queries = [
        // Total gastos este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM Expenses 
                WHERE date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'expenses_this_month', value: Math.round(rows[0].total) });
            });
        }),
        
        // Gastos pendientes de aprobaci�n
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount
                FROM Expenses 
                WHERE status = 'Pendiente'
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
                WHERE status IN ('Enviada', 'Vencida')
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
                WHERE status IN ('Borrador', 'Enviada')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'active_quotes', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Gastos por categor�a (top 5)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    ec.name as category_name,
                    COUNT(e.id) as expense_count,
                    COALESCE(SUM(e.amount), 0) as total_amount
                FROM ExpenseCategories ec
                LEFT JOIN Expenses e ON e.category_id = ec.id 
                    AND e.date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                GROUP BY ec.id, ec.name
                ORDER BY total_amount DESC
                LIMIT 10
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
            
            console.log('? Resumen financiero calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen financiero (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultSummary = {
                expenses_this_month: 0,
                pending_expenses: { count: 0, amount: 0 },
                pending_invoices: { count: 0, amount: 0 },
                active_quotes: { count: 0, amount: 0 },
                expenses_by_category: []
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos simulados - tablas financieras no disponibles o con columnas faltantes',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 3: Resumen de Inventario
router.get('/dashboard/inventory-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen de inventario...');
    
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
        
        // Items con stock cr�tico (0 unidades)
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
                WHERE DATE(performed_at) = CURDATE()
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'movements_today', value: rows[0].total });
            });
        }),
        
        // �rdenes de compra pendientes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as total_amount
                FROM PurchaseOrders
                WHERE status IN ('Pending', 'Approved', 'Pendiente', 'Aprobada', 'Aprobado')
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ 
                    metric: 'pending_purchase_orders', 
                    value: { count: rows[0].total, amount: Math.round(rows[0].total_amount) }
                });
            });
        }),
        
        // Top 5 repuestos m�s usados este mes
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    i.item_code as sku,
                    i.item_name,
                    SUM(CASE WHEN im.movement_type IN ('out', 'salida', 'Salida') THEN im.quantity ELSE 0 END) as usage_count,
                    i.current_stock
                FROM Inventory i
                LEFT JOIN InventoryMovements im ON im.inventory_id = i.id 
                    AND DATE(im.performed_at) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                GROUP BY i.id, i.item_code, i.item_name, i.current_stock
                ORDER BY usage_count DESC
                LIMIT 10
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'top_used_parts', value: rows });
            });
        }),
        
        // Detalles de items cr�ticos
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    item_code as sku,
                    item_name as name,
                    current_stock,
                    minimum_stock,
                    COALESCE(unit_cost, 0) as unit_cost
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
            
            console.log('? Resumen de inventario calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen de inventario (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultSummary = {
                low_stock_items: 0,
                critical_stock_items: 0,
                movements_today: 0,
                pending_purchase_orders: { count: 0, amount: 0 },
                top_used_parts: [],
                critical_items_detail: []
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos parciales - tabla de inventario/modificaciones no disponibles',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 4: Resumen de Contratos & SLA
router.get('/dashboard/contracts-sla-summary', authenticateToken, (req, res) => {
    console.log('?? Solicitando resumen de contratos y SLA...');
    
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
        
        // Contratos pr�ximos a vencer (30 d�as)
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
        
        // Cumplimiento SLA promedio (�ltimos 30 d�as)
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
        
        // Detalles de contratos pr�ximos a vencer
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
            
            console.log('? Resumen de contratos y SLA calculado');
            res.json({
                message: 'success',
                data: summary,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando resumen de contratos y SLA (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultSummary = {
                active_contracts: 0,
                contracts_expiring_soon: 0,
                expired_contracts: 0,
                tickets_outside_sla: 0,
                tickets_at_risk_sla: 0,
                sla_compliance: { percentage: 0, total_tickets: 0, met_sla: 0 },
                expiring_contracts_detail: []
            };
            res.json({
                message: 'success',
                data: defaultSummary,
                note: 'Datos de contratos simulados - tabla Contracts no disponible o con columnas faltantes',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 5: Alertas Cr�ticas Consolidadas
router.get('/dashboard/critical-alerts', authenticateToken, (req, res) => {
    console.log('?? Solicitando alertas cr�ticas...');
    
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
                LIMIT 10
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'unassigned_tickets_24h', value: rows });
            });
        }),
        
        // SLA en riesgo AHORA (pr�ximas 2 horas)
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
                LIMIT 10
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ metric: 'sla_critical_2h', value: rows });
            });
        }),
        
        // Stock en 0 (cr�tico)
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sku,
                    name,
                    minimum_stock,
                    0 as unit_cost
                FROM SpareParts 
                WHERE current_stock = 0
                ORDER BY minimum_stock DESC
                LIMIT 10
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
        
        // Equipos fuera de servicio (simulado - tabla Equipment no tiene columna activo)
        new Promise((resolve, reject) => {
            resolve({ metric: 'equipment_out_of_service', value: [] });
        }),
        
        // Gastos pendientes de aprobaci�n > 7 d�as (simulado - tabla Expenses no existe)
        new Promise((resolve, reject) => {
            resolve({ metric: 'expenses_pending_7days', value: [] });
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
            
            console.log(`? Alertas cr�ticas calculadas: ${totalAlerts} alertas totales`);
            res.json({
                message: 'success',
                data: alerts,
                total_alerts: totalAlerts,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('? Error calculando alertas críticas (dashboard) - devolviendo valores por defecto:', error && error.message || error);
            const defaultAlerts = {
                unassigned_tickets_24h: [],
                sla_critical_2h: [],
                zero_stock_items: [],
                contracts_expiring_week: [],
                equipment_out_of_service: [],
                expenses_pending_7days: []
            };
            res.json({
                message: 'success',
                data: defaultAlerts,
                total_alerts: 0,
                note: 'Alertas parciales - algunas tablas/columnas no disponibles',
                timestamp: new Date().toISOString()
            });
        });
});

// Endpoint 6: KPIs Mejorados (actualizaci�n del existente)
router.get('/dashboard/kpis-enhanced', authenticateToken, (req, res) => {
    console.log('📊 Solicitando KPIs mejorados del dashboard...');
    
    const queries = [
        // KPIs originales
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Clients', [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Clients:', err.message);
                    resolve({ metric: 'total_clients', value: 0 });
                } else {
                    console.log('✅ Clients:', rows[0].total);
                    resolve({ metric: 'total_clients', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Equipment', [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Equipment:', err.message);
                    resolve({ metric: 'total_equipment', value: 0 });
                } else {
                    console.log('✅ Equipment:', rows[0].total);
                    resolve({ metric: 'total_equipment', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE status NOT IN ('Cerrado', 'Completado')`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Tickets activos:', err.message);
                    resolve({ metric: 'active_tickets', value: 0 });
                } else {
                    console.log('✅ Tickets activos:', rows[0].total);
                    resolve({ metric: 'active_tickets', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE priority = 'Crítica' AND status NOT IN ('Cerrado', 'Completado')`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Tickets críticos:', err.message);
                    resolve({ metric: 'critical_tickets', value: 0 });
                } else {
                    console.log('✅ Tickets críticos:', rows[0].total);
                    resolve({ metric: 'critical_tickets', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM SpareParts WHERE current_stock <= minimum_stock`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query SpareParts:', err.message);
                    resolve({ metric: 'low_stock_items', value: 0 });
                } else {
                    console.log('✅ Stock bajo:', rows[0].total);
                    resolve({ metric: 'low_stock_items', value: rows[0].total });
                }
            });
        }),
        
        // Nuevos KPIs
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Contracts WHERE status = 'Active' AND end_date >= CURDATE()`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Contracts:', err.message);
                    resolve({ metric: 'active_contracts', value: 0 });
                } else {
                    console.log('✅ Contratos activos:', rows[0].total);
                    resolve({ metric: 'active_contracts', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Users WHERE role IN ('Technician', 'technician', 'Tecnico', 'Técnico', 'Manager', 'Admin', 'Supervisor')`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Users:', err.message);
                    resolve({ metric: 'active_staff', value: 0 });
                } else {
                    console.log('✅ Personal activo:', rows[0].total);
                    resolve({ metric: 'active_staff', value: rows[0].total });
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(DISTINCT user_id) as total FROM Attendance WHERE date = CURDATE()`, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query Attendance:', err.message);
                    resolve({ metric: 'attendance_today', value: 0 });
                } else {
                    console.log('✅ Asistencia hoy:', rows[0].total);
                    resolve({ metric: 'attendance_today', value: rows[0].total });
                }
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
                if (err) {
                    console.error('❌ Error en query tickets por estado:', err.message);
                    resolve({ metric: 'tickets_by_status', value: [] });
                } else {
                    console.log('✅ Tickets por estado:', rows.length, 'estados');
                    resolve({ metric: 'tickets_by_status', value: rows });
                }
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
                if (err) {
                    console.error('❌ Error en query tickets por prioridad:', err.message);
                    resolve({ metric: 'tickets_by_priority', value: [] });
                } else {
                    console.log('✅ Tickets por prioridad:', rows.length, 'prioridades');
                    resolve({ metric: 'tickets_by_priority', value: rows });
                }
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
                WHERE u.role IN ('Technician', 'technician', 'Tecnico', 'Técnico')
                GROUP BY u.id, u.username
                ORDER BY ticket_count DESC
                LIMIT 10
            `, [], (err, rows) => {
                if (err) {
                    console.error('❌ Error en query carga de técnicos:', err.message);
                    resolve({ metric: 'technician_workload', value: [] });
                } else {
                    console.log('✅ Carga de técnicos:', rows.length, 'técnicos');
                    resolve({ metric: 'technician_workload', value: rows });
                }
            });
        })
    ];
    
    Promise.allSettled(queries)
        .then(results => {
            const kpis = {};
            let successCount = 0;
            let errorCount = 0;
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    kpis[result.value.metric] = result.value.value;
                    successCount++;
                } else {
                    console.error(`❌ Query ${index} falló:`, result.reason);
                    errorCount++;
                }
            });
            
            console.log(`✅ KPIs mejorados calculados: ${successCount} éxitos, ${errorCount} errores`);
            console.log('📊 Datos finales:', JSON.stringify(kpis, null, 2));
            
            res.json({
                message: 'success',
                data: kpis,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            // Esto no debería suceder con allSettled, pero por si acaso
            console.error('❌ Error inesperado calculando KPIs mejorados:', error && error.message || error);
            const defaultKpis = {
                total_clients: 0,
                total_equipment: 0,
                active_tickets: 0,
                critical_tickets: 0,
                low_stock_items: 0,
                active_contracts: 0,
                active_staff: 0,
                attendance_today: 0,
                tickets_by_status: [],
                tickets_by_priority: [],
                technician_workload: []
            };
            res.json({
                message: 'success',
                data: defaultKpis,
                note: 'KPIs parciales - algunas tablas/columnas no disponibles',
                timestamp: new Date().toISOString()
            });
        });
});


// MANEJADORES GLOBALES DE ERRORES Y FINALIZACIÓN
// ===================================================================

// ===================================================================

module.exports = router;
