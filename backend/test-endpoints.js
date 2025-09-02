// Probar endpoints de comentarios y checklist
const API_URL = 'http://localhost:3000/api';

// Token de prueba (generado recientemente)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTM3MTYxNCwiZXhwIjoxNzI1Mzc1MjE0fQ.B9V6E9Zz3TW2a5gLZRDZUqOjgZOYmFJPnNVbKf5HYgY';

async function testEndpoints() {
    console.log('🧪 Probando endpoints de comentarios y checklist...\n');
    
    // Test 1: Obtener comentarios del ticket 7
    console.log('1️⃣ Probando GET /api/tickets/7/notes');
    try {
        const response = await fetch(`${API_URL}/tickets/7/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        if (response.ok) {
            console.log(`   ✅ Comentarios encontrados: ${data.data?.length || 0}`);
            if (data.data?.length > 0) {
                console.log('   📄 Primer comentario:', data.data[0]);
            }
        } else {
            console.log(`   ❌ Error: ${data.error}`);
        }
    } catch (error) {
        console.log(`   💥 Error de red: ${error.message}`);
    }
    
    console.log('\n');
    
    // Test 2: Crear un comentario nuevo
    console.log('2️⃣ Probando POST /api/tickets/7/notes');
    try {
        const response = await fetch(`${API_URL}/tickets/7/notes`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                note: 'Comentario de prueba para verificar que funciona',
                note_type: 'Comentario',
                author: 'admin'
            })
        });
        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        if (response.ok) {
            console.log(`   ✅ Comentario creado exitosamente`);
            console.log('   📄 Comentario creado:', data.data);
        } else {
            console.log(`   ❌ Error: ${data.error}`);
        }
    } catch (error) {
        console.log(`   💥 Error de red: ${error.message}`);
    }
    
    console.log('\n');
    
    // Test 3: Obtener checklist del ticket 7
    console.log('3️⃣ Probando GET /api/tickets/7/checklist');
    try {
        const response = await fetch(`${API_URL}/tickets/7/checklist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        if (response.ok) {
            console.log(`   ✅ Checklist encontrado`);
            console.log('   📄 Checklist:', data);
        } else {
            console.log(`   ❌ Error: ${data.error}`);
        }
    } catch (error) {
        console.log(`   💥 Error de red: ${error.message}`);
    }
    
    console.log('\n');
    
    // Test 4: Crear item de checklist
    console.log('4️⃣ Probando POST /api/tickets/7/checklist');
    try {
        const response = await fetch(`${API_URL}/tickets/7/checklist`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Tarea de prueba',
                description: 'Verificar que el checklist funciona correctamente'
            })
        });
        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        if (response.ok) {
            console.log(`   ✅ Item de checklist creado exitosamente`);
            console.log('   📄 Item creado:', data.data);
        } else {
            console.log(`   ❌ Error: ${data.error}`);
        }
    } catch (error) {
        console.log(`   💥 Error de red: ${error.message}`);
    }
    
    console.log('\n🏁 Pruebas completadas');
}

testEndpoints().catch(console.error);
