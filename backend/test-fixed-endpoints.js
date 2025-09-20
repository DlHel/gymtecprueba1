async function testFixedEndpoints() {
    const API_URL = 'http://localhost:3000/api';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjMsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGd5bXRlYy5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzcyODg5MDcsImV4cCI6MTczNzM3NTMwN30.CZVa5pF1vJNGgktB0zD-XGv_W4kF7A8nHN8hN8WBSBA';
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log('🧪 Probando endpoints CORREGIDOS de notificaciones...\n');

    // Test 1: Stats simplificadas
    try {
        console.log('1️⃣ Probando GET /notifications/stats-simple');
        const response1 = await fetch(`${API_URL}/notifications/stats-simple`, { headers });
        console.log(`Status: ${response1.status}`);
        if (response1.ok) {
            const data = await response1.json();
            console.log('✅ Respuesta exitosa:', JSON.stringify(data, null, 2));
        } else {
            const error = await response1.text();
            console.log('❌ Error:', error);
        }
    } catch (error) {
        console.log('❌ Error de conexión:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Queue simplificada
    try {
        console.log('2️⃣ Probando GET /notifications/queue-simple');
        const response2 = await fetch(`${API_URL}/notifications/queue-simple`, { headers });
        console.log(`Status: ${response2.status}`);
        if (response2.ok) {
            const data = await response2.json();
            console.log('✅ Respuesta exitosa:', JSON.stringify(data, null, 2));
        } else {
            const error = await response2.text();
            console.log('❌ Error:', error);
        }
    } catch (error) {
        console.log('❌ Error de conexión:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Templates simplificados
    try {
        console.log('3️⃣ Probando GET /notifications/templates-simple');
        const response3 = await fetch(`${API_URL}/notifications/templates-simple`, { headers });
        console.log(`Status: ${response3.status}`);
        if (response3.ok) {
            const data = await response3.json();
            console.log('✅ Respuesta exitosa:', JSON.stringify(data, null, 2));
        } else {
            const error = await response3.text();
            console.log('❌ Error:', error);
        }
    } catch (error) {
        console.log('❌ Error de conexión:', error.message);
    }
}

testFixedEndpoints();