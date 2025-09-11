class ExpenseService {

    static getAll(db, filters) {
        return new Promise((resolve, reject) => {
            const { status, category, date_from, date_to, limit = 50, offset = 0 } = filters;
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
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static create(db, data, userId) {
        return new Promise((resolve, reject) => {
            const { description, amount, date } = data;
            if (!description || !amount || !date || amount <= 0) {
                const error = new Error('Descripción, monto (>0) y fecha son requeridos');
                error.statusCode = 400;
                return reject(error);
            }

            const sql = `
                INSERT INTO Expenses (
                    category_id, category, description, amount, date, supplier,
                    receipt_number, payment_method, reference_type, reference_id,
                    notes, receipt_file, created_by, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
            `;
            const params = [
                data.category_id || null, data.category || 'Otros', data.description,
                data.amount, data.date, data.supplier || null, data.receipt_number || null,
                data.payment_method || null, data.reference_type || 'General', data.reference_id || null,
                data.notes || null, data.receipt_file || null, userId
            ];

            db.run(sql, params, function(err) {
                if (err) return reject(err);
                
                const getSql = `
                    SELECT e.*, ec.name as category_name, u.username as created_by_name
                    FROM Expenses e
                    LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
                    LEFT JOIN Users u ON e.created_by = u.id
                    WHERE e.id = ?
                `;
                db.get(getSql, [this.lastID], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });
        });
    }
    
    static update(db, expenseId, data, user) {
        return new Promise((resolve, reject) => {
            const checkSql = `SELECT status, created_by FROM Expenses WHERE id = ?`;
            db.get(checkSql, [expenseId], (err, expense) => {
                if (err) return reject(err);
                if (!expense) {
                    const error = new Error('Gasto no encontrado');
                    error.statusCode = 404;
                    return reject(error);
                }
                if (expense.status !== 'Pendiente' && user.role !== 'Admin') {
                    const error = new Error('Solo se pueden editar gastos pendientes');
                    error.statusCode = 403;
                    return reject(error);
                }
                if (expense.created_by !== user.id && user.role !== 'Admin') {
                    const error = new Error('No tienes permisos para editar este gasto');
                    error.statusCode = 403;
                    return reject(error);
                }

                const sql = `
                    UPDATE Expenses SET
                        category_id = COALESCE(?, category_id), category = COALESCE(?, category),
                        description = COALESCE(?, description), amount = COALESCE(?, amount),
                        date = COALESCE(?, date), supplier = COALESCE(?, supplier),
                        receipt_number = COALESCE(?, receipt_number), payment_method = COALESCE(?, payment_method),
                        reference_type = COALESCE(?, reference_type), reference_id = COALESCE(?, reference_id),
                        notes = COALESCE(?, notes), receipt_file = COALESCE(?, receipt_file),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `;
                const params = [
                    data.category_id, data.category, data.description, data.amount, data.date,
                    data.supplier, data.receipt_number, data.payment_method, data.reference_type,
                    data.reference_id, data.notes, data.receipt_file, expenseId
                ];

                db.run(sql, params, function(err) {
                    if (err) return reject(err);
                    
                    const getSql = `
                        SELECT e.*, ec.name as category_name, u_created.username as created_by_name, u_approved.username as approved_by_name
                        FROM Expenses e
                        LEFT JOIN ExpenseCategories ec ON e.category_id = ec.id
                        LEFT JOIN Users u_created ON e.created_by = u_created.id
                        LEFT JOIN Users u_approved ON e.approved_by = u_approved.id
                        WHERE e.id = ?
                    `;
                    db.get(getSql, [expenseId], (err, row) => {
                        if (err) return reject(err);
                        resolve({ data: row, changes: this.changes });
                    });
                });
            });
        });
    }

    static approve(db, expenseId, userId, notes) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE Expenses SET
                    status = 'Aprobado', approved_by = ?, approved_at = CURRENT_TIMESTAMP,
                    notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'Pendiente'
            `;
            db.run(sql, [userId, notes, expenseId], function(err) {
                if (err) return reject(err);
                if (this.changes === 0) {
                    const error = new Error('Gasto no encontrado o ya fue procesado');
                    error.statusCode = 404;
                    return reject(error);
                }
                resolve({ changes: this.changes });
            });
        });
    }

    static reject(db, expenseId, userId, notes) {
        return new Promise((resolve, reject) => {
            if (!notes) {
                const error = new Error('Se requiere una nota explicando el motivo del rechazo');
                error.statusCode = 400;
                return reject(error);
            }
            const sql = `
                UPDATE Expenses SET
                    status = 'Rechazado', approved_by = ?, approved_at = CURRENT_TIMESTAMP,
                    notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'Pendiente'
            `;
            db.run(sql, [userId, notes, expenseId], function(err) {
                if (err) return reject(err);
                if (this.changes === 0) {
                    const error = new Error('Gasto no encontrado o ya fue procesado');
                    error.statusCode = 404;
                    return reject(error);
                }
                resolve({ changes: this.changes });
            });
        });
    }

    static pay(db, expenseId, paymentData) {
        return new Promise((resolve, reject) => {
            const { payment_method, payment_notes } = paymentData;
            const sql = `
                UPDATE Expenses SET
                    status = 'Pagado', payment_method = COALESCE(?, payment_method),
                    paid_at = CURRENT_TIMESTAMP,
                    notes = CASE 
                        WHEN ? IS NOT NULL THEN CONCAT(COALESCE(notes, ''), '\n--- PAGO ---\n', ?)
                        ELSE notes
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'Aprobado'
            `;
            db.run(sql, [payment_method, payment_notes, payment_notes, expenseId], function(err) {
                if (err) return reject(err);
                if (this.changes === 0) {
                    const error = new Error('Gasto no encontrado o no está aprobado');
                    error.statusCode = 404;
                    return reject(error);
                }
                resolve({ changes: this.changes });
            });
        });
    }

    static delete(db, expenseId, user) {
        return new Promise((resolve, reject) => {
            const checkSql = `SELECT status, created_by FROM Expenses WHERE id = ?`;
            db.get(checkSql, [expenseId], (err, expense) => {
                if (err) return reject(err);
                if (!expense) {
                    const error = new Error('Gasto no encontrado');
                    error.statusCode = 404;
                    return reject(error);
                }
                if (!['Pendiente', 'Rechazado'].includes(expense.status)) {
                    const error = new Error('Solo se pueden eliminar gastos pendientes o rechazados');
                    error.statusCode = 403;
                    return reject(error);
                }
                if (expense.created_by !== user.id && user.role !== 'Admin') {
                    const error = new Error('No tienes permisos para eliminar este gasto');
                    error.statusCode = 403;
                    return reject(error);
                }
                const deleteSql = `DELETE FROM Expenses WHERE id = ?`;
                db.run(deleteSql, [expenseId], function(err) {
                    if (err) return reject(err);
                    resolve({ changes: this.changes });
                });
            });
        });
    }

    static getCategories(db) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM ExpenseCategories WHERE is_active = 1 ORDER BY name ASC`;
            db.all(sql, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static createCategory(db, data) {
        return new Promise((resolve, reject) => {
            const { name, description } = data;
            if (!name) {
                const error = new Error('El nombre de la categoría es requerido');
                error.statusCode = 400;
                return reject(error);
            }
            const sql = `INSERT INTO ExpenseCategories (name, description) VALUES (?, ?)`;
            db.run(sql, [name, description || null], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint')) {
                        const error = new Error('Ya existe una categoría con ese nombre');
                        error.statusCode = 409;
                        return reject(error);
                    }
                    return reject(err);
                }
                resolve({ id: this.lastID, name, description, is_active: true });
            });
        });
    }
}

module.exports = ExpenseService;
