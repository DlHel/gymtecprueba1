const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🧪 TESTEO DE API CHECKLIST GIMNACIÓN\n');

async function testChecklistAPI() {
    const baseUrl = 'http://localhost:3000/api';
    
    // Primero generar un token de autorización
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' }, 
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
    );
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    try {
        // 1. Test: Obtener templates de checklist
        console.log('=== 1. TESTING: GET /api/gimnacion/checklist-templates ===');
        
        const fetch = (await import('node-fetch')).default;
        
        const response1 = await fetch(`${baseUrl}/gimnacion/checklist-templates`, {
            method: 'GET',
            headers: headers
        });
        
        console.log(`Status: ${response1.status} ${response1.statusText}`);
        
        if (response1.ok) {
            const data1 = await response1.json();
            console.log('✅ Response data:', JSON.stringify(data1, null, 2));
            
            if (data1.data && data1.data.length > 0) {
                const templateId = data1.data[0].id;
                console.log(`\nUsando template ID: ${templateId} para el siguiente test...`);
                
                // 2. Test: Obtener items de un template
                console.log('\n=== 2. TESTING: GET /api/gimnacion/checklist-templates/:id/items ===');
                
                const response2 = await fetch(`${baseUrl}/gimnacion/checklist-templates/${templateId}/items`, {
                    method: 'GET',
                    headers: headers
                });
                
                console.log(`Status: ${response2.status} ${response2.statusText}`);
                
                if (response2.ok) {
                    const data2 = await response2.json();
                    console.log('✅ Template items:', JSON.stringify(data2, null, 2));
                } else {
                    const error2 = await response2.text();
                    console.log('❌ Error response:', error2);
                }
            } else {
                console.log('⚠️  No hay templates disponibles para probar items');
            }
            
        } else {
            const error1 = await response1.text();
            console.log('❌ Error response:', error1);
        }
        
    } catch (error) {
        console.error('❌ Error en el test:', error);
    }
}

// Función para verificar directamente en base de datos
async function checkDatabaseDirectly() {
    console.log('\n=== 3. VERIFICACIÓN DIRECTA EN BD ===');
    
    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gymtec_erp'
    });
    
    return new Promise((resolve) => {
        // Verificar templates
        connection.query(`
            SELECT t.id, t.name as template_name, t.description, t.is_default, t.created_at,
                   COUNT(i.id) as item_count
            FROM GimnacionChecklistTemplates t
            LEFT JOIN GimnacionChecklistItems i ON t.id = i.template_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `, (err, templates) => {
            if (err) {
                console.error('❌ Error consultando templates:', err.message);
            } else {
                console.log('✅ Templates en BD:');
                templates.forEach(template => {
                    console.log(`   - ID: ${template.id} | ${template.template_name} | Items: ${template.item_count}`);
                });
                
                if (templates.length > 0) {
                    // Verificar items del primer template
                    const templateId = templates[0].id;
                    console.log(`\n📋 Items del template "${templates[0].template_name}" (ID: ${templateId}):`);
                    
                    connection.query(`
                        SELECT id, item_text, item_order, is_required, category
                        FROM GimnacionChecklistItems
                        WHERE template_id = ?
                        ORDER BY item_order ASC
                    `, [templateId], (err, items) => {
                        if (err) {
                            console.error('❌ Error consultando items:', err.message);
                        } else {
                            if (items.length > 0) {
                                items.forEach((item, index) => {
                                    console.log(`   ${index + 1}. ${item.item_text} ${item.is_required ? '(Obligatorio)' : ''}`);
                                });
                            } else {
                                console.log('   ⚠️  No hay items en este template');
                            }
                        }
                        connection.end();
                        resolve();
                    });
                } else {
                    connection.end();
                    resolve();
                }
            }
        });
    });
}

// Ejecutar tests
async function runTests() {
    await testChecklistAPI();
    await checkDatabaseDirectly();
    console.log('\n🧪 Tests completados');
}

runTests();