/**
 * 🧪 TESTING FRONTEND DIRECTO - FLUJOS DE TRABAJO
 * Script para detectar problemas en los flujos de usuario reales
 */

const http = require('http');
const { URL } = require('url');

function makeRequest(url, options = {}) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 80,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: 5000
            };
            
            if (options.body) {
                requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
            }
            
            const req = http.request(requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    let parsedData = null;
                    try {
                        parsedData = JSON.parse(data);
                    } catch (e) {
                        parsedData = data;
                    }
                    
                    resolve({
                        status: res.statusCode,
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        data: parsedData,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({ status: 0, ok: false, error: error.message, data: null });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({ status: 0, ok: false, error: 'Request timeout', data: null });
            });
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
            
        } catch (error) {
            resolve({ status: 0, ok: false, error: error.message, data: null });
        }
    });
}

let issues = [];
let authToken = null;

function logIssue(severity, module, issue, solution = '') {
    const problem = {
        severity,
        module, 
        issue,
        solution,
        timestamp: new Date().toISOString()
    };
    
    issues.push(problem);
    
    const emoji = {
        'CRITICAL': '🚨',
        'HIGH': '⚠️',
        'MEDIUM': '📝',
        'LOW': '🎨'
    };
    
    console.log(`${emoji[severity]} [${severity}] ${module}: ${issue}`);
    if (solution) {
        console.log(`   🔧 Solución: ${solution}`);
    }
}

async function testAuthFlow() {
    console.log('\n🔐 === TESTING FLUJO DE AUTENTICACIÓN ===');
    
    // 1. Obtener token válido
    const loginResponse = await makeRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin@gymtec.com',
            password: 'admin123'
        })
    });
    
    if (loginResponse.ok && loginResponse.data?.token) {
        authToken = loginResponse.data.token;
        console.log('✅ Token de autenticación obtenido');
    } else {
        logIssue('CRITICAL', 'Autenticación', 
                'No se puede obtener token de autenticación', 
                'Verificar credenciales admin y configuración JWT');
        return false;
    }
    
    // 2. Verificar página de login
    const loginPageResponse = await makeRequest('http://localhost:8080/login.html');
    if (!loginPageResponse.ok) {
        logIssue('HIGH', 'Login Page', 
                'Página de login no accesible',
                'Verificar que login.html existe y el servidor frontend está corriendo');
    }
    
    // 3. Verificar scripts de autenticación
    const authJsResponse = await makeRequest('http://localhost:8080/js/auth.js');
    if (!authJsResponse.ok) {
        logIssue('CRITICAL', 'Auth Script', 
                'Script auth.js no disponible',
                'Verificar que js/auth.js existe en el frontend');
    } else {
        const authContent = authJsResponse.body;
        if (!authContent.includes('AuthManager')) {
            logIssue('HIGH', 'Auth Script', 
                    'AuthManager no encontrado en auth.js',
                    'Implementar AuthManager class en auth.js');
        }
        if (!authContent.includes('authenticatedFetch')) {
            logIssue('HIGH', 'Auth Script', 
                    'authenticatedFetch no encontrado',
                    'Implementar función authenticatedFetch para llamadas API');
        }
    }
    
    return true;
}

async function testClientModule() {
    console.log('\n👥 === TESTING MÓDULO CLIENTES ===');
    
    if (!authToken) return;
    
    // 1. Verificar página de clientes
    const clientesPageResponse = await makeRequest('http://localhost:8080/clientes.html');
    if (!clientesPageResponse.ok) {
        logIssue('HIGH', 'Clientes Page', 
                'Página clientes.html no accesible',
                'Verificar que clientes.html existe');
    } else {
        const pageContent = clientesPageResponse.body;
        
        // Verificar elementos clave del DOM
        if (!pageContent.includes('id="add-client-btn"') && !pageContent.includes('btn-add-client')) {
            logIssue('MEDIUM', 'Clientes UI', 
                    'Botón "Crear Cliente" no encontrado en HTML',
                    'Agregar botón para crear nuevos clientes con ID apropiado');
        }
        
        if (!pageContent.includes('client-list') && !pageContent.includes('clientes-table')) {
            logIssue('MEDIUM', 'Clientes UI', 
                    'Tabla/lista de clientes no encontrada',
                    'Agregar elemento para mostrar lista de clientes');
        }
        
        if (!pageContent.includes('js/clientes.js')) {
            logIssue('HIGH', 'Clientes Script', 
                    'Script clientes.js no incluido',
                    'Incluir <script src="js/clientes.js"></script> en clientes.html');
        }
    }
    
    // 2. Verificar API de clientes
    const clientsApiResponse = await makeRequest('http://localhost:3000/api/clients', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!clientsApiResponse.ok) {
        logIssue('CRITICAL', 'Clientes API', 
                'API /clients no responde correctamente',
                'Verificar endpoint de clientes en el backend');
    } else if (!clientsApiResponse.data?.data) {
        logIssue('MEDIUM', 'Clientes API', 
                'Estructura de respuesta inconsistente en /clients',
                'Asegurar que response tenga formato { data: [...] }');
    }
    
    // 3. Test de creación de cliente
    const newClientData = {
        name: 'Test Cliente ' + Date.now(),
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
    };
    
    const createClientResponse = await makeRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newClientData)
    });
    
    if (!createClientResponse.ok) {
        logIssue('HIGH', 'Clientes Create', 
                'No se puede crear cliente vía API',
                'Verificar endpoint POST /clients y validación de datos');
    }
    
    // 4. Verificar script específico
    const clientesJsResponse = await makeRequest('http://localhost:8080/js/clientes.js');
    if (!clientesJsResponse.ok) {
        logIssue('HIGH', 'Clientes Script', 
                'Script clientes.js no existe',
                'Crear js/clientes.js con funcionalidad de gestión de clientes');
    }
}

async function testTicketsModule() {
    console.log('\n🎫 === TESTING MÓDULO TICKETS ===');
    
    if (!authToken) return;
    
    // 1. Verificar página de tickets
    const ticketsPageResponse = await makeRequest('http://localhost:8080/tickets.html');
    if (!ticketsPageResponse.ok) {
        logIssue('HIGH', 'Tickets Page', 
                'Página tickets.html no accesible',
                'Verificar que tickets.html existe');
    } else {
        const pageContent = ticketsPageResponse.body;
        
        // Verificar elementos clave
        if (!pageContent.includes('ticket-list') && !pageContent.includes('tickets-table')) {
            logIssue('MEDIUM', 'Tickets UI', 
                    'Lista/tabla de tickets no encontrada',
                    'Agregar elemento con ID ticket-list o tickets-table');
        }
        
        if (!pageContent.includes('add-ticket') && !pageContent.includes('new-ticket')) {
            logIssue('MEDIUM', 'Tickets UI', 
                    'Botón crear ticket no encontrado',
                    'Agregar botón para crear nuevos tickets');
        }
        
        if (!pageContent.includes('js/tickets.js')) {
            logIssue('CRITICAL', 'Tickets Script', 
                    'Script tickets.js no incluido',
                    'Incluir <script src="js/tickets.js"></script>');
        }
        
        // Verificar filtros
        if (!pageContent.includes('filter') && !pageContent.includes('search')) {
            logIssue('LOW', 'Tickets UI', 
                    'Filtros/búsqueda no encontrados',
                    'Agregar controles de filtrado para tickets');
        }
    }
    
    // 2. Verificar API de tickets
    const ticketsApiResponse = await makeRequest('http://localhost:3000/api/tickets', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!ticketsApiResponse.ok) {
        logIssue('CRITICAL', 'Tickets API', 
                'API /tickets no responde',
                'Verificar endpoint GET /tickets en backend');
    }
    
    // 3. Test de dependencias para crear ticket
    const clientsForTicket = await makeRequest('http://localhost:3000/api/clients', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const equipmentForTicket = await makeRequest('http://localhost:3000/api/equipment', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!clientsForTicket.ok) {
        logIssue('HIGH', 'Tickets Dependencies', 
                'No se pueden obtener clientes para tickets',
                'Verificar que API /clients está funcionando');
    }
    
    if (!equipmentForTicket.ok) {
        logIssue('HIGH', 'Tickets Dependencies', 
                'No se pueden obtener equipos para tickets',
                'Verificar que API /equipment está funcionando');
    }
    
    // 4. Test de creación de ticket
    if (clientsForTicket.ok && clientsForTicket.data?.data?.length > 0 && 
        equipmentForTicket.ok && equipmentForTicket.data?.data?.length > 0) {
        
        const testTicket = {
            title: 'Test Ticket ' + Date.now(),
            description: 'Ticket de prueba automática',
            priority: 'medium',
            client_id: clientsForTicket.data.data[0].id,
            equipment_id: equipmentForTicket.data.data[0].id
        };
        
        const createTicketResponse = await makeRequest('http://localhost:3000/api/tickets', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testTicket)
        });
        
        if (!createTicketResponse.ok) {
            logIssue('HIGH', 'Tickets Create', 
                    'No se puede crear ticket vía API',
                    'Verificar endpoint POST /tickets y validación de campos');
        }
    }
}

async function testEquipmentModule() {
    console.log('\n🔧 === TESTING MÓDULO EQUIPOS ===');
    
    if (!authToken) return;
    
    // 1. Verificar página de equipos
    const equipoPageResponse = await makeRequest('http://localhost:8080/equipo.html');
    if (!equipoPageResponse.ok) {
        logIssue('HIGH', 'Equipos Page', 
                'Página equipo.html no accesible',
                'Verificar que equipo.html existe');
        return;
    }
    
    const pageContent = equipoPageResponse.body;
    
    // 2. Verificar elementos de UI
    if (!pageContent.includes('equipment-list') && !pageContent.includes('equipos-table')) {
        logIssue('MEDIUM', 'Equipos UI', 
                'Lista de equipos no encontrada',
                'Agregar tabla o lista para mostrar equipos');
    }
    
    if (!pageContent.includes('js/equipo.js') && !pageContent.includes('js/equipos.js')) {
        logIssue('HIGH', 'Equipos Script', 
                'Script de equipos no incluido',
                'Incluir script js/equipo.js o js/equipos.js');
    }
    
    // 3. Verificar API de equipos
    const equipmentApiResponse = await makeRequest('http://localhost:3000/api/equipment', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!equipmentApiResponse.ok) {
        logIssue('CRITICAL', 'Equipos API', 
                'API /equipment no responde',
                'Verificar endpoint GET /equipment en backend');
    } else {
        if (!equipmentApiResponse.data?.data) {
            logIssue('MEDIUM', 'Equipos API', 
                    'Estructura de respuesta inconsistente',
                    'Asegurar formato { data: [...] } en respuesta');
        }
    }
    
    // 4. Verificar filtros por ubicación
    const locationsResponse = await makeRequest('http://localhost:3000/api/locations', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!locationsResponse.ok) {
        logIssue('MEDIUM', 'Equipos Dependencies', 
                'No se pueden obtener ubicaciones para filtros',
                'Verificar API /locations para filtros de equipos');
    }
}

async function testInventoryModule() {
    console.log('\n📦 === TESTING MÓDULO INVENTARIO ===');
    
    if (!authToken) return;
    
    // 1. Verificar página de inventario
    const inventoryPageResponse = await makeRequest('http://localhost:8080/inventario-fase3.html');
    if (!inventoryPageResponse.ok) {
        logIssue('HIGH', 'Inventario Page', 
                'Página inventario-fase3.html no accesible',
                'Verificar que inventario-fase3.html existe');
        return;
    }
    
    const pageContent = inventoryPageResponse.body;
    
    // 2. Verificar elementos de UI
    if (!pageContent.includes('inventory-list') && !pageContent.includes('inventario-table')) {
        logIssue('MEDIUM', 'Inventario UI', 
                'Lista de inventario no encontrada',
                'Agregar tabla para mostrar items de inventario');
    }
    
    if (!pageContent.includes('js/inventario')) {
        logIssue('HIGH', 'Inventario Script', 
                'Script de inventario no incluido',
                'Incluir script js/inventario-fase3.js o similar');
    }
    
    // 3. Verificar API de inventario
    const inventoryApiResponse = await makeRequest('http://localhost:3000/api/inventory', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!inventoryApiResponse.ok) {
        logIssue('CRITICAL', 'Inventario API', 
                'API /inventory no responde',
                'Verificar endpoint GET /inventory en backend');
    }
    
    // 4. Test de movimientos de inventario
    const movementsResponse = await makeRequest('http://localhost:3000/api/inventory/movements', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!movementsResponse.ok) {
        logIssue('MEDIUM', 'Inventario Movements', 
                'API de movimientos no disponible',
                'Implementar endpoint /inventory/movements');
    }
}

async function testResponsiveDesign() {
    console.log('\n📱 === TESTING DISEÑO RESPONSIVO ===');
    
    const pages = ['login.html', 'tickets.html', 'clientes.html', 'equipo.html', 'inventario-fase3.html'];
    
    for (const page of pages) {
        const pageResponse = await makeRequest(`http://localhost:8080/${page}`);
        if (pageResponse.ok) {
            const content = pageResponse.body;
            
            // Verificar meta viewport
            if (!content.includes('viewport')) {
                logIssue('MEDIUM', `${page} Responsive`, 
                        'Meta viewport no encontrado',
                        'Agregar <meta name="viewport" content="width=device-width, initial-scale=1.0">');
            }
            
            // Verificar Tailwind CSS
            if (!content.includes('tailwind') && !content.includes('style.css')) {
                logIssue('HIGH', `${page} Responsive`, 
                        'CSS responsive no encontrado',
                        'Incluir Tailwind CSS o archivo CSS responsive');
            }
            
            // Verificar clases responsive básicas
            if (!content.includes('md:') && !content.includes('lg:') && !content.includes('sm:')) {
                logIssue('LOW', `${page} Responsive`, 
                        'Clases responsive no detectadas',
                        'Agregar clases Tailwind responsive (sm:, md:, lg:)');
            }
        }
    }
}

async function generateActionPlan() {
    console.log('\n🔧 === PLAN DE ACCIÓN ===');
    console.log('========================');
    
    if (issues.length === 0) {
        console.log('🎉 ¡NO SE ENCONTRARON PROBLEMAS EN LOS FLUJOS DE TRABAJO!');
        console.log('✅ Todos los módulos frontend están funcionando correctamente');
        return;
    }
    
    // Agrupar por severidad
    const issuesBySeverity = {
        'CRITICAL': [],
        'HIGH': [],
        'MEDIUM': [],
        'LOW': []
    };
    
    issues.forEach(issue => {
        issuesBySeverity[issue.severity].push(issue);
    });
    
    console.log(`\n📊 RESUMEN: ${issues.length} problemas encontrados`);
    console.log(`   🚨 Críticos: ${issuesBySeverity.CRITICAL.length}`);
    console.log(`   ⚠️  Altos: ${issuesBySeverity.HIGH.length}`);
    console.log(`   📝 Medios: ${issuesBySeverity.MEDIUM.length}`);
    console.log(`   🎨 Bajos: ${issuesBySeverity.LOW.length}`);
    
    // Plan de acción por prioridad
    if (issuesBySeverity.CRITICAL.length > 0) {
        console.log('\n🚨 PRIORIDAD 1 - CRÍTICOS (Corregir AHORA):');
        issuesBySeverity.CRITICAL.forEach((issue, index) => {
            console.log(`   ${index + 1}. [${issue.module}] ${issue.issue}`);
            console.log(`      🔧 ${issue.solution}`);
        });
    }
    
    if (issuesBySeverity.HIGH.length > 0) {
        console.log('\n⚠️ PRIORIDAD 2 - ALTOS (Corregir HOY):');
        issuesBySeverity.HIGH.forEach((issue, index) => {
            console.log(`   ${index + 1}. [${issue.module}] ${issue.issue}`);
            console.log(`      🔧 ${issue.solution}`);
        });
    }
    
    if (issuesBySeverity.MEDIUM.length > 0) {
        console.log('\n📝 PRIORIDAD 3 - MEDIOS (Esta semana):');
        issuesBySeverity.MEDIUM.forEach((issue, index) => {
            console.log(`   ${index + 1}. [${issue.module}] ${issue.issue}`);
            console.log(`      🔧 ${issue.solution}`);
        });
    }
    
    if (issuesBySeverity.LOW.length > 0) {
        console.log('\n🎨 PRIORIDAD 4 - BAJOS (Próximo sprint):');
        issuesBySeverity.LOW.forEach((issue, index) => {
            console.log(`   ${index + 1}. [${issue.module}] ${issue.issue}`);
            console.log(`      🔧 ${issue.solution}`);
        });
    }
    
    console.log('\n💡 COMANDOS ÚTILES PARA CORREGIR:');
    console.log('   • Para verificar archivos: ls frontend/js/');
    console.log('   • Para crear scripts faltantes: touch frontend/js/[nombre].js');
    console.log('   • Para verificar contenido: cat frontend/js/[archivo].js');
    console.log('   • Para editar: code frontend/js/[archivo].js');
}

async function runFrontendTesting() {
    console.log('🧪 INICIANDO TESTING FRONTEND DIRECTO');
    console.log('=====================================');
    console.log(`📅 Fecha: ${new Date().toISOString()}`);
    console.log(`🎯 Enfoque: Flujos de trabajo y funcionalidad de botones`);
    
    try {
        const authOk = await testAuthFlow();
        if (authOk) {
            await testClientModule();
            await testTicketsModule();
            await testEquipmentModule();
            await testInventoryModule();
            await testResponsiveDesign();
        }
        
        await generateActionPlan();
        
        console.log('\n🎊 Testing frontend completado');
        
    } catch (error) {
        console.error('💥 Error durante testing:', error.message);
    }
}

runFrontendTesting();