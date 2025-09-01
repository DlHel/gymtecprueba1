const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

console.log('🔍 Verificando tabla TicketNotes...');

connection.query('DESCRIBE TicketNotes', (err, results) => {
    if (err) {
        console.error('❌ La tabla TicketNotes no existe:', err.message);
        console.log('🔧 Creando tabla TicketNotes...');
        
        const createTableSQL = `
            CREATE TABLE TicketNotes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                note TEXT NOT NULL,
                note_type VARCHAR(50) DEFAULT 'General',
                author VARCHAR(100) DEFAULT 'Sistema',
                is_internal BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE
            )
        `;
        
        connection.query(createTableSQL, (createErr) => {
            if (createErr) {
                console.error('❌ Error creando tabla TicketNotes:', createErr.message);
            } else {
                console.log('✅ Tabla TicketNotes creada exitosamente');
            }
            connection.end();
        });
    } else {
        console.log('✅ Tabla TicketNotes existe:');
        console.table(results);
        connection.end();
    }
});
