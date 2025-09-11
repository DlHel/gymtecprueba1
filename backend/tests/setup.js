/**
 * Jest Setup File
 * Configuración global para pruebas unitarias
 */

// Configurar timeout para pruebas que pueden tardar más
jest.setTimeout(10000);

// Mock console methods para testing limpio
const originalConsole = { ...console };

beforeEach(() => {
    // Resetear mocks de console antes de cada test
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
});

afterEach(() => {
    // Restaurar console después de cada test
    Object.assign(console, originalConsole);
    
    // Limpiar todos los mocks
    jest.clearAllMocks();
});

// Variables globales para testing
global.mockDatabase = {
    users: [
        { id: 1, username: 'admin', role: 'admin', email: 'admin@gymtec.com' },
        { id: 2, username: 'tech1', role: 'technician', email: 'tech@gymtec.com' },
        { id: 3, username: 'manager1', role: 'manager', email: 'manager@gymtec.com' }
    ],
    clients: [
        { id: 1, name: 'Test Gym', email: 'test@gym.com', phone: '555-0123' },
        { id: 2, name: 'Elite Fitness', email: 'elite@fitness.com', phone: '555-0124' }
    ],
    equipment: [
        { id: 1, name: 'Treadmill 1', model_id: 1, location_id: 1, activo: 1 },
        { id: 2, name: 'Bike 1', model_id: 2, location_id: 1, activo: 1 }
    ],
    tickets: [
        { 
            id: 1, 
            title: 'Test Ticket', 
            status: 'open', 
            priority: 'high',
            equipment_id: 1,
            created_by: 2
        }
    ]
};

// Helpers globales para testing
global.testHelpers = {
    // Generar JWT token para testing
    generateTestToken: (user = { id: 1, username: 'test', role: 'admin' }) => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(user, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
    },
    
    // Crear request mock con autenticación
    authenticatedRequest: (app, method, endpoint, user) => {
        const request = require('supertest');
        const token = global.testHelpers.generateTestToken(user);
        
        return request(app)[method](endpoint)
            .set('Authorization', `Bearer ${token}`);
    },
    
    // Mock de middleware de autenticación
    mockAuthMiddleware: (req, res, next) => {
        req.user = { id: 1, username: 'test', role: 'admin' };
        next();
    },
    
    // Limpiar logs de test
    cleanTestLogs: () => {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const logsDir = path.join(__dirname, '../logs');
            if (fs.existsSync(logsDir)) {
                const files = fs.readdirSync(logsDir);
                files.forEach(file => {
                    if (file.includes('test')) {
                        fs.unlinkSync(path.join(logsDir, file));
                    }
                });
            }
        } catch (error) {
            console.warn('Could not clean test logs:', error.message);
        }
    }
};

// Mock de variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'gymtec_erp_test';

// Limpiar logs al finalizar todas las pruebas
afterAll(() => {
    global.testHelpers.cleanTestLogs();
});
