// Script para generar un token fresco
const fetch = require('node-fetch');

async function generateFreshToken() {
    try {
        console.log('🔐 Generando token fresco...');
        
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Token generado exitosamente:');
        console.log('Token:', data.token);
        console.log('Usuario:', data.user?.username);
        console.log('Expira en:', '10 horas');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

generateFreshToken();
