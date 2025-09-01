const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

console.log('🔍 Verificando tabla TicketPhotos...');

connection.query('DESCRIBE TicketPhotos', (err, results) => {
    if (err) {
        console.error('❌ La tabla TicketPhotos no existe:', err.message);
        console.log('🔧 Creando tabla TicketPhotos...');
        
        const createTableSQL = `
            CREATE TABLE TicketPhotos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                photo_data LONGTEXT NOT NULL,
                file_name VARCHAR(255) DEFAULT 'foto.jpg',
                mime_type VARCHAR(100) NOT NULL,
                file_size INT DEFAULT 0,
                description TEXT NULL,
                photo_type ENUM('Antes', 'Durante', 'Después', 'Evidencia', 'Otros') DEFAULT 'Otros',
                note_id INT NULL,
                author VARCHAR(100) DEFAULT 'Sistema',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (note_id) REFERENCES TicketNotes(id) ON DELETE SET NULL
            )
        `;
        
        connection.query(createTableSQL, (createErr) => {
            if (createErr) {
                console.error('❌ Error creando tabla TicketPhotos:', createErr.message);
            } else {
                console.log('✅ Tabla TicketPhotos creada exitosamente');
            }
            connection.end();
        });
    } else {
        console.log('✅ Tabla TicketPhotos existe:');
        console.table(results);
        connection.end();
    }
});
