// test-users-endpoint.js - Probar específicamente el endpoint de usuarios
const jwt = require('jsonwebtoken');

// Crear token para usuario administrador
const jwtSecret = 'your-secret-key'; // Debe coincidir con server-clean.js
const adminToken = jwt.sign(
    { 
        id: 1, 
        username: 'admin', 
        email: 'admin@gymtec.com',
        role: 'admin' 
    }, 
    jwtSecret, 
    { expiresIn: '24h' }
);

console.log('🔑 Token generado para admin:', adminToken);

// Probar endpoint de usuarios
const testUsersEndpoint = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/users', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Status:', response.status);
        console.log('📡 Status Text:', response.statusText);
        
        const result = await response.json();
        console.log('📊 Response:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

// Ejecutar test
testUsersEndpoint();