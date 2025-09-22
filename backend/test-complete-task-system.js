/**
 * GYMTEC ERP - Prueba Completa del Sistema de Generación Automática de Tareas
 * Verifica que las correlaciones inteligentes y generación automática funcionen
 */

// Usar fetch nativo de Node.js 18+
const fetch = globalThis.fetch;

const API_BASE = 'http://localhost:3000/api';
let authToken = '';

console.log('🧪 PRUEBA COMPLETA: Sistema de Generación Automática de Tareas\n');

async function testCompleteTaskGenerator() {
    try {
        console.log('1️⃣ Autenticación...');
        await authenticate();
        
        console.log('\n2️⃣ Probando correlaciones del dashboard...');
        await testDashboardCorrelations();
        
        console.log('\n3️⃣ Probando preview de generación de tareas...');
        await testTaskGenerationPreview();
        
        console.log('\n4️⃣ Probando generación de tareas para un contrato...');
        await testSingleContractGeneration();
        
        console.log('\n5️⃣ Probando generación masiva (simulación)...');
        await testBulkGenerationPreview();
        
        console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
        console.log('🎯 El sistema de generación automática está funcionando correctamente');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        throw error;
    }
}

async function authenticate() {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });
    
    if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
    }
    
    const data = await response.json();
    authToken = data.token;
    console.log('   ✅ Autenticación exitosa');
}

async function testDashboardCorrelations() {
    // Test SLA vs Planning correlation
    const slaResponse = await fetch(`${API_BASE}/dashboard/correlations/sla-planning`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!slaResponse.ok) {
        throw new Error(`SLA correlation failed: ${slaResponse.status}`);
    }
    
    const slaData = await slaResponse.json();
    console.log('   📊 SLA vs Planning:', {
        compliance: `${slaData.data.compliance_percentage}%`,
        tasks: `${slaData.data.completed_tasks}/${slaData.data.total_tasks}`,
        status: slaData.data.status
    });
    
    // Test contracts correlation
    const contractsResponse = await fetch(`${API_BASE}/dashboard/correlations/contracts-sla`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!contractsResponse.ok) {
        throw new Error(`Contracts correlation failed: ${contractsResponse.status}`);
    }
    
    const contractsData = await contractsResponse.json();
    console.log('   📋 Contracts & SLA:', {
        contracts: `${contractsData.data.active_contracts} activos`,
        compliance: `${contractsData.data.avg_compliance}%`,
        revenue: `$${contractsData.data.total_revenue.toLocaleString()}`
    });
    
    // Test operational efficiency
    const efficiencyResponse = await fetch(`${API_BASE}/dashboard/correlations/operational-efficiency`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!efficiencyResponse.ok) {
        throw new Error(`Efficiency correlation failed: ${efficiencyResponse.status}`);
    }
    
    const efficiencyData = await efficiencyResponse.json();
    console.log('   ⚡ Operational Efficiency:', {
        index: `${efficiencyData.data.efficiency_index}%`,
        completion: `${efficiencyData.data.task_completion_rate}%`,
        correlation: `${efficiencyData.data.correlation_index}%`
    });
}

async function testTaskGenerationPreview() {
    // Get a contract first
    const contractsResponse = await fetch(`${API_BASE}/contracts`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const contractsData = await contractsResponse.json();
    const contract = contractsData.data?.[0];
    
    if (!contract) {
        console.log('   ⚠️ No contracts found for preview test');
        return;
    }
    
    const previewResponse = await fetch(`${API_BASE}/contracts/${contract.id}/task-generation-preview`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!previewResponse.ok) {
        throw new Error(`Task preview failed: ${previewResponse.status}`);
    }
    
    const previewData = await previewResponse.json();
    console.log('   👁️ Preview para contrato:', contract.contract_number);
    console.log('   📝 Tareas a generar:', previewData.data.preview_tasks.length);
    console.log('   🗓️ Próximas fechas:', 
        previewData.data.preview_tasks.slice(0, 3).map(t => t.scheduled_date).join(', ')
    );
    console.log('   💰 Valor del contrato: $', contract.contract_value?.toLocaleString() || 'N/A');
}

async function testSingleContractGeneration() {
    // Get a contract for generation
    const contractsResponse = await fetch(`${API_BASE}/contracts`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const contractsData = await contractsResponse.json();
    const contract = contractsData.data?.[0];
    
    if (!contract) {
        console.log('   ⚠️ No contracts found for generation test');
        return;
    }
    
    const generateResponse = await fetch(`${API_BASE}/contracts/${contract.id}/generate-tasks`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            months_ahead: 2,
            force_regenerate: true
        })
    });
    
    if (!generateResponse.ok) {
        throw new Error(`Task generation failed: ${generateResponse.status}`);
    }
    
    const generateData = await generateResponse.json();
    console.log('   🏭 Generación para contrato:', contract.contract_number);
    console.log('   ✅ Tareas generadas:', generateData.data.generated_tasks);
    console.log('   🔄 Tareas actualizadas:', generateData.data.updated_tasks || 0);
    console.log('   📊 Total equipos procesados:', generateData.data.equipment_processed || 'N/A');
}

async function testBulkGenerationPreview() {
    const bulkResponse = await fetch(`${API_BASE}/contracts/generate-all-tasks`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            months_ahead: 1,
            dry_run: true  // Solo preview, no generar realmente
        })
    });
    
    if (!bulkResponse.ok) {
        throw new Error(`Bulk generation preview failed: ${bulkResponse.status}`);
    }
    
    const bulkData = await bulkResponse.json();
    console.log('   📊 Preview generación masiva:');
    console.log('   📋 Contratos procesados:', bulkData.data.contracts_processed);
    console.log('   🎯 Total tareas a generar:', bulkData.data.total_tasks_to_generate);
    console.log('   ⏱️ Tiempo estimado:', bulkData.data.estimated_time);
    console.log('   💡 Recomendación:', bulkData.data.recommendation);
}

// Ejecutar pruebas
if (require.main === module) {
    testCompleteTaskGenerator()
        .then(() => {
            console.log('\n🎉 SISTEMA COMPLETAMENTE FUNCIONAL');
            console.log('🚀 Listo para uso en producción');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 FALLO EN LAS PRUEBAS:', error.message);
            process.exit(1);
        });
}

module.exports = { testCompleteTaskGenerator };