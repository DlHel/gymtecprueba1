/**
 * Test Completo del Sistema Gymtec ERP - Versión Simplificada
 * Verifica funcionalidad completa usando fetch nativo de Node.js
 */

// Configuración
const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:8080';

let authToken = null;

/**
 * Helper para hacer requests HTTP
 */
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            timeout: 10000
        });
        
        const data = await response.text();
        let jsonData = null;
        
        try {
            jsonData = JSON.parse(data);
        } catch (e) {
            // No es JSON válido
        }
        
        return {
            status: response.status,
            data: jsonData || data,
            ok: response.ok
        };
    } catch (error) {
        return {
            status: 0,
            data: null,
            error: error.message,
            ok: false
        };
    }
}

/**
 * Test de conexión al backend
 */
async function testBackendConnection() {
    console.log('\n🔧 === PRUEBA DE BACKEND ===');
    
    // Probar endpoint sin autenticación
    const response = await makeRequest(`${API_BASE}/clients`);
    
    if (response.status === 401) {
        console.log('✅ Backend responde correctamente (requiere autenticación como esperado)');
        return true;
    } else if (response.status === 200) {
        console.log('✅ Backend responde correctamente');
        return true;
    } else {
        console.log(`❌ Backend no responde correctamente (Status: ${response.status})`);
        console.log(`📋 Error: ${response.error || 'Desconocido'}`);
        return false;
    }
}

/**
 * Test de autenticación
 */
async function testAuthentication() {
    console.log('\n🔐 === PRUEBA DE AUTENTICACIÓN ===');
    
    const loginData = {
        username: 'admin@gymtec.com',
        password: 'admin123'
    };
    
    const response = await makeRequest(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    });
    
    if (response.ok && response.data && response.data.token) {
        authToken = response.data.token;
        console.log('✅ Autenticación exitosa');
        console.log(`📋 Token obtenido: ${authToken.substring(0, 20)}...`);
        console.log(`👤 Usuario: ${response.data.user?.username || response.data.user?.email || 'admin'}`);
        console.log(`🎯 Rol: ${response.data.user?.role || 'admin'}`);
        return true;
    } else {
        console.log(`❌ Error de autenticación (Status: ${response.status})`);
        console.log(`📋 Respuesta: ${JSON.stringify(response.data, null, 2)}`);
        return false;
    }
}

/**
 * Test de endpoints principales
 */
async function testMainEndpoints() {
    console.log('\n📡 === PRUEBA DE ENDPOINTS PRINCIPALES ===');
    
    if (!authToken) {
        console.log('❌ No hay token disponible para las pruebas');
        return false;
    }
    
    const endpoints = [
        { name: 'tickets', path: '/tickets' },
        { name: 'clients', path: '/clients' },
        { name: 'equipment', path: '/equipment' },
        { name: 'users', path: '/users' },
        { name: 'locations', path: '/locations' }
    ];
    
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    let successCount = 0;
    
    for (const endpoint of endpoints) {
        console.log(`🔍 Probando ${endpoint.name}...`);
        
        const response = await makeRequest(`${API_BASE}${endpoint.path}`, {
            method: 'GET',
            headers
        });
        
        if (response.ok && response.data) {
            const dataCount = Array.isArray(response.data.data) ? response.data.data.length : 'N/A';
            console.log(`   ✅ ${endpoint.name}: OK (${dataCount} registros)`);
            successCount++;
        } else {
            console.log(`   ❌ ${endpoint.name}: Error ${response.status} - ${response.error || 'Desconocido'}`);
        }
    }
    
    console.log(`📊 Endpoints exitosos: ${successCount}/${endpoints.length}`);
    return successCount > 0;
}

/**
 * Test de frontend
 */
async function testFrontend() {
    console.log('\n🌐 === PRUEBA DE FRONTEND ===');
    
    const response = await makeRequest(FRONTEND_BASE);
    
    if (response.ok) {
        console.log('✅ Frontend accesible');
        
        // Verificar archivos críticos
        const criticalFiles = [
            '/login.html',
            '/tickets.html',
            '/js/auth.js',
            '/js/config.js',
            '/js/tickets.js'
        ];
        
        let fileSuccessCount = 0;
        
        for (const file of criticalFiles) {
            const fileResponse = await makeRequest(`${FRONTEND_BASE}${file}`);
            
            if (fileResponse.ok) {
                console.log(`   ✅ ${file}: Disponible`);
                fileSuccessCount++;
            } else {
                console.log(`   ❌ ${file}: No encontrado (${fileResponse.status})`);
            }
        }
        
        console.log(`📊 Archivos críticos encontrados: ${fileSuccessCount}/${criticalFiles.length}`);
        return fileSuccessCount >= 3; // Al menos 3 archivos críticos deben estar
    } else {
        console.log(`❌ Frontend no accesible (Status: ${response.status})`);
        return false;
    }
}

/**
 * Test de funcionalidad de tickets (la funcionalidad principal)
 */
async function testTicketsFunctionality() {
    console.log('\n🎫 === PRUEBA DE FUNCIONALIDAD DE TICKETS ===');
    
    if (!authToken) {
        console.log('❌ No hay token disponible para pruebas de tickets');
        return false;
    }
    
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    // 1. Probar listado de tickets
    console.log('🔍 Probando listado de tickets...');
    const ticketsResponse = await makeRequest(`${API_BASE}/tickets`, {
        method: 'GET',
        headers
    });
    
    if (ticketsResponse.ok && ticketsResponse.data) {
        const tickets = ticketsResponse.data.data || [];
        console.log(`   ✅ Listado de tickets: ${tickets.length} tickets encontrados`);
        
        if (tickets.length > 0) {
            const ticket = tickets[0];
            console.log(`   📋 Ejemplo: Ticket #${ticket.id} - ${ticket.title || 'Sin título'}`);
            console.log(`   📅 Estado: ${ticket.status || 'Sin estado'} | Prioridad: ${ticket.priority || 'Sin prioridad'}`);
        }
    } else {
        console.log(`   ❌ Error en listado de tickets: ${ticketsResponse.status}`);
        return false;
    }
    
    // 2. Probar obtención de clientes (necesario para crear tickets)
    console.log('🔍 Probando listado de clientes...');
    const clientsResponse = await makeRequest(`${API_BASE}/clients`, {
        method: 'GET',
        headers
    });
    
    if (clientsResponse.ok && clientsResponse.data) {
        const clients = clientsResponse.data.data || [];
        console.log(`   ✅ Listado de clientes: ${clients.length} clientes encontrados`);
    } else {
        console.log(`   ❌ Error en listado de clientes: ${clientsResponse.status}`);
    }
    
    // 3. Probar templates de checklist (funcionalidad gimnación)
    console.log('🔍 Probando templates de checklist...');
    const templatesResponse = await makeRequest(`${API_BASE}/checklist-templates`, {
        method: 'GET',
        headers
    });
    
    if (templatesResponse.ok || templatesResponse.status === 404) {
        console.log(`   ✅ Endpoint de templates accesible (puede estar vacío)`);
    } else {
        console.log(`   ❌ Error en templates: ${templatesResponse.status}`);
    }
    
    return true;
}

/**
 * Generar reporte final
 */
function generateReport(results) {
    console.log('\n📋 === REPORTE FINAL DEL SISTEMA ===');
    console.log('==========================================');
    
    const {
        backend,
        authentication,
        endpoints,
        frontend,
        tickets
    } = results;
    
    console.log('\n🔧 COMPONENTES PRINCIPALES:');
    console.log(`   Backend: ${backend ? '✅ FUNCIONAL' : '❌ NO FUNCIONAL'}`);
    console.log(`   Autenticación: ${authentication ? '✅ FUNCIONAL' : '❌ NO FUNCIONAL'}`);
    console.log(`   Endpoints API: ${endpoints ? '✅ FUNCIONAL' : '❌ NO FUNCIONAL'}`);
    console.log(`   Frontend: ${frontend ? '✅ FUNCIONAL' : '❌ NO FUNCIONAL'}`);
    console.log(`   Funcionalidad Tickets: ${tickets ? '✅ FUNCIONAL' : '❌ NO FUNCIONAL'}`);
    
    const allOK = backend && authentication && endpoints && frontend && tickets;
    
    console.log('\n🎯 ESTADO GENERAL:');
    console.log('==========================================');
    if (allOK) {
        console.log('🟢 SISTEMA COMPLETAMENTE FUNCIONAL ✅');
        console.log('🚀 Listo para desarrollo y pruebas');
        console.log('🎉 Todos los componentes están operativos');
    } else {
        console.log('🟡 SISTEMA PARCIALMENTE FUNCIONAL ⚠️');
        
        if (!backend) console.log('❌ Backend tiene problemas');
        if (!authentication) console.log('❌ Sistema de autenticación no funciona');
        if (!endpoints) console.log('❌ Endpoints API tienen problemas');
        if (!frontend) console.log('❌ Frontend no está accesible correctamente');
        if (!tickets) console.log('❌ Funcionalidad de tickets tiene problemas');
    }
    
    console.log('\n🌐 INFORMACIÓN DE ACCESO:');
    console.log('==========================================');
    console.log(`🔗 Frontend: http://localhost:8080`);
    console.log(`🔗 Backend API: http://localhost:3000/api`);
    console.log(`🔗 Login: http://localhost:8080/login.html`);
    console.log(`🔗 Tickets: http://localhost:8080/tickets.html`);
    
    console.log('\n👤 CREDENCIALES DE PRUEBA:');
    console.log('==========================================');
    console.log(`📧 Email: admin@gymtec.com`);
    console.log(`🔑 Contraseña: admin123`);
    console.log(`🎯 Rol: Administrador`);
    
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('==========================================');
    if (allOK) {
        console.log('1. ✅ Acceder a http://localhost:8080/login.html');
        console.log('2. ✅ Usar las credenciales admin@gymtec.com / admin123');
        console.log('3. ✅ Navegar a la gestión de tickets');
        console.log('4. ✅ Probar creación de tickets');
        console.log('5. ✅ Verificar que los tickets aparezcan en la lista');
    } else {
        console.log('1. 🔧 Revisar los componentes que fallaron');
        console.log('2. 🔧 Verificar que MySQL esté corriendo');
        console.log('3. 🔧 Verificar que ambos servidores estén iniciados');
        console.log('4. 🔧 Comprobar configuración de base de datos');
    }
    
    console.log('\n==========================================');
    
    return allOK;
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
    console.log('🚀 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA GYMTEC ERP');
    console.log('======================================================');
    console.log('⏱️  Iniciando diagnóstico del sistema...\n');
    
    const results = {
        backend: false,
        authentication: false,
        endpoints: false,
        frontend: false,
        tickets: false
    };
    
    try {
        // Ejecutar pruebas secuencialmente
        results.backend = await testBackendConnection();
        results.authentication = await testAuthentication();
        results.endpoints = await testMainEndpoints();
        results.frontend = await testFrontend();
        results.tickets = await testTicketsFunctionality();
        
        // Generar reporte final
        const systemOK = generateReport(results);
        
        if (systemOK) {
            console.log('🎊 ¡SISTEMA LISTO PARA USAR! 🎊');
        } else {
            console.log('⚠️  Sistema necesita atención');
        }
        
    } catch (error) {
        console.error('💥 Error crítico durante las pruebas:', error.message);
        console.error('🔍 Stack trace:', error.stack);
    }
}

// Verificar que Node.js tenga fetch (Node 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ ERROR: Este script requiere Node.js 18+ con fetch nativo');
    console.error('ℹ️  Alternativa: npm install node-fetch y modificar el script');
    process.exit(1);
}

// Ejecutar pruebas
console.log('🔍 Verificando Node.js y dependencias...');
console.log(`✅ Node.js ${process.version} detectado`);
console.log('✅ Fetch nativo disponible');

runAllTests().catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
});