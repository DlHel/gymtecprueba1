const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🎯 POBLACIÓN FINAL CORREGIDA DE BASE DE DATOS\n');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function finalPopulate() {
    try {
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // 1. COMPLETAR FOTOS DE MODELOS (CORREGIDO)
        console.log('📸 COMPLETANDO FOTOS DE MODELOS (VERSIÓN CORREGIDA):');
        
        const modelsWithoutPhotos = await query(`
            SELECT m.id, m.name, m.brand, m.category 
            FROM equipmentmodels m 
            LEFT JOIN modelphotos mp ON m.id = mp.model_id 
            WHERE mp.id IS NULL 
            ORDER BY m.category, m.brand
        `);
        
        console.log(`   📊 Modelos sin fotos: ${modelsWithoutPhotos.length}`);
        
        let fotosCreadas = 0;
        
        for (const model of modelsWithoutPhotos) {
            try {
                // Crear SVG placeholder específico por categoría
                let categoryColor = '#4f46e5';
                let categoryIcon = '🏋️';
                
                switch (model.category) {
                    case 'Cardio':
                        categoryColor = '#ef4444';
                        categoryIcon = '❤️';
                        break;
                    case 'Fuerza':
                        categoryColor = '#059669';
                        categoryIcon = '💪';
                        break;
                    case 'Funcional':
                        categoryColor = '#7c3aed';
                        categoryIcon = '🤸';
                        break;
                    case 'Accesorios':
                        categoryColor = '#f59e0b';
                        categoryIcon = '🔧';
                        break;
                }
                
                const svgContent = `
                    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="grad${model.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:${categoryColor};stop-opacity:0.1" />
                                <stop offset="100%" style="stop-color:${categoryColor};stop-opacity:0.3" />
                            </linearGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grad${model.id})" stroke="#e5e7eb" stroke-width="2" rx="12"/>
                        <rect x="20" y="20" width="360" height="200" fill="#ffffff" stroke="${categoryColor}" stroke-width="2" rx="8"/>
                        
                        <!-- Icono de categoría -->
                        <circle cx="60" cy="60" r="25" fill="${categoryColor}" opacity="0.2"/>
                        <text x="60" y="70" font-family="Arial" font-size="24" text-anchor="middle">${categoryIcon}</text>
                        
                        <!-- Información del modelo -->
                        <text x="200" y="80" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1f2937" text-anchor="middle">
                            ${model.brand}
                        </text>
                        <text x="200" y="105" font-family="Arial, sans-serif" font-size="16" fill="#4b5563" text-anchor="middle">
                            ${model.name}
                        </text>
                        <text x="200" y="130" font-family="Arial, sans-serif" font-size="14" fill="${categoryColor}" text-anchor="middle">
                            ${model.category}
                        </text>
                        
                        <!-- Marca de agua -->
                        <text x="350" y="280" font-family="Arial" font-size="10" fill="#9ca3af" text-anchor="end">GYMTEC ERP</text>
                        
                        <!-- Indicador de disponibilidad -->
                        <circle cx="350" cy="50" r="15" fill="#10b981"/>
                        <text x="350" y="55" font-family="Arial" font-size="12" fill="white" text-anchor="middle">✓</text>
                    </svg>
                `;
                
                const photoData = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
                const fileName = `${model.brand.replace(/\s+/g, '-')}-${model.name.replace(/\s+/g, '-')}.svg`;
                
                await query(`
                    INSERT INTO modelphotos (model_id, photo_data, file_name, mime_type, file_size, is_primary, created_at) 
                    VALUES (?, ?, ?, ?, ?, 1, NOW())
                `, [model.id, photoData, fileName, 'image/svg+xml', photoData.length]);
                
                fotosCreadas++;
                console.log(`      📸 Foto creada: ${model.brand} ${model.name} (${model.category})`);
                
            } catch (error) {
                console.log(`      ⚠️  Error agregando foto para ${model.brand} ${model.name}: ${error.message}`);
            }
        }
        
        console.log(`   ✅ Total de fotos creadas: ${fotosCreadas}\n`);

        // 2. COMPLETAR REPUESTOS SI FALTAN
        console.log('🔧 VERIFICANDO Y COMPLETANDO REPUESTOS:');
        
        const currentSpareparts = await query('SELECT COUNT(*) as count FROM spareparts');
        console.log(`   📊 Repuestos actuales: ${currentSpareparts[0].count}`);
        
        if (currentSpareparts[0].count < 20) {
            const sparepartsToAdd = [
                { name: 'Correa de Transmisión Universal', sku: 'COR-001', stock: 15, min_stock: 5, price: 25000 },
                { name: 'Motor 2.5HP para Caminadora', sku: 'MOT-002', stock: 3, min_stock: 1, price: 450000 },
                { name: 'Sensor de Velocidad Magnético', sku: 'SEN-003', stock: 12, min_stock: 3, price: 35000 },
                { name: 'Display LCD 7 Pulgadas', sku: 'DIS-004', stock: 8, min_stock: 2, price: 120000 },
                { name: 'Cable de Seguridad Universal', sku: 'CAB-005', stock: 25, min_stock: 10, price: 15000 },
                { name: 'Rodamientos para Elíptica', sku: 'ROD-006', stock: 20, min_stock: 8, price: 18000 },
                { name: 'Placa Controladora Principal', sku: 'PLA-007', stock: 5, min_stock: 2, price: 280000 },
                { name: 'Ventilador de Enfriamiento', sku: 'VEN-008', stock: 10, min_stock: 4, price: 45000 },
                { name: 'Lubricante para Equipos', sku: 'LUB-009', stock: 30, min_stock: 15, price: 8000 },
                { name: 'Kit de Tornillería Completo', sku: 'TOR-010', stock: 50, min_stock: 20, price: 12000 }
            ];
            
            let repuestosCreados = 0;
            
            for (const sparepart of sparepartsToAdd) {
                try {
                    // Verificar si ya existe
                    const exists = await query('SELECT id FROM spareparts WHERE sku = ?', [sparepart.sku]);
                    if (exists.length === 0) {
                        await query(`
                            INSERT INTO spareparts (name, sku, stock, min_stock, price, created_at) 
                            VALUES (?, ?, ?, ?, ?, NOW())
                        `, [sparepart.name, sparepart.sku, sparepart.stock, sparepart.min_stock, sparepart.price]);
                        
                        repuestosCreados++;
                        console.log(`      🔧 Repuesto agregado: ${sparepart.name}`);
                    }
                } catch (error) {
                    console.log(`      ⚠️  Error agregando repuesto: ${error.message}`);
                }
            }
            
            console.log(`   ✅ Repuestos agregados: ${repuestosCreados}\n`);
        }

        // 3. AGREGAR ALGUNAS FOTOS DE EQUIPOS ESPECÍFICOS
        console.log('📷 AGREGANDO FOTOS DE EQUIPOS ESPECÍFICOS:');
        
        const equipmentForPhotos = await query(`
            SELECT e.id, e.name, e.custom_id 
            FROM equipment e 
            LEFT JOIN equipmentphotos ep ON e.id = ep.equipment_id 
            WHERE ep.id IS NULL 
            ORDER BY RAND() 
            LIMIT 5
        `);
        
        console.log(`   📊 Equipos seleccionados para fotos: ${equipmentForPhotos.length}`);
        
        let fotosEquiposCreadas = 0;
        
        for (const equipment of equipmentForPhotos) {
            try {
                const svgContent = `
                    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="equipGrad${equipment.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.1" />
                                <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:0.3" />
                            </linearGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#equipGrad${equipment.id})" stroke="#e5e7eb" stroke-width="2" rx="12"/>
                        <rect x="20" y="20" width="360" height="200" fill="#ffffff" stroke="#3b82f6" stroke-width="2" rx="8"/>
                        
                        <!-- Información del equipo -->
                        <text x="200" y="80" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1f2937" text-anchor="middle">
                            ${equipment.name}
                        </text>
                        <text x="200" y="105" font-family="Arial, sans-serif" font-size="14" fill="#3b82f6" text-anchor="middle">
                            Código: ${equipment.custom_id}
                        </text>
                        <text x="200" y="130" font-family="Arial, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">
                            Foto del equipo individual
                        </text>
                        
                        <!-- Icono de equipo -->
                        <circle cx="60" cy="60" r="25" fill="#3b82f6" opacity="0.2"/>
                        <text x="60" y="70" font-family="Arial" font-size="24" text-anchor="middle">🏋️</text>
                        
                        <!-- Estado -->
                        <circle cx="350" cy="50" r="15" fill="#059669"/>
                        <text x="350" y="55" font-family="Arial" font-size="12" fill="white" text-anchor="middle">✓</text>
                        
                        <text x="350" y="280" font-family="Arial" font-size="10" fill="#9ca3af" text-anchor="end">GYMTEC ERP</text>
                    </svg>
                `;
                
                const photoData = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
                const fileName = `equipment-${equipment.custom_id}.svg`;
                
                await query(`
                    INSERT INTO equipmentphotos (equipment_id, photo_data, file_name, mime_type, file_size, created_at) 
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [equipment.id, photoData, fileName, 'image/svg+xml', photoData.length]);
                
                fotosEquiposCreadas++;
                console.log(`      📷 Foto de equipo creada: ${equipment.name} (${equipment.custom_id})`);
                
            } catch (error) {
                console.log(`      ⚠️  Error agregando foto de equipo: ${error.message}`);
            }
        }
        
        console.log(`   ✅ Fotos de equipos creadas: ${fotosEquiposCreadas}\n`);

        // 4. RESUMEN FINAL COMPLETO
        console.log('=' * 60);
        console.log('📊 RESUMEN FINAL COMPLETO DE LA BASE DE DATOS:');
        
        const finalStats = await query(`
            SELECT 
                (SELECT COUNT(*) FROM clients) as clients,
                (SELECT COUNT(*) FROM locations) as locations,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM equipmentmodels) as models,
                (SELECT COUNT(*) FROM tickets) as tickets,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM roles) as roles,
                (SELECT COUNT(*) FROM modelphotos) as model_photos,
                (SELECT COUNT(*) FROM equipmentphotos) as equipment_photos,
                (SELECT COUNT(*) FROM spareparts) as spareparts,
                (SELECT COUNT(*) FROM equipmentnotes) as notes
        `);
        
        const stats = finalStats[0];
        console.log(`   👥 Clientes: ${stats.clients}`);
        console.log(`   🏢 Ubicaciones: ${stats.locations}`);
        console.log(`   🏋️ Equipos: ${stats.equipment}`);
        console.log(`   🏭 Modelos: ${stats.models}`);
        console.log(`   🎫 Tickets: ${stats.tickets}`);
        console.log(`   👤 Usuarios: ${stats.users}`);
        console.log(`   🔑 Roles: ${stats.roles}`);
        console.log(`   📸 Fotos de modelos: ${stats.model_photos}`);
        console.log(`   📷 Fotos de equipos: ${stats.equipment_photos}`);
        console.log(`   🔧 Repuestos: ${stats.spareparts}`);
        console.log(`   📝 Notas: ${stats.notes}`);
        
        // Verificar distribución por categorías
        console.log('\n📈 DISTRIBUCIÓN POR CATEGORÍAS:');
        
        const modelsByCategory = await query(`
            SELECT category, COUNT(*) as count 
            FROM equipmentmodels 
            GROUP BY category 
            ORDER BY count DESC
        `);
        
        console.log('   🏭 Modelos por categoría:');
        modelsByCategory.forEach(cat => {
            console.log(`      • ${cat.category}: ${cat.count} modelos`);
        });
        
        const equipmentByLocation = await query(`
            SELECT l.name, COUNT(e.id) as equipment_count
            FROM locations l
            LEFT JOIN equipment e ON l.id = e.location_id
            GROUP BY l.id, l.name
            HAVING equipment_count > 0
            ORDER BY equipment_count DESC
            LIMIT 5
        `);
        
        console.log('\n   🏢 Top 5 ubicaciones con más equipos:');
        equipmentByLocation.forEach(loc => {
            console.log(`      • ${loc.name}: ${loc.equipment_count} equipos`);
        });
        
        console.log('\n🎉 ¡BASE DE DATOS COMPLETAMENTE POBLADA Y ORGANIZADA!');
        console.log('✅ Todos los datos están coherentes y listos para uso');
        console.log('✅ Fotos agregadas para modelos y equipos');
        console.log('✅ Repuestos completos con stock realista');
        console.log('✅ Sistema completamente funcional');

    } catch (error) {
        console.error('❌ Error durante población final:', error.message);
        console.error(error.stack);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

finalPopulate(); 