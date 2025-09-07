/**
 * Script de prueba para Service Tickets
 * Verifica autenticación y funcionalidad básica
 */

const API_URL = 'http://localhost:3000/api';

console.log('🧪 Iniciando pruebas de Service Tickets...');

// Función para hacer login
async function testLogin() {
    console.log('🔐 Probando login...');
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Login exitoso:', result);
            localStorage.setItem('gymtec_token', result.token);
            localStorage.setItem('gymtec_user', JSON.stringify(result.user));
            return result.token;
        } else {
            const error = await response.json();
            console.error('❌ Error en login:', error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error de red en login:', error);
        return null;
    }
}

// Función para probar endpoints de service tickets
async function testServiceTicketsEndpoints(token) {
    console.log('🎫 Probando endpoints de service tickets...');
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Probar obtener service tickets
    try {
        console.log('📋 Probando GET /api/service-tickets...');
        const response = await fetch(`${API_URL}/service-tickets`, { headers });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Service tickets obtenidos:', result);
        } else {
            const error = await response.json();
            console.error('❌ Error obteniendo service tickets:', error);
        }
    } catch (error) {
        console.error('❌ Error de red:', error);
    }

    // Probar obtener clientes
    try {
        console.log('👥 Probando GET /api/clients...');
        const response = await fetch(`${API_URL}/clients`, { headers });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Clientes obtenidos:', result.data?.length || 0, 'clientes');
        } else {
            const error = await response.json();
            console.error('❌ Error obteniendo clientes:', error);
        }
    } catch (error) {
        console.error('❌ Error de red:', error);
    }
}

// Función principal
async function runTests() {
    const token = await testLogin();
    if (token) {
        await testServiceTicketsEndpoints(token);
        console.log('🎉 Pruebas completadas. Ahora puedes acceder a http://localhost:8080/service-tickets.html');
    } else {
        console.error('❌ No se pudo obtener token de autenticación');
    }
}

// Ejecutar pruebas
runTests().catch(console.error);
