const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

// Test endpoint simple que solo cuenta registros
router.get('/simple-test', async (req, res) => {
    try {
        console.log('🧪 Test simple de notificaciones...');
        
        // Test básico: contar templates sin SQL complejo
        const templateCount = await db.allAsync('SELECT COUNT(*) as count FROM NotificationTemplates');
        console.log('✅ Templates encontrados:', templateCount[0].count);
        
        // Test básico: contar queue sin SQL complejo
        const queueCount = await db.allAsync('SELECT COUNT(*) as count FROM NotificationQueue');
        console.log('✅ Queue encontrados:', queueCount[0].count);
        
        // Test básico: contar logs sin SQL complejo
        const logCount = await db.allAsync('SELECT COUNT(*) as count FROM NotificationLog');
        console.log('✅ Logs encontrados:', logCount[0].count);
        
        res.json({
            message: 'Test simple exitoso',
            data: {
                templates: templateCount[0].count,
                queue: queueCount[0].count,
                logs: logCount[0].count
            }
        });
        
    } catch (error) {
        console.error('❌ Error en test simple:', error);
        res.status(500).json({
            error: 'Error en test simple',
            details: error.message
        });
    }
});

module.exports = router;