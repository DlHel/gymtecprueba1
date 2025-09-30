const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('🔧 POBLANDO TEMPLATE CON ITEMS DE CHECKLIST\n');

const checklistItems = [
    { text: 'Verificar funcionamiento general del equipo', required: true, category: 'General' },
    { text: 'Limpiar superficie y componentes externos', required: true, category: 'Limpieza' },
    { text: 'Verificar conexiones eléctricas', required: true, category: 'Eléctrico' },
    { text: 'Lubricar partes móviles', required: false, category: 'Mecánico' },
    { text: 'Verificar calibración y precisión', required: true, category: 'Calibración' },
    { text: 'Revisar sistema de frenado (si aplica)', required: false, category: 'Seguridad' },
    { text: 'Verificar estado de cables y conectores', required: true, category: 'Eléctrico' },
    { text: 'Probar funciones de emergencia', required: true, category: 'Seguridad' },
    { text: 'Revisar niveles de fluidos (si aplica)', required: false, category: 'Mantenimiento' },
    { text: 'Documentar observaciones y recomendaciones', required: true, category: 'Documentación' }
];

async function populateTemplate() {
    return new Promise((resolve, reject) => {
        // Primero verificar si ya hay items
        connection.query('SELECT COUNT(*) as count FROM GimnacionChecklistItems WHERE template_id = 1', (err, result) => {
            if (err) {
                console.error('❌ Error verificando items:', err);
                reject(err);
                return;
            }
            
            if (result[0].count > 0) {
                console.log(`⚠️  El template ya tiene ${result[0].count} items. Eliminando para recrear...`);
                
                connection.query('DELETE FROM GimnacionChecklistItems WHERE template_id = 1', (deleteErr) => {
                    if (deleteErr) {
                        console.error('❌ Error eliminando items existentes:', deleteErr);
                        reject(deleteErr);
                        return;
                    }
                    insertItems();
                });
            } else {
                insertItems();
            }
            
            function insertItems() {
                console.log('📝 Insertando items de checklist...');
                
                const insertPromises = checklistItems.map((item, index) => {
                    return new Promise((itemResolve, itemReject) => {
                        const sql = `
                            INSERT INTO GimnacionChecklistItems 
                            (template_id, item_text, item_order, is_required, category)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        connection.query(sql, [1, item.text, index + 1, item.required, item.category], (insertErr, result) => {
                            if (insertErr) {
                                console.error(`❌ Error insertando item ${index + 1}:`, insertErr);
                                itemReject(insertErr);
                            } else {
                                console.log(`✅ Item ${index + 1} insertado: ${item.text}`);
                                itemResolve(result);
                            }
                        });
                    });
                });
                
                Promise.all(insertPromises)
                    .then(() => {
                        console.log('\n✅ Todos los items insertados correctamente');
                        
                        // Verificar el resultado
                        connection.query(`
                            SELECT COUNT(*) as total_items,
                                   SUM(CASE WHEN is_required = 1 THEN 1 ELSE 0 END) as required_items
                            FROM GimnacionChecklistItems 
                            WHERE template_id = 1
                        `, (verifyErr, verifyResult) => {
                            if (verifyErr) {
                                console.error('❌ Error verificando items:', verifyErr);
                            } else {
                                const stats = verifyResult[0];
                                console.log(`📊 Estadísticas: ${stats.total_items} items total, ${stats.required_items} obligatorios`);
                            }
                            
                            connection.end();
                            resolve();
                        });
                    })
                    .catch(reject);
            }
        });
    });
}

populateTemplate()
    .then(() => {
        console.log('\n🎉 Template poblado exitosamente');
    })
    .catch(error => {
        console.error('💥 Error poblando template:', error);
        connection.end();
    });