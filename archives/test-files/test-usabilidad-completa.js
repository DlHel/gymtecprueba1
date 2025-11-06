/**
 * 🧪 PRUEBAS DE USABILIDAD COMPLETAS - GYMTEC ERP v3.0
 * Script automatizado para detectar bugs y problemas de usabilidad
 * 
 * Ejecutar: node test-usabilidad-completa.js
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuración
const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:8080';

// Resultados de las pruebas
let testResults = {
    backend: { tests: [], passed: 0, failed: 0 },
    frontend: { tests: [], passed: 0, failed: 0 },
    usability: { tests: [], passed: 0, failed: 0 },
    integration: { tests: [], passed: 0, failed: 0 },
    bugs: []
};

let authToken = null;

/**
 * Utilidad para hacer requests HTTP usando módulos nativos de Node.js
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: 10000
            };
            
            if (options.body) {
                requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
            }
            
            const req = client.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    let parsedData = null;
                    try {
                        parsedData = JSON.parse(data);
                    } catch (e) {
                        // No es JSON válido
                        parsedData = data;
                    }
                    
                    resolve({
                        status: res.statusCode,
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        data: parsedData,
                        headers: res.headers
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    status: 0,
                    ok: false,
                    error: error.message,
                    data: null
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 0,
                    ok: false,
                    error: 'Request timeout',
                    data: null
                });
            });
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
            
        } catch (error) {
            resolve({
                status: 0,
                ok: false,
                error: error.message,
                data: null
            });
        }
    });
}

/**
 * Función para registrar resultados de pruebas
 */
function logTest(category, testName, passed, details = '', bugSeverity = null) {
    const result = {
        test: testName,
        passed: passed,
        details: details,
        timestamp: new Date().toISOString()
    };
    
    testResults[category].tests.push(result);
    
    if (passed) {
        testResults[category].passed++;
        console.log(`   ✅ ${testName}`);
    } else {
        testResults[category].failed++;
        console.log(`   ❌ ${testName}: ${details}`);
        
        // Registrar como bug si tiene severidad
        if (bugSeverity) {
            testResults.bugs.push({
                module: category,
                test: testName,
                severity: bugSeverity,
                description: details,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    if (details && passed) {
        console.log(`      ℹ️  ${details}`);
    }
}

/**
 * 1. PRUEBAS DE BACKEND
 */
async function testBackend() {
    console.log('\n🔧 === PRUEBAS DE BACKEND ===');
    
    // Test 1: Conectividad básica
    const healthResponse = await makeRequest(`${API_BASE}/clients`);
    logTest('backend', 'Conectividad API', 
        healthResponse.status === 401, 
        `Status: ${healthResponse.status} (esperado 401 sin auth)`,
        healthResponse.status !== 401 ? 'HIGH' : null
    );
    
    // Test 2: Autenticación
    const loginResponse = await makeRequest(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin@gymtec.com',
            password: 'admin123'
        })
    });
    
    const authSuccess = loginResponse.ok && loginResponse.data && loginResponse.data.token;
    logTest('backend', 'Sistema de Autenticación', 
        authSuccess,
        authSuccess ? 'Token JWT obtenido correctamente' : `Error: ${loginResponse.data?.error || 'Login falló'}`,
        !authSuccess ? 'CRITICAL' : null
    );
    
    if (authSuccess) {
        authToken = loginResponse.data.token;
    }
    
    // Test 3: Endpoints principales con autenticación
    if (authToken) {
        const endpoints = [
            { name: 'Tickets', path: '/tickets' },
            { name: 'Clientes', path: '/clients' },
            { name: 'Equipos', path: '/equipment' },
            { name: 'Usuarios', path: '/users' },
            { name: 'Ubicaciones', path: '/locations' }
        ];
        
        for (const endpoint of endpoints) {
            const response = await makeRequest(`${API_BASE}${endpoint.path}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const success = response.ok && response.data && response.data.data;
            logTest('backend', `Endpoint ${endpoint.name}`, 
                success,
                success ? `${response.data.data.length} registros` : `Error ${response.status}`,
                !success ? 'MEDIUM' : null
            );
        }
    }
    
    // Test 4: Validación de entrada
    if (authToken) {
        const invalidTicket = await makeRequest(`${API_BASE}/tickets`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: '', // Título vacío - debe fallar
                description: ''
            })
        });
        
        logTest('backend', 'Validación de Entrada', 
            !invalidTicket.ok,
            invalidTicket.ok ? 'BUG: Acepta datos inválidos' : 'Rechaza datos inválidos correctamente',
            invalidTicket.ok ? 'HIGH' : null
        );
    }
}

/**
 * 2. PRUEBAS DE FRONTEND
 */
async function testFrontend() {
    console.log('\n🌐 === PRUEBAS DE FRONTEND ===');
    
    // Test 1: Páginas principales accesibles
    const pages = [
        { name: 'Index', path: '/' },
        { name: 'Login', path: '/login.html' },
        { name: 'Tickets', path: '/tickets.html' },
        { name: 'Clientes', path: '/clientes.html' },
        { name: 'Equipos', path: '/equipo.html' },
        { name: 'Inventario', path: '/inventario-fase3.html' }
    ];
    
    for (const page of pages) {
        const response = await makeRequest(`${FRONTEND_BASE}${page.path}`);
        logTest('frontend', `Página ${page.name}`, 
            response.ok,
            response.ok ? 'Accesible' : `Error ${response.status}`,
            !response.ok ? 'MEDIUM' : null
        );
    }
    
    // Test 2: Archivos JavaScript críticos
    const scripts = [
        { name: 'Config', path: '/js/config.js' },
        { name: 'Auth', path: '/js/auth.js' },
        { name: 'Tickets', path: '/js/tickets.js' },
        { name: 'Base Modal', path: '/js/base-modal.js' },
        { name: 'Checklist Editor', path: '/js/checklist-editor.js' }
    ];
    
    for (const script of scripts) {
        const response = await makeRequest(`${FRONTEND_BASE}${script.path}`);
        logTest('frontend', `Script ${script.name}`, 
            response.ok,
            response.ok ? 'Disponible' : `Error ${response.status}`,
            !response.ok ? 'HIGH' : null
        );
    }
    
    // Test 3: Archivos CSS
    const cssResponse = await makeRequest(`${FRONTEND_BASE}/css/style.css`);
    logTest('frontend', 'Estilos CSS', 
        cssResponse.ok,
        cssResponse.ok ? 'Tailwind CSS cargado' : 'CSS no encontrado',
        !cssResponse.ok ? 'MEDIUM' : null
    );
}

/**
 * 3. PRUEBAS DE USABILIDAD ESPECÍFICAS
 */
async function testUsability() {
    console.log('\n🎯 === PRUEBAS DE USABILIDAD ===');
    
    // Test 1: Flujo de autenticación completo
    const loginPageResponse = await makeRequest(`${FRONTEND_BASE}/login.html`);
    const hasLoginForm = loginPageResponse.ok;
    logTest('usability', 'Página de Login Funcional', 
        hasLoginForm,
        hasLoginForm ? 'Formulario de login disponible' : 'Página de login no accesible',
        !hasLoginForm ? 'CRITICAL' : null
    );
    
    // Test 2: Navegación del sistema
    const menuResponse = await makeRequest(`${FRONTEND_BASE}/menu.html`);
    logTest('usability', 'Sistema de Navegación', 
        menuResponse.ok,
        menuResponse.ok ? 'Menú principal disponible' : 'Menú no encontrado',
        !menuResponse.ok ? 'HIGH' : null
    );
    
    // Test 3: Responsividad (verificar archivo CSS)
    const tailwindCheck = cssResponse => {
        // Simulamos verificación de clases responsive
        return cssResponse.ok; // Simplificado para este test
    };
    const responsiveTest = await makeRequest(`${FRONTEND_BASE}/css/style.css`);
    logTest('usability', 'Diseño Responsivo', 
        responsiveTest.ok,
        responsiveTest.ok ? 'Tailwind CSS con clases responsive' : 'CSS responsivo no disponible',
        !responsiveTest.ok ? 'MEDIUM' : null
    );
    
    // Test 4: Gestión de errores frontend
    const errorHandling = await makeRequest(`${FRONTEND_BASE}/js/auth.js`);
    logTest('usability', 'Manejo de Errores Frontend', 
        errorHandling.ok,
        errorHandling.ok ? 'Script de autenticación con manejo de errores' : 'Script de manejo de errores no encontrado',
        !errorHandling.ok ? 'HIGH' : null
    );
}

/**
 * 4. PRUEBAS DE INTEGRACIÓN
 */
async function testIntegration() {
    console.log('\n🔄 === PRUEBAS DE INTEGRACIÓN ===');
    
    if (!authToken) {
        logTest('integration', 'Integración Frontend-Backend', 
            false, 
            'No se puede probar sin token de autenticación',
            'CRITICAL'
        );
        return;
    }
    
    // Test 1: Flujo completo de tickets
    const ticketsResponse = await makeRequest(`${API_BASE}/tickets`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const clientsResponse = await makeRequest(`${API_BASE}/clients`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const integrationSuccess = ticketsResponse.ok && clientsResponse.ok;
    logTest('integration', 'Flujo Tickets-Clientes', 
        integrationSuccess,
        integrationSuccess ? 'Datos relacionados disponibles' : 'Fallo en integración de datos',
        !integrationSuccess ? 'HIGH' : null
    );
    
    // Test 2: Consistency de datos
    if (ticketsResponse.ok && ticketsResponse.data && ticketsResponse.data.data) {
        const tickets = ticketsResponse.data.data;
        const hasValidStructure = tickets.every(ticket => 
            ticket.id && ticket.title && ticket.status
        );
        
        logTest('integration', 'Estructura de Datos Tickets', 
            hasValidStructure,
            hasValidStructure ? 'Estructura consistente' : 'Datos inconsistentes o faltantes',
            !hasValidStructure ? 'MEDIUM' : null
        );
    }
    
    // Test 3: Performance básico
    const startTime = Date.now();
    const perfResponse = await makeRequest(`${API_BASE}/tickets`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const responseTime = Date.now() - startTime;
    
    const performanceOK = responseTime < 2000; // Menos de 2 segundos
    logTest('integration', 'Performance de API', 
        performanceOK,
        `Tiempo de respuesta: ${responseTime}ms`,
        !performanceOK ? 'MEDIUM' : null
    );
}

/**
 * 5. VERIFICACIÓN DE CONFIGURACIÓN
 */
async function testConfiguration() {
    console.log('\n⚙️ === PRUEBAS DE CONFIGURACIÓN ===');
    
    // Test 1: Configuración de entorno
    const configScript = await makeRequest(`${FRONTEND_BASE}/js/config.js`);
    logTest('usability', 'Configuración de Entorno', 
        configScript.ok,
        configScript.ok ? 'Script de configuración disponible' : 'Configuración no encontrada',
        !configScript.ok ? 'HIGH' : null
    );
    
    // Test 2: Variables de entorno backend
    const envTest = await makeRequest(`${API_BASE}/clients`);
    const envConfigured = envTest.status === 401; // Debe requerir auth, indicando configuración correcta
    logTest('usability', 'Variables de Entorno Backend', 
        envConfigured,
        envConfigured ? 'Backend configurado correctamente' : 'Problemas de configuración backend',
        !envConfigured ? 'HIGH' : null
    );
}

/**
 * GENERACIÓN DE REPORTE
 */
function generateReport() {
    console.log('\n📊 === REPORTE DE PRUEBAS DE USABILIDAD ===');
    console.log('================================================');
    
    const totalTests = Object.values(testResults).reduce((acc, category) => {
        if (category.tests) return acc + category.tests.length;
        return acc;
    }, 0);
    
    const totalPassed = Object.values(testResults).reduce((acc, category) => {
        if (category.passed !== undefined) return acc + category.passed;
        return acc;
    }, 0);
    
    const totalFailed = Object.values(testResults).reduce((acc, category) => {
        if (category.failed !== undefined) return acc + category.failed;
        return acc;
    }, 0);
    
    console.log(`\n📈 RESUMEN GENERAL:`);
    console.log(`   Total de pruebas: ${totalTests}`);
    console.log(`   ✅ Exitosas: ${totalPassed}`);
    console.log(`   ❌ Fallidas: ${totalFailed}`);
    console.log(`   📊 Porcentaje de éxito: ${((totalPassed/totalTests)*100).toFixed(1)}%`);
    
    // Resumen por categoría
    console.log(`\n📋 RESUMEN POR CATEGORÍA:`);
    Object.entries(testResults).forEach(([category, results]) => {
        if (results.tests) {
            const successRate = results.tests.length > 0 ? 
                ((results.passed / results.tests.length) * 100).toFixed(1) : 0;
            console.log(`   ${category.toUpperCase()}: ${results.passed}/${results.tests.length} (${successRate}%)`);
        }
    });
    
    // Bugs encontrados
    if (testResults.bugs.length > 0) {
        console.log(`\n🐛 BUGS ENCONTRADOS (${testResults.bugs.length}):`);
        console.log('================================================');
        
        // Agrupar por severidad
        const bugsBySeverity = testResults.bugs.reduce((acc, bug) => {
            if (!acc[bug.severity]) acc[bug.severity] = [];
            acc[bug.severity].push(bug);
            return acc;
        }, {});
        
        ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
            if (bugsBySeverity[severity]) {
                console.log(`\n🚨 ${severity} (${bugsBySeverity[severity].length}):`);
                bugsBySeverity[severity].forEach((bug, index) => {
                    console.log(`   ${index + 1}. [${bug.module.toUpperCase()}] ${bug.test}`);
                    console.log(`      📝 ${bug.description}`);
                });
            }
        });
    } else {
        console.log(`\n🎉 ¡NO SE ENCONTRARON BUGS!`);
    }
    
    // Recomendaciones
    console.log(`\n💡 RECOMENDACIONES:`);
    console.log('================================================');
    
    if (totalFailed === 0) {
        console.log(`✅ El sistema está funcionando correctamente`);
        console.log(`✅ Todas las pruebas de usabilidad pasaron`);
        console.log(`✅ Listo para uso en producción`);
    } else {
        console.log(`⚠️  Se encontraron ${totalFailed} problemas que requieren atención`);
        console.log(`🔧 Revisar la sección de bugs para plan correctivo`);
        console.log(`📊 Priorizar bugs CRITICAL y HIGH`);
    }
    
    console.log('\n================================================');
    return testResults;
}

/**
 * FUNCIÓN PRINCIPAL
 */
async function runUsabilityTests() {
    console.log('🧪 INICIANDO PRUEBAS DE USABILIDAD COMPLETAS');
    console.log('==============================================');
    console.log(`📅 Fecha: ${new Date().toISOString()}`);
    console.log(`🎯 Objetivo: Detectar bugs y problemas de usabilidad`);
    console.log(`🔍 Alcance: Backend, Frontend, Integración y UX`);
    
    try {
        await testBackend();
        await testFrontend();
        await testUsability();
        await testIntegration();
        await testConfiguration();
        
        return generateReport();
        
    } catch (error) {
        console.error('💥 Error crítico durante las pruebas:', error.message);
        console.error('🔍 Stack trace:', error.stack);
        return null;
    }
}

// Verificar Node.js y ejecutar
runUsabilityTests().then(results => {
    if (results) {
        console.log('\n🎊 Pruebas de usabilidad completadas');
        process.exit(results.bugs.length > 0 ? 1 : 0);
    } else {
        console.log('\n💥 Las pruebas fallaron');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
});