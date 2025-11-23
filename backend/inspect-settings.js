const dbAdapter = require('./src/db-adapter');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const inspectSettings = async () => {
    console.log('🔍 Inspeccionando SystemSettings...');
    
    const sql = 'SELECT * FROM SystemSettings';
    
    dbAdapter.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log(`✅ Encontradas ${rows.length} filas:`);
            console.log(JSON.stringify(rows, null, 2));
        }
    });
};

inspectSettings();
