const fs = require('fs');
const path = require('path');
const db = require('./src/db-adapter');

console.log('🚀 Iniciando migración de funcionalidades avanzadas...');

// Función para ejecutar SQL desde archivo
function executeSQLFile(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const sql = fs.readFileSync(filePath, 'utf8');
            
            // Dividir en sentencias individuales para MySQL
            const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
            
            let completed = 0;
            let errors = [];
            
            statements.forEach((statement, index) => {
                const trimmedStatement = statement.trim();
                if (trimmedStatement.length === 0) {
                    completed++;
                    return;
                }
                
                db.run(trimmedStatement, (err) => {
                    if (err) {
                        // Ignorar errores de duplicados (tabla ya existe)
                        if (!err.message.includes('already exists') && 
                            !err.message.includes('Duplicate entry') &&
                            !err.message.includes('Duplicate column')) {
                            errors.push({ statement: trimmedStatement, error: err.message });
                        }
                    }
                    
                    completed++;
                    if (completed === statements.length) {
                        if (errors.length > 0) {
                            console.warn('⚠️ Algunos errores durante la migración:', errors);
                        }
                        resolve();
                    }
                });
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

// Función para poblar datos iniciales
async function seedInitialData() {
    console.log('📊 Poblando datos iniciales...');
    
    // Verificar y crear usuarios de prueba
    const users = [
        { username: 'admin', email: 'admin@gymtec.cl', password: 'admin123', role: 'Admin', status: 'Activo' },
        { username: 'tecnico1', email: 'tecnico1@gymtec.cl', password: 'tecnico123', role: 'Tecnico', status: 'Activo' },
        { username: 'tecnico2', email: 'tecnico2@gymtec.cl', password: 'tecnico123', role: 'Tecnico', status: 'Activo' },
        { username: 'supervisor', email: 'supervisor@gymtec.cl', password: 'supervisor123', role: 'Supervisor', status: 'Activo' }
    ];
    
    for (const user of users) {
        try {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT OR IGNORE INTO Users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
                    [user.username, user.email, user.password, user.role, user.status],
                    function(err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log(`✅ Usuario ${user.username} creado/verificado`);
        } catch (error) {
            console.log(`⚠️ Usuario ${user.username} ya existe o error:`, error.message);
        }
    }
    
    // Verificar configuraciones del sistema
    const configs = [
        { category: 'general', key: 'company_name', value: 'Gymtec', description: 'Nombre de la empresa' },
        { category: 'general', key: 'company_email', value: 'info@gymtec.cl', description: 'Email principal' },
        { category: 'tickets', key: 'default_priority', value: 'Media', description: 'Prioridad por defecto' },
        { category: 'tickets', key: 'sla_response_hours', value: '24', description: 'SLA de respuesta en horas' },
        { category: 'inventory', key: 'low_stock_threshold', value: '10', description: 'Umbral de stock bajo' }
    ];
    
    for (const config of configs) {
        try {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT OR IGNORE INTO SystemConfig (category, `key`, value, description) VALUES (?, ?, ?, ?)',
                    [config.category, config.key, config.value, config.description],
                    function(err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log(`✅ Configuración ${config.category}.${config.key} creada/verificada`);
        } catch (error) {
            console.log(`⚠️ Error con configuración ${config.category}.${config.key}:`, error.message);
        }
    }
    
    console.log('📊 Datos iniciales poblados');
}

// Función principal de migración
async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración del esquema...');
        
        const schemaPath = path.join(__dirname, 'database', 'mysql-schema.sql');
        await executeSQLFile(schemaPath);
        
        console.log('✅ Esquema migrado exitosamente');
        
        // Poblar datos iniciales
        await seedInitialData();
        
        console.log('🎉 Migración completada exitosamente');
        console.log('');
        console.log('📋 Nuevas funcionalidades disponibles:');
        console.log('  - Dashboard con KPIs en tiempo real');
        console.log('  - Gestión de usuarios y roles');
        console.log('  - Configuración del sistema');
        console.log('  - Módulo de cotizaciones');
        console.log('  - Módulo de facturación');
        console.log('  - Control de horario y asistencia');
        console.log('  - Plantillas de checklist');
        console.log('  - Reportes guardados');
        console.log('');
        console.log('🚀 El sistema ERP está listo para usar');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

// Ejecutar migración
runMigration();