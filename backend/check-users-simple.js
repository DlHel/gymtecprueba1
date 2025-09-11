const db = require('./src/db-adapter');

async function checkUsers() {
    try {
        console.log('🔍 Verificando usuarios en la base de datos...');
        
        const sql = `
            SELECT 
                id,
                username,
                email,
                role,
                status,
                created_at
            FROM Users 
            ORDER BY created_at DESC
            LIMIT 10
        `;
        
        const users = await new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`✅ Encontrados ${users.length} usuarios:`);
        console.table(users);
        
        // Verificar técnicos específicamente
        const techniciansSql = `
            SELECT 
                id,
                username,
                email,
                role
            FROM Users 
            WHERE role = 'Tecnico' 
            AND status = 'Activo'
            ORDER BY username
        `;
        
        const technicians = await new Promise((resolve, reject) => {
            db.all(techniciansSql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`🔧 Técnicos activos: ${technicians.length}`);
        if (technicians.length > 0) {
            console.table(technicians);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error verificando usuarios:', error);
        process.exit(1);
    }
}

checkUsers();
