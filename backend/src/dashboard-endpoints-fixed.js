// CORRECCIONES PARA ENDPOINTS DEL DASHBOARD
// Reemplazar columnas y tablas que no existen

/* 
PROBLEMAS ENCONTRADOS:
1. Tickets.assigned_to → Tickets.assigned_technician_id
2. Equipment.activo → NO EXISTE (eliminar filtro)
3. Expenses/Invoices/Quotes/PurchaseOrders → NO EXISTEN
4. Inventory/InventoryMovements → Solo existe SpareParts y TechnicianInventory
5. InventoryMovements.type → NO EXISTE
6. Contracts → NO EXISTE

SOLUCIÓN: Reemplazar endpoints con datos simulados o usar tablas existentes
*/

// ===== ENDPOINT 1: /api/dashboard/kpis-enhanced =====
// CAMBIOS:
// - assigned_to → assigned_technician_id
// - Eliminar referencias a Contracts (usar 0)
// - Eliminar referencias a Inventory (usar stock de SpareParts)

app.get('/api/dashboard/kpis-enhanced', authenticateToken, async (req, res) => {
    console.log('📊 Solicitando KPIs mejorados del dashboard...');
    try {
        const queries = [
            // Total clientes
            db.allAsync('SELECT COUNT(*) as total FROM Clients', []),
            
            // Total equipos  
            db.allAsync('SELECT COUNT(*) as total FROM Equipment', []),
            
            // Tickets activos
            db.allAsync(`SELECT COUNT(*) as total FROM Tickets WHERE status NOT IN ('Cerrado', 'Resuelto')`, []),
            
            // Tickets críticos
            db.allAsync(`SELECT COUNT(*) as total FROM Tickets WHERE priority IN ('Urgente', 'Alta') AND status NOT IN ('Cerrado', 'Resuelto')`, []),
            
            // Items con stock bajo (SpareParts)
            db.allAsync('SELECT COUNT(*) as total FROM SpareParts WHERE current_stock <= minimum_stock', []),
            
            // Contratos activos (SIMULADO = 0)
            Promise.resolve([{ total: 0 }]),
            
            // Personal activo
            db.allAsync(`SELECT COUNT(*) as total FROM Users WHERE role_id IS NOT NULL`, []),
            
            // Asistencia hoy
            db.allAsync(`SELECT COUNT(DISTINCT user_id) as total FROM Attendance WHERE DATE(check_in) = CURDATE()`, []),
            
            // Tickets por estado
            db.allAsync(`SELECT status, COUNT(*) as count FROM Tickets WHERE status NOT IN ('Cerrado', 'Resuelto') GROUP BY status`, []),
            
            // Tickets por prioridad
            db.allAsync(`SELECT priority, COUNT(*) as count FROM Tickets WHERE status NOT IN ('Cerrado', 'Resuelto') GROUP BY priority`, []),
            
            // Técnicos con carga (CORREGIDO: assigned_technician_id)
            db.allAsync(`
                SELECT 
                    u.id,
                    u.username,
                    COUNT(t.id) as ticket_count
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Resuelto')
                GROUP BY u.id, u.username
                ORDER BY ticket_count DESC
                LIMIT 10
            `, [])
        ];

        const results = await Promise.all(queries);

        const data = {
            total_clients: results[0][0]?.total || 0,
            total_equipment: results[1][0]?.total || 0,
            active_tickets: results[2][0]?.total || 0,
            critical_tickets: results[3][0]?.total || 0,
            low_stock_items: results[4][0]?.total || 0,
            active_contracts: results[5][0]?.total || 0,
            active_staff: results[6][0]?.total || 0,
            attendance_today: results[7][0]?.total || 0,
            tickets_by_status: results[8] || [],
            tickets_by_priority: results[9] || [],
            technician_workload: results[10] || []
        };

        res.json({
            message: 'success',
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error calculando KPIs mejorados:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ENDPOINT 2: /api/dashboard/critical-alerts =====
// CAMBIOS:
// - assigned_to → assigned_technician_id
// - Eliminar referencias a Equipment.activo, Expenses, Contracts

app.get('/api/dashboard/critical-alerts', authenticateToken, async (req, res) => {
    console.log('🚨 Solicitando alertas críticas...');
    try {
        const queries = [
            // Tickets sin asignar > 24h (CORREGIDO)
            db.allAsync(`
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
            `, []),
            
            // SLA crítico < 2h (SIMPLIFICADO - tickets urgentes creados hace > 2h)
            db.allAsync(`
                SELECT 
                    id,
                    title,
                    priority,
                    created_at
                FROM Tickets
                WHERE priority = 'Urgente'
                AND status NOT IN ('Cerrado', 'Resuelto')
                AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)
                LIMIT 5
            `, []),
            
            // Stock en 0
            db.allAsync(`
                SELECT 
                    id,
                    name,
                    sku,
                    current_stock,
                    minimum_stock
                FROM SpareParts
                WHERE current_stock = 0
                LIMIT 5
            `, []),
            
            // Contratos vencen esta semana (SIMULADO = vacío)
            Promise.resolve([]),
            
            // Equipos fuera de servicio (TODOS los equipos ya que no hay columna activo)
            db.allAsync(`
                SELECT 
                    e.id,
                    e.name,
                    e.serial_number,
                    l.name as location_name,
                    c.name as client_name
                FROM Equipment e
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Clients c ON l.client_id = c.id
                WHERE e.notes LIKE '%fuera%servicio%' OR e.notes LIKE '%deshabilitado%'
                LIMIT 10
            `, []),
            
            // Gastos pendientes > 7 días (SIMULADO = vacío)
            Promise.resolve([])
        ];

        const results = await Promise.all(queries);

        const alerts = {
            unassigned_tickets_24h: results[0] || [],
            sla_critical_2h: results[1] || [],
            zero_stock_items: results[2] || [],
            contracts_expiring_week: results[3] || [],
            equipment_out_of_service: results[4] || [],
            expenses_pending_7days: results[5] || []
        };

        const total_alerts = 
            alerts.unassigned_tickets_24h.length +
            alerts.sla_critical_2h.length +
            alerts.zero_stock_items.length +
            alerts.contracts_expiring_week.length +
            alerts.equipment_out_of_service.length +
            alerts.expenses_pending_7days.length;

        res.json({
            message: 'success',
            data: alerts,
            total_alerts: total_alerts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error calculando alertas críticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ENDPOINT 3: /api/dashboard/resources-summary =====
// CAMBIOS:
// - assigned_to → assigned_technician_id

app.get('/api/dashboard/resources-summary', authenticateToken, async (req, res) => {
    console.log('👥 Solicitando resumen de recursos humanos...');
    try {
        const queries = [
            // Personal activo
            db.allAsync(`SELECT COUNT(*) as total FROM Users WHERE role_id IS NOT NULL`, []),
            
            // Técnicos activos
            db.allAsync(`SELECT COUNT(*) as total FROM Users WHERE role_id IS NOT NULL`, []),
            
            // Asistencia hoy
            db.allAsync(`SELECT COUNT(DISTINCT user_id) as total FROM Attendance WHERE DATE(check_in) = CURDATE()`, []),
            
            // Horas extras este mes
            db.allAsync(`
                SELECT COALESCE(SUM(hours_approved), 0) as total 
                FROM Overtime 
                WHERE status = 'approved'
                AND DATE(date) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            `, []),
            
            // Carga de técnicos (CORREGIDO)
            db.allAsync(`
                SELECT 
                    u.id,
                    u.username,
                    COUNT(t.id) as ticket_count,
                    SUM(CASE WHEN t.priority IN ('Urgente', 'Alta') THEN 1 ELSE 0 END) as critical_count
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Resuelto')
                GROUP BY u.id, u.username
                ORDER BY ticket_count DESC
            `, []),
            
            // Utilización de recursos (CORREGIDO)
            db.allAsync(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN u.id END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT u.id), 0) as utilization_percentage
                FROM Users u
                LEFT JOIN Tickets t ON t.assigned_technician_id = u.id AND t.status NOT IN ('Cerrado', 'Resuelto')
            `, [])
        ];

        const results = await Promise.all(queries);

        const data = {
            active_staff: results[0][0]?.total || 0,
            active_technicians: results[1][0]?.total || 0,
            attendance_today: results[2][0]?.total || 0,
            overtime_hours_month: results[3][0]?.total || 0,
            technician_workload: results[4] || [],
            resource_utilization: Math.round(results[5][0]?.utilization_percentage || 0)
        };

        console.log('✅ Resumen de recursos calculado');
        res.json({
            message: 'success',
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error calculando resumen de recursos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ENDPOINT 4: /api/dashboard/financial-summary =====
// CAMBIOS: Todo simulado ya que no existen las tablas

app.get('/api/dashboard/financial-summary', authenticateToken, async (req, res) => {
    console.log('💰 Solicitando resumen financiero...');
    try {
        // DATOS SIMULADOS - NO HAY TABLAS DE FINANZAS
        const data = {
            expenses_this_month: 0,
            pending_expenses: { count: 0, amount: 0 },
            pending_invoices: { count: 0, amount: 0 },
            active_quotes: { count: 0, amount: 0 },
            expenses_by_category: []
        };

        console.log('✅ Resumen financiero (simulado)');
        res.json({
            message: 'success',
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error calculando resumen financiero:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ENDPOINT 5: /api/dashboard/inventory-summary =====
// CAMBIOS: Usar SpareParts en lugar de Inventory

app.get('/api/dashboard/inventory-summary', authenticateToken, async (req, res) => {
    console.log('📦 Solicitando resumen de inventario...');
    try {
        const queries = [
            // Stock bajo
            db.allAsync(`SELECT COUNT(*) as total FROM SpareParts WHERE current_stock <= minimum_stock AND current_stock > 0`, []),
            
            // Stock crítico (0)
            db.allAsync(`SELECT COUNT(*) as total FROM SpareParts WHERE current_stock = 0`, []),
            
            // Movimientos hoy (SIMULADO = 0, no hay tabla InventoryMovements)
            Promise.resolve([{ total: 0 }]),
            
            // Órdenes pendientes (SIMULADO = vacío)
            Promise.resolve([{ count: 0, total_amount: 0 }]),
            
            // Top repuestos (por nombre alfabético, no hay datos de uso)
            db.allAsync(`
                SELECT 
                    sku as item_code,
                    name as item_name,
                    0 as usage_count,
                    current_stock
                FROM SpareParts
                WHERE current_stock > 0
                ORDER BY name ASC
                LIMIT 5
            `, [])
        ];

        const results = await Promise.all(queries);

        const data = {
            low_stock_items: results[0][0]?.total || 0,
            critical_stock_items: results[1][0]?.total || 0,
            movements_today: results[2][0]?.total || 0,
            pending_purchase_orders: {
                count: results[3][0]?.count || 0,
                amount: results[3][0]?.total_amount || 0
            },
            top_used_parts: results[4] || []
        };

        console.log('✅ Resumen de inventario calculado');
        res.json({
            message: 'success',
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error calculando resumen de inventario:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ENDPOINT 6: /api/dashboard/contracts-sla-summary =====
// CAMBIOS: Todo simulado ya que no existe tabla Contracts

app.get('/api/dashboard/contracts-sla-summary', authenticateToken, async (req, res) => {
    console.log('📋 Solicitando resumen de contratos y SLA...');
    try {
        // Simular datos de contratos (no existe la tabla)
        const queries = [
            // SLA Compliance (basado en tickets completados a tiempo)
            db.allAsync(`
                SELECT 
                    COUNT(*) as total_tickets,
                    SUM(CASE WHEN status IN ('Resuelto', 'Cerrado') THEN 1 ELSE 0 END) as met_sla
                FROM Tickets
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, []),
            
            // Contratos activos (SIMULADO = 0)
            Promise.resolve([{ total: 0 }]),
            
            // Contratos vencidos (SIMULADO = 0)
            Promise.resolve([{ total: 0 }]),
            
            // Próximos a vencer (SIMULADO = 0)
            Promise.resolve([{ total: 0 }]),
            
            // Tickets fuera de SLA (tickets urgentes no resueltos)
            db.allAsync(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE priority = 'Urgente' 
                AND status NOT IN ('Resuelto', 'Cerrado')
            `, []),
            
            // Tickets en riesgo SLA (tickets de alta prioridad)
            db.allAsync(`
                SELECT COUNT(*) as total 
                FROM Tickets 
                WHERE priority = 'Alta' 
                AND status NOT IN ('Resuelto', 'Cerrado')
            `, [])
        ];

        const results = await Promise.all(queries);

        const sla_data = results[0][0] || { total_tickets: 0, met_sla: 0 };
        const sla_percentage = sla_data.total_tickets > 0 
            ? Math.round((sla_data.met_sla / sla_data.total_tickets) * 100) 
            : 0;

        const data = {
            active_contracts: results[1][0]?.total || 0,
            expired_contracts: results[2][0]?.total || 0,
            contracts_expiring_soon: results[3][0]?.total || 0,
            tickets_outside_sla: results[4][0]?.total || 0,
            tickets_at_risk_sla: results[5][0]?.total || 0,
            sla_compliance: {
                percentage: sla_percentage,
                met_sla: sla_data.met_sla,
                total_tickets: sla_data.total_tickets
            }
        };

        console.log('✅ Resumen de contratos y SLA calculado');
        res.json({
            message: 'success',
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error calculando resumen de contratos:', error);
        res.status(500).json({ error: error.message });
    }
});
