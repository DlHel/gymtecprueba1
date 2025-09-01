// Script de prueba para el endpoint de ticket detail
const fetch = require('node-fetch');

async function testTicketDetailEndpoint() {
    try {
        console.log('🔐 Iniciando sesión...');
        
        // Primero hacer login para obtener token
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginResult = await loginResponse.json();
        console.log('✅ Login exitoso');
        
        if (!loginResult.token) {
            throw new Error('No se recibió token en el login');
        }

        const token = loginResult.token;
        console.log('🎫 Token obtenido');

        // Ahora probar el endpoint de ticket detail
        console.log('🔍 Probando endpoint /api/tickets/7/detail...');
        
        const ticketResponse = await fetch('http://localhost:3000/api/tickets/7/detail', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`📨 Status de respuesta: ${ticketResponse.status} ${ticketResponse.statusText}`);

        if (!ticketResponse.ok) {
            const errorText = await ticketResponse.text();
            console.error('❌ Error en respuesta:', errorText);
            return;
        }

        const ticketResult = await ticketResponse.json();
        console.log('✅ Respuesta exitosa:');
        console.log(JSON.stringify(ticketResult, null, 2));

    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
    }
}

testTicketDetailEndpoint();
