const express = require('express');

const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken, requireRole } = require('../../core/middleware/auth.middleware');

function normalizeQuoteStatus(status) {
    switch (String(status || '').trim().toLowerCase()) {
        case 'approved':
        case 'aprobada':
            return 'Aprobada';
        case 'rejected':
        case 'rechazada':
            return 'Rechazada';
        case 'draft':
        case 'borrador':
        case 'pending':
        default:
            return 'Borrador';
    }
}

function normalizeInvoiceStatus(status) {
    switch (String(status || '').trim().toLowerCase()) {
        case 'paid':
        case 'pagada':
            return 'Pagada';
        case 'cancelled':
        case 'cancelada':
            return 'Cancelada';
        case 'pending':
        case 'pendiente':
        default:
            return 'Pendiente';
    }
}

// RUTAS DE GASTOS - SISTEMA FINANCIERO
// ===================================================================

// GET /api/expenses - Obtener todos los gastos
router.get('/expenses', authenticateToken, (req, res) => {
    console.log('💸 Obteniendo lista de gastos...');
    
    const { status, category, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    let sql = `
        SELECT 
            e.*,
            ec.name as category_name,
            u_created.username as created_by_name,
            u_approved.username as approved_by_name
        FROM Expenses e
        LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
        LEFT JOIN Users u_created ON e.created_by = u_created.id
        LEFT JOIN Users u_approved ON e.approved_by = u_approved.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        sql += ` AND e.status = ?`;
        params.push(status);
    }
    
    if (category) {
        sql += ` AND (e.category = ? OR ec.name = ?)`;
        params.push(category, category);
    }
    
    if (date_from) {
        sql += ` AND e.date >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND e.date <= ?`;
        params.push(date_to);
    }
    
    sql += ' ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo gastos:', err);
            res.status(500).json({ 
                error: 'Error obteniendo gastos',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ ${rows.length} gastos obtenidos`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length,
            offset: parseInt(offset, 10),
            limit: parseInt(limit, 10)
        });
    });
});

// GET /api/expenses/:id - Obtener gasto individual
router.get('/expenses/:id', authenticateToken, (req, res) => {
    const expenseId = req.params.id;

    const sql = `
        SELECT 
            e.*,
            ec.name as category_name,
            u_created.username as created_by_name,
            u_approved.username as approved_by_name
        FROM Expenses e
        LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
        LEFT JOIN Users u_created ON e.created_by = u_created.id
        LEFT JOIN Users u_approved ON e.approved_by = u_approved.id
        WHERE e.id = ?
        LIMIT 1
    `;

    db.get(sql, [expenseId], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo gasto:', err);
            return res.status(500).json({
                error: 'Error obteniendo gasto',
                details: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                error: 'Gasto no encontrado'
            });
        }

        res.json({
            message: 'success',
            data: row
        });
    });
});

// POST /api/expenses - Crear nuevo gasto
// POST /api/expenses - Crear nuevo gasto (Admin/Manager/Technician) 🔒
router.post('/expenses', authenticateToken, requireRole(['Admin', 'Manager', 'Technician']), (req, res) => {
    const {
        category,
        category_id,
        description,
        amount,
        date,
        supplier,
        receipt_number,
        payment_method,
        reference_type,
        reference_id,
        notes,
        receipt_file
    } = req.body;
    
    // Validaciones básicas
    if (!description || !amount || !date) {
        return res.status(400).json({
            error: 'Descripción, monto y fecha son requeridos'
        });
    }
    
    if (amount <= 0) {
        return res.status(400).json({
            error: 'El monto debe ser mayor a 0'
        });
    }
    
    console.log(`💸 Creando nuevo gasto: ${description} - $${amount}`);
    
    const sql = `
        INSERT INTO Expenses (
            category_id, category, description, amount, date, supplier,
            receipt_number, payment_method, reference_type, reference_id,
            notes, receipt_file, created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `;
    
    const params = [
        category_id || null,
        category || 'Otros',
        description,
        amount,
        date,
        supplier || null,
        receipt_number || null,
        payment_method || null,
        reference_type || 'General',
        reference_id || null,
        notes || null,
        receipt_file || null,
        req.user.id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando gasto:', err);
            res.status(500).json({
                error: 'Error al crear gasto',
                details: err.message
            });
            return;
        }
        
        console.log(`✅ Gasto creado con ID: ${this.lastID}`);
        
        // Obtener el gasto completo creado
        const getSql = `
            SELECT 
                e.*,
                ec.name as category_name,
                u.username as created_by_name
            FROM Expenses e
            LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
            LEFT JOIN Users u ON e.created_by = u.id
            WHERE e.id = ?
        `;
        
        db.get(getSql, [this.lastID], (err, row) => {
            if (err) {
                console.error('❌ Error obteniendo gasto creado:', err);
                res.status(201).json({
                    message: 'Gasto creado exitosamente',
                    id: this.lastID
                });
                return;
            }
            
            res.status(201).json({
                message: 'Gasto creado exitosamente',
                data: row
            });
        });
    });
});

// PUT /api/expenses/:id - Actualizar gasto
// PUT /api/expenses/:id - Actualizar gasto (SOLO Admin/Manager) 🔒
router.put('/expenses/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const expenseId = req.params.id;
    const {
        category,
        category_id,
        description,
        amount,
        date,
        supplier,
        receipt_number,
        payment_method,
        reference_type,
        reference_id,
        notes,
        receipt_file
    } = req.body;
    
    console.log(`💸 Actualizando gasto ID: ${expenseId}`);
    
    // Primero verificar que el gasto existe y obtener su estado actual
    const checkSql = `SELECT status, created_by FROM Expenses WHERE id = ?`;
    
    db.get(checkSql, [expenseId], (err, expense) => {
        if (err) {
            console.error('❌ Error verificando gasto:', err);
            return res.status(500).json({
                error: 'Error verificando gasto',
                details: err.message
            });
        }
        
        if (!expense) {
            return res.status(404).json({
                error: 'Gasto no encontrado'
            });
        }
        
        // Solo el creador o admin puede editar gastos pendientes
        if (expense.status !== 'Pendiente' && req.user.role !== 'Admin') {
            return res.status(403).json({
                error: 'Solo se pueden editar gastos pendientes'
            });
        }
        
        if (expense.created_by !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({
                error: 'No tienes permisos para editar este gasto'
            });
        }
        
        const sql = `
            UPDATE Expenses SET
                category_id = COALESCE(?, category_id),
                category = COALESCE(?, category),
                description = COALESCE(?, description),
                amount = COALESCE(?, amount),
                date = COALESCE(?, date),
                supplier = COALESCE(?, supplier),
                receipt_number = COALESCE(?, receipt_number),
                payment_method = COALESCE(?, payment_method),
                reference_type = COALESCE(?, reference_type),
                reference_id = COALESCE(?, reference_id),
                notes = COALESCE(?, notes),
                receipt_file = COALESCE(?, receipt_file),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            category_id,
            category,
            description,
            amount,
            date,
            supplier,
            receipt_number,
            payment_method,
            reference_type,
            reference_id,
            notes,
            receipt_file,
            expenseId
        ];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error actualizando gasto:', err);
                return res.status(500).json({
                    error: 'Error al actualizar gasto',
                    details: err.message
                });
            }
            
            console.log(`✅ Gasto ${expenseId} actualizado`);
            
            // Obtener el gasto actualizado
            const getSql = `
                SELECT 
                    e.*,
                    ec.name as category_name,
                    u_created.username as created_by_name,
                    u_approved.username as approved_by_name
                FROM Expenses e
                LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
                LEFT JOIN Users u_created ON e.created_by = u_created.id
                LEFT JOIN Users u_approved ON e.approved_by = u_approved.id
                WHERE e.id = ?
            `;
            
            db.get(getSql, [expenseId], (err, row) => {
                if (err) {
                    console.error('❌ Error obteniendo gasto actualizado:', err);
                    return res.json({
                        message: 'Gasto actualizado exitosamente',
                        changes: this.changes
                    });
                }
                
                res.json({
                    message: 'Gasto actualizado exitosamente',
                    data: row,
                    changes: this.changes
                });
            });
        });
    });
});

// PUT /api/expenses/:id/approve - Aprobar gasto
router.put('/expenses/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const expenseId = req.params.id;
    const { notes } = req.body;
    
    console.log(`✅ Aprobando gasto ID: ${expenseId} por usuario: ${req.user.username}`);
    
    const sql = `
        UPDATE Expenses SET
            status = 'Aprobado',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Pendiente'
    `;
    
    db.run(sql, [req.user.id, notes, expenseId], function(err) {
        if (err) {
            console.error('❌ Error aprobando gasto:', err);
            return res.status(500).json({
                error: 'Error al aprobar gasto',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Gasto no encontrado o ya fue procesado'
            });
        }
        
        console.log(`✅ Gasto ${expenseId} aprobado exitosamente`);
        
        res.json({
            message: 'Gasto aprobado exitosamente',
            expense_id: expenseId,
            approved_by: req.user.username,
            approved_at: new Date().toISOString()
        });
    });
});

// PUT /api/expenses/:id/reject - Rechazar gasto
router.put('/expenses/:id/reject', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const expenseId = req.params.id;
    const { notes } = req.body;
    
    if (!notes) {
        return res.status(400).json({
            error: 'Se requiere una nota explicando el motivo del rechazo'
        });
    }
    
    console.log(`❌ Rechazando gasto ID: ${expenseId} por usuario: ${req.user.username}`);
    
    const sql = `
        UPDATE Expenses SET
            status = 'Rechazado',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Pendiente'
    `;
    
    db.run(sql, [req.user.id, notes, expenseId], function(err) {
        if (err) {
            console.error('❌ Error rechazando gasto:', err);
            return res.status(500).json({
                error: 'Error al rechazar gasto',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Gasto no encontrado o ya fue procesado'
            });
        }
        
        console.log(`❌ Gasto ${expenseId} rechazado exitosamente`);
        
        res.json({
            message: 'Gasto rechazado exitosamente',
            expense_id: expenseId,
            rejected_by: req.user.username,
            rejected_at: new Date().toISOString(),
            reason: notes
        });
    });
});

// PUT /api/expenses/:id/pay - Marcar gasto como pagado
router.put('/expenses/:id/pay', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const expenseId = req.params.id;
    const { payment_method, payment_notes } = req.body;
    
    console.log(`💳 Marcando gasto ID: ${expenseId} como pagado`);
    
    const sql = `
        UPDATE Expenses SET
            status = 'Pagado',
            payment_method = COALESCE(?, payment_method),
            paid_at = CURRENT_TIMESTAMP,
            notes = CASE 
                WHEN ? IS NOT NULL THEN CONCAT(COALESCE(notes, ''), '\n--- PAGO ---\n', ?)
                ELSE notes
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Aprobado'
    `;
    
    db.run(sql, [payment_method, payment_notes, payment_notes, expenseId], function(err) {
        if (err) {
            console.error('❌ Error marcando gasto como pagado:', err);
            return res.status(500).json({
                error: 'Error al marcar gasto como pagado',
                details: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Gasto no encontrado o no está aprobado'
            });
        }
        
        console.log(`💳 Gasto ${expenseId} marcado como pagado`);
        
        res.json({
            message: 'Gasto marcado como pagado exitosamente',
            expense_id: expenseId,
            paid_at: new Date().toISOString(),
            payment_method: payment_method
        });
    });
});

// DELETE /api/expenses/:id - Eliminar gasto
// DELETE /api/expenses/:id - Eliminar gasto (SOLO Admin) 🔒
router.delete('/expenses/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const expenseId = req.params.id;
    
    console.log(`🗑️ Eliminando gasto ID: ${expenseId}`);
    
    // Verificar permisos: solo el creador o admin pueden eliminar gastos pendientes
    const checkSql = `SELECT status, created_by FROM Expenses WHERE id = ?`;
    
    db.get(checkSql, [expenseId], (err, expense) => {
        if (err) {
            console.error('❌ Error verificando gasto:', err);
            return res.status(500).json({
                error: 'Error verificando gasto',
                details: err.message
            });
        }
        
        if (!expense) {
            return res.status(404).json({
                error: 'Gasto no encontrado'
            });
        }
        
        // Solo se pueden eliminar gastos pendientes o rechazados
        if (!['Pendiente', 'Rechazado'].includes(expense.status)) {
            return res.status(403).json({
                error: 'Solo se pueden eliminar gastos pendientes o rechazados'
            });
        }
        
        // Solo el creador o admin pueden eliminar
        if (expense.created_by !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({
                error: 'No tienes permisos para eliminar este gasto'
            });
        }
        
        const deleteSql = `DELETE FROM Expenses WHERE id = ?`;
        
        db.run(deleteSql, [expenseId], function(err) {
            if (err) {
                console.error('❌ Error eliminando gasto:', err);
                return res.status(500).json({
                    error: 'Error al eliminar gasto',
                    details: err.message
                });
            }
            
            console.log(`✅ Gasto ${expenseId} eliminado exitosamente`);
            
            res.json({
                message: 'Gasto eliminado exitosamente',
                expense_id: expenseId,
                deleted_by: req.user.username
            });
        });
    });
});

// GET /api/expense-categories - Obtener categorías de gastos
router.get('/expense-categories', authenticateToken, (req, res) => {
    console.log('📁 Obteniendo categorías de gastos...');
    
    const sql = `
        SELECT * FROM ExpenseCategories 
        WHERE is_active = 1 
        ORDER BY name ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo categorías:', err);
            res.status(500).json({
                error: 'Error obteniendo categorías',
                details: err.message
            });
            return;
        }
        
        console.log(`✅ ${rows.length} categorías obtenidas`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length
        });
    });
});

// POST /api/expense-categories - Crear nueva categoría
router.post('/expense-categories', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
        return res.status(400).json({
            error: 'El nombre de la categoría es requerido'
        });
    }
    
    console.log(`📁 Creando nueva categoría: ${name}`);
    
    const sql = `
        INSERT INTO ExpenseCategories (name, description)
        VALUES (?, ?)
    `;
    
    db.run(sql, [name, description || null], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint')) {
                return res.status(409).json({
                    error: 'Ya existe una categoría con ese nombre'
                });
            }
            
            console.error('❌ Error creando categoría:', err);
            return res.status(500).json({
                error: 'Error al crear categoría',
                details: err.message
            });
        }
        
        console.log(`✅ Categoría creada con ID: ${this.lastID}`);
        
        res.status(201).json({
            message: 'Categoría creada exitosamente',
            data: {
                id: this.lastID,
                name,
                description,
                is_active: true,
                created_at: new Date().toISOString()
            }
        });
    });
});

// GET /api/expenses/stats - Obtener estadísticas de gastos
router.get('/expenses/stats', authenticateToken, (req, res) => {
    console.log('📊 Calculando estadísticas de gastos...');
    
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
        case 'week':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
            break;
        case 'month':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
            break;
        case 'quarter':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`;
            break;
        case 'year':
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)`;
            break;
        default:
            dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    }
    
    const queries = [
        // Total gastos por estado
        new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM Expenses e
                WHERE 1=1 ${dateFilter}
                GROUP BY status
            `;
            
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ type: 'by_status', data: rows });
            });
        }),
        
        // Total gastos por categoría
        new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COALESCE(e.category, 'Sin categoría') as category,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM Expenses e
                WHERE 1=1 ${dateFilter}
                GROUP BY e.category
                ORDER BY total_amount DESC
                LIMIT 10
            `;
            
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ type: 'by_category', data: rows });
            });
        }),
        
        // Totales generales
        new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    SUM(CASE WHEN status = 'Pendiente' THEN amount ELSE 0 END) as pending_amount,
                    SUM(CASE WHEN status = 'Aprobado' THEN amount ELSE 0 END) as approved_amount,
                    SUM(CASE WHEN status = 'Pagado' THEN amount ELSE 0 END) as paid_amount
                FROM Expenses e
                WHERE 1=1 ${dateFilter}
            `;
            
            db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve({ type: 'totals', data: row });
            });
        })
    ];
    
    Promise.all(queries)
        .then(results => {
            const stats = {
                period,
                date_range: {
                    from: new Date(Date.now() - (period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                }
            };
            
            results.forEach(result => {
                stats[result.type] = result.data;
            });
            
            console.log('✅ Estadísticas de gastos calculadas');
            res.json({
                message: 'success',
                data: stats,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            console.error('❌ Error calculando estadísticas:', error);
            res.status(500).json({
                error: 'Error calculando estadísticas',
                details: error.message
            });
        });
});

// ============================================================================
// QUOTES CRUD ENDPOINTS (Cotizaciones) - Financial Module
// ============================================================================

// GET /api/quotes - Obtener todas las cotizaciones
router.get('/quotes', authenticateToken, (req, res) => {
    console.log('📋 Obteniendo lista de cotizaciones...');
    
    const { status, client_id, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    let sql = `
        SELECT q.*, c.name as client_name FROM Quotes q LEFT JOIN Clients c ON q.client_id = c.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        sql += ` AND q.status = ?`;
        params.push(status);
    }
    
    if (client_id) {
        sql += ` AND q.client_id = ?`;
        params.push(client_id);
    }
    
    if (date_from) {
        sql += ` AND q.created_date >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND q.created_date <= ?`;
        params.push(date_to);
    }
    
    sql += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo cotizaciones:', err);
            res.status(500).json({ 
                error: 'Error obteniendo cotizaciones',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ ${rows.length} cotizaciones obtenidas`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length,
            offset: parseInt(offset, 10),
            limit: parseInt(limit, 10)
        });
    });
});

// POST /api/quotes - Crear nueva cotización
// POST /api/quotes - Crear nueva cotización (SOLO Admin/Manager) 🔒
router.post('/quotes', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        client_id,
        quote_number,
        created_date,
        quote_date,
        valid_until,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes
    } = req.body;
    
    // Validaciones básicas
    const effectiveCreatedDate = created_date || quote_date || new Date().toISOString().split('T')[0];
    const normalizedStatus = normalizeQuoteStatus(req.body.status);

    if (!client_id || !effectiveCreatedDate || !description || !total) {
        return res.status(400).json({
            error: 'Cliente, fecha, descripción y total son requeridos'
        });
    }
    
    if (total <= 0) {
        return res.status(400).json({
            error: 'El total debe ser mayor a 0'
        });
    }
    
    console.log(`📋 Creando nueva cotización para cliente ${client_id}: $${total}`);
    
    const params = [
        client_id,
        quote_number || `Q-${Date.now()}`,
        effectiveCreatedDate,
        valid_until || null,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms || null,
        notes || null,
        req.user.id,
        normalizedStatus
    ];

    const createSql = `
        INSERT INTO Quotes (
            client_id, quote_number, created_date, valid_until, description,
            items, subtotal, tax_amount, total, payment_terms, notes,
            created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(createSql, params, function(err) {
        if (err) {
            console.error('❌ Error creando cotización:', err);
            res.status(500).json({ 
                error: 'Error creando cotización',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ Cotización creada con ID: ${this.lastID}`);
        res.status(201).json({
            message: 'Cotización creada exitosamente',
            id: this.lastID,
            quote_number: quote_number || `Q-${Date.now()}`
        });
    });
});

// PUT /api/quotes/:id - Actualizar cotización
// PUT /api/quotes/:id - Actualizar cotización (SOLO Admin/Manager) 🔒
router.put('/quotes/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const quoteId = req.params.id;
    const {
        client_id,
        quote_number,
        created_date,
        quote_date,
        valid_until,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes,
        status
    } = req.body;
    
    console.log(`📋 Actualizando cotización ID: ${quoteId}`);
    const effectiveCreatedDate = created_date || quote_date || null;
    const normalizedStatus = normalizeQuoteStatus(status);
    
    const sql = `
        UPDATE Quotes SET
            client_id = ?,
            quote_number = ?,
            created_date = ?,
            valid_until = ?,
            description = ?,
            items = ?,
            subtotal = ?,
            tax_amount = ?,
            total = ?,
            payment_terms = ?,
            notes = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        client_id,
        quote_number,
        effectiveCreatedDate,
        valid_until,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms,
        notes,
        normalizedStatus,
        quoteId
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error actualizando cotización:', err);
            res.status(500).json({ 
                error: 'Error actualizando cotización',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Cotización no encontrada'
            });
        }
        
        console.log(`✅ Cotización ${quoteId} actualizada`);
        res.json({
            message: 'Cotización actualizada exitosamente',
            changes: this.changes
        });
    });
});

// DELETE /api/quotes/:id - Eliminar cotización
// DELETE /api/quotes/:id - Eliminar cotización (SOLO Admin) 🔒
router.delete('/quotes/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const quoteId = req.params.id;
    
    console.log(`📋 Eliminando cotización ID: ${quoteId}`);
    
    const sql = 'DELETE FROM Quotes WHERE id = ?';
    
    db.run(sql, [quoteId], function(err) {
        if (err) {
            console.error('❌ Error eliminando cotización:', err);
            res.status(500).json({ 
                error: 'Error eliminando cotización',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Cotización no encontrada'
            });
        }
        
        console.log(`✅ Cotización ${quoteId} eliminada`);
        res.json({
            message: 'Cotización eliminada exitosamente',
            changes: this.changes
        });
    });
});

// GET /api/quotes/:id - Obtener cotización específica
router.get('/quotes/:id', authenticateToken, (req, res) => {
    const quoteId = req.params.id;
    
    console.log(`📋 Obteniendo cotización ID: ${quoteId}`);
    
    const sql = `
        SELECT 
            q.*,
            c.name as client_name,
            c.email as client_email,
            c.phone as client_phone,
            u.username as created_by_name
        FROM Quotes q
        LEFT JOIN Clients c ON q.client_id = c.id
        LEFT JOIN Users u ON q.created_by = u.id
        WHERE q.id = ?
    `;
    
    db.get(sql, [quoteId], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo cotización:', err);
            res.status(500).json({ 
                error: 'Error obteniendo cotización',
                details: err.message 
            });
            return;
        }
        
        if (!row) {
            return res.status(404).json({
                error: 'Cotización no encontrada'
            });
        }
        
        // Parse items JSON if exists
        if (row.items) {
            try {
                row.items = JSON.parse(row.items);
            } catch (e) {
                console.warn('⚠️ Error parsing items JSON:', e);
                row.items = [];
            }
        }
        
        console.log(`✅ Cotización ${quoteId} obtenida`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// ============================================================================
// INVOICES CRUD ENDPOINTS (Facturas) - Financial Module  
// ============================================================================

// GET /api/invoices - Obtener todas las facturas
router.get('/invoices', authenticateToken, (req, res) => {
    console.log('🧾 Obteniendo lista de facturas...');
    
    const { status, client_id, date_from, date_to, limit = 50, offset = 0 } = req.query;
    
    let sql = `
        SELECT i.*, c.name as client_name FROM Invoices i LEFT JOIN Clients c ON i.client_id = c.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
        sql += ` AND i.status = ?`;
        params.push(status);
    }
    
    if (client_id) {
        sql += ` AND i.client_id = ?`;
        params.push(client_id);
    }
    
    if (date_from) {
        sql += ` AND i.issue_date >= ?`;
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ` AND i.issue_date <= ?`;
        params.push(date_to);
    }
    
    sql += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo facturas:', err);
            res.status(500).json({ 
                error: 'Error obteniendo facturas',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ ${rows.length} facturas obtenidas`);
        res.json({
            message: 'success',
            data: rows,
            total: rows.length,
            offset: parseInt(offset, 10),
            limit: parseInt(limit, 10)
        });
    });
});

// POST /api/invoices - Crear nueva factura
// POST /api/invoices - Crear nueva factura (SOLO Admin/Manager) 🔒
router.post('/invoices', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        client_id,
        quote_id,
        invoice_number,
        invoice_date,
        issue_date,
        due_date,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes
    } = req.body;
    
    const effectiveIssueDate = issue_date || invoice_date || new Date().toISOString().split('T')[0];
    const normalizedStatus = normalizeInvoiceStatus(req.body.status);

    // Validaciones básicas
    if (!client_id || !effectiveIssueDate || !description || !total) {
        return res.status(400).json({
            error: 'Cliente, fecha, descripción y total son requeridos'
        });
    }
    
    if (total <= 0) {
        return res.status(400).json({
            error: 'El total debe ser mayor a 0'
        });
    }
    
    console.log(`🧾 Creando nueva factura para cliente ${client_id}: $${total}`);
    
    const sql = `
        INSERT INTO Invoices (
            client_id, quote_id, invoice_number, issue_date, due_date,
            description, items, subtotal, tax_amount, total, payment_terms,
            notes, created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        client_id,
        quote_id || null,
        invoice_number || `INV-${Date.now()}`,
        effectiveIssueDate,
        due_date || null,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms || null,
        notes || null,
        req.user.id,
        normalizedStatus
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando factura:', err);
            res.status(500).json({ 
                error: 'Error creando factura',
                details: err.message 
            });
            return;
        }
        
        console.log(`✅ Factura creada con ID: ${this.lastID}`);
        res.status(201).json({
            message: 'Factura creada exitosamente',
            id: this.lastID,
            invoice_number: invoice_number || `INV-${Date.now()}`
        });
    });
});

// PUT /api/invoices/:id - Actualizar factura
// PUT /api/invoices/:id - Actualizar factura (SOLO Admin/Manager) 🔒
router.put('/invoices/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const invoiceId = req.params.id;
    const {
        client_id,
        quote_id,
        invoice_number,
        invoice_date,
        issue_date,
        due_date,
        description,
        items,
        subtotal,
        tax_amount,
        total,
        payment_terms,
        notes,
        status
    } = req.body;
    
    console.log(`🧾 Actualizando factura ID: ${invoiceId}`);
    const effectiveIssueDate = issue_date || invoice_date || null;
    const normalizedStatus = normalizeInvoiceStatus(status);
    
    const sql = `
        UPDATE Invoices SET
            client_id = ?,
            quote_id = ?,
            invoice_number = ?,
            issue_date = ?,
            due_date = ?,
            description = ?,
            items = ?,
            subtotal = ?,
            tax_amount = ?,
            total = ?,
            payment_terms = ?,
            notes = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        client_id,
        quote_id,
        invoice_number,
        effectiveIssueDate,
        due_date,
        description,
        JSON.stringify(items || []),
        subtotal || 0,
        tax_amount || 0,
        total,
        payment_terms,
        notes,
        normalizedStatus,
        invoiceId
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error actualizando factura:', err);
            res.status(500).json({ 
                error: 'Error actualizando factura',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        console.log(`✅ Factura ${invoiceId} actualizada`);
        res.json({
            message: 'Factura actualizada exitosamente',
            changes: this.changes
        });
    });
});

// DELETE /api/invoices/:id - Eliminar factura
// DELETE /api/invoices/:id - Eliminar factura (SOLO Admin) 🔒
router.delete('/invoices/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const invoiceId = req.params.id;
    
    console.log(`🧾 Eliminando factura ID: ${invoiceId}`);
    
    const sql = 'DELETE FROM Invoices WHERE id = ?';
    
    db.run(sql, [invoiceId], function(err) {
        if (err) {
            console.error('❌ Error eliminando factura:', err);
            res.status(500).json({ 
                error: 'Error eliminando factura',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        console.log(`✅ Factura ${invoiceId} eliminada`);
        res.json({
            message: 'Factura eliminada exitosamente',
            changes: this.changes
        });
    });
});

// GET /api/invoices/:id - Obtener factura específica
router.get('/invoices/:id', authenticateToken, (req, res) => {
    const invoiceId = req.params.id;
    
    console.log(`🧾 Obteniendo factura ID: ${invoiceId}`);
    
    const sql = `
        SELECT 
            i.*,
            c.name as client_name,
            c.email as client_email,
            c.phone as client_phone,
            c.address as client_address,
            u.username as created_by_name,
            q.quote_number
        FROM Invoices i
        LEFT JOIN Clients c ON i.client_id = c.id
        LEFT JOIN Users u ON i.created_by = u.id
        LEFT JOIN Quotes q ON i.quote_id = q.id
        WHERE i.id = ?
    `;
    
    db.get(sql, [invoiceId], (err, row) => {
        if (err) {
            console.error('❌ Error obteniendo factura:', err);
            res.status(500).json({ 
                error: 'Error obteniendo factura',
                details: err.message 
            });
            return;
        }
        
        if (!row) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        // Parse items JSON if exists
        if (row.items) {
            try {
                row.items = JSON.parse(row.items);
            } catch (e) {
                console.warn('⚠️ Error parsing items JSON:', e);
                row.items = [];
            }
        }
        
        console.log(`✅ Factura ${invoiceId} obtenida`);
        res.json({
            message: 'success',
            data: row
        });
    });
});

// PUT /api/invoices/:id/mark-paid - Marcar factura como pagada
router.put('/invoices/:id/mark-paid', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const invoiceId = req.params.id;
    const { notes } = req.body;
    
    console.log(`🧾 Marcando factura ${invoiceId} como pagada`);
    
    const sql = `
        UPDATE Invoices SET
            status = 'Pagada',
            notes = CASE
                WHEN ? IS NOT NULL AND TRIM(?) <> '' THEN CONCAT(COALESCE(notes, ''), '\n--- PAGO ---\n', ?)
                ELSE notes
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        notes || null,
        notes || null,
        notes || null,
        invoiceId
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error marcando factura como pagada:', err);
            res.status(500).json({ 
                error: 'Error marcando factura como pagada',
                details: err.message 
            });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Factura no encontrada'
            });
        }
        
        console.log(`✅ Factura ${invoiceId} marcada como pagada`);
        res.json({
            message: 'Factura marcada como pagada exitosamente',
            changes: this.changes
        });
    });
});

// ===================================================================

module.exports = router;
