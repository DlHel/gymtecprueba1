const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp',
    port: process.env.DB_PORT || 3306
};

async function migrateTicketSystem() {
    let connection;
    
    try {
        console.log('🔄 Conectando a MySQL...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida');

        // Crear las nuevas tablas del sistema de tickets
        const tables = [
            {
                name: 'TicketTimeEntries',
                sql: `CREATE TABLE IF NOT EXISTS TicketTimeEntries (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    ticket_id INT(11) NOT NULL,
                    technician_id INT(11),
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration_seconds INT(11) DEFAULT 0,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (technician_id) REFERENCES Users(id) ON DELETE SET NULL ON UPDATE CASCADE,
                    INDEX idx_time_entries_ticket (ticket_id),
                    INDEX idx_time_entries_technician (technician_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'TicketNotes',
                sql: `CREATE TABLE IF NOT EXISTS TicketNotes (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    ticket_id INT(11) NOT NULL,
                    note TEXT NOT NULL,
                    note_type ENUM('Comentario', 'Diagnóstico', 'Solución', 'Seguimiento') DEFAULT 'Comentario',
                    author VARCHAR(150) DEFAULT 'Sistema',
                    is_internal BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    INDEX idx_ticket_notes_ticket (ticket_id),
                    INDEX idx_ticket_notes_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'TicketHistory',
                sql: `CREATE TABLE IF NOT EXISTS TicketHistory (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    ticket_id INT(11) NOT NULL,
                    field_changed VARCHAR(100) NOT NULL,
                    old_value TEXT,
                    new_value TEXT,
                    changed_by VARCHAR(150) DEFAULT 'Sistema',
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    INDEX idx_ticket_history_ticket (ticket_id),
                    INDEX idx_ticket_history_changed (changed_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'TicketChecklists',
                sql: `CREATE TABLE IF NOT EXISTS TicketChecklists (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    ticket_id INT(11) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    is_completed BOOLEAN DEFAULT FALSE,
                    completed_at TIMESTAMP NULL,
                    completed_by VARCHAR(150),
                    order_index INT(11) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    INDEX idx_ticket_checklists_ticket (ticket_id),
                    INDEX idx_ticket_checklists_order (order_index)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'TicketSpareParts',
                sql: `CREATE TABLE IF NOT EXISTS TicketSpareParts (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    ticket_id INT(11) NOT NULL,
                    spare_part_id INT(11) NOT NULL,
                    quantity_used INT(11) NOT NULL DEFAULT 1,
                    unit_cost DECIMAL(10,2),
                    notes TEXT,
                    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (spare_part_id) REFERENCES SpareParts(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    INDEX idx_ticket_spare_parts_ticket (ticket_id),
                    INDEX idx_ticket_spare_parts_part (spare_part_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'TicketPhotos',
                sql: `CREATE TABLE IF NOT EXISTS TicketPhotos (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    ticket_id INT(11) NOT NULL,
                    photo_data LONGTEXT NOT NULL,
                    file_name VARCHAR(255),
                    mime_type VARCHAR(100),
                    file_size INT(11),
                    description TEXT,
                    photo_type ENUM('Problema', 'Proceso', 'Solución', 'Otros') DEFAULT 'Otros',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
                    INDEX idx_ticket_photos_ticket (ticket_id),
                    INDEX idx_ticket_photos_type (photo_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            }
        ];

        console.log('\n🔧 Creando tablas del sistema de tickets...');
        
        for (const table of tables) {
            try {
                await connection.execute(table.sql);
                console.log(`✅ Tabla ${table.name} creada/verificada`);
            } catch (error) {
                console.error(`❌ Error creando tabla ${table.name}:`, error.message);
            }
        }

        // Verificar que las tablas se crearon correctamente
        console.log('\n🔍 Verificando tablas creadas...');
        const [tables_result] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'Ticket%'
        `, [dbConfig.database]);
        
        console.log('📋 Tablas de tickets encontradas:');
        tables_result.forEach(row => {
            console.log(`   - ${row.TABLE_NAME}`);
        });

        console.log('\n✅ Migración del sistema de tickets completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar migración
if (require.main === module) {
    migrateTicketSystem();
}

module.exports = { migrateTicketSystem }; 