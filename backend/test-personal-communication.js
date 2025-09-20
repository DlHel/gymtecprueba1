// test-personal-communication.js - Probar comunicación completa del módulo personal
const jwt = require('jsonwebtoken');

// 1. Probar conectividad básica del backend
const testBackendConnectivity = async () => {
    console.log('🔍 1. Probando conectividad básica del backend...');
    try {
        // Probar con endpoint root o cualquier endpoint que responda
        const response = await fetch('http://localhost:3000/');
        console.log('   Status:', response.status);
        
        if (response.status === 404) {
            console.log('   ✅ Backend responde (404 es normal para root)');
            return true;
        } else if (response.ok) {
            const data = await response.text();
            console.log('   ✅ Backend responde correctamente');
            return true;
        } else {
            console.log('   ❌ Backend responde con error');
            return false;
        }
    } catch (error) {
        console.log('   ❌ Error de conectividad:', error.message);
        return false;
    }
};

// 2. Crear token de prueba
const createTestToken = () => {
    console.log('🔑 2. Generando token de prueba...');
    const jwtSecret = 'gymtec_secret_key_2024'; // Debe coincidir con authService.js
    const testToken = jwt.sign(
        { 
            id: 1, 
            username: 'admin', 
            email: 'admin@gymtec.com',
            role: 'admin' 
        }, 
        jwtSecret, 
        { expiresIn: '24h' }
    );
    
    console.log('   ✅ Token generado:', testToken.substring(0, 50) + '...');
    return testToken;
};

// 3. Probar endpoint de usuarios
const testUsersEndpoint = async (token) => {
    console.log('👥 3. Probando endpoint /api/users...');
    try {
        const response = await fetch('http://localhost:3000/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('   Status:', response.status);
        console.log('   Status Text:', response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('   ✅ Endpoint responde correctamente:');
            console.log('   📊 Estructura:', Object.keys(result));
            console.log('   📊 Datos:', result);
            return result;
        } else {
            const errorText = await response.text();
            console.log('   ❌ Error del endpoint:', errorText);
            return null;
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        return null;
    }
};

// 4. Probar sin autenticación
const testUsersEndpointNoAuth = async () => {
    console.log('🚫 4. Probando endpoint sin autenticación...');
    try {
        const response = await fetch('http://localhost:3000/api/users');
        console.log('   Status:', response.status);
        console.log('   Status Text:', response.statusText);
        
        const result = await response.text();
        console.log('   📄 Respuesta:', result);
        
    } catch (error) {
        console.log('   ❌ Error:', error.message);
    }
};

// 5. Verificar base de datos
const testDatabaseConnection = async (token) => {
    console.log('🗄️ 5. Probando conexión a base de datos...');
    try {
        // Intentar endpoint que muestre info de la BD
        const response = await fetch('http://localhost:3000/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('   Status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('   ✅ BD conectada, stats disponibles:', Object.keys(result));
        } else {
            console.log('   ⚠️ Endpoint stats no disponible, probando otro...');
        }
    } catch (error) {
        console.log('   ❌ Error probando BD:', error.message);
    }
};

// Ejecutar todas las pruebas
const runAllTests = async () => {
    console.log('🚀 ========================================');
    console.log('🚀 DIAGNÓSTICO COMPLETO - MÓDULO PERSONAL');
    console.log('🚀 ========================================');
    
    const backendOk = await testBackendConnectivity();
    
    if (!backendOk) {
        console.log('❌ Backend no disponible, no se pueden hacer más pruebas');
        return;
    }
    
    const token = createTestToken();
    
    await testUsersEndpointNoAuth();
    const usersResult = await testUsersEndpoint(token);
    await testDatabaseConnection(token);
    
    console.log('🎯 ========================================');
    console.log('🎯 RESUMEN DE DIAGNÓSTICO');
    console.log('🎯 ========================================');
    
    if (usersResult) {
        console.log('✅ Comunicación frontend-backend: OK');
        console.log('✅ Autenticación: OK');
        console.log('✅ Endpoint /api/users: OK');
        console.log(`✅ Usuarios en BD: ${usersResult.data ? usersResult.data.length : 'Estructura diferente'}`);
    } else {
        console.log('❌ Hay problemas en la comunicación o autenticación');
    }
    
    console.log('🎯 ========================================');
};

// Ejecutar diagnóstico
runAllTests().catch(console.error);