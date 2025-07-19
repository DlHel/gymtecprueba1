const fs = require('fs');
const path = require('path');
const mysql = require('./src/mysql-database.js');

async function applySchema() {
    try {
        console.log('🔧 Aplicando schema MySQL completo...');
        
        // Leer el archivo schema
        const schemaPath = path.join(__dirname, 'database', 'mysql-schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Dividir por declaraciones (separadas por punto y coma)
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'COMMIT');
        
        console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Omitir comentarios y declaraciones vacías
            if (statement.startsWith('/*') || statement.length < 10) {
                continue;
            }
            
            try {
                await mysql.query(statement);
                console.log(`✅ [${i + 1}/${statements.length}] Ejecutado correctamente`);
            } catch (error) {
                // Algunos errores son esperados (como "table already exists")
                if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== 'ER_DUP_KEYNAME') {
                    console.warn(`⚠️ [${i + 1}/${statements.length}] Warning:`, error.message);
                } else {
                    console.log(`✅ [${i + 1}/${statements.length}] Ya existe (OK)`);
                }
            }
        }
        
        // Verificar que la tabla ChecklistTemplates existe
        const checkTable = await mysql.query("SHOW TABLES LIKE 'ChecklistTemplates'");
        if (checkTable.length > 0) {
            console.log('✅ Tabla ChecklistTemplates verificada');
        } else {
            console.error('❌ Tabla ChecklistTemplates no encontrada después de aplicar schema');
        }
        
        console.log('🎉 Schema aplicado exitosamente');
        
    } catch (error) {
        console.error('❌ Error aplicando schema:', error);
    }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
    applySchema().then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Error fatal:', err);
        process.exit(1);
    });
}

module.exports = { applySchema }; 