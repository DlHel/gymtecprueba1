const express = require('express');
const router = express.Router();
const ExpenseService = require('../services/expenseService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const db = require('../db-adapter');

// Helper to handle errors
const handleError = (res, error) => {
    console.error('❌ Operation failed:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        error: error.message || 'Internal Server Error',
        details: error.details || error.toString()
    });
};

router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('💸 Obteniendo lista de gastos...');
        const expenses = await ExpenseService.getAll(db, req.query);
        console.log(`✅ ${expenses.length} gastos obtenidos`);
        res.json({ message: 'success', data: expenses });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log(`💸 Creando nuevo gasto...`);
        const newExpense = await ExpenseService.create(db, req.body, req.user.id);
        console.log(`✅ Gasto creado con ID: ${newExpense.id}`);
        res.status(201).json({ message: 'Gasto creado exitosamente', data: newExpense });
    } catch (error) {
        handleError(res, error);
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        console.log(`💸 Actualizando gasto ID: ${req.params.id}`);
        const result = await ExpenseService.update(db, req.params.id, req.body, req.user);
        console.log(`✅ Gasto ${req.params.id} actualizado`);
        res.json({ message: 'Gasto actualizado exitosamente', ...result });
    } catch (error) {
        handleError(res, error);
    }
});

router.put('/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        console.log(`✅ Aprobando gasto ID: ${req.params.id}`);
        await ExpenseService.approve(db, req.params.id, req.user.id, req.body.notes);
        console.log(`✅ Gasto ${req.params.id} aprobado exitosamente`);
        res.json({ message: 'Gasto aprobado exitosamente', expense_id: req.params.id });
    } catch (error) {
        handleError(res, error);
    }
});

router.put('/:id/reject', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        console.log(`❌ Rechazando gasto ID: ${req.params.id}`);
        await ExpenseService.reject(db, req.params.id, req.user.id, req.body.notes);
        console.log(`❌ Gasto ${req.params.id} rechazado exitosamente`);
        res.json({ message: 'Gasto rechazado exitosamente', expense_id: req.params.id });
    } catch (error) {
        handleError(res, error);
    }
});

router.put('/:id/pay', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        console.log(`💳 Marcando gasto ID: ${req.params.id} como pagado`);
        await ExpenseService.pay(db, req.params.id, req.body);
        console.log(`💳 Gasto ${req.params.id} marcado como pagado`);
        res.json({ message: 'Gasto marcado como pagado exitosamente', expense_id: req.params.id });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        console.log(`🗑️ Eliminando gasto ID: ${req.params.id}`);
        await ExpenseService.delete(db, req.params.id, req.user);
        console.log(`✅ Gasto ${req.params.id} eliminado exitosamente`);
        res.json({ message: 'Gasto eliminado exitosamente', expense_id: req.params.id });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/categories', authenticateToken, async (req, res) => {
    try {
        console.log('📁 Obteniendo categorías de gastos...');
        const categories = await ExpenseService.getCategories(db);
        console.log(`✅ ${categories.length} categorías obtenidas`);
        res.json({ message: 'success', data: categories });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/categories', authenticateToken, requireRole(['Admin']), async (req, res) => {
    try {
        console.log(`📁 Creando nueva categoría: ${req.body.name}`);
        const newCategory = await ExpenseService.createCategory(db, req.body);
        console.log(`✅ Categoría creada con ID: ${newCategory.id}`);
        res.status(201).json({ message: 'Categoría creada exitosamente', data: newCategory });
    } catch (error) {
        handleError(res, error);
    }
});

// The stats route remains here for now as its logic is more complex
router.get('/stats', authenticateToken, (req, res) => {
    console.log('📊 Calculando estadísticas de gastos...');
    const { period = 'month' } = req.query;
    let dateFilter = '';
    switch (period) {
        case 'week': dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`; break;
        case 'month': dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`; break;
        case 'quarter': dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`; break;
        case 'year': dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)`; break;
        default: dateFilter = `AND e.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    }
    const queries = [
        new Promise((resolve, reject) => {
            const sql = `SELECT status, COUNT(*) as count, SUM(amount) as total_amount FROM Expenses e WHERE 1=1 ${dateFilter} GROUP BY status`;
            db.all(sql, [], (err, rows) => err ? reject(err) : resolve({ type: 'by_status', data: rows }));
        }),
        new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) as total_count, SUM(amount) as total_amount, AVG(amount) as avg_amount, SUM(CASE WHEN status = 'Pendiente' THEN amount ELSE 0 END) as pending_amount, SUM(CASE WHEN status = 'Aprobado' THEN amount ELSE 0 END) as approved_amount, SUM(CASE WHEN status = 'Pagado' THEN amount ELSE 0 END) as paid_amount FROM Expenses e WHERE 1=1 ${dateFilter}`;
            db.get(sql, [], (err, row) => err ? reject(err) : resolve({ type: 'totals', data: row }));
        })
    ];
    Promise.all(queries)
        .then(results => {
            const stats = { period };
            results.forEach(result => { stats[result.type] = result.data; });
            console.log('✅ Estadísticas de gastos calculadas');
            res.json({ message: 'success', data: stats });
        })
        .catch(error => handleError(res, error));
});


module.exports = router;
