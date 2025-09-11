const express = require('express');
const AuthController = require('../controllers/authController');
const ClientController = require('../controllers/clientController');
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
    // RUTAS PENDIENTES DE MODULARIZAR
    // ===================================================================
    
    // TODO: Mover a LocationController
    console.log('⏳ Rutas de ubicaciones pendientes de modularizar');
    
    // TODO: Mover a EquipmentController  
    console.log('⏳ Rutas de equipos pendientes de modularizar');
    
    // TODO: Mover a TicketController
    console.log('⏳ Rutas de tickets pendientes de modularizar');
    
    // TODO: Mover a InventoryController
    console.log('⏳ Rutas de inventario pendientes de modularizar');
    
    // TODO: Mover a DashboardController
    console.log('⏳ Rutas de dashboard pendientes de modularizar');

    console.log('✅ Rutas modulares configuradas correctamente');
    
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
        'DELETE /api/clients/:id'
    ];
    
    console.log('📋 Rutas modulares configuradas:');
    configuredRoutes.forEach(route => {
        console.log(`   ✅ ${route}`);
    });
}

module.exports = { setupRoutes };
