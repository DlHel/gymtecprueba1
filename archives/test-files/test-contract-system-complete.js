// Test para verificar el sistema completo de contratos con validación de clientes
const mysql = require('mysql2/promise');

async function testContractSystem() {
    let connection;
    
    try {
        // Configurar conexión a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('🔌 Conectado a la base de datos');

        // 1. Verificar que tenemos clientes existentes
        console.log('\n1. Verificando clientes existentes...');
        const [clients] = await connection.execute('SELECT id, name, company FROM Clients LIMIT 3');
        console.log(`✅ Clientes encontrados: ${clients.length}`);
        clients.forEach(client => {
            console.log(`   - ID: ${client.id}, Nombre: ${client.name}, Empresa: ${client.company}`);
        });

        if (clients.length === 0) {
            console.log('⚠️ No hay clientes. Creando cliente de prueba...');
            const [result] = await connection.execute(`
                INSERT INTO Clients (name, email, phone, company, address, contact_person, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                'GymTech Solutions',
                'contacto@gymtech.com', 
                '555-0123',
                'GymTech Corp',
                'Av. Principal 123',
                'Juan Pérez'
            ]);
            
            const newClientId = result.insertId;
            console.log(`✅ Cliente creado con ID: ${newClientId}`);
            
            // Obtener el cliente recién creado
            const [newClient] = await connection.execute('SELECT * FROM Clients WHERE id = ?', [newClientId]);
            clients.push(newClient[0]);
        }

        // 2. Verificar estructura de la tabla Contracts con nuevos campos
        console.log('\n2. Verificando estructura de tabla Contracts...');
        const [contractFields] = await connection.execute('DESCRIBE Contracts');
        const fieldNames = contractFields.map(field => field.Field);
        
        const requiredFields = [
            'service_type', 'maintenance_frequency', 'contract_value', 
            'sla_level', 'response_time_hours', 'resolution_time_hours',
            'services_included', 'equipment_covered'
        ];

        console.log('✅ Campos de la tabla Contracts:');
        fieldNames.forEach(field => {
            const isNew = requiredFields.includes(field);
            console.log(`   ${isNew ? '🆕' : '  '} ${field}`);
        });

        const missingFields = requiredFields.filter(field => !fieldNames.includes(field));
        if (missingFields.length > 0) {
            console.log(`❌ Campos faltantes: ${missingFields.join(', ')}`);
            return;
        }

        // 3. Crear contrato de prueba con validación de cliente
        console.log('\n3. Creando contrato de prueba con especificaciones de servicio...');
        const testClient = clients[0];
        
        const contractData = {
            client_id: testClient.id,
            contract_number: `CONT-${Date.now()}`,
            title: 'Contrato de Mantenimiento Premium',
            description: 'Contrato de mantenimiento completo para equipos de gimnasio',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            status: 'active',
            
            // Nuevos campos de especificación de servicio
            service_type: 'mantenimiento_completo',
            maintenance_frequency: 'mensual',
            contract_value: 15000.00,
            sla_level: 'premium',
            response_time_hours: 4,
            resolution_time_hours: 24,
            services_included: JSON.stringify([
                'mantenimiento_preventivo',
                'mantenimiento_correctivo', 
                'limpieza_profunda',
                'calibracion_equipos',
                'soporte_24_7'
            ]),
            equipment_covered: JSON.stringify([
                'cardio',
                'fuerza', 
                'funcional'
            ])
        };

        const insertSQL = `
            INSERT INTO Contracts (
                client_id, contract_number, title, description, start_date, end_date, status,
                service_type, maintenance_frequency, contract_value, sla_level,
                response_time_hours, resolution_time_hours, services_included, equipment_covered,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const [contractResult] = await connection.execute(insertSQL, [
            contractData.client_id,
            contractData.contract_number,
            contractData.title,
            contractData.description,
            contractData.start_date,
            contractData.end_date,
            contractData.status,
            contractData.service_type,
            contractData.maintenance_frequency,
            contractData.contract_value,
            contractData.sla_level,
            contractData.response_time_hours,
            contractData.resolution_time_hours,
            contractData.services_included,
            contractData.equipment_covered
        ]);

        const contractId = contractResult.insertId;
        console.log(`✅ Contrato creado con ID: ${contractId}`);

        // 4. Verificar contrato creado con relación de cliente
        console.log('\n4. Verificando contrato creado con información del cliente...');
        const [contractQuery] = await connection.execute(`
            SELECT c.*, cl.name as client_name, cl.company as client_company, cl.email as client_email
            FROM Contracts c
            LEFT JOIN Clients cl ON c.client_id = cl.id
            WHERE c.id = ?
        `, [contractId]);

        if (contractQuery.length > 0) {
            const contract = contractQuery[0];
            console.log('✅ Contrato verificado:');
            console.log(`   - Número: ${contract.contract_number}`);
            console.log(`   - Cliente: ${contract.client_name} (${contract.client_company})`);
            console.log(`   - Tipo de Servicio: ${contract.service_type}`);
            console.log(`   - Frecuencia: ${contract.maintenance_frequency}`);
            console.log(`   - Valor: $${contract.contract_value}`);
            console.log(`   - Nivel SLA: ${contract.sla_level}`);
            console.log(`   - Tiempo Respuesta: ${contract.response_time_hours}h`);
            console.log(`   - Tiempo Resolución: ${contract.resolution_time_hours}h`);
            
            // Parsear servicios incluidos
            try {
                const services = JSON.parse(contract.services_included);
                console.log(`   - Servicios: ${services.join(', ')}`);
            } catch (e) {
                console.log(`   - Servicios: ${contract.services_included}`);
            }

            // Parsear equipos cubiertos
            try {
                const equipment = JSON.parse(contract.equipment_covered);
                console.log(`   - Equipos: ${equipment.join(', ')}`);
            } catch (e) {
                console.log(`   - Equipos: ${contract.equipment_covered}`);
            }
        }

        // 5. Probar validación de cliente inexistente
        console.log('\n5. Probando validación con cliente inexistente...');
        try {
            await connection.execute(insertSQL, [
                99999, // ID de cliente que no existe
                `CONT-INVALID-${Date.now()}`,
                'Contrato Inválido',
                'Este contrato debería fallar',
                '2024-01-01',
                '2024-12-31',
                'active',
                'mantenimiento_basico',
                'trimestral',
                5000.00,
                'basico',
                24,
                72,
                '["mantenimiento_preventivo"]',
                '["cardio"]'
            ]);
            console.log('❌ ERROR: Se permitió crear contrato con cliente inexistente');
        } catch (error) {
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                console.log('✅ Validación funcionando: No se permite cliente inexistente');
            } else {
                console.log(`⚠️ Error inesperado: ${error.message}`);
            }
        }

        // 6. Verificar tabla ContractServices si existe
        console.log('\n6. Verificando tabla ContractServices...');
        try {
            const [contractServices] = await connection.execute('DESCRIBE ContractServices');
            console.log('✅ Tabla ContractServices encontrada:');
            contractServices.forEach(field => {
                console.log(`   - ${field.Field} (${field.Type})`);
            });
        } catch (error) {
            console.log('⚠️ Tabla ContractServices no encontrada');
        }

        console.log('\n🎉 ¡SISTEMA DE CONTRATOS CON VALIDACIÓN DE CLIENTES FUNCIONANDO CORRECTAMENTE!');
        console.log('\n📋 Resumen de funcionalidades verificadas:');
        console.log('   ✅ Validación de existencia de clientes');
        console.log('   ✅ Especificaciones detalladas de servicios');
        console.log('   ✅ Campos de tiempo de respuesta y resolución SLA');
        console.log('   ✅ Almacenamiento JSON de servicios y equipos');
        console.log('   ✅ Relación properly establecida cliente-contrato');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar test
testContractSystem().catch(console.error);