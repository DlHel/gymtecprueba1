const express = require('express');
const router = express.Router();

// ===================================================================
// MIDDLEWARE DE AUTENTICACIÓN (debe importarse desde el servidor principal)
// ===================================================================

// Estas funciones serán inyectadas desde el servidor principal
let authenticateToken, requireRole, db;

function setDependencies(deps) {
    authenticateToken = deps.authenticateToken;
    requireRole = deps.requireRole;
    db = deps.db;
}

// ===================================================================
// RUTAS DE GASTOS - SISTEMA FINANCIERO
// ===================================================================

// GET /expenses - Obtener todos los gastos
router.get('/', authenticateToken, (req, res) => {
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
    
    sql += ` ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
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
            offset: parseInt(offset),
            limit: parseInt(limit)
        });
    });
});

// POST /expenses - Crear nuevo gasto
router.post('/', authenticateToken, (req, res) => {
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

// PUT /expenses/:id/approve - Aprobar gasto
router.put('/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
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

// GET /categories - Obtener categorías de gastos
router.get('/categories', authenticateToken, (req, res) => {
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

// GET /stats - Obtener estadísticas de gastos
router.get('/stats', authenticateToken, (req, res) => {
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

module.exports = { router, setDependencies };
