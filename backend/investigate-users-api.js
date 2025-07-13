/**
 * Script para investigar el problema con la API de usuarios
 * Encuentra por qué /api/users devuelve 404
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class UsersApiInvestigator {
    constructor() {
        this.serverHost = 'localhost';
        this.serverPort = 3000;
        this.baseUrl = `http://${this.serverHost}:${this.serverPort}`;
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
    }

    async makeRequest(endpoint, method = 'GET') {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.serverHost,
                port: this.serverPort,
                path: endpoint,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Node.js-Investigation'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.setTimeout(5000, () => {
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async checkServerStatus() {
        this.log('🔍 Verificando estado del servidor...');
        
        try {
            const response = await this.makeRequest('/api/health');
            if (response.statusCode === 200) {
                this.log('✅ Servidor respondiendo correctamente');
                return true;
            } else {
                this.log(`❌ Servidor devolvió código ${response.statusCode}`);
                return false;
            }
        } catch (error) {
            this.log(`❌ Error conectando al servidor: ${error.message}`);
            return false;
        }
    }

    async checkAllEndpoints() {
        this.log('🔍 Verificando todos los endpoints...');
        
        const endpoints = [
            '/api/clients',
            '/api/locations',
            '/api/equipment',
            '/api/tickets',
            '/api/models',
            '/api/inventory',
            '/api/users',
            '/api/user',
            '/api/personal',
            '/api/staff'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint);
                const status = response.statusCode === 200 ? '✅' : '❌';
                this.log(`${status} ${endpoint} - Status: ${response.statusCode}`);
                
                if (response.statusCode === 404) {
                    this.log(`   └── Respuesta 404: ${response.data.substring(0, 100)}...`);
                }
            } catch (error) {
                this.log(`❌ ${endpoint} - Error: ${error.message}`);
            }
        }
    }

    async analyzeServerCode() {
        this.log('🔍 Analizando código del servidor...');
        
        const serverFilePath = path.join(__dirname, 'src', 'server.js');
        
        if (!fs.existsSync(serverFilePath)) {
            this.log('❌ No se pudo encontrar server.js');
            return;
        }

        const serverCode = fs.readFileSync(serverFilePath, 'utf8');
        
        // Buscar definiciones de rutas relacionadas con users
        const userRoutes = [];
        const lines = serverCode.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('users') && (line.includes('app.') || line.includes('router.'))) {
                userRoutes.push({
                    lineNumber: i + 1,
                    content: lines[i].trim()
                });
            }
        }

        this.log(`📝 Rutas relacionadas con 'users' encontradas: ${userRoutes.length}`);
        
        if (userRoutes.length === 0) {
            this.log('❌ No se encontraron rutas definidas para users');
            this.log('💡 Esto explica por qué la API devuelve 404');
        } else {
            this.log('📋 Rutas encontradas:');
            userRoutes.forEach(route => {
                this.log(`   Línea ${route.lineNumber}: ${route.content}`);
            });
        }

        // Buscar otros patrones relacionados con usuarios
        const userPatterns = ['personal', 'staff', 'employee', 'user'];
        for (const pattern of userPatterns) {
            const matches = serverCode.match(new RegExp(`app\\.[a-z]+\\(['"]/api/${pattern}`, 'gi'));
            if (matches) {
                this.log(`🔍 Encontrado patrón '${pattern}': ${matches.length} coincidencias`);
                matches.forEach(match => {
                    this.log(`   └── ${match}`);
                });
            }
        }
    }

    async checkDatabaseTables() {
        this.log('🔍 Verificando tablas de la base de datos...');
        
        try {
            const response = await this.makeRequest('/api/debug/tables');
            if (response.statusCode === 200) {
                const tables = JSON.parse(response.data);
                this.log(`📊 Tablas encontradas: ${tables.length}`);
                
                const userTables = tables.filter(table => 
                    table.toLowerCase().includes('user') || 
                    table.toLowerCase().includes('personal') || 
                    table.toLowerCase().includes('staff')
                );
                
                if (userTables.length > 0) {
                    this.log('👥 Tablas relacionadas con usuarios:');
                    userTables.forEach(table => {
                        this.log(`   └── ${table}`);
                    });
                } else {
                    this.log('❌ No se encontraron tablas relacionadas con usuarios');
                }
            }
        } catch (error) {
            this.log(`❌ Error verificando tablas: ${error.message}`);
        }
    }

    async run() {
        this.log('🚀 Iniciando investigación de API de usuarios...');
        this.log('================================================');
        
        const serverUp = await this.checkServerStatus();
        if (!serverUp) {
            this.log('❌ No se puede continuar sin el servidor');
            return;
        }

        await this.checkAllEndpoints();
        await this.analyzeServerCode();
        await this.checkDatabaseTables();

        this.log('================================================');
        this.log('✅ Investigación completada');
        this.log('');
        this.log('💡 RECOMENDACIONES:');
        this.log('1. Verificar si la ruta /api/users está definida en server.js');
        this.log('2. Revisar si la tabla users existe en la base de datos');
        this.log('3. Confirmar que el endpoint esté registrado correctamente');
        this.log('4. Verificar que no haya errores de sintaxis en la definición');
    }
}

// Ejecutar investigación
const investigator = new UsersApiInvestigator();
investigator.run().catch(console.error); 