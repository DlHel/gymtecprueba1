const express = require('express');
const router = express.Router();

/**
 * @route GET /api/simple-test
 * @desc Simple test without database dependencies
 */
router.get('/simple-test', async (req, res) => {
    try {
        console.log('🧪 Simple test endpoint accessed');
        
        res.json({
            message: 'success',
            data: {
                test: 'Simple endpoint working',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error en simple test:', error);
        res.status(500).json({
            error: 'Error en simple test',
            details: error.message
        });
    }
});

/**
 * @route GET /api/mysql-test
 * @desc Test MySQL connection directly
 */
router.get('/mysql-test', async (req, res) => {
    try {
        console.log('🧪 MySQL test endpoint accessed');
        
        // Import MySQL module directly
        const mysql = require('../mysql-database');
        
        console.log('📡 Testing MySQL connection...');
        const result = await mysql.query('SELECT 1 as test, NOW() as current_time');
        
        console.log('✅ MySQL test result:', result);
        
        res.json({
            message: 'success',
            data: {
                mysql_test: result,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error en MySQL test:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            error: 'Error en MySQL test',
            details: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;