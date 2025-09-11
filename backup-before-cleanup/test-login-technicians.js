// Test script para simular login y verificar endpoint de técnicos

async function testLogin() {
    const apiUrl = 'http://localhost:3000/api';
    
    console.log('🔐 Haciendo login como admin...');
    
    try {
        // Paso 1: Login
        const loginResponse = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
            console.error('❌ Error en login:', loginData);
            return;
        }
        
        console.log('✅ Login exitoso:', loginData.user.username);
        const token = loginData.token;
        
        // Paso 2: Probar endpoint de técnicos
        console.log('🔧 Probando endpoint de técnicos...');
        
        const techniciansResponse = await fetch(`${apiUrl}/users/technicians`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!techniciansResponse.ok) {
            console.error('❌ Error obteniendo técnicos:', techniciansResponse.status, techniciansResponse.statusText);
            const errorData = await techniciansResponse.json();
            console.error('Error details:', errorData);
            return;
        }
        
        const techniciansData = await techniciansResponse.json();
        console.log('✅ Técnicos obtenidos exitosamente:', techniciansData);
        
    } catch (error) {
        console.error('❌ Error en el test:', error);
    }
}

testLogin();
