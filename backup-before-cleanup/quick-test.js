const fetch = require('node-fetch');

async function quickTest() {
    try {
        console.log('🔗 Probando endpoint directo...');
        
        // Login primero
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        // Probar ticket detail
        const response = await fetch('http://localhost:3000/api/tickets/7/detail', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS!');
            console.log(`Ticket: ${data.data.title}`);
            console.log(`Cliente: ${data.data.client_name}`);
        } else {
            const errorText = await response.text();
            console.log('❌ ERROR:', errorText);
        }
    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

quickTest();
