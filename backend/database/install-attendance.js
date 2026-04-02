const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../config.env' });

console.log('🔧 INSTALANDO MÓDULO DE ASISTENCIA EN MYSQL...\n');

// Configuración de conexión
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

console.log(`📡 Conectando a MySQL en ${config.host}:${config.port}...`);
console.log(`📋 Base de datos: ${config.database}`);

// Crear conexión
const connection = mysql.createConnection(config);

connection.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        console.log('\n💡 SOLUCIONES:');
        console.log('   • Verifica que MySQL esté corriendo');
        console.log('   • Verifica la configuración en config.env');
        console.log('   • Ejecuta primero: npm run setup-mysql');
        process.exit(1);
    }
    
    console.log('✅ Conectado a MySQL exitosamente');
    
    // Leer archivo SQL de asistencia
    console.log('\n🏗️  Ejecutando esquema de asistencia...');
    const schemaPath = path.join(__dirname, 'attendance-system-mysql.sql');
    
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Archivo de esquema no encontrado:', schemaPath);
        console.error('   Ruta esperada:', schemaPath);
        connection.end();
        process.exit(1);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split por statement terminados en punto y coma
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    let completed = 0;
    let errors = 0;
    const total = statements.length;
    
    console.log(`📝 Ejecutando ${total} statements SQL...`);
    
    statements.forEach((statement, index) => {
        const trimmed = statement.trim();
        if (trimmed) {
            connection.query(trimmed, (err) => {
                if (err) {
                    // Ignorar errores de "ya existe"
                    if (err.message.includes('already exists') || 
                        err.message.includes('Duplicate') ||
                        err.message.includes('Cannot drop')) {
                        console.log(`⚠️  Statement ${index + 1}: Ya existía (ignorado)`);
                    } else {
                        console.error(`❌ Error en statement ${index + 1}:`, err.message);
                        errors++;
                    }
                }
                
                completed++;
                
                if (completed === total) {
                    console.log(`\n✅ Proceso completado: ${completed - errors}/${total} statements exitosos`);
                    
                    if (errors > 0) {
                        console.log(`⚠️  ${errors} errores encontrados (revisa los mensajes arriba)`);
                    }
                    
                    // Verificar tablas creadas
                    console.log('\n📊 Verificando tablas del módulo de asistencia...');
                    const tablesToCheck = [
                        'ShiftTypes',
                        'WorkSchedules',
                        'EmployeeSchedules',
                        'Attendance',
                        'Overtime',
                        'LeaveRequests',
                        'Holidays',
                        'AttendanceNotes',
                        'PayrollPeriods',
                        'PayrollDetails'
                    ];
                    
                    let checkedTables = 0;
                    let existingTables = 0;
                    
                    tablesToCheck.forEach(table => {
                        connection.query(`SHOW TABLES LIKE '${table}'`, (err, results) => {
                            checkedTables++;
                            if (!err && results.length > 0) {
                                console.log(`   ✅ ${table}`);
                                existingTables++;
                            } else {
                                console.log(`   ❌ ${table} (no encontrada)`);
                            }
                            
                            if (checkedTables === tablesToCheck.length) {
                                console.log(`\n📈 Tablas verificadas: ${existingTables}/${tablesToCheck.length}`);
                                
                                if (existingTables === tablesToCheck.length) {
                                    console.log('\n🎉 MÓDULO DE ASISTENCIA INSTALADO CORRECTAMENTE');
                                    console.log('\n✨ Características instaladas:');
                                    console.log('   • Tipos de turno (5 predefinidos)');
                                    console.log('   • Horarios de trabajo configurables');
                                    console.log('   • Asignación de horarios a empleados');
                                    console.log('   • Registro de entrada/salida con geolocalización');
                                    console.log('   • Cálculo automático de tardanzas');
                                    console.log('   • Horas extras con multiplicadores');
                                    console.log('   • Solicitudes de permisos/vacaciones');
                                    console.log('   • Días festivos (15 feriados chilenos)');
                                    console.log('   • Notas de asistencia');
                                    console.log('   • Integración con nómina');
                                    console.log('\n💡 Accede al módulo en: http://localhost:8080/asistencia.html');
                                    console.log('💡 Usuario demo: define GYMTEC_ADMIN_PASSWORD antes de ejecutar el seed');
                                } else {
                                    console.log('\n⚠️  INSTALACIÓN INCOMPLETA - Algunas tablas no se crearon');
                                }
                                
                                connection.end();
                                process.exit(existingTables === tablesToCheck.length ? 0 : 1);
                            }
                        });
                    });
                }
            });
        } else {
            completed++;
        }
    });
});
