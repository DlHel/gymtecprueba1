const dbAdapter = require('./src/db-adapter');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const truncateSettings = async () => {
    console.log('🗑️ Truncando SystemSettings...');
    
    const sql = 'TRUNCATE TABLE SystemSettings';
    
    dbAdapter.run(sql, [], (err) => {
        if (err) {
            console.error('❌ Error truncando tabla:', err);
            // Try DELETE if TRUNCATE fails (e.g. foreign keys, though unlikely here)
            dbAdapter.run('DELETE FROM SystemSettings', [], (err2) => {
                if (err2) console.error('❌ Error borrando datos:', err2);
                else console.log('✅ Datos borrados (DELETE)');
            });
        } else {
            console.log('✅ Tabla truncada exitosamente');
        }
    });
};

truncateSettings();
