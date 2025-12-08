/**
 * Script de Generación de Datos de Prueba - Módulo de Asistencia
 * Genera 3 meses de datos realistas con múltiples escenarios
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../config.env' });

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    timezone: '+00:00'
};

// Configuración de escenarios de prueba
const SCENARIOS = {
    // Usuarios con diferentes patrones de asistencia
    USERS: [
        { id: null, name: 'Juan Pérez', pattern: 'perfect', shift: 'morning' },
        { id: null, name: 'María González', pattern: 'occasional_late', shift: 'morning' },
        { id: null, name: 'Pedro Ramírez', pattern: 'frequent_late', shift: 'afternoon' },
        { id: null, name: 'Ana López', pattern: 'absences', shift: 'morning' },
        { id: null, name: 'Carlos Díaz', pattern: 'overtime', shift: 'flexible' }
    ],
    
    // Turnos de trabajo
    SHIFTS: {
        morning: { start: '09:00', end: '18:00', tolerance: 15 },
        afternoon: { start: '14:00', end: '22:00', tolerance: 15 },
        night: { start: '22:00', end: '06:00', tolerance: 15 },
        flexible: { start: '08:00', end: '17:00', tolerance: 30 }
    },
    
    // Patrones de asistencia
    PATTERNS: {
        perfect: { late_rate: 0, absence_rate: 0, overtime_rate: 0 },
        occasional_late: { late_rate: 0.15, absence_rate: 0.02, overtime_rate: 0.1 },
        frequent_late: { late_rate: 0.35, absence_rate: 0.05, overtime_rate: 0 },
        absences: { late_rate: 0.1, absence_rate: 0.15, overtime_rate: 0 },
        overtime: { late_rate: 0.05, absence_rate: 0.01, overtime_rate: 0.4 }
    }
};

/**
 * Genera fecha aleatoria dentro de un rango
 */
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Agrega minutos a una hora en formato HH:MM
 */
function addMinutes(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMins = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMins / 60) % 24;
    const newMins = totalMins % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * Calcula horas trabajadas
 */
function calculateWorkedHours(checkIn, checkOut) {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    let totalMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMins < 0) totalMins += 24 * 60; // Turno nocturno
    return (totalMins / 60).toFixed(2);
}

/**
 * Genera registros de asistencia para un usuario
 */
async function generateAttendanceForUser(connection, user, startDate, endDate) {
    const pattern = SCENARIOS.PATTERNS[user.pattern];
    const shift = SCENARIOS.SHIFTS[user.shift];
    const records = [];
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        // Saltar fines de semana (opcional, según negocio)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Lunes a Viernes
            
            // Decidir si hay ausencia
            const isAbsent = Math.random() < pattern.absence_rate;
            
            if (!isAbsent) {
                // Decidir si hay tardanza
                const isLate = Math.random() < pattern.late_rate;
                const lateMinutes = isLate ? Math.floor(Math.random() * 45) + 5 : 0;
                
                // Calcular horarios
                const checkInTime = addMinutes(shift.start, lateMinutes - Math.floor(Math.random() * 10));
                const normalWorkHours = 8;
                const checkOutTime = addMinutes(checkInTime, normalWorkHours * 60 + Math.floor(Math.random() * 30) - 15);
                
                const workedHours = calculateWorkedHours(checkInTime, checkOutTime);
                
                const record = {
                    user_id: user.id,
                    date: currentDate.toISOString().split('T')[0],
                    check_in_time: `${currentDate.toISOString().split('T')[0]} ${checkInTime}:00`,
                    check_out_time: `${currentDate.toISOString().split('T')[0]} ${checkOutTime}:00`,
                    worked_hours: parseFloat(workedHours),
                    scheduled_hours: normalWorkHours,
                    is_late: isLate ? 1 : 0,
                    late_minutes: lateMinutes,
                    status: isLate ? 'late' : 'present',
                    check_in_location: 'Reloj Control - Entrada Principal',
                    check_out_location: 'Reloj Control - Entrada Principal',
                    check_in_ip: '192.168.1.100'
                };
                
                records.push(record);
                
                // Generar horas extras si aplica
                const hasOvertime = Math.random() < pattern.overtime_rate;
                if (hasOvertime) {
                    const overtimeHours = (Math.random() * 3 + 1).toFixed(1);
                    const overtimeRecord = {
                        user_id: user.id,
                        date: currentDate.toISOString().split('T')[0],
                        start_time: checkOutTime,
                        end_time: addMinutes(checkOutTime, parseInt(overtimeHours * 60, 10)),
                        hours: parseFloat(overtimeHours),
                        type: dayOfWeek === 6 ? 'sunday' : 'regular',
                        multiplier: dayOfWeek === 6 ? 1.8 : 1.5,
                        hourly_rate: 5000,
                        total_amount: parseFloat(overtimeHours) * 5000 * (dayOfWeek === 6 ? 1.8 : 1.5),
                        description: 'Trabajo adicional por proyecto urgente',
                        status: Math.random() > 0.3 ? 'approved' : 'pending',
                        requested_by: user.id
                    };
                    
                    await connection.query(
                        'INSERT INTO Overtime SET ?',
                        overtimeRecord
                    );
                }
            } else {
                // Registro de ausencia
                const record = {
                    user_id: user.id,
                    date: currentDate.toISOString().split('T')[0],
                    status: 'absent',
                    worked_hours: 0,
                    scheduled_hours: 8
                };
                records.push(record);
            }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Insertar registros en batch
    if (records.length > 0) {
        await connection.query(
            'INSERT INTO Attendance (user_id, date, check_in_time, check_out_time, worked_hours, scheduled_hours, is_late, late_minutes, status, check_in_location, check_out_location, check_in_ip) VALUES ?',
            [records.map(r => [
                r.user_id, r.date, r.check_in_time || null, r.check_out_time || null,
                r.worked_hours, r.scheduled_hours, r.is_late || 0, r.late_minutes || 0,
                r.status, r.check_in_location || null, r.check_out_location || null, r.check_in_ip || null
            ])]
        );
    }
    
    return records.length;
}

/**
 * Script principal
 */
async function main() {
    let connection;
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado exitosamente\n');
        
        // Obtener IDs de usuarios existentes
        console.log('👥 Obteniendo usuarios...');
        const [users] = await connection.query('SELECT id, username FROM Users LIMIT 5');
        
        if (users.length === 0) {
            throw new Error('No hay usuarios en la base de datos');
        }
        
        // Asignar IDs a los escenarios
        SCENARIOS.USERS.forEach((scenario, index) => {
            if (users[index]) {
                scenario.id = users[index].id;
                scenario.name = users[index].username;
            }
        });
        
        // Filtrar solo usuarios con ID
        const validUsers = SCENARIOS.USERS.filter(u => u.id !== null);
        console.log(`✅ Encontrados ${validUsers.length} usuarios para generar datos\n`);
        
        // Definir rango de fechas (últimos 3 meses)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        
        console.log(`📅 Generando datos desde ${startDate.toISOString().split('T')[0]} hasta ${endDate.toISOString().split('T')[0]}\n`);
        
        // Limpiar datos anteriores de prueba
        console.log('🧹 Limpiando datos anteriores...');
        await connection.query('DELETE FROM Attendance WHERE user_id IN (?)', [validUsers.map(u => u.id)]);
        await connection.query('DELETE FROM Overtime WHERE user_id IN (?)', [validUsers.map(u => u.id)]);
        console.log('✅ Datos anteriores eliminados\n');
        
        // Generar datos para cada usuario
        let totalRecords = 0;
        for (const user of validUsers) {
            console.log(`👤 Generando datos para ${user.name} (Patrón: ${user.pattern}, Turno: ${user.shift})...`);
            const records = await generateAttendanceForUser(connection, user, startDate, endDate);
            totalRecords += records;
            console.log(`   ✅ ${records} registros generados\n`);
        }
        
        // Resumen final
        console.log('═'.repeat(60));
        console.log('📊 RESUMEN DE DATOS GENERADOS');
        console.log('═'.repeat(60));
        console.log(`Total de usuarios: ${validUsers.length}`);
        console.log(`Total de registros de asistencia: ${totalRecords}`);
        console.log(`Período: ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}`);
        
        const [attendanceSummary] = await connection.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(worked_hours) as total_hours
            FROM Attendance 
            WHERE user_id IN (?)
        `, [validUsers.map(u => u.id)]);
        
        const [overtimeSummary] = await connection.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(hours) as total_hours
            FROM Overtime 
            WHERE user_id IN (?)
        `, [validUsers.map(u => u.id)]);
        
        console.log('\n📈 ESTADÍSTICAS:');
        console.log(`   Presentes: ${attendanceSummary[0].present}`);
        console.log(`   Tardanzas: ${attendanceSummary[0].late}`);
        console.log(`   Ausencias: ${attendanceSummary[0].absent}`);
        console.log(`   Horas trabajadas: ${parseFloat(attendanceSummary[0].total_hours).toFixed(1)}h`);
        console.log(`\n⏰ HORAS EXTRAS:`);
        console.log(`   Total: ${overtimeSummary[0].total}`);
        console.log(`   Aprobadas: ${overtimeSummary[0].approved}`);
        console.log(`   Pendientes: ${overtimeSummary[0].pending}`);
        console.log(`   Horas extras: ${parseFloat(overtimeSummary[0].total_hours ||0).toFixed(1)}h`);
        console.log('═'.repeat(60));
        console.log('\n✅ Datos de prueba generados exitosamente!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar
main();
