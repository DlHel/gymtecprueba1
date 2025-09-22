/**
 * GYMTEC ERP - Migración para Generador Automático de Tareas
 * Agrega columna contract_id a MaintenanceTasks para correlación con contratos
 */

const db = require('./src/db-adapter');

console.log('🔄 MIGRACIÓN: Agregando soporte contractual a MaintenanceTasks...\n');

async function migrateTaskGenerator() {
    try {
        console.log('1️⃣ Verificando estructura actual...');
        
        // Verificar si la columna contract_id ya existe
        const tableInfo = await new Promise((resolve, reject) => {
            db.all('DESCRIBE MaintenanceTasks', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const hasContractId = tableInfo.some(column => column.Field === 'contract_id');
        
        if (hasContractId) {
            console.log('   ✅ Columna contract_id ya existe');
        } else {
            console.log('   📝 Agregando columna contract_id...');
            
            await new Promise((resolve, reject) => {
                db.run(`
                    ALTER TABLE MaintenanceTasks 
                    ADD COLUMN contract_id INT NULL COMMENT 'ID del contrato asociado',
                    ADD INDEX idx_contract_id (contract_id),
                    ADD FOREIGN KEY (contract_id) REFERENCES Contracts(id) ON DELETE SET NULL
                `, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log('   ✅ Columna contract_id agregada');
        }

        console.log('\n2️⃣ Verificando columna is_contractual...');
        
        const hasIsContractual = tableInfo.some(column => column.Field === 'is_contractual');
        
        if (hasIsContractual) {
            console.log('   ✅ Columna is_contractual ya existe');
        } else {
            console.log('   📝 Agregando columna is_contractual...');
            
            await new Promise((resolve, reject) => {
                db.run(`
                    ALTER TABLE MaintenanceTasks 
                    ADD COLUMN is_contractual BOOLEAN DEFAULT FALSE COMMENT 'Tarea generada por contrato'
                `, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log('   ✅ Columna is_contractual agregada');
        }

        console.log('\n3️⃣ Creando índices adicionales...');
        
        try {
            await new Promise((resolve, reject) => {
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_maintenance_contractual 
                    ON MaintenanceTasks(is_contractual, status, scheduled_date)
                `, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log('   ✅ Índices de rendimiento creados');
        } catch (indexError) {
            console.log('   ⚠️ Índices ya existían o error menor:', indexError.message);
        }

        console.log('\n4️⃣ Verificando estructura final...');
        
        const finalTableInfo = await new Promise((resolve, reject) => {
            db.all('DESCRIBE MaintenanceTasks', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const relevantColumns = finalTableInfo.filter(col => 
            ['contract_id', 'is_contractual', 'is_preventive'].includes(col.Field)
        );

        console.log('   📋 Columnas relacionadas con contratos:');
        relevantColumns.forEach(col => {
            console.log(`      - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'Nullable' : 'Not Null'})`);
        });

        console.log('\n5️⃣ Creando datos de prueba...');
        
        // Verificar si hay tareas existentes sin contract_id
        const tasksWithoutContract = await new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(*) as count 
                FROM MaintenanceTasks 
                WHERE contract_id IS NULL
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0].count);
            });
        });

        if (tasksWithoutContract > 0) {
            console.log(`   📝 Asignando contratos a ${tasksWithoutContract} tareas existentes...`);
            
            // Asignar contratos aleatoriamente a tareas existentes para demo
            await new Promise((resolve, reject) => {
                db.run(`
                    UPDATE MaintenanceTasks mt
                    JOIN Equipment e ON mt.equipment_id = e.id
                    JOIN Locations l ON e.location_id = l.id
                    JOIN Contracts c ON l.client_id = c.client_id
                    SET mt.contract_id = c.id,
                        mt.is_contractual = FALSE
                    WHERE mt.contract_id IS NULL
                    AND c.status = 'activo'
                `, [], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log('   ✅ Contratos asignados a tareas existentes');
        }

        console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('🎯 MaintenanceTasks está listo para generación automática de tareas');
        console.log('🔗 Las tareas ahora pueden estar vinculadas a contratos específicos');
        console.log('⚡ El sistema puede distinguir entre tareas manuales y contractuales');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Ejecutar migración
migrateTaskGenerator();