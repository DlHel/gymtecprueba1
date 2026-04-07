const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken, requireRole } = require('../../core/middleware/auth.middleware');
const { toMySQLDateTime } = require('../../core/utils/datetime');

/**
 * GYMTEC ERP - Módulo de Workforce
 * Extraído de server-clean.js para arquitectura modular
 */

router.get('/shift-types', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM ShiftTypes WHERE is_active = 1 ORDER BY name';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo tipos de turno:', err);
            return res.status(500).json({ error: 'Error al obtener tipos de turno' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Crear tipo de turno
router.post('/shift-types', authenticateToken, requireRole(['Admin']), (req, res) => {
    const { name, description, color } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `INSERT INTO ShiftTypes (name, description, color) VALUES (?, ?, ?)`;
    
    db.run(sql, [name, description, color || '#3B82F6'], function(err) {
        if (err) {
            console.error('Error creando tipo de turno:', err);
            return res.status(500).json({ error: 'Error al crear tipo de turno' });
        }
        res.json({ 
            message: 'success',
            data: { id: this.lastID, name, description, color }
        });
    });
});

// ===================================================================
// HORARIOS DE TRABAJO
// ===================================================================

// GET - Obtener todos los horarios
router.get('/work-schedules', authenticateToken, (req, res) => {
    const sql = `
        SELECT ws.*, st.name as shift_type_name, st.color as shift_type_color
        FROM WorkSchedules ws
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE ws.is_active = 1
        ORDER BY ws.name
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error obteniendo horarios:', err);
            return res.status(500).json({ error: 'Error al obtener horarios' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener horario por ID
router.get('/work-schedules/:id', authenticateToken, (req, res) => {
    const sql = `
        SELECT ws.*, st.name as shift_type_name
        FROM WorkSchedules ws
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE ws.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo horario:', err);
            return res.status(500).json({ error: 'Error al obtener horario' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }
        res.json({ message: 'success', data: row });
    });
});

// POST - Crear horario
router.post('/work-schedules', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        name, description, shift_type_id,
        monday_enabled, monday_start, monday_end, monday_break_duration,
        tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
        wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
        thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
        friday_enabled, friday_start, friday_end, friday_break_duration,
        saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
        sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
        weekly_hours, tolerance_minutes
    } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const sql = `
        INSERT INTO WorkSchedules (
            name, description, shift_type_id,
            monday_enabled, monday_start, monday_end, monday_break_duration,
            tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
            wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
            thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
            friday_enabled, friday_start, friday_end, friday_break_duration,
            saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
            sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
            weekly_hours, tolerance_minutes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        name, description, shift_type_id,
        monday_enabled || 0, monday_start, monday_end, monday_break_duration || 0,
        tuesday_enabled || 0, tuesday_start, tuesday_end, tuesday_break_duration || 0,
        wednesday_enabled || 0, wednesday_start, wednesday_end, wednesday_break_duration || 0,
        thursday_enabled || 0, thursday_start, thursday_end, thursday_break_duration || 0,
        friday_enabled || 0, friday_start, friday_end, friday_break_duration || 0,
        saturday_enabled || 0, saturday_start, saturday_end, saturday_break_duration || 0,
        sunday_enabled || 0, sunday_start, sunday_end, sunday_break_duration || 0,
        weekly_hours || 0, tolerance_minutes || 15
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error creando horario:', err);
            return res.status(500).json({ error: 'Error al crear horario' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// PUT - Actualizar horario
router.put('/work-schedules/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const {
        name, description, shift_type_id,
        monday_enabled, monday_start, monday_end, monday_break_duration,
        tuesday_enabled, tuesday_start, tuesday_end, tuesday_break_duration,
        wednesday_enabled, wednesday_start, wednesday_end, wednesday_break_duration,
        thursday_enabled, thursday_start, thursday_end, thursday_break_duration,
        friday_enabled, friday_start, friday_end, friday_break_duration,
        saturday_enabled, saturday_start, saturday_end, saturday_break_duration,
        sunday_enabled, sunday_start, sunday_end, sunday_break_duration,
        weekly_hours, tolerance_minutes
    } = req.body;
    
    const sql = `
        UPDATE WorkSchedules SET
            name = ?, description = ?, shift_type_id = ?,
            monday_enabled = ?, monday_start = ?, monday_end = ?, monday_break_duration = ?,
            tuesday_enabled = ?, tuesday_start = ?, tuesday_end = ?, tuesday_break_duration = ?,
            wednesday_enabled = ?, wednesday_start = ?, wednesday_end = ?, wednesday_break_duration = ?,
            thursday_enabled = ?, thursday_start = ?, thursday_end = ?, thursday_break_duration = ?,
            friday_enabled = ?, friday_start = ?, friday_end = ?, friday_break_duration = ?,
            saturday_enabled = ?, saturday_start = ?, saturday_end = ?, saturday_break_duration = ?,
            sunday_enabled = ?, sunday_start = ?, sunday_end = ?, sunday_break_duration = ?,
            weekly_hours = ?, tolerance_minutes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        name, description, shift_type_id,
        monday_enabled || 0, monday_start, monday_end, monday_break_duration || 0,
        tuesday_enabled || 0, tuesday_start, tuesday_end, tuesday_break_duration || 0,
        wednesday_enabled || 0, wednesday_start, wednesday_end, wednesday_break_duration || 0,
        thursday_enabled || 0, thursday_start, thursday_end, thursday_break_duration || 0,
        friday_enabled || 0, friday_start, friday_end, friday_break_duration || 0,
        saturday_enabled || 0, saturday_start, saturday_end, saturday_break_duration || 0,
        sunday_enabled || 0, sunday_start, sunday_end, sunday_break_duration || 0,
        weekly_hours || 0, tolerance_minutes || 15,
        req.params.id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error actualizando horario:', err);
            return res.status(500).json({ error: 'Error al actualizar horario' });
        }
        res.json({ message: 'success' });
    });
});

// DELETE - Desactivar horario
router.delete('/work-schedules/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    const sql = 'UPDATE WorkSchedules SET is_active = 0 WHERE id = ?';
    
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            console.error('Error desactivando horario:', err);
            return res.status(500).json({ error: 'Error al desactivar horario' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// ASIGNACIÓN DE HORARIOS A EMPLEADOS
// ===================================================================

// GET - Obtener horarios de un empleado
router.get('/employee-schedules/:userId', authenticateToken, (req, res) => {
    const sql = `
        SELECT es.*, ws.name as schedule_name, ws.weekly_hours,
               u.username, st.name as shift_type_name
        FROM EmployeeSchedules es
        JOIN WorkSchedules ws ON es.schedule_id = ws.id
        JOIN Users u ON es.user_id = u.id
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE es.user_id = ?
        ORDER BY es.start_date DESC
    `;
    
    db.all(sql, [req.params.userId], (err, rows) => {
        if (err) {
            console.error('Error obteniendo horarios del empleado:', err);
            return res.status(500).json({ error: 'Error al obtener horarios' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener horario activo de un empleado
router.get('/employee-schedules/:userId/active', authenticateToken, (req, res) => {
    const sql = `
        SELECT es.*, ws.*, st.name as shift_type_name
        FROM EmployeeSchedules es
        JOIN WorkSchedules ws ON es.schedule_id = ws.id
        LEFT JOIN ShiftTypes st ON ws.shift_type_id = st.id
        WHERE es.user_id = ?
          AND es.is_active = 1
          AND CURDATE() >= es.start_date
          AND (es.end_date IS NULL OR CURDATE() <= es.end_date)
        ORDER BY es.start_date DESC
        LIMIT 10
    `;
    
    db.get(sql, [req.params.userId], (err, row) => {
        if (err) {
            console.error('Error obteniendo horario activo:', err);
            return res.status(500).json({ error: 'Error al obtener horario activo' });
        }
        res.json({ message: 'success', data: row });
    });
});

// POST - Asignar horario a empleado
router.post('/employee-schedules', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { user_id, schedule_id, start_date, end_date, notes } = req.body;
    
    if (!user_id || !schedule_id || !start_date) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const sql = `
        INSERT INTO EmployeeSchedules (user_id, schedule_id, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [user_id, schedule_id, start_date, end_date, notes], function(err) {
        if (err) {
            console.error('Error asignando horario:', err);
            return res.status(500).json({ error: 'Error al asignar horario' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// ===================================================================
// ASISTENCIA
// ===================================================================

// GET - Obtener asistencias (con filtros)
router.get('/attendance', authenticateToken, (req, res) => {
    const { user_id, date_from, date_to, status } = req.query;
    
    let sql = `
        SELECT a.*, u.username, u.role_id,
               ws.name as schedule_name
        FROM Attendance a
        JOIN Users u ON a.user_id = u.id
        LEFT JOIN EmployeeSchedules es ON es.user_id = u.id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND a.user_id = ?';
        params.push(user_id);
    }
    
    if (date_from) {
        sql += ' AND a.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND a.date <= ?';
        params.push(date_to);
    }
    
    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY a.date DESC, u.username';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo asistencias:', err);
            return res.status(500).json({ error: 'Error al obtener asistencias' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// GET - Obtener asistencia de hoy del usuario actual
router.get('/attendance/today', authenticateToken, (req, res) => {
    const sql = `
        SELECT a.*, ws.name as schedule_name,
               ws.tolerance_minutes
        FROM Attendance a
        LEFT JOIN EmployeeSchedules es ON es.user_id = a.user_id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE a.user_id = ? AND a.date = CURDATE()
    `;
    
    db.get(sql, [req.user.id], (err, row) => {
        if (err) {
            console.error('Error obteniendo asistencia de hoy:', err);
            return res.status(500).json({ error: 'Error al obtener asistencia' });
        }
        res.json({ message: 'success', data: row });
    });
});

// NOTE: Por limitaciones de tamaño, las demás rutas (check-in, check-out, overtime, leave-requests, holidays, reports) 
// se mantendrán en su ubicación actual después de startServer() temporalmente.
// TODO: Mover todas las rutas aquí en un refactor posterior.

// ===================================================================
// REPORTES DE ASISTENCIA
// ===================================================================

// GET - Resumen de asistencia por empleado
router.get('/attendance/summary/:userId', authenticateToken, (req, res) => {
    const { month, year } = req.query;
    
    let sql = `
        SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as late_days,
            SUM(late_minutes) as total_late_minutes,
            SUM(worked_hours) as total_worked_hours,
            AVG(worked_hours) as avg_worked_hours
        FROM Attendance
        WHERE user_id = ?
    `;
    
    const params = [req.params.userId];
    
    if (month && year) {
        sql += ' AND MONTH(date) = ? AND YEAR(date) = ?';
        params.push(month, year);
    }
    
    db.get(sql, params, (err, row) => {
        if (err) {
            console.error('Error obteniendo resumen de asistencia:', err);
            return res.status(500).json({ error: 'Error al obtener resumen' });
        }
        res.json({ message: 'success', data: row });
    });
});

// GET - Estadísticas generales de asistencia
router.get('/attendance/stats', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const sql = `
        SELECT 
            COUNT(DISTINCT user_id) as total_employees,
            COUNT(*) as total_records,
            SUM(CASE WHEN date = CURDATE() THEN 1 ELSE 0 END) as today_present,
            SUM(CASE WHEN date = CURDATE() AND check_in_time IS NOT NULL AND check_out_time IS NULL THEN 1 ELSE 0 END) as currently_working,
            SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_late
        FROM Attendance
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error obteniendo estadísticas:', err);
            return res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
        res.json({ message: 'success', data: row });
    });
});

// GET - Vista global de asistencia para Admin/Manager (NUEVO)
router.get('/attendance/all', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { user_id, date_from, date_to, status, limit = 100 } = req.query;
    
    // Query principal con información del usuario
    let sql = `
        SELECT 
            a.id,
            a.user_id,
            a.date,
            a.check_in_time,
            a.check_out_time,
            a.worked_hours,
            a.scheduled_hours,
            a.is_late,
            a.late_minutes,
            a.status,
            u.username,
            u.email,
            u.role_id,
            ws.name as schedule_name,
            ws.weekly_hours
        FROM Attendance a
        JOIN Users u ON a.user_id = u.id
        LEFT JOIN EmployeeSchedules es ON es.user_id = u.id 
            AND a.date BETWEEN es.start_date AND COALESCE(es.end_date, '9999-12-31')
            AND es.is_active = 1
        LEFT JOIN WorkSchedules ws ON es.schedule_id = ws.id
        WHERE 1=1
    `;
    
    const params = [];
    
    // Filtros
    if (user_id) {
        sql += ' AND a.user_id = ?';
        params.push(user_id);
    }
    
    if (date_from) {
        sql += ' AND a.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND a.date <= ?';
        params.push(date_to);
    }
    
    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY a.date DESC, u.username LIMIT ?';
    params.push(parseInt(limit, 10));
    
    // Obtener registros
    db.all(sql, params, (err, attendances) => {
        if (err) {
            console.error('❌ Error obteniendo asistencias globales:', err);
            return res.status(500).json({ message: 'error', error: 'Error al obtener asistencias' });
        }
        
        // Obtener agregaciones
        let summarySQL = `
            SELECT 
                COUNT(DISTINCT user_id) as total_users,
                COUNT(*) as total_records,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_lates,
                SUM(late_minutes) as total_late_minutes,
                SUM(worked_hours) as total_worked_hours,
                AVG(worked_hours) as avg_worked_hours
            FROM Attendance
            WHERE 1=1
        `;
        
        const summaryParams = [];
        
        if (user_id) {
            summarySQL += ' AND user_id = ?';
            summaryParams.push(user_id);
        }
        
        if (date_from) {
            summarySQL += ' AND date >= ?';
            summaryParams.push(date_from);
        }
        
        if (date_to) {
            summarySQL += ' AND date <= ?';
            summaryParams.push(date_to);
        }
        
        if (status) {
            summarySQL += ' AND status = ?';
            summaryParams.push(status);
        }
        
        db.get(summarySQL, summaryParams, (err, summary) => {
            if (err) {
                console.error('❌ Error obteniendo resumen:', err);
                return res.json({ message: 'success', data: attendances, summary: null });
            }
            
            console.log(`✅ Asistencias globales obtenidas: ${attendances.length} registros`);
            res.json({ 
                message: 'success', 
                data: attendances,
                summary: summary || {},
                filters: { user_id, date_from, date_to, status, limit }
            });
        });
    });
});

// POST - Marcar entrada (check-in)
router.post('/attendance/check-in', authenticateToken, (req, res) => {
    const { location, notes } = req.body;
    const user_id = req.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Verificar si ya marcó entrada hoy
    const checkSql = 'SELECT * FROM Attendance WHERE user_id = ? AND date = CURDATE()';
    
    db.get(checkSql, [user_id], (err, existing) => {
        if (err) {
            console.error('Error verificando asistencia:', err);
            return res.status(500).json({ error: 'Error al verificar asistencia' });
        }
        
        if (existing && existing.check_in_time) {
            return res.status(400).json({ 
                error: 'Ya has marcado tu entrada hoy',
                data: existing
            });
        }
        
        // Obtener horario del empleado para calcular tardanza
        const scheduleSql = `
            SELECT ws.*, 
                   CASE DAYOFWEEK(NOW())
                       WHEN 2 THEN ws.monday_start
                       WHEN 3 THEN ws.tuesday_start
                       WHEN 4 THEN ws.wednesday_start
                       WHEN 5 THEN ws.thursday_start
                       WHEN 6 THEN ws.friday_start
                       WHEN 7 THEN ws.saturday_start
                       WHEN 1 THEN ws.sunday_start
                   END as scheduled_start
            FROM EmployeeSchedules es
            JOIN WorkSchedules ws ON es.schedule_id = ws.id
            WHERE es.user_id = ?
              AND es.is_active = 1
              AND CURDATE() >= es.start_date
              AND (es.end_date IS NULL OR CURDATE() <= es.end_date)
            LIMIT 10
        `;
        
        db.get(scheduleSql, [user_id], (err, schedule) => {
            const now = new Date();
            const nowTime = toMySQLDateTime(now); //  FIX: Hora local
            let is_late = 0;
            let late_minutes = 0;
            let status = 'present';
            
            if (schedule && schedule.scheduled_start) {
                const scheduledStart = new Date();
                const [hours, minutes] = schedule.scheduled_start.split(':');
                scheduledStart.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
                
                const tolerance = (schedule.tolerance_minutes || 15) * 60 * 1000;
                const diff = now - scheduledStart;
                
                if (diff > tolerance) {
                    is_late = 1;
                    late_minutes = Math.floor(diff / 60000);
                    status = 'late';
                }
            }
            
            if (existing) {
                // Actualizar registro existente
                const updateSql = `
                    UPDATE Attendance SET
                        check_in_time = ?,
                        check_in_location = ?,
                        check_in_notes = ?,
                        check_in_ip = ?,
                        is_late = ?,
                        late_minutes = ?,
                        status = ?
                    WHERE id = ?
                `;
                
                db.run(updateSql, [nowTime, location, notes, ip, is_late, late_minutes, status, existing.id], function(err) {
                    if (err) {
                        console.error('Error actualizando entrada:', err);
                        return res.status(500).json({ error: 'Error al marcar entrada' });
                    }
                    res.json({ message: 'Entrada registrada correctamente', data: { id: existing.id, is_late, late_minutes } });
                });
            } else {
                // Crear nuevo registro
                const insertSql = `
                    INSERT INTO Attendance (
                        user_id, date, check_in_time, check_in_location, check_in_notes, check_in_ip,
                        is_late, late_minutes, status, scheduled_hours
                    ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const scheduled_hours = schedule ? schedule.weekly_hours / 5 : 8; // Aproximación
                
                db.run(insertSql, [user_id, nowTime, location, notes, ip, is_late, late_minutes, status, scheduled_hours], function(err) {
                    if (err) {
                        console.error('Error creando entrada:', err);
                        return res.status(500).json({ error: 'Error al marcar entrada' });
                    }
                    res.json({ message: 'Entrada registrada correctamente', data: { id: this.lastID, is_late, late_minutes } });
                });
            }
        });
    });
});

// POST - Marcar salida (check-out)
router.post('/attendance/check-out', authenticateToken, (req, res) => {
    const { location, notes } = req.body;
    const user_id = req.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Obtener registro de hoy
    const getSql = 'SELECT * FROM Attendance WHERE user_id = ? AND date = CURDATE()';
    
    db.get(getSql, [user_id], (err, attendance) => {
        if (err) {
            console.error('Error obteniendo asistencia:', err);
            return res.status(500).json({ error: 'Error al obtener asistencia' });
        }
        
        if (!attendance) {
            return res.status(400).json({ error: 'No has marcado entrada hoy' });
        }
        
        if (attendance.check_out_time) {
            return res.status(400).json({ error: 'Ya has marcado tu salida hoy' });
        }
        
        const now = new Date();
        
        // FIX: Convertir check_in_time de MySQL DATETIME a JavaScript Date correctamente
        // MySQL puede devolver Date object o string "2025-10-09 03:29:00"
        let check_in;
        if (attendance.check_in_time instanceof Date) {
            // Ya es un objeto Date
            check_in = attendance.check_in_time;
        } else if (typeof attendance.check_in_time === 'string') {
            // Es un string, necesitamos parsearlo como hora local
            const checkInStr = attendance.check_in_time.replace(' ', 'T');
            check_in = new Date(checkInStr);
        } else {
            console.error('Tipo inesperado para check_in_time:', typeof attendance.check_in_time);
            return res.status(500).json({ error: 'Error procesando hora de entrada' });
        }
        
        const worked_hours = (now - check_in) / (1000 * 60 * 60); // Horas trabajadas
        
        const updateSql = `
            UPDATE Attendance SET
                check_out_time = ?,
                check_out_location = ?,
                check_out_notes = ?,
                check_out_ip = ?,
                worked_hours = ?
            WHERE id = ?
        `;
        
        db.run(updateSql, [toMySQLDateTime(now), location, notes, ip, worked_hours.toFixed(2), attendance.id], function(err) {
            if (err) {
                console.error('Error marcando salida:', err);
                return res.status(500).json({ error: 'Error al marcar salida' });
            }
            res.json({ 
                message: 'Salida registrada correctamente',
                data: { worked_hours: worked_hours.toFixed(2) }
            });
        });
    });
});

// ===================================================================
// HORAS EXTRAS
// ===================================================================

// GET - Obtener horas extras
router.get('/overtime', authenticateToken, (req, res) => {
    const { user_id, status, date_from, date_to } = req.query;
    
    let sql = `
        SELECT o.*, u.username,
               requester.username as requested_by_name,
               approver.username as approved_by_name
        FROM Overtime o
        JOIN Users u ON o.user_id = u.id
        LEFT JOIN Users requester ON o.requested_by = requester.id
        LEFT JOIN Users approver ON o.approved_by = approver.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND o.user_id = ?';
        params.push(user_id);
    }
    
    if (status) {
        sql += ' AND o.status = ?';
        params.push(status);
    }
    
    if (date_from) {
        sql += ' AND o.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND o.date <= ?';
        params.push(date_to);
    }
    
    sql += ' ORDER BY o.date DESC, o.start_time DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo horas extras:', err);
            return res.status(500).json({ error: 'Error al obtener horas extras' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Registrar horas extras
router.post('/overtime', authenticateToken, (req, res) => {
    const { 
        user_id, date, start_time, end_time, type, description, reason,
        hourly_rate
    } = req.body;
    
    if (!user_id || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    // Calcular horas
    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);
    const hours = (end - start) / (1000 * 60 * 60);
    
    // Determinar multiplicador según tipo
    let multiplier = 1.5;
    if (type === 'night') multiplier = 2.0;
    if (type === 'holiday') multiplier = 2.0;
    if (type === 'sunday') multiplier = 1.8;
    
    const total_amount = hourly_rate ? (hours * hourly_rate * multiplier).toFixed(2) : 0;
    
    const sql = `
        INSERT INTO Overtime (
            user_id, date, start_time, end_time, hours,
            type, multiplier, description, reason,
            hourly_rate, total_amount, requested_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
        user_id, date, start_time, end_time, hours.toFixed(2),
        type || 'regular', multiplier, description, reason,
        hourly_rate || 0, total_amount, req.user.id, 'pending'
    ], function(err) {
        if (err) {
            console.error('Error registrando horas extras:', err);
            return res.status(500).json({ error: 'Error al registrar horas extras' });
        }
        res.json({ message: 'success', data: { id: this.lastID, hours: hours.toFixed(2), total_amount } });
    });
});

// PUT - Aprobar/Rechazar horas extras
router.put('/overtime/:id/status', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { status, rejection_reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const sql = `
        UPDATE Overtime SET
            status = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [status, req.user.id, rejection_reason, req.params.id], function(err) {
        if (err) {
            console.error('Error actualizando estado de horas extras:', err);
            return res.status(500).json({ error: 'Error al actualizar estado' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// SOLICITUDES DE PERMISO/VACACIONES
// ===================================================================

// GET - Obtener solicitudes de permiso
router.get('/leave-requests', authenticateToken, (req, res) => {
    const { user_id, status } = req.query;
    
    let sql = `
        SELECT lr.*, u.username,
               approver.username as approved_by_name,
               replacement.username as replacement_name
        FROM LeaveRequests lr
        JOIN Users u ON lr.user_id = u.id
        LEFT JOIN Users approver ON lr.approved_by = approver.id
        LEFT JOIN Users replacement ON lr.replacement_user_id = replacement.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (user_id) {
        sql += ' AND lr.user_id = ?';
        params.push(user_id);
    }
    
    if (status) {
        sql += ' AND lr.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY lr.start_date DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error obteniendo solicitudes de permiso:', err);
            return res.status(500).json({ error: 'Error al obtener solicitudes' });
        }
        res.json({ message: 'success', data: rows });
    });
});

// POST - Crear solicitud de permiso
router.post('/leave-requests', authenticateToken, (req, res) => {
    const {
        start_date, end_date, days_requested, type, reason,
        has_documentation, documentation_file, replacement_user_id
    } = req.body;
    
    if (!start_date || !end_date || !type) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const sql = `
        INSERT INTO LeaveRequests (
            user_id, start_date, end_date, days_requested,
            type, reason, has_documentation, documentation_file,
            replacement_user_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
        req.user.id, start_date, end_date, days_requested || 1,
        type, reason, has_documentation || 0, documentation_file,
        replacement_user_id, 'pending'
    ], function(err) {
        if (err) {
            console.error('Error creando solicitud de permiso:', err);
            return res.status(500).json({ error: 'Error al crear solicitud' });
        }
        res.json({ message: 'success', data: { id: this.lastID } });
    });
});

// PUT - Aprobar/Rechazar solicitud de permiso
router.put('/leave-requests/:id/status', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { status, rejection_reason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    
    const sql = `
        UPDATE LeaveRequests SET
            status = ?,
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [status, req.user.id, rejection_reason, req.params.id], function(err) {
        if (err) {
            console.error('Error actualizando solicitud:', err);
            return res.status(500).json({ error: 'Error al actualizar solicitud' });
        }
        res.json({ message: 'success' });
    });
});

// ===================================================================
// ENDPOINTS ESPEC�?FICOS PARA APROBACI�"N/RECHAZO (ADMIN)
// ===================================================================

// PATCH - Aprobar horas extras (con ajuste manual de horas)
router.patch('/overtime/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { hours_approved } = req.body;
    const overtimeId = req.params.id;
    
    // Validar que hours_approved sea un n�mero positivo
    if (!hours_approved || hours_approved <= 0) {
        return res.status(400).json({ error: 'Horas aprobadas debe ser mayor a 0' });
    }
    
    // Verificar que no se aprueben m�s horas de las solicitadas
    const checkSql = 'SELECT hours_requested FROM Overtime WHERE id = ?';
    
    db.get(checkSql, [overtimeId], (err, row) => {
        if (err) {
            console.error('Error verificando overtime:', err);
            return res.status(500).json({ error: 'Error al verificar horas extras' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }
        
        if (hours_approved > row.hours_requested) {
            return res.status(400).json({ 
                error: `No puede aprobar m�s horas (${hours_approved}h) de las solicitadas (${row.hours_requested}h)` 
            });
        }
        
        // Aprobar con horas ajustadas
        const updateSql = `
            UPDATE Overtime SET
                status = 'approved',
                hours_approved = ?,
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        db.run(updateSql, [hours_approved, req.user.id, overtimeId], function(err) {
            if (err) {
                console.error('Error aprobando horas extras:', err);
                return res.status(500).json({ error: 'Error al aprobar horas extras' });
            }
            
            console.log(`? Horas extras aprobadas: ${hours_approved}h (ID: ${overtimeId}) por usuario ${req.user.id}`);
            res.json({ 
                message: 'success', 
                data: { 
                    id: overtimeId, 
                    hours_approved, 
                    status: 'approved' 
                } 
            });
        });
    });
});

// PATCH - Rechazar horas extras
router.patch('/overtime/:id/reject', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { rejection_reason } = req.body;
    const overtimeId = req.params.id;
    
    const sql = `
        UPDATE Overtime SET
            status = 'rejected',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [req.user.id, rejection_reason || 'Rechazado por administrador', overtimeId], function(err) {
        if (err) {
            console.error('Error rechazando horas extras:', err);
            return res.status(500).json({ error: 'Error al rechazar horas extras' });
        }
        
        console.log(`? Horas extras rechazadas (ID: ${overtimeId}) por usuario ${req.user.id}`);
        res.json({ message: 'success', data: { id: overtimeId, status: 'rejected' } });
    });
});

// PATCH - Aprobar permiso/vacaciones
router.patch('/leave-requests/:id/approve', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const leaveId = req.params.id;
    
    const sql = `
        UPDATE LeaveRequests SET
            status = 'approved',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    db.run(sql, [req.user.id, leaveId], function(err) {
        if (err) {
            console.error('Error aprobando permiso:', err);
            return res.status(500).json({ error: 'Error al aprobar permiso' });
        }
        
        console.log(`? Permiso aprobado (ID: ${leaveId}) por usuario ${req.user.id}`);
        res.json({ message: 'success', data: { id: leaveId, status: 'approved' } });
    });
});

// PATCH - Rechazar permiso/vacaciones
router.patch('/leave-requests/:id/reject', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const { rejection_reason } = req.body;
    const leaveId = req.params.id;
    
    const sql = `
        UPDATE LeaveRequests SET
            status = 'rejected',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    `;
    
    db.run(sql, [req.user.id, rejection_reason || 'Rechazado por administrador', leaveId], function(err) {
        if (err) {
            console.error('Error rechazando permiso:', err);
            return res.status(500).json({ error: 'Error al rechazar permiso' });
        }
        
        console.log(`? Permiso rechazado (ID: ${leaveId}) por usuario ${req.user.id}`);
        res.json({ message: 'success', data: { id: leaveId, status: 'rejected' } });
    });
});

// GET - Estad�sticas del d�a para administradores
router.get('/attendance/stats/today', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    const statsQueries = {
        // Empleados presentes (con check-in hoy)
        present: `SELECT COUNT(DISTINCT user_id) as count FROM Attendance WHERE DATE(check_in) = ?`,
        
        // Llegadas tarde (check-in despu�s de horario)
        late: `SELECT COUNT(DISTINCT a.user_id) as count 
               FROM Attendance a 
               JOIN EmployeeSchedules es ON a.user_id = es.user_id
               JOIN ShiftTypes st ON es.shift_type_id = st.id
               WHERE DATE(a.check_in) = ? 
               AND TIME(a.check_in) > st.start_time`,
        
        // Horas extras pendientes
        pending_overtime: `SELECT COUNT(*) as count FROM Overtime WHERE status = 'pending'`,
        
        // Permisos pendientes
        pending_leave: `SELECT COUNT(*) as count FROM LeaveRequests WHERE status = 'pending'`,
        
        // Total horas extras del mes
        overtime_hours: `SELECT IFNULL(SUM(hours_approved), 0) as total 
                         FROM Overtime 
                         WHERE status = 'approved' 
                         AND MONTH(date) = MONTH(CURDATE()) 
                         AND YEAR(date) = YEAR(CURDATE())`
    };
    
    const stats = {};
    let completed = 0;
    const total = Object.keys(statsQueries).length;
    
    Object.keys(statsQueries).forEach(key => {
        const params = statsQueries[key].includes('?') ? [today] : [];
        
        db.get(statsQueries[key], params, (err, row) => {
            if (err) {
                console.error(`Error en query ${key}:`, err);
                stats[key] = 0;
            } else {
                stats[key] = row.count || row.total || 0;
            }
            
            completed++;
            if (completed === total) {
                console.log('?? Estad�sticas del d�a generadas:', stats);
                res.json({ message: 'success', data: stats });
            }
        });
    });
});

console.log('✅ Rutas principales de asistencia registradas (shift-types, schedules, employee-schedules, attendance, summary, stats, check-in, check-out, overtime, leave-requests)');

// ===================================================================
// NÓMINA CHILE - ENDPOINTS
// ===================================================================
// El wiring canónico de nómina vive en register-advanced-routes.js para evitar doble montaje.

// ===================================================================
// GESTIÓN DE PERÍODOS DE NÓMINA
// ===================================================================

// GET - Listar todos los períodos de nómina
router.get('/payroll-periods', authenticateToken, requireRole(['Admin', 'Manager', 'Finance']), async (req, res) => {
    try {
        const sql = `
            SELECT 
                pp.*,
                u1.username as closed_by_name,
                u2.username as approved_by_name
            FROM PayrollPeriods pp
            LEFT JOIN Users u1 ON pp.closed_by = u1.id
            LEFT JOIN Users u2 ON pp.approved_by = u2.id
            ORDER BY pp.start_date DESC
        `;
        
        db.all(sql, [], (err, periods) => {
            if (err) {
                console.error('❌ Error obteniendo períodos:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            console.log(`✅ Períodos de nómina obtenidos: ${periods.length}`);
            res.json({ message: 'success', data: periods });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// POST - Cerrar período actual
router.post('/payroll-periods/close-current', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { period_name, start_date, end_date, notes } = req.body;
        const user_id = req.user.id;
        
        // Validar que no exista un período cerrado para esas fechas
        const checkSql = `
            SELECT * FROM PayrollPeriods 
            WHERE (start_date <= ? AND end_date >= ?) 
               OR (start_date <= ? AND end_date >= ?)
               OR (start_date >= ? AND end_date <= ?)
        `;
        
        db.get(checkSql, [start_date, start_date, end_date, end_date, start_date, end_date], async (err, existing) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (existing) {
                return res.status(400).json({ 
                    message: 'error', 
                    error: 'Ya existe un período que se solapa con estas fechas' 
                });
            }
            
            // Calcular estadísticas del período
            const statsSql = `
                SELECT 
                    COUNT(DISTINCT user_id) as total_employees,
                    SUM(worked_hours) as total_hours,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absences,
                    SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_late
                FROM Attendance
                WHERE date >= ? AND date <= ?
            `;
            
            db.get(statsSql, [start_date, end_date], (err, stats) => {
                if (err) {
                    console.error('❌ Error calculando estadísticas:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                // Calcular horas extras del período
                const overtimeSql = `
                    SELECT SUM(hours) as total_overtime
                    FROM Overtime
                    WHERE date >= ? AND date <= ? AND status = 'approved'
                `;
                
                db.get(overtimeSql, [start_date, end_date], (err, overtime) => {
                    if (err) {
                        console.error('❌ Error calculando horas extras:', err);
                        return res.status(500).json({ message: 'error', error: err.message });
                    }
                    
                    // Crear período
                    const insertSql = `
                        INSERT INTO PayrollPeriods (
                            period_name, start_date, end_date, status,
                            total_employees, total_hours_worked, total_overtime_hours,
                            total_absences, total_late_arrivals,
                            closed_by, closed_at, notes
                        ) VALUES (?, ?, ?, 'closed', ?, ?, ?, ?, ?, ?, NOW(), ?)
                    `;
                    
                    const params = [
                        period_name,
                        start_date,
                        end_date,
                        stats.total_employees || 0,
                        parseFloat(stats.total_hours || 0).toFixed(2),
                        parseFloat(overtime.total_overtime || 0).toFixed(2),
                        stats.total_absences || 0,
                        stats.total_late || 0,
                        user_id,
                        notes || null
                    ];
                    
                    db.run(insertSql, params, function(err) {
                        if (err) {
                            console.error('❌ Error creando período:', err);
                            return res.status(500).json({ message: 'error', error: err.message });
                        }
                        
                        const periodId = this.lastID;
                        
                        // Asignar período a registros de asistencia
                        const updateAttendanceSql = `
                            UPDATE Attendance 
                            SET payroll_period_id = ?
                            WHERE date >= ? AND date <= ?
                        `;
                        
                        db.run(updateAttendanceSql, [periodId, start_date, end_date], (err) => {
                            if (err) {
                                console.error('⚠️ Error asignando asistencias al período:', err);
                            }
                            
                            // Asignar período a horas extras aprobadas
                            const updateOvertimeSql = `
                                UPDATE Overtime 
                                SET payroll_period_id = ?
                                WHERE date >= ? AND date <= ? AND status = 'approved'
                            `;
                            
                            db.run(updateOvertimeSql, [periodId, start_date, end_date], (err) => {
                                if (err) {
                                    console.error('⚠️ Error asignando horas extras al período:', err);
                                }
                                
                                console.log(`✅ Período ${period_name} cerrado exitosamente (ID: ${periodId})`);
                                res.json({ 
                                    message: 'success', 
                                    data: { 
                                        id: periodId, 
                                        period_name,
                                        total_employees: stats.total_employees || 0,
                                        total_hours: parseFloat(stats.total_hours || 0).toFixed(2)
                                    } 
                                });
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/close-current:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// PATCH - Aprobar período
router.patch('/payroll-periods/:id/approve', authenticateToken, requireRole(['Admin']), (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const user_id = req.user.id;
        
        // Verificar que el período esté cerrado
        const checkSql = 'SELECT * FROM PayrollPeriods WHERE id = ?';
        
        db.get(checkSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            if (period.status !== 'closed') {
                return res.status(400).json({ 
                    message: 'error', 
                    error: 'Solo se pueden aprobar períodos cerrados' 
                });
            }
            
            // Aprobar período
            const updateSql = `
                UPDATE PayrollPeriods
                SET status = 'approved',
                    approved_by = ?,
                    approved_at = NOW(),
                    notes = COALESCE(?, notes)
                WHERE id = ?
            `;
            
            db.run(updateSql, [user_id, notes, id], (err) => {
                if (err) {
                    console.error('❌ Error aprobando período:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                console.log(`✅ Período ${id} aprobado por usuario ${user_id}`);
                res.json({ message: 'success', data: { id, status: 'approved' } });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/approve:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// PATCH - Rechazar período
router.patch('/payroll-periods/:id/reject', authenticateToken, requireRole(['Admin']), (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;
        
        if (!rejection_reason) {
            return res.status(400).json({ 
                message: 'error', 
                error: 'Debe proporcionar una razón de rechazo' 
            });
        }
        
        // Verificar que el período exista
        const checkSql = 'SELECT * FROM PayrollPeriods WHERE id = ?';
        
        db.get(checkSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            // Rechazar período y liberar registros
            const updatePeriodSql = `
                UPDATE PayrollPeriods
                SET status = 'rejected',
                    rejection_reason = ?
                WHERE id = ?
            `;
            
            db.run(updatePeriodSql, [rejection_reason, id], (err) => {
                if (err) {
                    console.error('❌ Error rechazando período:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                // Liberar registros de asistencia
                const freeAttendanceSql = 'UPDATE Attendance SET payroll_period_id = NULL WHERE payroll_period_id = ?';
                db.run(freeAttendanceSql, [id], (err) => {
                    if (err) {
                        console.error('⚠️ Error liberando asistencias:', err);
                    }
                    
                    // Liberar horas extras
                    const freeOvertimeSql = 'UPDATE Overtime SET payroll_period_id = NULL WHERE payroll_period_id = ?';
                    db.run(freeOvertimeSql, [id], (err) => {
                        if (err) {
                            console.error('⚠️ Error liberando horas extras:', err);
                        }
                        
                        console.log(`✅ Período ${id} rechazado. Registros liberados para corrección.`);
                        res.json({ message: 'success', data: { id, status: 'rejected' } });
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/reject:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// GET - Obtener detalles de un período
router.get('/payroll-periods/:id/details', authenticateToken, requireRole(['Admin', 'Manager', 'Finance']), (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener información del período
        const periodSql = `
            SELECT 
                pp.*,
                u1.username as closed_by_name,
                u2.username as approved_by_name
            FROM PayrollPeriods pp
            LEFT JOIN Users u1 ON pp.closed_by = u1.id
            LEFT JOIN Users u2 ON pp.approved_by = u2.id
            WHERE pp.id = ?
        `;
        
        db.get(periodSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error obteniendo período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            // Obtener resumen por empleado
            const summarySql = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    COUNT(DISTINCT a.date) as days_worked,
                    SUM(a.worked_hours) as hours_worked,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absences,
                    SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_arrivals,
                    COALESCE(SUM(ot.hours), 0) as overtime_hours,
                    COALESCE(SUM(ot.total_amount), 0) as overtime_amount
                FROM Users u
                LEFT JOIN Attendance a ON u.id = a.user_id AND a.payroll_period_id = ?
                LEFT JOIN Overtime ot ON u.id = ot.user_id AND ot.payroll_period_id = ? AND ot.status = 'approved'
                WHERE u.is_active = 1
                GROUP BY u.id, u.username
                HAVING days_worked > 0 OR overtime_hours > 0
            `;
            
            db.all(summarySql, [id, id], (err, summary) => {
                if (err) {
                    console.error('❌ Error obteniendo resumen:', err);
                    return res.json({ message: 'success', data: { period, summary: [] } });
                }
                
                res.json({ message: 'success', data: { period, summary } });
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/details:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// GET - Exportar período a CSV
router.get('/payroll-periods/:id/export', authenticateToken, requireRole(['Admin', 'Finance']), (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el período esté aprobado
        const checkSql = 'SELECT * FROM PayrollPeriods WHERE id = ?';
        
        db.get(checkSql, [id], (err, period) => {
            if (err) {
                console.error('❌ Error verificando período:', err);
                return res.status(500).json({ message: 'error', error: err.message });
            }
            
            if (!period) {
                return res.status(404).json({ message: 'error', error: 'Período no encontrado' });
            }
            
            if (period.status !== 'approved') {
                return res.status(403).json({ 
                    message: 'error', 
                    error: 'Solo se pueden exportar períodos aprobados' 
                });
            }
            
            // Obtener datos para exportación
            const exportSql = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    COUNT(DISTINCT a.date) as dias_trabajados,
                    COALESCE(SUM(a.worked_hours), 0) as horas_regulares,
                    COALESCE(SUM(ot.hours), 0) as horas_extras,
                    COALESCE(SUM(ot.total_amount), 0) as monto_horas_extras,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as ausencias,
                    SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as llegadas_tardes,
                    SUM(a.late_minutes) as minutos_tarde_total
                FROM Users u
                LEFT JOIN Attendance a ON u.id = a.user_id AND a.payroll_period_id = ?
                LEFT JOIN Overtime ot ON u.id = ot.user_id AND ot.payroll_period_id = ? AND ot.status = 'approved'
                WHERE u.is_active = 1
                GROUP BY u.id, u.username, u.email
                HAVING dias_trabajados > 0 OR horas_extras > 0
                ORDER BY u.username
            `;
            
            db.all(exportSql, [id, id], (err, data) => {
                if (err) {
                    console.error('❌ Error obteniendo datos de exportación:', err);
                    return res.status(500).json({ message: 'error', error: err.message });
                }
                
                // Generar CSV
                let csv = 'Usuario,Email,Días Trabajados,Horas Regulares,Horas Extras,Monto HH.EE,Ausencias,Tardanzas,Min. Tarde\n';
                
                data.forEach(row => {
                    csv += `"${row.username}","${row.email}",${row.dias_trabajados},${parseFloat(row.horas_regulares).toFixed(2)},`;
                    csv += `${parseFloat(row.horas_extras).toFixed(2)},${parseFloat(row.monto_horas_extras).toFixed(0)},`;
                    csv += `${row.ausencias},${row.llegadas_tardes},${row.minutos_tarde_total || 0}\n`;
                });
                
                // Enviar como descarga
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="nomina_${period.period_name.replace(/ /g, '_')}.csv"`);
                res.send('\uFEFF' + csv); // BOM para UTF-8
                
                console.log(`✅ Período ${id} exportado exitosamente`);
            });
        });
    } catch (error) {
        console.error('❌ Error en /api/payroll-periods/:id/export:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// ===================================================================

module.exports = router;
