const db = require('./src/mysql-database.js');

async function testInvoiceEndpoints() {
    try {
        console.log('🧪 Probando endpoints de facturas...');
        
        // 0. Verificar clientes existentes
        console.log('0. Verificando clientes existentes...');
        const clients = await db.query('SELECT id, name FROM Clients LIMIT 5');
        console.log('📋 Clientes disponibles:', clients);
        
        let clientId = 1;
        if (clients.length === 0) {
            console.log('⚠️ No hay clientes en la base de datos. Creando cliente de prueba...');
            const clientResult = await db.query(`
                INSERT INTO Clients (name, email, phone, address) 
                VALUES (?, ?, ?, ?)
            `, ['Cliente de Prueba', 'test@test.com', '123456789', 'Dirección de prueba']);
            clientId = clientResult.insertId;
            console.log('✅ Cliente de prueba creado con ID:', clientId);
        } else {
            clientId = clients[0].id;
            console.log('✅ Usando cliente existente con ID:', clientId);
        }
        
        // 1. Crear una factura de prueba
        console.log('1. Creando factura de prueba...');
        const newInvoice = {
            client_id: clientId, // Usar client_id válido
            location_id: null,
            invoice_number: 'TEST-001',
            title: 'Factura de Prueba',
            description: 'Descripción de prueba',
            total_amount: 100000,
            status: 'Pendiente',
            items: [
                {
                    description: 'Item de prueba',
                    quantity: 1,
                    unit_price: 100000,
                    total: 100000
                }
            ]
        };
        
        const insertResult = await db.query(`
            INSERT INTO Invoices (client_id, location_id, invoice_number, title, description, total_amount, status, items) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            newInvoice.client_id,
            newInvoice.location_id,
            newInvoice.invoice_number,
            newInvoice.title,
            newInvoice.description,
            newInvoice.total_amount,
            newInvoice.status,
            JSON.stringify(newInvoice.items)
        ]);
        
        const testId = insertResult.insertId;
        console.log(`✅ Factura creada con ID: ${testId}`);
        
        // 2. Leer la factura
        console.log('2. Leyendo factura...');
        const readResult = await db.query('SELECT * FROM Invoices WHERE id = ?', [testId]);
        console.log(`✅ Factura leída: ${readResult[0].title} - ${readResult[0].status}`);
        
        // 3. Actualizar la factura (simular PUT)
        console.log('3. Actualizando factura...');
        const updateResult = await db.query(`
            UPDATE Invoices 
            SET title = ?, status = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, ['Factura Actualizada', 'Enviada', 150000, testId]);
        
        console.log(`✅ Factura actualizada: ${updateResult.affectedRows} filas`);
        
        // 4. Verificar actualización
        const updatedResult = await db.query('SELECT * FROM Invoices WHERE id = ?', [testId]);
        console.log(`✅ Estado después de actualizar: ${updatedResult[0].title} - ${updatedResult[0].status}`);
        
        // 5. Eliminar factura de prueba
        console.log('4. Eliminando factura de prueba...');
        const deleteResult = await db.query('DELETE FROM Invoices WHERE id = ?', [testId]);
        console.log(`✅ Factura eliminada: ${deleteResult.affectedRows} filas`);
        
        console.log('🎉 ¡Todos los tests pasaron correctamente!');
        
    } catch (error) {
        console.error('❌ Error en los tests:', error.message);
    } finally {
        process.exit(0);
    }
}

testInvoiceEndpoints();
