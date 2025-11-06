// test-informes-tecnicos-completo.js - Test completo del módulo de informes técnicos
const API_URL = 'http://localhost:3000/api';

// Credenciales de prueba
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

let authToken = null;
let testTicketId = null;

console.log('🧪 Test de Módulo de Informes Técnicos\n');
console.log('=========================================\n');

// Función auxiliar para hacer peticiones autenticadas
async function authenticatedFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    return response;
}

// 1. Login
async function testLogin() {
    console.log('📝 TEST 1: Login de usuario');
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });

        const result = await response.json();

        if (result.token) {
            authToken = result.token;
            console.log('✅ Login exitoso');
            console.log(`   Token: ${authToken.substring(0, 20)}...`);
            return true;
        } else {
            console.log('❌ Login falló:', result);
            return false;
        }
    } catch (error) {
        console.log('❌ Error en login:', error.message);
        return false;
    }
}

// 2. Crear ticket de prueba con comentarios etiquetados
async function testCreateTicket() {
    console.log('\n📝 TEST 2: Crear ticket de prueba con comentarios etiquetados');
    try {
        // Crear ticket
        const ticketData = {
            title: 'Mantenimiento Preventivo - Cinta Matrix T7xe',
            description: 'Mantenimiento programado según protocolo',
            priority: 'Alta',
            client_id: 1,
            location_id: 1,
            equipment_id: 1
        };

        const response = await authenticatedFetch(`${API_URL}/tickets`, {
            method: 'POST',
            body: JSON.stringify(ticketData)
        });

        const result = await response.json();

        if (result.message === 'success' && result.data) {
            testTicketId = result.data.id;
            console.log(`✅ Ticket creado: #${testTicketId}`);
            return true;
        } else {
            console.log('❌ Error creando ticket:', result);
            return false;
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
}

// 3. Agregar comentarios etiquetados al ticket
async function testAddTaggedComments() {
    console.log('\n📝 TEST 3: Agregar comentarios etiquetados');
    
    const comments = [
        {
            tag: '#diagnostico',
            text: '#diagnostico Revisión visual completa del equipo. Banda presenta desgaste normal. Rodillos en buen estado. Sistema eléctrico funcional.'
        },
        {
            tag: '#trabajo',
            text: '#trabajo Limpieza profunda de banda y rodillos con producto especializado.'
        },
        {
            tag: '#trabajo',
            text: '#trabajo Lubricación de banda aplicada según especificaciones del fabricante.'
        },
        {
            tag: '#trabajo',
            text: '#trabajo Ajuste de tensión de banda y calibración de sensores de velocidad.'
        },
        {
            tag: '#solucion',
            text: '#solucion Mantenimiento preventivo completado exitosamente. Equipo funcionando dentro de parámetros normales. Todos los sistemas operativos.'
        },
        {
            tag: '#recomendacion',
            text: '#recomendacion Mantener programa de lubricación cada 100 horas de uso.'
        },
        {
            tag: '#recomendacion',
            text: '#recomendacion Revisar tensión de banda semanalmente.'
        },
        {
            tag: '#recomendacion',
            text: '#recomendacion Programar próximo mantenimiento preventivo en 3 meses.'
        },
        {
            tag: '#cierre',
            text: '#cierre Servicio completado satisfactoriamente el día de hoy. El equipo fue probado completamente y entregado al cliente funcionando correctamente. Cliente satisfecho con el servicio prestado. Se entregan recomendaciones de mantenimiento para extender vida útil del equipo.'
        }
    ];

    try {
        let successCount = 0;

        for (const comment of comments) {
            const response = await authenticatedFetch(`${API_URL}/tickets/${testTicketId}/comments`, {
                method: 'POST',
                body: JSON.stringify({
                    comment_text: comment.text
                })
            });

            const result = await response.json();

            if (result.message === 'success') {
                console.log(`✅ Comentario agregado: ${comment.tag}`);
                successCount++;
            } else {
                console.log(`❌ Error con ${comment.tag}:`, result);
            }
        }

        console.log(`\n📊 ${successCount}/${comments.length} comentarios agregados`);
        return successCount === comments.length;

    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
}

// 4. Cerrar ticket (marcar como completed)
async function testCompleteTicket() {
    console.log('\n📝 TEST 4: Marcar ticket como completado');
    try {
        const response = await authenticatedFetch(`${API_URL}/tickets/${testTicketId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                status: 'completed'
            })
        });

        const result = await response.json();

        if (result.message === 'success') {
            console.log(`✅ Ticket #${testTicketId} marcado como completado`);
            return true;
        } else {
            console.log('❌ Error:', result);
            return false;
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
}

// 5. Obtener datos para informe
async function testGetInformeData() {
    console.log('\n📝 TEST 5: Obtener datos completos para informe');
    try {
        const response = await authenticatedFetch(`${API_URL}/tickets/${testTicketId}/informe-data`);
        const result = await response.json();

        if (result.message === 'success' && result.data) {
            const { ticket, comments, photos } = result.data;

            console.log('✅ Datos obtenidos exitosamente:');
            console.log(`   Ticket: #${ticket.id} - ${ticket.title}`);
            console.log(`   Cliente: ${ticket.client_name || 'N/A'}`);
            console.log(`   Equipo: ${ticket.equipment_model || 'N/A'}`);
            console.log(`   Técnico: ${ticket.technician_name || 'N/A'}`);
            console.log(`   Comentarios: ${comments.length}`);
            console.log(`   Fotos: ${photos.length}`);

            // Verificar comentarios etiquetados
            console.log('\n📋 Comentarios etiquetados encontrados:');
            const tags = ['#diagnostico', '#trabajo', '#solucion', '#recomendacion', '#cierre'];
            tags.forEach(tag => {
                const count = comments.filter(c => c.comment_text.includes(tag)).length;
                console.log(`   ${tag}: ${count}`);
            });

            return true;
        } else {
            console.log('❌ Error:', result);
            return false;
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
}

// 6. Registrar informe generado
async function testRegisterInforme() {
    console.log('\n📝 TEST 6: Registrar informe en base de datos');
    try {
        const informeData = {
            ticket_id: testTicketId,
            filename: `Informe_tecnico_${testTicketId}_${Date.now()}.pdf`,
            notas_adicionales: 'Test de generación de informe técnico',
            client_email: 'cliente@ejemplo.com'
        };

        const response = await authenticatedFetch(`${API_URL}/informes`, {
            method: 'POST',
            body: JSON.stringify(informeData)
        });

        const result = await response.json();

        if (result.message === 'success' && result.data) {
            console.log('✅ Informe registrado exitosamente:');
            console.log(`   ID: ${result.data.id}`);
            console.log(`   Ticket: #${result.data.ticket_id}`);
            console.log(`   Archivo: ${result.data.filename}`);
            return result.data.id;
        } else {
            console.log('❌ Error:', result);
            return null;
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        return null;
    }
}

// 7. Listar informes generados
async function testListInformes() {
    console.log('\n📝 TEST 7: Listar informes generados');
    try {
        const response = await authenticatedFetch(`${API_URL}/informes`);
        const result = await response.json();

        if (result.message === 'success' && result.data) {
            console.log(`✅ ${result.data.length} informes encontrados:`);
            
            result.data.slice(0, 5).forEach(informe => {
                console.log(`   ID: ${informe.id} | Ticket: #${informe.ticket_id} | ${informe.filename}`);
            });

            if (result.data.length > 5) {
                console.log(`   ... y ${result.data.length - 5} más`);
            }

            return true;
        } else {
            console.log('❌ Error:', result);
            return false;
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
}

// 8. Verificar tabla InformesTecnicos
async function testInformesTecnicosTable() {
    console.log('\n📝 TEST 8: Verificar tabla InformesTecnicos');
    try {
        // Intentar consultar la tabla
        const response = await authenticatedFetch(`${API_URL}/informes`);
        
        if (response.ok) {
            console.log('✅ Tabla InformesTecnicos existe y es accesible');
            return true;
        } else {
            console.log('❌ Error accediendo a tabla:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
}

// Ejecutar todos los tests
async function runAllTests() {
    console.log('🚀 Iniciando batería de tests...\n');
    
    const tests = [
        { name: 'Login', fn: testLogin },
        { name: 'Crear Ticket', fn: testCreateTicket },
        { name: 'Comentarios Etiquetados', fn: testAddTaggedComments },
        { name: 'Completar Ticket', fn: testCompleteTicket },
        { name: 'Obtener Datos Informe', fn: testGetInformeData },
        { name: 'Registrar Informe', fn: testRegisterInforme },
        { name: 'Listar Informes', fn: testListInformes },
        { name: 'Tabla InformesTecnicos', fn: testInformesTecnicosTable }
    ];

    const results = [];

    for (const test of tests) {
        const result = await test.fn();
        results.push({ name: test.name, passed: result });
    }

    // Resumen
    console.log('\n\n=========================================');
    console.log('📊 RESUMEN DE TESTS');
    console.log('=========================================\n');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(result => {
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
    });

    console.log(`\n📈 Total: ${passed}/${total} tests pasados (${Math.round(passed/total*100)}%)`);

    if (passed === total) {
        console.log('\n🎉 ¡Todos los tests pasaron exitosamente!');
        console.log('\n📄 El módulo de Informes Técnicos está completamente funcional');
        console.log('\n✨ Próximos pasos:');
        console.log('   1. Abrir http://localhost:8080/reportes.html');
        console.log('   2. Click en "Informe Técnico"');
        console.log(`   3. Seleccionar ticket #${testTicketId}`);
        console.log('   4. Verificar preview de datos');
        console.log('   5. Generar PDF');
    } else {
        console.log('\n⚠️  Algunos tests fallaron. Revisar logs arriba.');
    }

    console.log('\n=========================================\n');
}

// Ejecutar
runAllTests().catch(error => {
    console.error('\n💥 Error fatal en tests:', error);
    process.exit(1);
});
