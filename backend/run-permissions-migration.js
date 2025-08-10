const fs = require('fs');
const path = require('path');
const db = require('./src/db-adapter');

async function runMigration() {
    console.log('🚀 Iniciando migración del sistema de permisos...');
    
    try {
        // Leer el archivo SQL
        const sqlFile = path.join(__dirname, 'migrate-permissions-system.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Dividir por declaraciones completas (incluyendo CREATE TABLE multi-línea)
        const statements = [];
        let currentStatement = '';
        let inStatement = false;
        
        const lines = sql.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Ignorar comentarios y líneas vacías
            if (trimmed.startsWith('--') || trimmed === '') {
                continue;
            }
            
            currentStatement += line + '\n';
            
            // Si encontramos punto y coma al final de una línea, terminamos la declaración
            if (trimmed.endsWith(';')) {
                statements.push(currentStatement.trim().slice(0, -1)); // Remover el último ;
                currentStatement = '';
            }
        }
        
        console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`);
        
        // Ejecutar cada declaración
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await new Promise((resolve, reject) => {
                        db.run(statement, [], function(err) {
                            if (err) {
                                console.log(`❌ Error en declaración ${i + 1}:`, err.message);
                                console.log(`SQL: ${statement.substring(0, 100)}...`);
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    
                    if (i % 10 === 0) {
                        console.log(`✅ Procesadas ${i + 1}/${statements.length} declaraciones`);
                    }
                } catch (error) {
                    console.error(`❌ Error ejecutando declaración ${i + 1}:`, error.message);
                    // Continuar con la siguiente declaración
                }
            }
        }
        
        console.log('✅ Migración completada. Verificando resultados...');
        
        // Verificar que las tablas se crearon
        const tables = ['SystemModules', 'ModulePermissions', 'UserModulePermissions'];
        for (const table of tables) {
            await new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
                    if (err) {
                        console.log(`❌ Error verificando tabla ${table}:`, err.message);
                        reject(err);
                    } else {
                        console.log(`📊 Tabla ${table}: ${row.count} registros`);
                        resolve();
                    }
                });
            });
        }
        
        console.log('🎉 Sistema de permisos migrado exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

// Ejecutar la migración
runMigration();
