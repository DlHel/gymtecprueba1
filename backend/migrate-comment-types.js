// Migración para actualizar tipos de comentarios en TicketNotes
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function migrateCommentTypes() {
    let connection;
    
    try {
        // Crear conexión a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gymtec_erp',
            charset: 'utf8mb4'
        });

        console.log('🔄 Iniciando migración de tipos de comentarios...');

        // Verificar la estructura actual de la tabla
        const [tableInfo] = await connection.execute(`
            SHOW COLUMNS FROM TicketNotes WHERE Field = 'note_type'
        `);
        
        if (tableInfo.length > 0) {
            console.log('📋 Estructura actual del campo note_type:');
            console.log(tableInfo[0]);
        }

        // Actualizar el ENUM para incluir los nuevos tipos
        await connection.execute(`
            ALTER TABLE TicketNotes 
            MODIFY COLUMN note_type ENUM(
                'General', 
                'Comentario', 
                'Diagnóstico', 
                'Solución', 
                'Seguimiento', 
                'Comunicación Cliente'
            ) DEFAULT 'General'
        `);

        console.log('✅ Tipos de comentarios actualizados exitosamente');

        // Actualizar registros existentes que tengan 'Comentario' como tipo por defecto
        const [updateResult] = await connection.execute(`
            UPDATE TicketNotes 
            SET note_type = 'General' 
            WHERE note_type = 'Comentario' 
            AND created_at < NOW()
        `);

        console.log(`📝 Actualizados ${updateResult.affectedRows} registros existentes a tipo 'General'`);

        // Verificar la nueva estructura
        const [newTableInfo] = await connection.execute(`
            SHOW COLUMNS FROM TicketNotes WHERE Field = 'note_type'
        `);
        
        console.log('📋 Nueva estructura del campo note_type:');
        console.log(newTableInfo[0]);

        // Mostrar estadísticas de tipos de comentarios
        const [stats] = await connection.execute(`
            SELECT note_type, COUNT(*) as count 
            FROM TicketNotes 
            GROUP BY note_type 
            ORDER BY count DESC
        `);

        console.log('📊 Estadísticas de tipos de comentarios:');
        stats.forEach(stat => {
            console.log(`  ${stat.note_type}: ${stat.count} comentarios`);
        });

        console.log('🎉 Migración completada exitosamente');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la migración si se llama directamente
if (require.main === module) {
    migrateCommentTypes().catch(error => {
        console.error('💥 Fallo en la migración:', error);
        process.exit(1);
    });
}

module.exports = { migrateCommentTypes };
