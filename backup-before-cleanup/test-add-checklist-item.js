// Test del endpoint POST /api/tickets/:id/checklist
const fetch = require('node-fetch');

async function testAddChecklistItem() {
    try {
        console.log('🔐 Haciendo login...');
        
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('📋 Probando agregar item al checklist del ticket 7...');
        
        const response = await fetch('http://localhost:3000/api/tickets/7/checklist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                title: 'Nueva tarea de prueba',
                description: 'Esta es una tarea agregada via API'
            })
        });
        
        console.log(`Status: ${response.status}`);
        
        const data = await response.json();
        console.log('Respuesta:', JSON.stringify(data, null, 2));
        
        if (response.status === 201) {
            console.log('✅ SUCCESS! Item agregado correctamente');
        } else {
            console.log('❌ ERROR: Problema al agregar item');
        }
        
    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

testAddChecklistItem();
