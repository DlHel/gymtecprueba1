/**
 * 🐛 DETECTOR DE BUGS ESPECÍFICOS - GYMTEC ERP v3.0
 * Script para detectar bugs específicos reportados frecuentemente
 */

const http = require('http');
const { URL } = require('url');

// Configuración
const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:8080';

// Lista de bugs identificados para verificar
const bugsToCheck = [];

function makeRequest(url, options = {}) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = http;
            
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
            
            const req = client.request(requestOptions, (res) => {
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

function logBug(severity, module, description, details = '') {
    const bug = {
        severity,
        module,
        description,
        details,
        timestamp: new Date().toISOString()
    };
    
    bugsToCheck.push(bug);
    
    const severityEmoji = {
        'CRITICAL': '🚨',
        'HIGH': '⚠️',
        'MEDIUM': '📝',
        'LOW': '🎨'
    };
    
    console.log(`${severityEmoji[severity]} BUG [${severity}] - ${module}: ${description}`);
    if (details) {
        console.log(`   📋 Detalles: ${details}`);
    }
}

async function testSpecificBugs() {
    console.log('\n🔍 === DETECTOR DE BUGS ESPECÍFICOS ===');
    console.log('=======================================');
    
    let authToken = null;
    
    // 1. Test de autenticación para obtener token
    const loginResponse = await makeRequest(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin@gymtec.com',
            password: 'admin123'
        })
    });
    
    if (loginResponse.ok && loginResponse.data && loginResponse.data.token) {
        authToken = loginResponse.data.token;
        console.log('✅ Token de autenticación obtenido');
    } else {
        logBug('CRITICAL', 'Autenticación', 'No se puede obtener token de autenticación', 
               `Status: ${loginResponse.status}, Error: ${loginResponse.data?.error || 'Unknown'}`);
        return;
    }
    
    // 2. BUG POTENCIAL: Verificar si tickets.js usa authenticatedFetch
    const ticketsJsResponse = await makeRequest(`${FRONTEND_BASE}/js/tickets.js`);
    if (ticketsJsResponse.ok) {
        const ticketsJsContent = ticketsJsResponse.body;
        
        // Buscar uso incorrecto de fetch() directo
        const regularFetchMatches = ticketsJsContent.match(/(?<!authenticated)fetch\(/g);
        const authenticatedFetchMatches = ticketsJsContent.match(/authenticatedFetch\(/g);
        
        if (regularFetchMatches && regularFetchMatches.length > 0) {
            const regularCount = regularFetchMatches.length;
            const authCount = authenticatedFetchMatches ? authenticatedFetchMatches.length : 0;
            
            if (regularCount > authCount) {
                logBug('HIGH', 'Tickets JavaScript', 
                       'Uso de fetch() no autenticado detectado', 
                       `${regularCount} usos de fetch() vs ${authCount} usos de authenticatedFetch()`);
            }
        }
        
        // Verificar si tiene protección de autenticación
        if (!ticketsJsContent.includes('isAuthenticated') && !ticketsJsContent.includes('protectPage')) {
            logBug('CRITICAL', 'Tickets JavaScript', 
                   'No se encontró verificación de autenticación en tickets.js');
        }
    }
    
    // 3. BUG POTENCIAL: Verificar si auth.js está incluido en todas las páginas
    const pagesToCheck = ['tickets.html', 'clientes.html', 'equipo.html', 'inventario-fase3.html'];
    
    for (const page of pagesToCheck) {
        const pageResponse = await makeRequest(`${FRONTEND_BASE}/${page}`);
        if (pageResponse.ok) {
            const pageContent = pageResponse.body;
            
            if (!pageContent.includes('js/auth.js')) {
                logBug('HIGH', `Página ${page}`, 
                       'No incluye script de autenticación auth.js');
            }
            
            if (!pageContent.includes('js/config.js')) {
                logBug('MEDIUM', `Página ${page}`, 
                       'No incluye script de configuración config.js');
            }
        }
    }
    
    // 4. BUG POTENCIAL: Verificar acceso a páginas sin autenticación
    const protectedPages = ['tickets.html', 'clientes.html', 'equipo.html'];
    
    for (const page of protectedPages) {
        const pageResponse = await makeRequest(`${FRONTEND_BASE}/${page}`);
        if (pageResponse.ok) {
            // La página es accesible sin autenticación
            // Este es normal para archivos HTML estáticos, pero verificamos el contenido JavaScript
            console.log(`ℹ️  Página ${page} accesible (normal para servidor estático)`);
        }
    }
    
    // 5. BUG POTENCIAL: Verificar endpoints API sin autenticación
    const protectedEndpoints = [
        { name: 'Tickets', path: '/tickets' },
        { name: 'Clientes', path: '/clients' },
        { name: 'Equipos', path: '/equipment' },
        { name: 'Usuarios', path: '/users' }
    ];
    
    for (const endpoint of protectedEndpoints) {
        // Sin token
        const unauthorizedResponse = await makeRequest(`${API_BASE}${endpoint.path}`);
        
        if (unauthorizedResponse.status !== 401) {
            logBug('CRITICAL', `API ${endpoint.name}`, 
                   'Endpoint accesible sin autenticación', 
                   `Status: ${unauthorizedResponse.status} (esperado: 401)`);
        }
        
        // Con token
        const authorizedResponse = await makeRequest(`${API_BASE}${endpoint.path}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!authorizedResponse.ok) {
            logBug('HIGH', `API ${endpoint.name}`, 
                   'Endpoint no accesible con token válido', 
                   `Status: ${authorizedResponse.status}`);
        }
    }
    
    // 6. BUG POTENCIAL: Verificar validación de entrada en formularios
    if (authToken) {
        const invalidTicketResponse = await makeRequest(`${API_BASE}/tickets`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: '', // Título vacío
                description: '',
                equipment_id: 'invalid', // ID inválido
                priority: 'invalid_priority' // Prioridad inválida
            })
        });
        
        if (invalidTicketResponse.ok) {
            logBug('HIGH', 'API Validación', 
                   'Acepta datos inválidos para crear tickets', 
                   'Falló validación de entrada');
        }
    }
    
    // 7. BUG POTENCIAL: Verificar CORS
    const corsResponse = await makeRequest(`${API_BASE}/clients`, {
        headers: { 
            'Origin': 'http://example.com',
            'Authorization': `Bearer ${authToken}`
        }
    });
    
    // Si CORS está mal configurado, podría bloquear requests legítimos
    
    // 8. BUG POTENCIAL: Verificar response consistency
    if (authToken) {
        const ticketsResponse = await makeRequest(`${API_BASE}/tickets`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (ticketsResponse.ok && ticketsResponse.data) {
            // Verificar estructura de respuesta
            if (!ticketsResponse.data.hasOwnProperty('data')) {
                logBug('MEDIUM', 'API Response', 
                       'Estructura de respuesta inconsistente en /tickets', 
                       'Falta propiedad "data" en response');
            }
            
            if (ticketsResponse.data.data && Array.isArray(ticketsResponse.data.data)) {
                const tickets = ticketsResponse.data.data;
                if (tickets.length > 0) {
                    const firstTicket = tickets[0];
                    const requiredFields = ['id', 'title', 'status', 'priority'];
                    
                    for (const field of requiredFields) {
                        if (!firstTicket.hasOwnProperty(field)) {
                            logBug('MEDIUM', 'API Data', 
                                   `Campo requerido '${field}' faltante en tickets`);
                        }
                    }
                }
            }
        }
    }
    
    // 9. BUG POTENCIAL: Verificar manejo de errores
    const nonExistentResponse = await makeRequest(`${API_BASE}/non-existent-endpoint`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (nonExistentResponse.status !== 404) {
        logBug('LOW', 'API Error Handling', 
               'No retorna 404 para endpoints inexistentes', 
               `Status: ${nonExistentResponse.status}`);
    }
    
    // 10. BUG POTENCIAL: Verificar archivos estáticos críticos
    const staticFiles = [
        { name: 'CSS Principal', path: '/css/style.css' },
        { name: 'Config JS', path: '/js/config.js' },
        { name: 'Auth JS', path: '/js/auth.js' },
        { name: 'Lucide Icons', path: 'https://unpkg.com/lucide@latest/dist/umd/lucide.js' }
    ];
    
    for (const file of staticFiles) {
        if (file.path.startsWith('http')) {
            // Archivo externo - solo log info
            console.log(`ℹ️  Archivo externo: ${file.name}`);
        } else {
            const fileResponse = await makeRequest(`${FRONTEND_BASE}${file.path}`);
            if (!fileResponse.ok) {
                logBug('HIGH', 'Archivos Estáticos', 
                       `Archivo crítico no disponible: ${file.name}`, 
                       `Path: ${file.path}, Status: ${fileResponse.status}`);
            }
        }
    }
}

async function generateBugReport() {
    console.log('\n📋 === REPORTE DE BUGS DETECTADOS ===');
    console.log('=====================================');
    
    if (bugsToCheck.length === 0) {
        console.log('🎉 ¡NO SE DETECTARON BUGS ESPECÍFICOS!');
        console.log('✅ El sistema pasó todas las verificaciones automáticas');
        return;
    }
    
    // Agrupar bugs por severidad
    const bugsBySeverity = {
        'CRITICAL': [],
        'HIGH': [],
        'MEDIUM': [],
        'LOW': []
    };
    
    bugsToCheck.forEach(bug => {
        bugsBySeverity[bug.severity].push(bug);
    });
    
    console.log(`\n📊 RESUMEN: ${bugsToCheck.length} bugs detectados`);
    console.log(`   🚨 Críticos: ${bugsBySeverity.CRITICAL.length}`);
    console.log(`   ⚠️  Altos: ${bugsBySeverity.HIGH.length}`);
    console.log(`   📝 Medios: ${bugsBySeverity.MEDIUM.length}`);
    console.log(`   🎨 Bajos: ${bugsBySeverity.LOW.length}`);
    
    // Mostrar bugs por severidad
    Object.entries(bugsBySeverity).forEach(([severity, bugs]) => {
        if (bugs.length > 0) {
            console.log(`\n=== BUGS ${severity} ===`);
            bugs.forEach((bug, index) => {
                console.log(`${index + 1}. [${bug.module}] ${bug.description}`);
                if (bug.details) {
                    console.log(`   📋 ${bug.details}`);
                }
            });
        }
    });
    
    // Plan correctivo
    console.log('\n🔧 === PLAN CORRECTIVO RECOMENDADO ===');
    console.log('=====================================');
    
    if (bugsBySeverity.CRITICAL.length > 0) {
        console.log('\n🚨 PRIORIDAD 1 - CRÍTICOS (Inmediato):');
        bugsBySeverity.CRITICAL.forEach((bug, index) => {
            console.log(`   ${index + 1}. Corregir: ${bug.description} en ${bug.module}`);
        });
    }
    
    if (bugsBySeverity.HIGH.length > 0) {
        console.log('\n⚠️ PRIORIDAD 2 - ALTOS (Esta semana):');
        bugsBySeverity.HIGH.forEach((bug, index) => {
            console.log(`   ${index + 1}. Mejorar: ${bug.description} en ${bug.module}`);
        });
    }
    
    if (bugsBySeverity.MEDIUM.length > 0) {
        console.log('\n📝 PRIORIDAD 3 - MEDIOS (Próximo sprint):');
        bugsBySeverity.MEDIUM.forEach((bug, index) => {
            console.log(`   ${index + 1}. Optimizar: ${bug.description} en ${bug.module}`);
        });
    }
    
    if (bugsBySeverity.LOW.length > 0) {
        console.log('\n🎨 PRIORIDAD 4 - BAJOS (Backlog):');
        bugsBySeverity.LOW.forEach((bug, index) => {
            console.log(`   ${index + 1}. Pulir: ${bug.description} en ${bug.module}`);
        });
    }
    
    console.log('\n💡 RECOMENDACIONES GENERALES:');
    console.log('   1. Priorizar bugs CRÍTICOS y ALTOS');
    console.log('   2. Implementar testing automatizado');
    console.log('   3. Documentar todas las correcciones');
    console.log('   4. Re-ejecutar pruebas después de cada corrección');
}

async function runBugDetection() {
    console.log('🐛 INICIANDO DETECTOR DE BUGS ESPECÍFICOS');
    console.log('=========================================');
    console.log(`📅 Fecha: ${new Date().toISOString()}`);
    console.log(`🎯 Objetivo: Detectar bugs conocidos y potenciales`);
    
    try {
        await testSpecificBugs();
        await generateBugReport();
        
        console.log('\n🎊 Detección de bugs completada');
        process.exit(bugsToCheck.filter(b => ['CRITICAL', 'HIGH'].includes(b.severity)).length > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('💥 Error durante la detección de bugs:', error.message);
        process.exit(1);
    }
}

runBugDetection();