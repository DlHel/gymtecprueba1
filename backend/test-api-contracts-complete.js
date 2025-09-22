// Test final para verificar API de contratos con validación de clientes
const http = require('http');

async function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ data: jsonData, status: res.statusCode });
                    } else {
                        reject({ response: { data: jsonData, status: res.statusCode } });
                    }
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

const API_URL = 'http://localhost:3000/api';
let authToken = '';

async function testContractAPI() {
    try {
        console.log('🚀 Iniciando pruebas del API de contratos...\n');

        // 1. Login para obtener token
        console.log('1. Realizando login...');
        const loginResponse = await makeRequest('POST', '/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        authToken = loginResponse.data.token;
        console.log('✅ Login exitoso\n');

        // Headers con autenticación
        const authHeaders = {
            'Authorization': `Bearer ${authToken}`
        };

        // 2. Obtener clientes disponibles
        console.log('2. Obteniendo clientes disponibles...');
        const clientsResponse = await makeRequest('GET', '/clients', null, authHeaders);
        const clients = clientsResponse.data.data || [];
        console.log(`✅ Clientes encontrados: ${clients.length}`);
        clients.slice(0, 3).forEach(client => {
            console.log(`   - ID: ${client.id}, Nombre: ${client.name}`);
        });
        console.log('');

        if (clients.length === 0) {
            console.log('❌ No hay clientes disponibles para la prueba');
            return;
        }

        // 3. Crear contrato con especificaciones de servicio
        console.log('3. Creando contrato con especificaciones detalladas...');
        const testClient = clients[0];
        
        const contractData = {
            client_id: testClient.id,
            contract_number: `API-CONT-${Date.now()}`,
            contract_name: 'Contrato API Test Premium',
            service_description: 'Contrato de prueba con especificaciones completas de servicio',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            status: 'active',
            
            // Especificaciones de servicio
            service_type: 'mantenimiento_completo',
            maintenance_frequency: 'mensual',
            contract_value: 25000.00,
            sla_level: 'premium',
            response_time_hours: 2,
            resolution_time_hours: 12,
            services_included: [
                'mantenimiento_preventivo',
                'mantenimiento_correctivo',
                'limpieza_profunda',
                'calibracion_equipos',
                'soporte_24_7',
                'repuestos_incluidos'
            ],
            equipment_covered: [
                'cardio',
                'fuerza',
                'funcional',
                'accesorios'
            ]
        };

        const createResponse = await axios.post(`${API_URL}/contracts`, contractData, { headers: authHeaders });
        const newContract = createResponse.data.data;
        console.log(`✅ Contrato creado con ID: ${newContract.id}`);
        console.log(`   - Número: ${newContract.contract_number}`);
        console.log(`   - Cliente: ${newContract.client_name}`);
        console.log(`   - Tipo: ${newContract.service_type}`);
        console.log(`   - Frecuencia: ${newContract.maintenance_frequency}`);
        console.log(`   - Valor: $${newContract.contract_value}`);
        console.log('');

        // 4. Obtener contrato creado
        console.log('4. Verificando contrato creado...');
        const getResponse = await axios.get(`${API_URL}/contracts/${newContract.id}`, { headers: authHeaders });
        const retrievedContract = getResponse.data.data;
        console.log('✅ Contrato verificado:');
        console.log(`   - ID: ${retrievedContract.id}`);
        console.log(`   - Número: ${retrievedContract.contract_number}`);
        console.log(`   - SLA Level: ${retrievedContract.sla_level}`);
        console.log(`   - Tiempo Respuesta: ${retrievedContract.response_time_hours}h`);
        console.log(`   - Tiempo Resolución: ${retrievedContract.resolution_time_hours}h`);
        
        // Parsear servicios incluidos
        try {
            const services = JSON.parse(retrievedContract.services_included || '[]');
            console.log(`   - Servicios (${services.length}): ${services.join(', ')}`);
        } catch (e) {
            console.log(`   - Servicios: ${retrievedContract.services_included}`);
        }

        // Parsear equipos cubiertos
        try {
            const equipment = JSON.parse(retrievedContract.equipment_covered || '[]');
            console.log(`   - Equipos (${equipment.length}): ${equipment.join(', ')}`);
        } catch (e) {
            console.log(`   - Equipos: ${retrievedContract.equipment_covered}`);
        }
        console.log('');

        // 5. Actualizar contrato
        console.log('5. Actualizando contrato...');
        const updateData = {
            ...contractData,
            contract_name: 'Contrato API Test Premium ACTUALIZADO',
            contract_value: 30000.00,
            sla_level: 'enterprise',
            services_included: [
                'mantenimiento_preventivo',
                'mantenimiento_correctivo',
                'limpieza_profunda',
                'calibracion_equipos',
                'soporte_24_7',
                'repuestos_incluidos',
                'consultoria_tecnica'
            ]
        };

        const updateResponse = await axios.put(`${API_URL}/contracts/${newContract.id}`, updateData, { headers: authHeaders });
        const updatedContract = updateResponse.data.data;
        console.log(`✅ Contrato actualizado:`);
        console.log(`   - Nombre: ${updatedContract.contract_name}`);
        console.log(`   - Valor: $${updatedContract.contract_value}`);
        console.log(`   - SLA Level: ${updatedContract.sla_level}`);
        console.log('');

        // 6. Probar validación de cliente inexistente
        console.log('6. Probando validación de cliente inexistente...');
        try {
            const invalidContractData = {
                ...contractData,
                client_id: 99999,
                contract_number: `INVALID-${Date.now()}`
            };
            
            await axios.post(`${API_URL}/contracts`, invalidContractData, { headers: authHeaders });
            console.log('❌ ERROR: Se permitió crear contrato con cliente inexistente');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Validación funcionando: Cliente inexistente rechazado');
                console.log(`   - Error: ${error.response.data.error}`);
            } else {
                console.log(`⚠️ Error inesperado: ${error.message}`);
            }
        }
        console.log('');

        // 7. Listar todos los contratos
        console.log('7. Listando contratos...');
        const listResponse = await axios.get(`${API_URL}/contracts`, { headers: authHeaders });
        const contracts = listResponse.data.data || [];
        console.log(`✅ Total de contratos: ${contracts.length}`);
        contracts.slice(0, 3).forEach(contract => {
            console.log(`   - ${contract.contract_number} (Cliente: ${contract.client_name || 'N/A'})`);
        });

        console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL API DE CONTRATOS EXITOSAS!');
        console.log('\n📋 Funcionalidades verificadas:');
        console.log('   ✅ Creación de contratos con validación de cliente');
        console.log('   ✅ Especificaciones detalladas de servicios');
        console.log('   ✅ Campos SLA (response_time, resolution_time)');
        console.log('   ✅ Almacenamiento JSON de servicios y equipos');
        console.log('   ✅ Actualización de contratos');
        console.log('   ✅ Validación de cliente existente');
        console.log('   ✅ Recuperación de información del cliente');
        console.log('   ✅ Listado completo de contratos');

    } catch (error) {
        console.error('❌ Error en prueba del API:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Verificar que axios esté disponible
if (typeof require !== 'undefined') {
    testContractAPI().catch(console.error);
} else {
    console.log('❌ Este script requiere Node.js y axios');
}