// Debug detallado del error en creación de contratos
const http = require('http');

function makeDetailedRequest(method, path, data = null, token = null) {
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

        console.log(`\n🔍 Request: ${method} ${options.path}`);
        console.log('📤 Headers:', options.headers);
        if (data) {
            console.log('📦 Body:', JSON.stringify(data, null, 2));
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`📥 Response Status: ${res.statusCode}`);
                console.log('📥 Response Headers:', res.headers);
                console.log('📥 Response Body:', body);
                
                try {
                    const jsonData = JSON.parse(body);
                    resolve({ data: jsonData, status: res.statusCode });
                } catch (e) {
                    resolve({ data: body, status: res.statusCode });
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Request Error:', error);
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function debugContract() {
    try {
        console.log('🔍 DEBUG: Investigando error en creación de contratos\n');

        // 1. Login
        console.log('=== PASO 1: LOGIN ===');
        const loginResponse = await makeDetailedRequest('POST', '/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        if (loginResponse.status !== 200) {
            console.log('❌ Login failed');
            return;
        }
        
        const token = loginResponse.data.token;
        
        // 2. Obtener un cliente
        console.log('\n=== PASO 2: OBTENER CLIENTES ===');
        const clientsResponse = await makeDetailedRequest('GET', '/clients', null, token);
        const clients = clientsResponse.data.data || [];
        
        if (clients.length === 0) {
            console.log('❌ No hay clientes');
            return;
        }
        
        const testClient = clients[0];
        console.log(`✅ Cliente seleccionado: ID=${testClient.id}, Name=${testClient.name}`);

        // 3. Intentar crear contrato con datos mínimos
        console.log('\n=== PASO 3: CREAR CONTRATO BÁSICO ===');
        const basicContract = {
            client_id: testClient.id,
            contract_number: `DEBUG-${Date.now()}`,
            contract_name: 'Debug Contract',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            status: 'active'
        };

        const basicResponse = await makeDetailedRequest('POST', '/contracts', basicContract, token);

        // 4. Intentar crear contrato con campos completos
        console.log('\n=== PASO 4: CREAR CONTRATO COMPLETO ===');
        const fullContract = {
            client_id: testClient.id,
            contract_number: `DEBUG-FULL-${Date.now()}`,
            contract_name: 'Debug Full Contract',
            service_description: 'Contrato completo de prueba',
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

        const fullResponse = await makeDetailedRequest('POST', '/contracts', fullContract, token);

        console.log('\n=== RESUMEN DEBUG ===');
        console.log(`Contrato básico: Status ${basicResponse.status}`);
        console.log(`Contrato completo: Status ${fullResponse.status}`);

        if (basicResponse.status >= 400) {
            console.log('❌ Error en contrato básico:', basicResponse.data);
        }
        
        if (fullResponse.status >= 400) {
            console.log('❌ Error en contrato completo:', fullResponse.data);
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

debugContract();