const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testSLADashboard() {
    console.log('🧪 Probando acceso al dashboard SLA...\n');
    
    try {
        // Paso 1: Login
        console.log('1. Intentando login...');
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (!loginResponse.data.token) {
            console.log('❌ No se recibió token en el login');
            console.log('Respuesta:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Login exitoso, token recibido');
        console.log(`   Token: ${token.substring(0, 20)}...`);
        console.log('');
        
        // Paso 2: Acceder al dashboard SLA
        console.log('2. Accediendo al dashboard SLA...');
        const dashboardResponse = await axios.get(`${API_URL}/api/sla/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Dashboard SLA responde correctamente\n');
        console.log('📊 Datos recibidos:');
        console.log(JSON.stringify(dashboardResponse.data, null, 2));
        
        // Verificar estructura de datos
        const data = dashboardResponse.data.data;
        console.log('\n✅ Verificación de estructura:');
        console.log(`   - sla_statistics: ${data.sla_statistics.length} registros`);
        console.log(`   - expired_tickets: ${data.expired_tickets.length} tickets`);
        console.log(`   - risk_tickets: ${data.risk_tickets.length} tickets`);
        console.log(`   - client_performance: ${data.client_performance.length} clientes`);
        
        // Mostrar estadísticas SLA
        if (data.sla_statistics.length > 0) {
            console.log('\n📋 Estadísticas SLA:');
            data.sla_statistics.forEach(stat => {
                console.log(`   - ${stat.sla_status}: ${stat.count} tickets`);
            });
        } else {
            console.log('\n⚠️  No hay estadísticas SLA (array vacío)');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testSLADashboard();
