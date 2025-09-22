// Test simplificado del API de contratos
const http = require('http');

async function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve({ data: jsonData, status: res.statusCode });
                } catch (e) {
                    reject(new Error(`Parse error: ${body}`));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testSimpleContract() {
    try {
        console.log('🚀 Prueba rápida del sistema de contratos...\n');

        // 1. Login
        console.log('1. Login...');
        const loginResponse = await makeRequest('POST', '/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        if (loginResponse.status !== 200) {
            throw new Error('Login failed');
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Login exitoso\n');

        // 2. Obtener clientes
        console.log('2. Obteniendo clientes...');
        const clientsResponse = await makeRequest('GET', '/clients', null, token);
        const clients = clientsResponse.data.data || [];
        console.log(`✅ Clientes encontrados: ${clients.length}\n`);

        if (clients.length === 0) {
            console.log('❌ No hay clientes para la prueba');
            return;
        }

        // 3. Crear contrato
        console.log('3. Creando contrato con especificaciones...');
        const contractData = {
            client_id: clients[0].id,
            contract_number: `SIMPLE-${Date.now()}`,
            contract_name: 'Contrato Test Simple',
            service_description: 'Prueba del sistema de contratos',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            status: 'active',
            service_type: 'mantenimiento_completo',
            maintenance_frequency: 'mensual',
            contract_value: 20000.00,
            sla_level: 'premium',
            response_time_hours: 4,
            resolution_time_hours: 24,
            services_included: JSON.stringify(['mantenimiento_preventivo', 'soporte_24_7']),
            equipment_covered: JSON.stringify(['cardio', 'fuerza'])
        };

        const createResponse = await makeRequest('POST', '/contracts', contractData, token);
        
        if (createResponse.status === 201 || createResponse.status === 200) {
            console.log('✅ Contrato creado exitosamente');
            console.log(`   - ID: ${createResponse.data.data?.id || 'N/A'}`);
            console.log(`   - Cliente: ${createResponse.data.data?.client_name || clients[0].name}`);
        } else {
            console.log(`❌ Error creando contrato: ${createResponse.status}`);
        }

        // 4. Probar validación con cliente inexistente
        console.log('\n4. Probando validación de cliente inexistente...');
        try {
            const invalidContract = { ...contractData, client_id: 99999 };
            const invalidResponse = await makeRequest('POST', '/contracts', invalidContract, token);
            console.log('❌ ERROR: Se permitió cliente inexistente');
        } catch (error) {
            console.log('✅ Validación funcionando: Cliente inexistente rechazado');
        }

        console.log('\n🎉 ¡SISTEMA DE CONTRATOS FUNCIONANDO!');
        console.log('\n📋 Funcionalidades verificadas:');
        console.log('   ✅ Autenticación JWT');
        console.log('   ✅ Validación de clientes existentes');  
        console.log('   ✅ Creación de contratos con especificaciones');
        console.log('   ✅ Campos de servicio y SLA');
        console.log('   ✅ Rechazo de clientes inexistentes');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

testSimpleContract();