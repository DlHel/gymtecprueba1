const axios = require('axios');

console.log('🌐 VERIFICACIÓN COMPLETA DE APIs - GYMTEC ERP\n');

const BASE_URL = 'http://localhost:3000';

// Lista de endpoints a verificar (basados en el servidor real)
const endpoints = [
    // Clientes
    { method: 'GET', path: '/api/clients', description: 'Obtener todos los clientes' },
    { method: 'GET', path: '/api/clients/1/locations', description: 'Obtener ubicaciones de cliente' },
    
    // Ubicaciones y Equipos
    { method: 'GET', path: '/api/locations/1/equipment', description: 'Obtener equipos de ubicación' },
    { method: 'GET', path: '/api/equipment/1/tickets', description: 'Obtener tickets de equipo' },
    
    // Inventario
    { method: 'GET', path: '/api/inventory', description: 'Obtener inventario completo' },
    
    // Modelos
    { method: 'GET', path: '/api/models', description: 'Obtener todos los modelos' },
    { method: 'GET', path: '/api/models/1', description: 'Obtener modelo específico' },
    { method: 'GET', path: '/api/models/1/photos', description: 'Obtener fotos de modelo' },
    { method: 'GET', path: '/api/models/1/main-photo', description: 'Obtener foto principal de modelo' },
    
    // Tickets
    { method: 'GET', path: '/api/tickets', description: 'Obtener todos los tickets' },
    { method: 'GET', path: '/api/tickets/1', description: 'Obtener ticket específico' },
    
    // Notas y Fotos
    { method: 'GET', path: '/api/equipment/1/notes', description: 'Obtener notas de equipo' },
    { method: 'GET', path: '/api/equipment/1/photos', description: 'Obtener fotos de equipo' }
];

async function verifyAPI(endpoint) {
    try {
        const url = `${BASE_URL}${endpoint.path}`;
        const response = await axios({
            method: endpoint.method,
            url: url,
            timeout: 5000,
            validateStatus: function (status) {
                return status < 500; // Acepta cualquier status code menor a 500
            }
        });
        
        return {
            success: response.status >= 200 && response.status < 400,
            status: response.status,
            hasData: response.data && (Array.isArray(response.data) ? response.data.length > 0 : Object.keys(response.data).length > 0),
            dataCount: Array.isArray(response.data) ? response.data.length : (response.data ? 1 : 0),
            error: null
        };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 0,
            hasData: false,
            dataCount: 0,
            error: error.code === 'ECONNREFUSED' ? 'Servidor no disponible' : error.message
        };
    }
}

async function verifyAllAPIs() {
    let totalAPIs = endpoints.length;
    let successfulAPIs = 0;
    let failedAPIs = 0;
    let apisWithData = 0;
    
    console.log(`🔍 Verificando ${totalAPIs} endpoints...\n`);
    
    for (const endpoint of endpoints) {
        const result = await verifyAPI(endpoint);
        
        if (result.success) {
            successfulAPIs++;
            if (result.hasData) {
                apisWithData++;
                console.log(`✅ ${endpoint.method} ${endpoint.path} - OK (${result.status}) - ${result.dataCount} registros`);
            } else {
                console.log(`⚠️  ${endpoint.method} ${endpoint.path} - OK (${result.status}) - Sin datos`);
            }
        } else {
            failedAPIs++;
            console.log(`❌ ${endpoint.method} ${endpoint.path} - FALLO (${result.status}) - ${result.error}`);
        }
        
        console.log(`   📝 ${endpoint.description}`);
        console.log('');
    }
    
    // Resumen
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN DE APIs:');
    console.log(`   ✅ APIs exitosas: ${successfulAPIs}/${totalAPIs}`);
    console.log(`   ❌ APIs fallidas: ${failedAPIs}/${totalAPIs}`);
    console.log(`   📊 APIs con datos: ${apisWithData}/${totalAPIs}`);
    console.log(`   📈 Porcentaje de éxito: ${((successfulAPIs / totalAPIs) * 100).toFixed(1)}%`);
    
    if (failedAPIs === 0) {
        console.log('\n🎉 ¡TODAS LAS APIs FUNCIONAN CORRECTAMENTE!');
    } else if (failedAPIs <= 2) {
        console.log('\n⚠️  Mayoría de APIs funcionando - revisar APIs fallidas');
    } else {
        console.log('\n❌ Múltiples APIs fallando - revisar servidor backend');
    }
}

// Verificar si el servidor está disponible primero
async function checkServerHealth() {
    try {
        console.log('🏥 Verificando salud del servidor...');
        // Intentar con diferentes endpoints
        let response;
        try {
            response = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
        } catch {
            // Si /health no existe, intentar con /api/clients
            response = await axios.get(`${BASE_URL}/api/clients`, { timeout: 3000 });
        }
        console.log('✅ Servidor backend disponible\n');
        return true;
    } catch (error) {
        console.log('❌ Servidor backend no disponible');
        console.log('   💡 Asegúrate de que el servidor esté ejecutándose en el puerto 3000\n');
        return false;
    }
}

async function main() {
    const serverAvailable = await checkServerHealth();
    
    if (serverAvailable) {
        await verifyAllAPIs();
    } else {
        console.log('⏹️  No se pueden verificar las APIs sin el servidor backend');
        console.log('   🚀 Ejecuta: npm start (desde la carpeta backend)');
    }
}

main(); 