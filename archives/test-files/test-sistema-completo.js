/**
 * Test Completo del Sistema Gymtec ERP
 * Verifica funcionalidad completa del frontend y backend
 */

const axios = require('axios').default;

// Configuración
const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:8080';

let authToken = null;
let testResults = {
    backend: {
        connection: false,
        authentication: false,
        endpoints: {}
    },
    frontend: {
        accessible: false,
        files: {}
    },
    database: {
        connection: false,
        data: false
    }
};

/**
 * Test de conexión al backend
 */
async function testBackendConnection() {
    console.log('\n🔧 === PRUEBA DE BACKEND ===');
    
    try {
        // Probar conexión básica
        const response = await axios.get(`${API_BASE}/health`, {
            timeout: 5000,
            validateStatus: () => true // Aceptar cualquier status
        });
        
        console.log(`✅ Backend responde (Status: ${response.status})`);
        testResults.backend.connection = true;
        
        return true;
    } catch (error) {
        console.log(`❌ Backend no responde: ${error.message}`);
        testResults.backend.connection = false;
        return false;
    }
}

/**
 * Test de autenticación
 */
async function testAuthentication() {
    console.log('\n🔐 === PRUEBA DE AUTENTICACIÓN ===');
    
    try {
        const loginData = {
            email: 'admin@gymtec.com',
            password: 'admin123'
        };
        
        const response = await axios.post(`${API_BASE}/auth/login`, loginData, {
            timeout: 10000,
            validateStatus: () => true
        });
        
        if (response.status === 200 && response.data.token) {
            authToken = response.data.token;
            console.log('✅ Autenticación exitosa');
            console.log(`📋 Token obtenido: ${authToken.substring(0, 20)}...`);
            console.log(`👤 Usuario: ${response.data.user?.username || 'admin'}`);
            console.log(`🎯 Rol: ${response.data.user?.role || 'admin'}`);
            
            testResults.backend.authentication = true;
            return true;
        } else {
            console.log(`❌ Error de autenticación (Status: ${response.status})`);
            console.log(`📋 Respuesta: ${JSON.stringify(response.data, null, 2)}`);
            testResults.backend.authentication = false;
            return false;
        }
    } catch (error) {
        console.log(`❌ Error en autenticación: ${error.message}`);
        testResults.backend.authentication = false;
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
        { name: 'tickets', path: '/tickets', method: 'GET' },
        { name: 'clients', path: '/clients', method: 'GET' },
        { name: 'equipment', path: '/equipment', method: 'GET' },
        { name: 'users', path: '/users', method: 'GET' },
        { name: 'locations', path: '/locations', method: 'GET' }
    ];
    
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    for (const endpoint of endpoints) {
        try {
            console.log(`🔍 Probando ${endpoint.name}...`);
            
            const response = await axios({
                method: endpoint.method,
                url: `${API_BASE}${endpoint.path}`,
                headers,
                timeout: 10000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                const dataCount = Array.isArray(response.data.data) ? response.data.data.length : 'N/A';
                console.log(`   ✅ ${endpoint.name}: OK (${dataCount} registros)`);
                testResults.backend.endpoints[endpoint.name] = true;
            } else {
                console.log(`   ❌ ${endpoint.name}: Error ${response.status}`);
                testResults.backend.endpoints[endpoint.name] = false;
            }
        } catch (error) {
            console.log(`   ❌ ${endpoint.name}: ${error.message}`);
            testResults.backend.endpoints[endpoint.name] = false;
        }
    }
}

/**
 * Test de frontend
 */
async function testFrontend() {
    console.log('\n🌐 === PRUEBA DE FRONTEND ===');
    
    try {
        // Probar acceso al servidor frontend
        const response = await axios.get(FRONTEND_BASE, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log('✅ Frontend accesible');
            testResults.frontend.accessible = true;
            
            // Verificar archivos críticos
            const criticalFiles = [
                '/login.html',
                '/tickets.html',
                '/js/auth.js',
                '/js/config.js',
                '/js/tickets.js'
            ];
            
            for (const file of criticalFiles) {
                try {
                    const fileResponse = await axios.get(`${FRONTEND_BASE}${file}`, {
                        timeout: 5000,
                        validateStatus: () => true
                    });
                    
                    if (fileResponse.status === 200) {
                        console.log(`   ✅ ${file}: Disponible`);
                        testResults.frontend.files[file] = true;
                    } else {
                        console.log(`   ❌ ${file}: No encontrado (${fileResponse.status})`);
                        testResults.frontend.files[file] = false;
                    }
                } catch (error) {
                    console.log(`   ❌ ${file}: Error - ${error.message}`);
                    testResults.frontend.files[file] = false;
                }
            }
            
        } else {
            console.log(`❌ Frontend no accesible (Status: ${response.status})`);
            testResults.frontend.accessible = false;
        }
    } catch (error) {
        console.log(`❌ Frontend no accesible: ${error.message}`);
        testResults.frontend.accessible = false;
    }
}

/**
 * Test de base de datos
 */
async function testDatabase() {
    console.log('\n🗄️  === PRUEBA DE BASE DE DATOS ===');
    
    if (!authToken) {
        console.log('❌ No hay token para probar base de datos');
        return false;
    }
    
    try {
        // Probar queries básicas
        const response = await axios.get(`${API_BASE}/tickets?limit=5`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            timeout: 10000,
            validateStatus: () => true
        });
        
        if (response.status === 200 && response.data.data) {
            console.log('✅ Conexión a base de datos funcional');
            console.log(`📊 Tickets encontrados: ${response.data.data.length}`);
            testResults.database.connection = true;
            testResults.database.data = response.data.data.length > 0;
            
            // Mostrar ejemplo de datos
            if (response.data.data.length > 0) {
                const ticket = response.data.data[0];
                console.log(`📋 Ejemplo de ticket: ID ${ticket.id} - ${ticket.title || 'Sin título'}`);
            }
            
            return true;
        } else {
            console.log(`❌ Error en consulta BD (Status: ${response.status})`);
            testResults.database.connection = false;
            return false;
        }
    } catch (error) {
        console.log(`❌ Error de base de datos: ${error.message}`);
        testResults.database.connection = false;
        return false;
    }
}

/**
 * Generar reporte final
 */
function generateReport() {
    console.log('\n📋 === REPORTE FINAL DEL SISTEMA ===');
    console.log('==========================================');
    
    // Backend
    console.log('\n🔧 BACKEND:');
    console.log(`   Conexión: ${testResults.backend.connection ? '✅ OK' : '❌ FALLO'}`);
    console.log(`   Autenticación: ${testResults.backend.authentication ? '✅ OK' : '❌ FALLO'}`);
    
    console.log('\n   Endpoints:');
    Object.entries(testResults.backend.endpoints).forEach(([endpoint, status]) => {
        console.log(`   - ${endpoint}: ${status ? '✅ OK' : '❌ FALLO'}`);
    });
    
    // Frontend
    console.log('\n🌐 FRONTEND:');
    console.log(`   Accesible: ${testResults.frontend.accessible ? '✅ OK' : '❌ FALLO'}`);
    
    console.log('\n   Archivos críticos:');
    Object.entries(testResults.frontend.files).forEach(([file, status]) => {
        console.log(`   - ${file}: ${status ? '✅ OK' : '❌ FALLO'}`);
    });
    
    // Base de datos
    console.log('\n🗄️  BASE DE DATOS:');
    console.log(`   Conexión: ${testResults.database.connection ? '✅ OK' : '❌ FALLO'}`);
    console.log(`   Datos: ${testResults.database.data ? '✅ OK' : '❌ SIN DATOS'}`);
    
    // Estado general
    const allBackendOK = testResults.backend.connection && testResults.backend.authentication && 
                        Object.values(testResults.backend.endpoints).every(status => status);
    const allFrontendOK = testResults.frontend.accessible && 
                         Object.values(testResults.frontend.files).every(status => status);
    const allDatabaseOK = testResults.database.connection;
    
    console.log('\n🎯 ESTADO GENERAL:');
    console.log('==========================================');
    if (allBackendOK && allFrontendOK && allDatabaseOK) {
        console.log('🟢 SISTEMA COMPLETAMENTE FUNCIONAL');
        console.log('✅ Todos los componentes están operativos');
        console.log('🚀 Listo para uso en desarrollo');
    } else {
        console.log('🟡 SISTEMA PARCIALMENTE FUNCIONAL');
        if (!allBackendOK) console.log('⚠️  Problemas en backend detectados');
        if (!allFrontendOK) console.log('⚠️  Problemas en frontend detectados');
        if (!allDatabaseOK) console.log('⚠️  Problemas en base de datos detectados');
    }
    
    console.log('\n🌐 URLs de acceso:');
    console.log(`   Backend: http://localhost:3000`);
    console.log(`   Frontend: http://localhost:8080`);
    console.log(`   Login: http://localhost:8080/login.html`);
    
    console.log('\n👤 Credenciales de prueba:');
    console.log(`   Usuario: admin@gymtec.com`);
    console.log(`   Contraseña: admin123`);
    
    console.log('\n==========================================');
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
    console.log('🚀 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA GYMTEC ERP');
    console.log('======================================================');
    
    try {
        await testBackendConnection();
        await testAuthentication();
        await testMainEndpoints();
        await testFrontend();
        await testDatabase();
        
        generateReport();
        
    } catch (error) {
        console.error('💥 Error crítico durante las pruebas:', error.message);
    }
}

// Verificar dependencias
console.log('🔍 Verificando dependencias...');
if (!axios) {
    console.error('❌ ERROR: axios no está disponible. Ejecutar: npm install axios');
    process.exit(1);
}

// Ejecutar pruebas
runAllTests().catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
});