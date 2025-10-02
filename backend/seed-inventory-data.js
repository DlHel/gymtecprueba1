const mysql = require('mysql2/promise');

async function seedInventoryData() {
    let connection;
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        console.log('✅ Conectado a MySQL');
        
        // Verificar si ya existen datos
        const [existing] = await connection.query('SELECT COUNT(*) as total FROM Inventory WHERE is_active = 1');
        
        if (existing[0].total > 0) {
            console.log(`ℹ️  Ya existen ${existing[0].total} items en el inventario`);
            console.log('📊 Primeros 5 items existentes:');
            const [items] = await connection.query('SELECT id, item_code, item_name, current_stock FROM Inventory WHERE is_active = 1 LIMIT 5');
            items.forEach(item => {
                console.log(`   - [${item.item_code}] ${item.item_name} (Stock: ${item.current_stock})`);
            });
            return;
        }
        
        console.log('📦 Insertando datos de prueba en Inventory...');
        
        // Obtener categorías existentes
        const [categories] = await connection.query('SELECT id, name FROM InventoryCategories LIMIT 3');
        const categoryId = categories.length > 0 ? categories[0].id : null;
        
        // Insertar items de inventario
        const inventoryItems = [
            {
                item_code: 'REP-001',
                item_name: 'Cable de acero 5mm',
                description: 'Cable de acero galvanizado para equipos de gimnasio',
                category_id: categoryId,
                current_stock: 50,
                minimum_stock: 10,
                maximum_stock: 100,
                reorder_point: 15,
                unit_cost: 25.50,
                average_cost: 25.50,
                unit_of_measure: 'metros',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            },
            {
                item_code: 'REP-002',
                item_name: 'Rodamiento 6205',
                description: 'Rodamiento estándar para poleas y ejes',
                category_id: categoryId,
                current_stock: 30,
                minimum_stock: 5,
                maximum_stock: 50,
                reorder_point: 10,
                unit_cost: 15.00,
                average_cost: 15.00,
                unit_of_measure: 'unidades',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            },
            {
                item_code: 'REP-003',
                item_name: 'Tornillo M8x40',
                description: 'Tornillos de alta resistencia para fijaciones',
                category_id: categoryId,
                current_stock: 200,
                minimum_stock: 50,
                maximum_stock: 500,
                reorder_point: 75,
                unit_cost: 0.50,
                average_cost: 0.50,
                unit_of_measure: 'unidades',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            },
            {
                item_code: 'REP-004',
                item_name: 'Polea de 100mm',
                description: 'Polea de nylon para sistemas de cables',
                category_id: categoryId,
                current_stock: 15,
                minimum_stock: 3,
                maximum_stock: 30,
                reorder_point: 5,
                unit_cost: 45.00,
                average_cost: 45.00,
                unit_of_measure: 'unidades',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            },
            {
                item_code: 'REP-005',
                item_name: 'Grasa lubricante industrial',
                description: 'Grasa para mantenimiento de equipos',
                category_id: categoryId,
                current_stock: 8,
                minimum_stock: 2,
                maximum_stock: 20,
                reorder_point: 4,
                unit_cost: 35.00,
                average_cost: 35.00,
                unit_of_measure: 'kg',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            },
            {
                item_code: 'REP-006',
                item_name: 'Pin selector de peso',
                description: 'Pin magnético para selección de peso en máquinas',
                category_id: categoryId,
                current_stock: 25,
                minimum_stock: 5,
                maximum_stock: 50,
                reorder_point: 10,
                unit_cost: 12.00,
                average_cost: 12.00,
                unit_of_measure: 'unidades',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            },
            {
                item_code: 'REP-007',
                item_name: 'Banda de transmisión',
                description: 'Banda para cintas de correr',
                category_id: categoryId,
                current_stock: 5,
                minimum_stock: 2,
                maximum_stock: 10,
                reorder_point: 3,
                unit_cost: 180.00,
                average_cost: 180.00,
                unit_of_measure: 'unidades',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            },
            {
                item_code: 'REP-008',
                item_name: 'Tapicería vinilo negro',
                description: 'Material de tapicería para asientos y respaldos',
                category_id: categoryId,
                current_stock: 12,
                minimum_stock: 3,
                maximum_stock: 25,
                reorder_point: 5,
                unit_cost: 55.00,
                average_cost: 55.00,
                unit_of_measure: 'metros',
                location_id: null,
                primary_supplier_id: null,
                is_active: 1
            }
        ];
        
        for (const item of inventoryItems) {
            await connection.query('INSERT INTO Inventory SET ?', item);
        }
        
        console.log(`✅ ${inventoryItems.length} items insertados en Inventory`);
        
        // Verificar inserción
        const [result] = await connection.query('SELECT COUNT(*) as total FROM Inventory WHERE is_active = 1');
        console.log(`📊 Total items en inventario: ${result[0].total}`);
        
        // Mostrar primeros items
        console.log('📋 Items insertados:');
        const [items] = await connection.query('SELECT id, item_code, item_name, current_stock, minimum_stock FROM Inventory WHERE is_active = 1 ORDER BY id DESC LIMIT 8');
        items.forEach(item => {
            console.log(`   ✅ [${item.item_code}] ${item.item_name} (Stock: ${item.current_stock}/${item.minimum_stock})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

// Ejecutar
seedInventoryData()
    .then(() => {
        console.log('🎉 Proceso completado exitosamente');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
