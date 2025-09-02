#!/usr/bin/env node

const fetch = require('node-fetch');

console.log('🔍 Verificando corrección del sistema de tickets...\n');

async function verifyFix() {
    try {
        // Simular llamada autenticada al endpoint
        const response = await fetch('http://localhost:3000/api/tickets/7/detail', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyNTIzODkzNCwiZXhwIjoxNzI1MjQyNTM0fQ.OZNCtO_L_Nk3YhNXCFAjhJKxFGqhVbUCtJbPgL5HZGw'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('✅ Respuesta del endpoint /api/tickets/7/detail:');
        console.log('📊 Datos recibidos:');
        console.log(`   🎫 Ticket: ${data.data.title}`);
        console.log(`   📸 Fotos: ${data.data.photos?.length || 0}`);
        console.log(`   📝 Comentarios: ${data.data.notes?.length || 0}`);
        console.log(`   📋 Checklist: ${data.data.checklist?.length || 0}`);
        
        console.log('\n📈 Metadata:');
        console.log(`   photos_count: ${data.data.metadata?.photos_count || 0}`);
        console.log(`   notes_count: ${data.data.metadata?.notes_count || 0}`);
        console.log(`   checklist_count: ${data.data.metadata?.checklist_count || 0}`);
        
        // Verificar que la corrección funcionó
        const hasNotes = (data.data.notes?.length || 0) > 0;
        const hasChecklist = (data.data.checklist?.length || 0) > 0;
        
        console.log('\n🎯 Estado de la corrección:');
        console.log(`   Comentarios cargados: ${hasNotes ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Checklist cargado: ${hasChecklist ? '✅ SÍ' : '❌ NO'}`);
        
        if (hasNotes && hasChecklist) {
            console.log('\n🎉 ¡CORRECCIÓN EXITOSA! El problema está completamente resuelto.');
        } else {
            console.log('\n⚠️ La corrección necesita más trabajo.');
        }
        
    } catch (error) {
        console.error('❌ Error verificando corrección:', error.message);
    }
}

verifyFix();
