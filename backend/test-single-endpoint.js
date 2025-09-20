async function testSingleEndpoint() {
    const API_URL = 'http://localhost:3000/api';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjMsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGd5bXRlYy5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzcyODg5MDcsImV4cCI6MTczNzM3NTMwN30.CZVa5pF1vJNGgktB0zD-XGv_W4kF7A8nHN8hN8WBSBA';
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log('🧪 Probando endpoint simple-test de notificaciones...\n');

    try {
        const response = await fetch(`${API_URL}/notifications/simple-test`, { headers });
        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Respuesta exitosa:', JSON.stringify(data, null, 2));
        } else {
            const error = await response.text();
            console.log('❌ Error:', error);
        }
    } catch (error) {
        console.log('❌ Error de conexión:', error.message);
    }
}

testSingleEndpoint();