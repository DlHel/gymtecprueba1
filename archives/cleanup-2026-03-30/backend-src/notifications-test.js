const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

// Test endpoint simple
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Probando conexión básica de base de datos...');
        
        // Test 1: Verificar que las tablas existen
        const tables = await db.allAsync("SHOW TABLES LIKE 'Notification%'");
        console.log('✅ Tablas encontradas:', tables.length);
        
        // Test 2: Contar templates
        const templateCount = await db.allAsync('SELECT COUNT(*) as count FROM NotificationTemplates');
        console.log('✅ Templates encontrados:', templateCount[0].count);
        
        res.json({
            message: 'Test exitoso',
            data: {
                tables: tables.length,
                templates: templateCount[0].count
            }
        });
        
    } catch (error) {
        console.error('❌ Error en test:', error);
        res.status(500).json({
            error: 'Error en test',
            details: error.message
        });
    }
});

module.exports = router;