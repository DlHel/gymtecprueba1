const express = require('express');
const router = express.Router();

// Importar el adaptador de base de datos
const db = require('../db-adapter');

/**
 * @route GET /api/test-db
 * @desc Probar conexión de base de datos paso a paso
 */
router.get('/test-db', async (req, res) => {
    try {
        console.log('🧪 Iniciando test de base de datos...');
        
        // Test 1: Verificar que db existe
        console.log('✅ 1. DB adapter cargado:', typeof db);
        
        // Test 2: Verificar allAsync method
        console.log('✅ 2. allAsync method:', typeof db.allAsync);
        
        // Test 3: Query simple
        console.log('🔍 3. Ejecutando query simple...');
        const result = await db.allAsync('SELECT 1 as test');
        console.log('✅ 3. Query simple result:', result);
        
        // Test 4: Query a tabla real
        console.log('🔍 4. Ejecutando query a NotificationTemplates...');
        const templates = await db.allAsync('SELECT COUNT(*) as count FROM NotificationTemplates');
        console.log('✅ 4. Templates count result:', templates);
        
        res.json({
            message: 'success',
            tests: {
                db_adapter: 'loaded',
                allAsync_method: 'available',
                simple_query: result,
                templates_count: templates
            }
        });
        
    } catch (error) {
        console.error('❌ Error en test de DB:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        
        res.status(500).json({
            error: 'Error en test de base de datos',
            details: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;