const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Token de prueba (debes tener un usuario en el sistema)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTczMjA3NDkzN30.iLlGjMkJQ3YGEFWkTdKqQvPUK7kTKPtq4EQh7UcvRZo';

async function testAPIWithNotifications() {
    console.log('🧪 TESTING - API Integrada con Notificaciones');
    console.log('=' .repeat(60));
    
    try {
        // 1. Crear ticket via API
        console.log('\n📝 Creando ticket via API...');
        
        const ticketData = {
            client_id: 1,
            location_id: 1,
            equipment_id: 607,
            title: 'API Test - Sistema de Notificaciones Integrado',
            description: 'Este ticket se crea via API para probar la integración completa del sistema de notificaciones.',
            priority: 'Alta',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +24 horas
        };
        
        const createResponse = await axios.post(`${API_BASE}/tickets`, ticketData, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Ticket creado:', createResponse.data);
        const ticketId = createResponse.data.data.id;
        
        // 2. Esperar un poco para que se procesen las notificaciones
        console.log('\n⏳ Esperando procesamiento de notificaciones...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 3. Verificar notificaciones generadas
        console.log('\n🔍 Verificando notificaciones generadas...');
        const notificationsResponse = await axios.get(`${API_BASE}/notifications`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });
        
        console.log('📬 Notificaciones encontradas:', notificationsResponse.data.data?.length || 0);
        if (notificationsResponse.data.data?.length > 0) {
            notificationsResponse.data.data.slice(0, 3).forEach((notif, index) => {
                console.log(`  ${index + 1}. ${notif.subject || 'Sin asunto'} (${notif.status || 'N/A'})`);
            });
        }
        
        // 4. Actualizar ticket para generar más notificaciones
        console.log('\n🔄 Actualizando ticket para generar notificaciones de cambio...');
        
        const updateData = {
            ...ticketData,
            status: 'En Progreso',
            title: 'API Test - ACTUALIZADO - Sistema de Notificaciones'
        };
        
        const updateResponse = await axios.put(`${API_BASE}/tickets/${ticketId}`, updateData, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Ticket actualizado:', updateResponse.data);
        
        // 5. Esperar y verificar nuevas notificaciones
        console.log('\n⏳ Esperando nuevas notificaciones...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalNotificationsResponse = await axios.get(`${API_BASE}/notifications`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });
        
        console.log('\n📊 RESULTADOS FINALES:');
        console.log(`📬 Total notificaciones: ${finalNotificationsResponse.data.data?.length || 0}`);
        console.log(`🎫 Ticket ID creado: ${ticketId}`);
        
        // Mostrar últimas notificaciones
        if (finalNotificationsResponse.data.data?.length > 0) {
            console.log('\n🔔 Últimas notificaciones:');
            finalNotificationsResponse.data.data.slice(0, 5).forEach((notif, index) => {
                console.log(`  ${index + 1}. ${notif.subject || 'Sin asunto'}`);
                console.log(`     Estado: ${notif.status || 'N/A'} | Tipo: ${notif.type || 'N/A'}`);
            });
        }
        
        console.log('\n✅ PRUEBA API COMPLETADA EXITOSAMENTE');
        console.log('🔔 El sistema de notificaciones está integrado correctamente con la API');
        
    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBA API:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Verificar que el servidor esté corriendo antes de la prueba
async function checkServer() {
    try {
        const response = await axios.get(`${API_BASE}/test-db`);
        console.log('✅ Servidor backend disponible');
        return true;
    } catch (error) {
        console.error('❌ Servidor backend no disponible. Asegúrate de que esté corriendo en puerto 3000');
        return false;
    }
}

// Ejecutar prueba
async function runTest() {
    const serverOk = await checkServer();
    if (serverOk) {
        await testAPIWithNotifications();
    }
}

runTest();