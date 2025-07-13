const mysql = require('mysql2/promise');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración de colores para la consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

class SimpleTestRunner {
    constructor() {
        this.baseUrl = 'localhost';
        this.port = 3000;
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
        this.db = null;
    }

    log(message, color = colors.white) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
    }

    async connectToDatabase() {
        try {
            this.db = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'gymtec_erp'
            });
            this.log('✅ Conectado a la base de datos MySQL', colors.green);
            return true;
        } catch (error) {
            this.log(`❌ Error conectando a la base de datos: ${error.message}`, colors.red);
            return false;
        }
    }

    async runTest(testName, testFunction) {
        this.results.total++;
        this.log(`🔄 Ejecutando: ${testName}`, colors.cyan);
        
        try {
            await testFunction();
            this.results.passed++;
            this.log(`✅ ${testName} - ÉXITO`, colors.green);
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({ test: testName, error: error.message });
            this.log(`❌ ${testName} - FALLÓ: ${error.message}`, colors.red);
        }
    }

    makeHttpRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                port: this.port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const req = http.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsedData = responseData ? JSON.parse(responseData) : {};
                        resolve({
                            statusCode: res.statusCode,
                            data: parsedData,
                            raw: responseData
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            data: null,
                            raw: responseData
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testServerStatus() {
        try {
            const response = await this.makeHttpRequest('/');
            if (response.statusCode !== 200) {
                throw new Error(`Servidor no responde correctamente. Status: ${response.statusCode}`);
            }
            if (!response.raw.includes('Gymtec') && !response.raw.includes('API')) {
                throw new Error('Respuesta del servidor no es la esperada');
            }
        } catch (error) {
            throw new Error(`Error de conexión al servidor: ${error.message}`);
        }
    }

    async testApiEndpoint(endpoint, expectedType = 'array') {
        try {
            const response = await this.makeHttpRequest(endpoint);
            
            if (response.statusCode !== 200) {
                throw new Error(`HTTP ${response.statusCode}: Error en endpoint`);
            }
            
            // Manejar estructura de respuesta del servidor: { message: "success", data: [...] }
            let actualData = response.data;
            if (response.data && response.data.message === 'success' && response.data.data !== undefined) {
                actualData = response.data.data;
            }
            
            if (expectedType === 'array' && !Array.isArray(actualData)) {
                throw new Error(`Respuesta no es un array. Tipo recibido: ${typeof actualData}`);
            }
            
            if (expectedType === 'object' && (typeof actualData !== 'object' || Array.isArray(actualData))) {
                throw new Error(`Respuesta no es un objeto. Tipo recibido: ${typeof actualData}`);
            }
            
            return actualData;
        } catch (error) {
            throw new Error(`Error en ${endpoint}: ${error.message}`);
        }
    }

    async testDatabaseTables() {
        try {
            const [rows] = await this.db.execute('SHOW TABLES');
            const tables = rows.map(row => Object.values(row)[0]);
            
            const expectedTables = [
                'clients',
                'locations',
                'equipment',
                'equipmentmodels',
                'tickets',
                'users'
            ];
            
            let missingTables = [];
            for (const table of expectedTables) {
                if (!tables.includes(table)) {
                    missingTables.push(table);
                }
            }
            
            if (missingTables.length > 0) {
                throw new Error(`Tablas no encontradas: ${missingTables.join(', ')}`);
            }
            
            this.log(`📊 Tablas verificadas: ${tables.length}`, colors.blue);
        } catch (error) {
            throw new Error(`Error verificando tablas: ${error.message}`);
        }
    }

    async testDataIntegrity() {
        try {
            const queries = [
                { table: 'clients', min: 1 },
                { table: 'locations', min: 1 },
                { table: 'equipment', min: 1 },
                { table: 'equipmentmodels', min: 1 },
                { table: 'users', min: 1 }
            ];
            
            for (const query of queries) {
                const [rows] = await this.db.execute(`SELECT COUNT(*) as count FROM ${query.table}`);
                const count = rows[0].count;
                
                if (count < query.min) {
                    throw new Error(`Tabla ${query.table} tiene ${count} registros, esperado al menos ${query.min}`);
                }
                
                this.log(`📋 ${query.table}: ${count} registros`, colors.blue);
            }
        } catch (error) {
            throw new Error(`Error verificando integridad de datos: ${error.message}`);
        }
    }

    async testFileStructure() {
        try {
            const frontendDir = path.join(__dirname, '..', 'frontend');
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            
            if (!fs.existsSync(frontendDir)) {
                throw new Error('Directorio frontend no existe');
            }
            
            if (!fs.existsSync(uploadsDir)) {
                throw new Error('Directorio uploads no existe');
            }

            // Verificar archivos principales del frontend
            const mainFiles = [
                'index.html',
                'clientes.html', 
                'tickets.html',
                'modelos.html',
                'inventario.html',
                'personal.html'
            ];

            for (const file of mainFiles) {
                const filePath = path.join(frontendDir, file);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Archivo ${file} no existe en frontend`);
                }
            }

            this.log(`📁 Estructura de archivos verificada`, colors.blue);
            
        } catch (error) {
            throw new Error(`Error verificando estructura de archivos: ${error.message}`);
        }
    }

    async runAllTests() {
        this.log('🚀 Iniciando pruebas del sistema...', colors.bright);
        
        try {
            // Pruebas de base de datos
            const dbConnected = await this.connectToDatabase();
            if (dbConnected) {
                await this.runTest('Tablas de Base de Datos', () => this.testDatabaseTables());
                await this.runTest('Integridad de Datos', () => this.testDataIntegrity());
            }
            
            // Pruebas de servidor
            await this.runTest('Estado del Servidor', () => this.testServerStatus());
            
            // Pruebas de APIs principales
            await this.runTest('API Clientes', () => this.testApiEndpoint('/api/clients'));
            await this.runTest('API Ubicaciones', () => this.testApiEndpoint('/api/locations'));
            await this.runTest('API Equipos', () => this.testApiEndpoint('/api/equipment'));
            await this.runTest('API Tickets', () => this.testApiEndpoint('/api/tickets'));
            await this.runTest('API Modelos', () => this.testApiEndpoint('/api/models'));
            await this.runTest('API Usuarios', () => this.testApiEndpoint('/api/users'));
            
            // Pruebas de estructura
            await this.runTest('Estructura de Archivos', () => this.testFileStructure());
            
        } catch (error) {
            this.log(`❌ Error crítico: ${error.message}`, colors.red);
            this.results.failed++;
        } finally {
            if (this.db) {
                await this.db.end();
                this.log('🔌 Conexión a base de datos cerrada', colors.yellow);
            }
        }
        
        this.printResults();
    }

    printResults() {
        this.log('\n' + '='.repeat(50), colors.bright);
        this.log('📊 RESULTADOS DE PRUEBAS DEL SISTEMA', colors.bright);
        this.log('='.repeat(50), colors.bright);
        
        this.log(`Total de pruebas: ${this.results.total}`, colors.blue);
        this.log(`Exitosas: ${this.results.passed}`, colors.green);
        this.log(`Fallidas: ${this.results.failed}`, colors.red);
        
        const percentage = this.results.total > 0 ? Math.round((this.results.passed / this.results.total) * 100) : 0;
        this.log(`Porcentaje de éxito: ${percentage}%`, 
                  percentage >= 80 ? colors.green : percentage >= 60 ? colors.yellow : colors.red);
        
        if (this.results.errors.length > 0) {
            this.log('\n❌ ERRORES ENCONTRADOS:', colors.red);
            this.results.errors.forEach((error, index) => {
                this.log(`${index + 1}. ${error.test}: ${error.error}`, colors.red);
            });
        }
        
        this.log('\n' + '='.repeat(50), colors.bright);
        
        if (this.results.failed === 0) {
            this.log('🎉 ¡TODAS LAS PRUEBAS PASARON!', colors.green);
        } else {
            this.log(`⚠️  ${this.results.failed} pruebas fallaron`, colors.yellow);
        }
    }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
    const testRunner = new SimpleTestRunner();
    testRunner.runAllTests().catch(error => {
        console.error('Error ejecutando pruebas:', error);
        process.exit(1);
    });
}

module.exports = SimpleTestRunner; 