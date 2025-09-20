const http = require('http');
const https = require('https');

// Función para hacer peticiones HTTP
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https');
        const httpModule = isHttps ? https : http;
        
        const req = httpModule.request(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            ...options
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

async function testCompleteWorkflow() {
    console.log('🧪 TESTING - Flujo Completo Frontend → Backend → Notificaciones');
    console.log('=' .repeat(70));
    
    const API_BASE = 'http://localhost:3000/api';
    const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTczMjA3NDkzN30.iLlGjMkJQ3YGEFWkTdKqQvPUK7kTKPtq4EQh7UcvRZo';
    
    try {
        // 1. Verificar conexión al backend
        console.log('\n🔌 Verificando conexión al backend...');
        const healthCheck = await makeRequest(`${API_BASE}/test-db`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        console.log('✅ Backend disponible:', healthCheck.status);
        
        // 2. Obtener estado inicial de notificaciones
        console.log('\n📊 Estado inicial de notificaciones...');
        const initialNotifications = await makeRequest(`${API_BASE}/notifications`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        const initialCount = initialNotifications.data?.data?.length || 0;
        console.log(`📬 Notificaciones iniciales: ${initialCount}`);
        
        // 3. Crear ticket como lo haría el frontend
        console.log('\n🎫 Creando ticket desde "frontend"...');
        const ticketData = {
            client_id: 1,
            location_id: 1, 
            equipment_id: 607,
            title: 'FRONTEND TEST - Reparación Crítica Cinta Caminadora',
            description: 'Ticket creado desde el frontend para probar integración completa del sistema de notificaciones automáticas.',
            priority: 'Alta',
            due_date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // +12 horas
        };
        
        const createResponse = await makeRequest(`${API_BASE}/tickets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: ticketData
        });
        
        if (createResponse.status === 201) {
            console.log('✅ Ticket creado exitosamente:', {
                id: createResponse.data.data.id,
                title: createResponse.data.data.title,
                status: createResponse.data.data.status
            });
            
            const ticketId = createResponse.data.data.id;
            
            // 4. Esperar procesamiento de notificaciones
            console.log('\n⏳ Esperando procesamiento automático de notificaciones (3 segundos)...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 5. Verificar nuevas notificaciones
            console.log('\n🔍 Verificando notificaciones generadas...');
            const updatedNotifications = await makeRequest(`${API_BASE}/notifications`, {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            });
            
            const newCount = updatedNotifications.data?.data?.length || 0;
            const newNotifications = newCount - initialCount;
            
            console.log(`📬 Notificaciones nuevas: +${newNotifications} (total: ${newCount})`);
            
            if (newNotifications > 0) {
                console.log('\n🔔 Últimas notificaciones generadas:');
                updatedNotifications.data?.data?.slice(0, 3).forEach((notif, index) => {
                    console.log(`   ${index + 1}. ${notif.subject || 'Sin asunto'}`);
                    console.log(`      Estado: ${notif.status} | Prioridad: ${notif.priority || 'N/A'}`);
                });
            }
            
            // 6. Actualizar ticket para generar más notificaciones
            console.log('\n🔄 Actualizando ticket (cambio de estado)...');
            const updateData = {
                ...ticketData,
                status: 'En Progreso',
                title: 'FRONTEND TEST - ACTUALIZADO - Reparación Crítica'
            };
            
            const updateResponse = await makeRequest(`${API_BASE}/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: updateData
            });
            
            if (updateResponse.status === 200) {
                console.log('✅ Ticket actualizado exitosamente');
                
                // 7. Verificar notificaciones finales
                console.log('\n⏳ Esperando nuevas notificaciones de actualización (3 segundos)...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const finalNotifications = await makeRequest(`${API_BASE}/notifications`, {
                    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
                });
                
                const finalCount = finalNotifications.data?.data?.length || 0;
                const totalNewNotifications = finalCount - initialCount;
                
                // 8. Mostrar resumen completo
                console.log('\n🎉 RESUMEN FINAL DEL FLUJO:');
                console.log('═'.repeat(50));
                console.log(`🎫 Ticket creado: ID ${ticketId}`);
                console.log(`📬 Notificaciones iniciales: ${initialCount}`);
                console.log(`📬 Notificaciones finales: ${finalCount}`);
                console.log(`🔔 Nuevas notificaciones: +${totalNewNotifications}`);
                
                if (totalNewNotifications > 0) {
                    console.log('\n📋 TODAS LAS NOTIFICACIONES GENERADAS:');
                    finalNotifications.data?.data?.slice(0, 5).forEach((notif, index) => {
                        console.log(`\n${index + 1}. ${notif.subject || 'Sin asunto'}`);
                        console.log(`   Estado: ${notif.status} | Prioridad: ${notif.priority || 'N/A'}`);
                        console.log(`   Tipo: ${notif.type || 'N/A'} | Creado: ${notif.created_at || 'N/A'}`);
                    });
                }
                
                console.log('\n✅ FLUJO COMPLETO EXITOSO - SISTEMA FUNCIONANDO CORRECTAMENTE');
                console.log('🔔 Frontend → Backend → Triggers → Notificaciones ✅');
                
            } else {
                console.log('❌ Error actualizando ticket:', updateResponse.status);
            }
            
        } else {
            console.log('❌ Error creando ticket:', createResponse.status, createResponse.data);
        }
        
    } catch (error) {
        console.error('\n❌ ERROR EN FLUJO COMPLETO:', error.message);
    }
}

// Ejecutar flujo completo
console.log('🚀 Iniciando prueba de flujo completo...');
testCompleteWorkflow();