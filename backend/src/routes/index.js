const express = require('express');
const AuthController = require('../controllers/authController');
const ClientController = require('../controllers/clientController');
const TicketController = require('../controllers/ticketController');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Configurador de Rutas Principal
 * @bitacora: Sistema modular de rutas organizadas por módulos
 */

function setupRoutes(app) {
    console.log('🔧 Configurando rutas modulares...');

    // ===================================================================
    // RUTAS DE PRUEBA Y DIAGNÓSTICO
    // ===================================================================
    
    app.get('/api/test-early', (req, res) => {
        console.log('🔍 Endpoint /api/test-early called');
        res.json({
            message: 'Server is working! (Early endpoint)',
            timestamp: new Date().toISOString(),
            loadedRoutes: [
                'GET /api/test-early',
                'Static files configured',
                'CORS enabled',
                'JSON middleware enabled'
            ]
        });
    });

    app.get('/api/diag', (req, res) => {
        console.log('🔍 Endpoint /api/diag called');
        res.json({
            message: 'Diagnostic endpoint working!',
            timestamp: new Date().toISOString(),
            server: 'Express',
            architecture: 'Modular'
        });
    });

    app.get('/test', (req, res) => {
        console.log('🔍 Endpoint /test called');
        res.json({
            message: 'Test endpoint without /api working!',
            timestamp: new Date().toISOString()
        });
    });

    // ===================================================================
    // RUTAS DE AUTENTICACIÓN
    // ===================================================================
    
    // Endpoint de test para login
    app.post('/api/auth/test-login', (req, res) => {
        console.log('🧪 Test login endpoint called', req.body);
        const { username, password } = req.body;
        
        // Usuario de test hardcodeado
        if (username === 'admin' && password === 'admin123') {
            const token = 'test-token-12345';
            console.log('✅ Test login successful');
            res.json({
                message: 'Login successful',
                token: token,
                user: {
                    id: 1,
                    username: 'admin',
                    email: 'admin@gymtec.com',
                    role: 'admin'
                }
            });
        } else {
            console.log('❌ Test login failed');
            res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
    });
    
    app.post('/api/auth/login', AuthController.login);
    app.post('/api/auth/logout', authenticateToken, AuthController.logout);
    app.get('/api/auth/verify', authenticateToken, AuthController.verify);
    app.post('/api/auth/change-password', authenticateToken, AuthController.changePassword);

    // ===================================================================
    // RUTAS DE CLIENTES
    // ===================================================================
    
    app.get('/api/clients', ClientController.getAll);
    app.get('/api/clients/:id', ClientController.getById);
    app.post('/api/clients', ClientController.create);
    app.put('/api/clients/:id', ClientController.update);
    app.delete('/api/clients/:id', requireRole(['Admin', 'Manager']), ClientController.delete);

    // ===================================================================
    // RUTAS DE UBICACIONES (LOCATIONS)
    // ===================================================================
    
    app.get('/api/locations', (req, res) => {
        console.log('🏢 GET /api/locations called');
        // Mock data para testing
        res.json({
            message: 'success',
            data: [
                { id: 1, name: 'Sede Principal', client_id: 1, address: 'Av. Principal 123', city: 'Lima' },
                { id: 2, name: 'Sede Norte', client_id: 1, address: 'Av. Norte 456', city: 'Lima' }
            ]
        });
    });
    
    app.get('/api/locations/:id', (req, res) => {
        console.log(`🏢 GET /api/locations/${req.params.id} called`);
        res.json({
            message: 'success',
            data: { id: req.params.id, name: 'Sede Principal', client_id: 1, address: 'Av. Principal 123', city: 'Lima' }
        });
    });
    
    app.post('/api/locations', (req, res) => {
        console.log('🏢 POST /api/locations called', req.body);
        res.json({
            message: 'Location created successfully',
            data: { id: Date.now(), ...req.body }
        });
    });

    // ===================================================================
    // RUTAS DE EQUIPOS (EQUIPMENT)
    // ===================================================================
    
    app.get('/api/equipment', (req, res) => {
        console.log('🏋️ GET /api/equipment called');
        // Mock data para testing
        res.json({
            message: 'success',
            data: [
                { id: 1, name: 'Cinta Corredor Pro', model_id: 1, location_id: 1, serial_number: 'TC001', activo: true },
                { id: 2, name: 'Bicicleta Estática X1', model_id: 2, location_id: 1, serial_number: 'BE001', activo: true }
            ]
        });
    });
    
    app.get('/api/equipment/:id', (req, res) => {
        console.log(`🏋️ GET /api/equipment/${req.params.id} called`);
        res.json({
            message: 'success',
            data: { id: req.params.id, name: 'Cinta Corredor Pro', model_id: 1, location_id: 1, serial_number: 'TC001', activo: true }
        });
    });
    
    app.post('/api/equipment', (req, res) => {
        console.log('🏋️ POST /api/equipment called', req.body);
        res.json({
            message: 'Equipment created successfully',
            data: { id: Date.now(), ...req.body }
        });
    });

    // ===================================================================
    // RUTAS DE TICKETS (EXPANDIDAS)
    // ===================================================================
    
    app.get('/api/tickets', authenticateToken, TicketController.getAll);
    app.get('/api/tickets/:id', authenticateToken, TicketController.getById);
    app.post('/api/tickets', authenticateToken, TicketController.create);
    app.put('/api/tickets/:id', authenticateToken, TicketController.update);
    app.delete('/api/tickets/:id', authenticateToken, TicketController.delete);
    app.get('/api/tickets/:id/detail', authenticateToken, TicketController.getDetailById);

    // ===================================================================
    // RUTAS DE INVENTARIO
    // ===================================================================
    
    app.get('/api/inventory', (req, res) => {
        console.log('📦 GET /api/inventory called');
        res.json({
            message: 'success',
            data: [
                { id: 1, item_code: 'INV001', item_name: 'Aceite Lubricante', current_stock: 50, minimum_stock: 10 },
                { id: 2, item_code: 'INV002', item_name: 'Repuesto Motor', current_stock: 5, minimum_stock: 2 }
            ]
        });
    });
    
    app.post('/api/inventory', (req, res) => {
        console.log('📦 POST /api/inventory called', req.body);
        res.json({
            message: 'Inventory item created successfully',
            data: { id: Date.now(), ...req.body }
        });
    });

    // ===================================================================
    // RUTAS DE GASTOS (EXPENSES) - MODULAR
    // ===================================================================
    const { router: expensesRouter, setDependencies: setExpensesDependencies } = require('./expenses');
    const db = require('../db-adapter');

    setExpensesDependencies({
        db,
        authenticateToken,
        requireRole
    });
    app.use('/api/expenses', expensesRouter);
    console.log('   ✅ Módulo de Gastos (Expenses) cargado');

    // ===================================================================
    // RUTAS DE DASHBOARD Y ESTADÍSTICAS
    // ===================================================================
    
    app.get('/api/dashboard/stats', (req, res) => {
        console.log('📊 GET /api/dashboard/stats called');
        res.json({
            message: 'success',
            data: {
                totalClients: 15,
                totalEquipment: 45,
                activeTickets: 8,
                pendingExpenses: 3,
                monthlyRevenue: 12500.00
            }
        });
    });

    // ===================================================================
    // RUTAS DE USUARIOS
    // ===================================================================
    
    app.get('/api/users', authenticateToken, (req, res) => {
        console.log('👥 GET /api/users called');
        res.json({
            message: 'success',
            data: [
                { id: 1, username: 'admin', email: 'admin@gymtec.com', role: 'admin', active: true },
                { id: 2, username: 'manager', email: 'manager@gymtec.com', role: 'manager', active: true }
            ]
        });
    });

    // ===================================================================
    // RUTAS DE MODELOS DE EQUIPOS
    // ===================================================================
    
    app.get('/api/equipment-models', (req, res) => {
        console.log('🏗️ GET /api/equipment-models called');
        res.json({
            message: 'success',
            data: [
                { id: 1, name: 'Cinta Corredor', category: 'Cardio', brand: 'TechGym' },
                { id: 2, name: 'Bicicleta Estática', category: 'Cardio', brand: 'FitPro' }
            ]
        });
    });    console.log('✅ Rutas modulares configuradas correctamente');
    
    // Log de rutas configuradas
    logConfiguredRoutes();
}

/**
 * Función para loggear rutas configuradas
 */
function logConfiguredRoutes() {
    const configuredRoutes = [
        'POST /api/auth/login',
        'POST /api/auth/logout', 
        'GET /api/auth/verify',
        'POST /api/auth/change-password',
        'GET /api/clients',
        'GET /api/clients/:id',
        'POST /api/clients',
        'PUT /api/clients/:id', 
        'DELETE /api/clients/:id',
        'GET /api/locations',
        'GET /api/locations/:id',
        'POST /api/locations',
        'GET /api/equipment',
        'GET /api/equipment/:id',
        'POST /api/equipment',
        'GET /api/tickets',
        'GET /api/tickets/:id',
        'POST /api/tickets',
        'PUT /api/tickets/:id',
        'GET /api/inventory',
        'POST /api/inventory',
        'GET /api/expenses',
        'POST /api/expenses',
        'GET /api/dashboard/stats',
        'GET /api/users',
        'GET /api/equipment-models'
    ];
    
    console.log('📋 Rutas modulares configuradas:');
    configuredRoutes.forEach(route => {
        console.log(`   ✅ ${route}`);
    });
}

module.exports = { setupRoutes };
