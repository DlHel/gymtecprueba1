const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Importar fetch de manera compatible
let fetch;
(async () => {
    try {
        fetch = (await import('node-fetch')).default;
    } catch (error) {
        // Fallback para versiones más antiguas
        fetch = require('node-fetch');
    }
})();

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

class BackendTestRunner {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
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
        } catch (error) {
            this.log(`❌ Error conectando a la base de datos: ${error.message}`, colors.red);
            throw error;
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

    async testServerStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/`);
            if (!response.ok) {
                throw new Error(`Servidor no responde. Status: ${response.status}`);
            }
            const text = await response.text();
            if (!text.includes('Gymtec ERP API')) {
                throw new Error('Respuesta del servidor no es la esperada');
            }
        } catch (error) {
            throw new Error(`Error de conexión al servidor: ${error.message}`);
        }
    }

    async testApiEndpoint(endpoint, expectedType = 'array') {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (expectedType === 'array' && !Array.isArray(data)) {
                throw new Error(`Respuesta no es un array. Tipo recibido: ${typeof data}`);
            }
            
            if (expectedType === 'object' && (typeof data !== 'object' || Array.isArray(data))) {
                throw new Error(`Respuesta no es un objeto. Tipo recibido: ${typeof data}`);
            }
            
            return data;
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
                'users',
                'inventory',
                'modelphotos',
                'modelmanuals',
                'equipmentnotes',
                'systemconfig'
            ];
            
            for (const table of expectedTables) {
                if (!tables.includes(table)) {
                    throw new Error(`Tabla ${table} no encontrada en la base de datos`);
                }
            }
            
            this.log(`📊 Tablas verificadas: ${tables.length}`, colors.blue);
        } catch (error) {
            throw new Error(`Error verificando tablas: ${error.message}`);
        }
    }

    async testDataIntegrity() {
        try {
            // Verificar que hay datos en las tablas principales
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

    async testForeignKeys() {
        try {
            // Verificar integridad de foreign keys
            const queries = [
                {
                    name: 'equipment-location',
                    query: `SELECT COUNT(*) as count FROM equipment e 
                            LEFT JOIN locations l ON e.location_id = l.id 
                            WHERE l.id IS NULL`
                },
                {
                    name: 'locations-client',
                    query: `SELECT COUNT(*) as count FROM locations l 
                            LEFT JOIN clients c ON l.client_id = c.id 
                            WHERE c.id IS NULL`
                },
                {
                    name: 'tickets-client',
                    query: `SELECT COUNT(*) as count FROM tickets t 
                            LEFT JOIN clients c ON t.client_id = c.id 
                            WHERE t.client_id IS NOT NULL AND c.id IS NULL`
                }
            ];
            
            for (const query of queries) {
                const [rows] = await this.db.execute(query.query);
                const count = rows[0].count;
                
                if (count > 0) {
                    throw new Error(`Inconsistencia en foreign key ${query.name}: ${count} registros huérfanos`);
                }
            }
        } catch (error) {
            throw new Error(`Error verificando foreign keys: ${error.message}`);
        }
    }

    async testCRUDOperations() {
        try {
            // Probar operaciones CRUD básicas
            const testClient = {
                name: 'Test Client',
                legal_name: 'Test Client S.A.',
                rut: '99999999-9',
                address: 'Test Address',
                phone: '+56 9 9999 9999',
                email: 'test@test.com',
                business_activity: 'Testing',
                contact_name: 'Test Contact'
            };

            // CREATE
            const createResponse = await fetch(`${this.baseUrl}/api/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testClient)
            });
            
            if (!createResponse.ok) {
                throw new Error(`Error creando cliente: ${createResponse.status}`);
            }
            
            const createdClient = await createResponse.json();
            const clientId = createdClient.id;
            
            // READ
            const readResponse = await fetch(`${this.baseUrl}/api/clients/${clientId}`);
            if (!readResponse.ok) {
                throw new Error(`Error leyendo cliente: ${readResponse.status}`);
            }
            
            const readClient = await readResponse.json();
            if (readClient.name !== testClient.name) {
                throw new Error('Datos del cliente no coinciden');
            }
            
            // UPDATE
            const updateData = { ...testClient, name: 'Updated Test Client' };
            const updateResponse = await fetch(`${this.baseUrl}/api/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            if (!updateResponse.ok) {
                throw new Error(`Error actualizando cliente: ${updateResponse.status}`);
            }
            
            // DELETE
            const deleteResponse = await fetch(`${this.baseUrl}/api/clients/${clientId}`, {
                method: 'DELETE'
            });
            
            if (!deleteResponse.ok) {
                throw new Error(`Error eliminando cliente: ${deleteResponse.status}`);
            }
            
            // Verificar que fue eliminado
            const verifyResponse = await fetch(`${this.baseUrl}/api/clients/${clientId}`);
            if (verifyResponse.ok) {
                throw new Error('Cliente no fue eliminado correctamente');
            }
            
        } catch (error) {
            throw new Error(`Error en operaciones CRUD: ${error.message}`);
        }
    }

    async testFileOperations() {
        try {
            // Verificar directorios de archivos
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            const modelsDir = path.join(uploadsDir, 'models');
            
            if (!fs.existsSync(uploadsDir)) {
                throw new Error('Directorio uploads no existe');
            }
            
            if (!fs.existsSync(modelsDir)) {
                throw new Error('Directorio uploads/models no existe');
            }
            
            // Verificar permisos de escritura
            const testFile = path.join(uploadsDir, 'test.txt');
            fs.writeFileSync(testFile, 'test');
            
            if (!fs.existsSync(testFile)) {
                throw new Error('No se puede escribir en directorio uploads');
            }
            
            fs.unlinkSync(testFile);
            
        } catch (error) {
            throw new Error(`Error en operaciones de archivos: ${error.message}`);
        }
    }

    async testSystemConfiguration() {
        try {
            // Verificar configuración del sistema
            const configResponse = await fetch(`${this.baseUrl}/api/config`);
            if (!configResponse.ok) {
                throw new Error(`Error obteniendo configuración: ${configResponse.status}`);
            }
            
            const config = await configResponse.json();
            if (!Array.isArray(config)) {
                throw new Error('Configuración no es un array');
            }
            
            // Verificar que existen configuraciones básicas
            const requiredConfigs = ['ticket_sla_hours', 'inventory_low_stock_threshold'];
            for (const configKey of requiredConfigs) {
                const configItem = config.find(c => c.key === configKey);
                if (!configItem) {
                    throw new Error(`Configuración ${configKey} no encontrada`);
                }
            }
            
        } catch (error) {
            throw new Error(`Error en configuración del sistema: ${error.message}`);
        }
    }

    async runAllTests() {
        this.log('🚀 Iniciando pruebas del backend...', colors.bright);
        
        try {
            await this.connectToDatabase();
            
            // Pruebas de servidor
            await this.runTest('Estado del Servidor', () => this.testServerStatus());
            
            // Pruebas de base de datos
            await this.runTest('Tablas de Base de Datos', () => this.testDatabaseTables());
            await this.runTest('Integridad de Datos', () => this.testDataIntegrity());
            await this.runTest('Foreign Keys', () => this.testForeignKeys());
            
            // Pruebas de APIs
            await this.runTest('API Clientes', () => this.testApiEndpoint('/api/clients'));
            await this.runTest('API Ubicaciones', () => this.testApiEndpoint('/api/locations'));
            await this.runTest('API Equipos', () => this.testApiEndpoint('/api/equipment'));
            await this.runTest('API Tickets', () => this.testApiEndpoint('/api/tickets'));
            await this.runTest('API Modelos', () => this.testApiEndpoint('/api/models'));
            await this.runTest('API Inventario', () => this.testApiEndpoint('/api/inventory'));
            await this.runTest('API Usuarios', () => this.testApiEndpoint('/api/users'));
            await this.runTest('API Dashboard KPIs', () => this.testApiEndpoint('/api/dashboard/kpis', 'object'));
            await this.runTest('API Dashboard Actividad', () => this.testApiEndpoint('/api/dashboard/activity'));
            
            // Pruebas de funcionalidad
            await this.runTest('Operaciones CRUD', () => this.testCRUDOperations());
            await this.runTest('Operaciones de Archivos', () => this.testFileOperations());
            await this.runTest('Configuración del Sistema', () => this.testSystemConfiguration());
            
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
        this.log('📊 RESULTADOS DE PRUEBAS DEL BACKEND', colors.bright);
        this.log('='.repeat(50), colors.bright);
        
        this.log(`Total de pruebas: ${this.results.total}`, colors.blue);
        this.log(`Exitosas: ${this.results.passed}`, colors.green);
        this.log(`Fallidas: ${this.results.failed}`, colors.red);
        
        const percentage = Math.round((this.results.passed / this.results.total) * 100);
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
    const testRunner = new BackendTestRunner();
    testRunner.runAllTests().catch(error => {
        console.error('Error ejecutando pruebas:', error);
        process.exit(1);
    });
}

module.exports = BackendTestRunner; 