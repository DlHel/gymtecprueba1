// const fetch = require('node-fetch'); // Node 18+ tiene fetch integrado

const API_BASE = 'http://localhost:3000/api';

async function testIntelligentAssignmentAPI() {
    console.log('🧪 Probando API del Sistema de Asignación Inteligente...\n');

    try {
        // 1. Test: Análisis de carga de trabajo
        console.log('📋 1. Probando análisis de carga de trabajo...');
        const workloadResponse = await fetch(`${API_BASE}/intelligent-assignment/workload-analysis`);
        
        if (workloadResponse.ok) {
            const workloadData = await workloadResponse.json();
            console.log('✅ Análisis de carga de trabajo:', JSON.stringify(workloadData, null, 2));
        } else {
            console.log('❌ Error en análisis de carga de trabajo:', workloadResponse.status, await workloadResponse.text());
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // 2. Test: Análisis de técnicos para tarea específica
        console.log('📋 2. Probando análisis de técnicos para tarea 4...');
        const analysisResponse = await fetch(`${API_BASE}/intelligent-assignment/analyze-technicians/4`);
        
        if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            console.log('✅ Análisis de técnicos:', JSON.stringify(analysisData, null, 2));
        } else {
            console.log('❌ Error en análisis de técnicos:', analysisResponse.status, await analysisResponse.text());
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // 3. Test: Asignación automática de tarea
        console.log('📋 3. Probando asignación automática de tarea 4...');
        const assignResponse = await fetch(`${API_BASE}/intelligent-assignment/assign-task/4`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            console.log('✅ Asignación automática:', JSON.stringify(assignData, null, 2));
        } else {
            console.log('❌ Error en asignación automática:', assignResponse.status, await assignResponse.text());
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // 4. Test: Logs de asignación
        console.log('📋 4. Probando logs de asignación...');
        const logsResponse = await fetch(`${API_BASE}/intelligent-assignment/assignment-logs`);
        
        if (logsResponse.ok) {
            const logsData = await logsResponse.json();
            console.log('✅ Logs de asignación:', JSON.stringify(logsData, null, 2));
        } else {
            console.log('❌ Error en logs de asignación:', logsResponse.status, await logsResponse.text());
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // 5. Test: Asignación masiva
        console.log('📋 5. Probando asignación masiva de tareas [5, 6]...');
        const bulkResponse = await fetch(`${API_BASE}/intelligent-assignment/bulk-assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                taskIds: [5, 6]
            })
        });
        
        if (bulkResponse.ok) {
            const bulkData = await bulkResponse.json();
            console.log('✅ Asignación masiva:', JSON.stringify(bulkData, null, 2));
        } else {
            console.log('❌ Error en asignación masiva:', bulkResponse.status, await bulkResponse.text());
        }

        console.log('\n🎉 Pruebas de API completadas!');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar pruebas
testIntelligentAssignmentAPI();