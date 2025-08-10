const mysql = require('mysql2');

// Configuración de conexión MySQL
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
};

const connection = mysql.createConnection(dbConfig);

// Crear solicitud de prueba
const insertSQL = `INSERT INTO SparePartRequests 
(ticket_id, spare_part_name, quantity_needed, priority, description, justification, requested_by, status) 
VALUES (1, 'Banda de correr', 2, 'Alta', 'Banda desgastada en cinta de correr', 'Equipo fuera de servicio por banda dañada', 'Técnico Juan', 'pendiente')`;

connection.query(insertSQL, (err, result) => {
    if (err) {
        console.error('❌ Error:', err.message);
    } else {
        console.log('✅ Solicitud de prueba creada con ID:', result.insertId);
    }
    connection.end();
});
