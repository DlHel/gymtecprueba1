// Test del endpoint de low-stock
const fetch = require('node-fetch');

async function testLowStockEndpoint() {
    try {
        console.log('🔐 Haciendo login...');
        
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('📦 Probando endpoint de inventario low-stock...');
        
        const response = await fetch('http://localhost:3000/api/inventory/low-stock', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS!');
            console.log('Datos:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log('❌ ERROR:', errorText);
        }
    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

testLowStockEndpoint();
