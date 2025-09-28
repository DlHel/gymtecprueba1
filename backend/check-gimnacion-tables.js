const db = require('./src/db-adapter');

console.log('🔍 Verificando tablas de gimnación...\n');

// Verificar tabla GimnacionChecklistTemplates
db.all('SELECT COUNT(*) as count FROM GimnacionChecklistTemplates', [], (err, result) => {
    if (err) {
        console.log('❌ Error con GimnacionChecklistTemplates:', err.message);
        console.log('🔧 Posiblemente la tabla no existe. Verificando...');
        
        // Intentar crear las tablas
        console.log('📝 Ejecutando migración de gimnación...');
        
        const { execSync } = require('child_process');
        try {
            execSync('mysql -u root -p < database/gimnacion-tickets-migration.sql', { 
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('✅ Migración ejecutada exitosamente');
        } catch (migrateError) {
            console.log('❌ Error en migración automática:', migrateError.message);
            console.log('💡 Ejecuta manualmente: mysql -u root -p < database/gimnacion-tickets-migration.sql');
        }
    } else {
        console.log(`✅ GimnacionChecklistTemplates encontrada: ${result[0].count} templates`);
        
        // Si existen templates, mostrar algunos
        if (result[0].count > 0) {
            db.all('SELECT id, name, description FROM GimnacionChecklistTemplates LIMIT 3', [], (err, templates) => {
                if (!err) {
                    console.log('\n📋 Templates disponibles:');
                    templates.forEach(t => {
                        console.log(`  - ${t.id}: ${t.name} (${t.description})`);
                    });
                }
            });
        }
    }
    
    process.exit(0);
});