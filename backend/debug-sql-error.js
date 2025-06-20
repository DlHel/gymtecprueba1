const db = require('./src/db-adapter');

console.log('🔍 DIAGNOSTICANDO ERROR SQL EN UBICACIONES');
console.log('===========================================\n');

async function debugSQLError() {
    try {
        // 1. Verificar estructura de la tabla Locations
        console.log('📋 1. Verificando estructura de tabla Locations...');
        
        const tableStructure = await new Promise((resolve, reject) => {
            db.all("DESCRIBE Locations", (err, rows) => {
                if (err) {
                    // Si DESCRIBE no funciona, intentar con PRAGMA (SQLite) o SHOW COLUMNS (MySQL)
                    db.all("PRAGMA table_info(Locations)", (err2, rows2) => {
                        if (err2) {
                            db.all("SHOW COLUMNS FROM Locations", (err3, rows3) => {
                                if (err3) {
                                    reject(err3);
                                } else {
                                    resolve(rows3);
                                }
                            });
                        } else {
                            resolve(rows2);
                        }
                    });
                } else {
                    resolve(rows);
                }
            });
        });
        
        console.log('✅ Estructura de Locations:');
        console.table(tableStructure);

        // 2. Verificar estructura de la tabla Equipment
        console.log('\n📋 2. Verificando estructura de tabla Equipment...');
        
        const equipmentStructure = await new Promise((resolve, reject) => {
            db.all("DESCRIBE Equipment", (err, rows) => {
                if (err) {
                    db.all("PRAGMA table_info(Equipment)", (err2, rows2) => {
                        if (err2) {
                            db.all("SHOW COLUMNS FROM Equipment", (err3, rows3) => {
                                if (err3) {
                                    reject(err3);
                                } else {
                                    resolve(rows3);
                                }
                            });
                        } else {
                            resolve(rows2);
                        }
                    });
                } else {
                    resolve(rows);
                }
            });
        });
        
        console.log('✅ Estructura de Equipment:');
        console.table(equipmentStructure);

        // 3. Probar consulta simple sin subconsulta
        console.log('\n📋 3. Probando consulta simple de Locations...');
        
        const simpleLocations = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM Locations LIMIT 3", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('✅ Primeras 3 ubicaciones:');
        console.table(simpleLocations);

        // 4. Probar consulta con alias
        console.log('\n📋 4. Probando consulta con alias l...');
        
        const aliasTest = await new Promise((resolve, reject) => {
            db.all("SELECT l.id, l.name, l.client_id FROM Locations l LIMIT 3", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('✅ Consulta con alias funciona:');
        console.table(aliasTest);

        // 5. Probar la subconsulta problemática paso a paso
        console.log('\n📋 5. Probando subconsulta problemática...');
        
        // Primero probar la subconsulta interna
        const innerQuery = await new Promise((resolve, reject) => {
            db.all(`
                SELECT type, COUNT(*) as type_count 
                FROM Equipment 
                WHERE location_id = 49
                GROUP BY type
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('✅ Subconsulta interna (location_id = 49):');
        console.table(innerQuery);

        // 6. Probar la consulta completa con un ID específico
        console.log('\n📋 6. Probando consulta completa con ID específico...');
        
        const fullQuery = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    l.*,
                    (SELECT GROUP_CONCAT(CONCAT(e.type, ' (', e.type_count, ')') SEPARATOR '; ') 
                     FROM (
                        SELECT type, COUNT(*) as type_count 
                        FROM Equipment 
                        WHERE location_id = l.id 
                        GROUP BY type
                     ) e
                    ) as equipment_summary
                FROM Locations l
                WHERE l.client_id = ?
                ORDER BY l.name
            `, [8], (err, rows) => {
                if (err) {
                    console.log('❌ Error en consulta completa:', err.message);
                    // Intentar versión simplificada
                    db.all(`
                        SELECT l.* FROM Locations l WHERE l.client_id = ?
                    `, [8], (err2, rows2) => {
                        if (err2) {
                            reject(err2);
                        } else {
                            console.log('✅ Consulta simplificada funciona:');
                            console.table(rows2);
                            resolve(rows2);
                        }
                    });
                } else {
                    resolve(rows);
                }
            });
        });

        if (fullQuery && fullQuery.length > 0) {
            console.log('✅ Consulta completa funciona:');
            console.table(fullQuery);
        }

    } catch (error) {
        console.error('❌ Error durante diagnóstico:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        console.log('\n' + '='.repeat(50));
        console.log('✅ Diagnóstico completado');
    }
}

// Ejecutar diagnóstico
debugSQLError(); 