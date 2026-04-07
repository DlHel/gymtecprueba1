const express = require('express');

const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken, requireRole } = require('../../core/middleware/auth.middleware');

router.use(authenticateToken);

router.get('/maintenance-tasks/technicians', (req, res) => {
    const sql = `
        SELECT
            id,
            username,
            email,
            username AS first_name,
            '' AS last_name,
            username AS name,
            role,
            '' AS phone
        FROM Users
        WHERE role IN ('technician', 'Technician', 'Tecnico', 'Técnico', 'admin', 'Admin', 'Manager', 'Supervisor')
          AND status = 'Activo'
        ORDER BY username
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: 'Error retrieving technicians',
                code: 'DB_ERROR',
                details: err.message
            });
        }

        res.json({ message: 'success', data: rows || [] });
    });
});

router.get('/maintenance-tasks', (req, res) => {
    const sql = `
        SELECT
            mt.id,
            mt.title,
            mt.description,
            mt.type,
            mt.status,
            mt.priority,
            mt.scheduled_date,
            mt.scheduled_time,
            mt.estimated_duration,
            mt.actual_duration,
            mt.notes,
            mt.is_preventive,
            mt.started_at,
            mt.completed_at,
            mt.created_at,
            mt.updated_at,
            e.name AS equipment_name,
            e.serial_number AS equipment_serial,
            em.name AS equipment_model,
            u.username AS technician_username,
            u.username AS technician_name,
            c.name AS client_name,
            l.name AS location_name
        FROM MaintenanceTasks mt
        LEFT JOIN Equipment e ON mt.equipment_id = e.id
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        LEFT JOIN Users u ON mt.technician_id = u.id
        LEFT JOIN Clients c ON mt.client_id = c.id
        LEFT JOIN Locations l ON mt.location_id = l.id
        ORDER BY mt.scheduled_date DESC, mt.scheduled_time ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: 'Error retrieving maintenance tasks',
                code: 'DB_ERROR',
                details: err.message
            });
        }

        res.json({
            message: 'success',
            data: rows || [],
            metadata: {
                total: rows ? rows.length : 0,
                timestamp: new Date().toISOString()
            }
        });
    });
});

router.post('/maintenance-tasks', (req, res) => {
    const {
        title,
        description,
        type = 'maintenance',
        equipment_id,
        technician_id,
        scheduled_date,
        scheduled_time,
        estimated_duration,
        priority = 'medium',
        notes,
        is_preventive = false
    } = req.body;

    if (!title || !scheduled_date) {
        return res.status(400).json({
            error: 'Title and scheduled_date are required',
            code: 'VALIDATION_ERROR'
        });
    }

    const sql = `
        INSERT INTO MaintenanceTasks
        (title, description, type, equipment_id, technician_id, scheduled_date, scheduled_time, estimated_duration, priority, notes, is_preventive, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
    `;

    db.run(sql, [
        title,
        description || null,
        type,
        equipment_id || null,
        technician_id || null,
        scheduled_date,
        scheduled_time || null,
        estimated_duration || null,
        priority,
        notes || null,
        is_preventive ? 1 : 0,
        req.user?.id || null
    ], function(err) {
        if (err) {
            return res.status(500).json({
                error: 'Error creating maintenance task',
                code: 'DB_ERROR',
                details: err.message
            });
        }

        res.status(201).json({
            message: 'Maintenance task created successfully',
            success: true,
            data: { id: this.lastID, title, scheduled_date, scheduled_time, priority, status: 'pending' }
        });
    });
});

router.put('/maintenance-tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const {
        title,
        description,
        type,
        equipment_id,
        technician_id,
        scheduled_date,
        scheduled_time,
        estimated_duration,
        priority,
        notes,
        status
    } = req.body;

    const sql = `
        UPDATE MaintenanceTasks
        SET title = ?, description = ?, type = ?, equipment_id = ?, technician_id = ?,
            scheduled_date = ?, scheduled_time = ?, estimated_duration = ?, priority = ?,
            notes = ?, status = ?, updated_at = NOW()
        WHERE id = ?
    `;

    db.run(sql, [
        title,
        description || null,
        type || null,
        equipment_id || null,
        technician_id || null,
        scheduled_date || null,
        scheduled_time || null,
        estimated_duration || null,
        priority || null,
        notes || null,
        status || null,
        taskId
    ], function(err) {
        if (err) {
            return res.status(500).json({
                error: 'Error updating maintenance task',
                code: 'DB_ERROR',
                details: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Maintenance task not found',
                code: 'NOT_FOUND'
            });
        }

        res.json({ message: 'Maintenance task updated successfully', success: true });
    });
});

router.delete('/maintenance-tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id, 10);

    db.run('DELETE FROM MaintenanceTasks WHERE id = ?', [taskId], function(err) {
        if (err) {
            return res.status(500).json({
                error: 'Error deleting maintenance task',
                code: 'DB_ERROR',
                details: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Maintenance task not found',
                code: 'NOT_FOUND'
            });
        }

        res.json({ message: 'Maintenance task deleted successfully', success: true });
    });
});

router.get('/system-settings', requireRole(['Admin']), (req, res) => {
    const sql = 'SELECT * FROM SystemSettings ORDER BY setting_key';

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: 'Error retrieving settings',
                code: 'SETTINGS_FETCH_ERROR',
                details: err.message
            });
        }

        const settings = {
            company: {},
            workSchedule: { days: {} },
            security: {},
            maintenance: {},
            integrations: {}
        };

        (rows || []).forEach((row) => {
            const { setting_key: key, setting_value: value } = row;
            let parsedValue = value;

            if (value === 'true') parsedValue = true;
            else if (value === 'false') parsedValue = false;
            else if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) parsedValue = Number(value);

            if (key.startsWith('company.')) settings.company[key.split('.')[1]] = parsedValue;
            else if (key.startsWith('workSchedule.days.')) settings.workSchedule.days[key.split('.')[2]] = parsedValue;
            else if (key.startsWith('workSchedule.')) settings.workSchedule[key.split('.')[1]] = parsedValue;
            else if (key.startsWith('security.')) settings.security[key.split('.')[1]] = parsedValue;
            else if (key.startsWith('maintenance.')) settings.maintenance[key.split('.')[1]] = parsedValue;
            else if (key.startsWith('integrations.')) settings.integrations[key.split('.')[1]] = parsedValue;
        });

        res.json({ data: settings });
    });
});

router.put('/system-settings', requireRole(['Admin']), async (req, res) => {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings format', code: 'VALIDATION_ERROR' });
    }

    const flatSettings = [];

    if (settings.company) {
        Object.keys(settings.company).forEach((key) => flatSettings.push({ key: `company.${key}`, value: settings.company[key] }));
    }

    if (settings.workSchedule) {
        const { days, ...rest } = settings.workSchedule;
        Object.keys(rest).forEach((key) => flatSettings.push({ key: `workSchedule.${key}`, value: rest[key] }));
        if (days) {
            Object.keys(days).forEach((key) => flatSettings.push({ key: `workSchedule.days.${key}`, value: days[key] }));
        }
    }

    if (settings.security) {
        Object.keys(settings.security).forEach((key) => flatSettings.push({ key: `security.${key}`, value: settings.security[key] }));
    }

    if (settings.maintenance) {
        Object.keys(settings.maintenance).forEach((key) => flatSettings.push({ key: `maintenance.${key}`, value: settings.maintenance[key] }));
    }

    if (settings.integrations) {
        Object.keys(settings.integrations).forEach((key) => flatSettings.push({ key: `integrations.${key}`, value: settings.integrations[key] }));
    }

    let connection;
    try {
        connection = await db.db.pool.getConnection();
        await connection.beginTransaction();

        const stmtSql = `
            INSERT INTO SystemSettings (setting_key, setting_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
        `;

        for (const item of flatSettings) {
            await connection.query(stmtSql, [item.key, String(item.value)]);
        }

        await connection.commit();

        res.json({
            message: 'Settings updated successfully',
            data: settings
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            error: 'Error saving settings',
            code: 'SETTINGS_SAVE_ERROR',
            details: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
