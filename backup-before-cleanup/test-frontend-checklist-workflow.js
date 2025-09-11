// Test completo que simula el frontend agregando una tarea
const fetch = require('node-fetch');

async function testFrontendWorkflow() {
    try {
        console.log('🔐 1. Haciendo login...');
        
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        const ticketId = 7;
        
        console.log(`📋 2. Obteniendo checklist actual del ticket ${ticketId}...`);
        
        // Obtener checklist actual
        const checklistResponse = await fetch(`http://localhost:3000/api/tickets/${ticketId}/checklist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (checklistResponse.ok) {
            const checklistData = await checklistResponse.json();
            console.log(`✅ Checklist actual tiene ${checklistData.data.length} items`);
        }
        
        console.log('✨ 3. Agregando nueva tarea...');
        
        const addResponse = await fetch(`http://localhost:3000/api/tickets/${ticketId}/checklist`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                title: 'Verificar funcionamiento de botones',
                description: 'Probar todos los botones de la consola del equipo'
            })
        });
        
        console.log(`Status: ${addResponse.status}`);
        
        if (addResponse.ok) {
            const result = await addResponse.json();
            console.log('✅ Tarea agregada:', result.data.title);
            console.log(`🆔 ID: ${result.data.id}, Order: ${result.data.order_index}`);
            
            console.log('🔄 4. Verificando checklist actualizado...');
            
            // Verificar que se agregó correctamente
            const updatedChecklistResponse = await fetch(`http://localhost:3000/api/tickets/${ticketId}/checklist`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (updatedChecklistResponse.ok) {
                const updatedData = await updatedChecklistResponse.json();
                console.log(`✅ Checklist actualizado tiene ${updatedData.data.length} items`);
                
                // Mostrar últimos 3 items
                console.log('📝 Últimas tareas:');
                updatedData.data.slice(-3).forEach(item => {
                    const status = item.is_completed ? '✅' : '⏳';
                    console.log(`  ${status} ${item.title} (ID: ${item.id})`);
                });
            }
            
        } else {
            const errorData = await addResponse.json();
            console.log('❌ Error:', errorData);
        }
        
    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

testFrontendWorkflow();
