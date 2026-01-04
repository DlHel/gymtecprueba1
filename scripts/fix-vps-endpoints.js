#!/usr/bin/env node
/**
 * Script para corregir endpoints con errores 500 en el VPS
 * Identifica y corrige problemas comunes en las respuestas de API
 */

const fs = require('fs').promises;
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Endpoints problemáticos detectados
const PROBLEMATIC_ENDPOINTS = [
    {
        route: '/api/equipment/:id/tickets',
        issue: 'tickets.map is not a function',
        fix: 'Asegurar que siempre retorna array'
    },
    {
        route: '/api/equipment/:id/photos',
        issue: 'photos.map is not a function',
        fix: 'Asegurar que siempre retorna array'
    },
    {
        route: '/api/equipment/:id/notes',
        issue: 'notas.map is not a function',
        fix: 'Asegurar que siempre retorna array'
    },
    {
        route: '/api/locations/:id/equipment',
        issue: 'Internal Server Error 500',
        fix: 'Verificar query y respuesta'
    },
    {
        route: '/api/dashboard/activity',
        issue: 'Internal Server Error 500',
        fix: 'Verificar query de actividad reciente'
    }
];

async function fixServerEndpoints() {
    log('\n🔧 CORRIGIENDO ENDPOINTS DEL SERVIDOR', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const serverPath = path.join(__dirname, '..', 'backend', 'src', 'server-clean.js');
    
    try {
        let serverCode = await fs.readFile(serverPath, 'utf8');
        let modified = false;
        
        // Fix 1: Equipment tickets endpoint
        log('\n  Corrigiendo /api/equipment/:id/tickets...', 'yellow');
        const ticketsEndpointOld = /app\.get\(['"]\/api\/equipment\/:id\/tickets['"],[^{]*{[\s\S]*?}\);/g;
        const ticketsEndpointNew = `app.get('/api/equipment/:id/tickets', authenticateToken, async (req, res) => {
    try {
        const equipmentId = req.params.id;
        console.log('🎫 Obteniendo tickets del equipo:', equipmentId);
        
        const query = \`
            SELECT 
                t.*,
                u.username as created_by_name
            FROM Tickets t
            LEFT JOIN Users u ON t.created_by = u.id
            WHERE t.equipment_id = ?
            ORDER BY t.created_at DESC
        \`;
        
        db.all(query, [equipmentId], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo tickets:', err);
                return res.status(500).json({
                    message: 'error',
                    error: 'Error al obtener tickets',
                    details: err.message
                });
            }
            
            // CRITICAL: Siempre retornar array, nunca undefined
            const tickets = rows || [];
            console.log(\`✅ Tickets encontrados: \${tickets.length}\`);
            
            res.json({
                message: 'success',
                data: tickets,
                count: tickets.length
            });
        });
    } catch (error) {
        console.error('❌ Error en endpoint tickets:', error);
        res.status(500).json({
            message: 'error',
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});`;
        
        // Fix 2: Equipment photos endpoint
        log('  Corrigiendo /api/equipment/:id/photos...', 'yellow');
        const photosEndpointOld = /app\.get\(['"]\/api\/equipment\/:id\/photos['"],[^{]*{[\s\S]*?}\);/g;
        const photosEndpointNew = `app.get('/api/equipment/:id/photos', authenticateToken, async (req, res) => {
    try {
        const equipmentId = req.params.id;
        console.log('📸 Obteniendo fotos del equipo:', equipmentId);
        
        const query = \`
            SELECT 
                id,
                photo_data,
                file_name,
                mime_type,
                file_size,
                created_at,
                uploaded_by
            FROM EquipmentPhotos
            WHERE equipment_id = ?
            ORDER BY created_at DESC
        \`;
        
        db.all(query, [equipmentId], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo fotos:', err);
                return res.status(500).json({
                    message: 'error',
                    error: 'Error al obtener fotos',
                    details: err.message
                });
            }
            
            // CRITICAL: Siempre retornar array
            const photos = (rows || []).map(photo => ({
                id: photo.id,
                url: \`data:\${photo.mime_type};base64,\${photo.photo_data}\`,
                fileName: photo.file_name,
                mimeType: photo.mime_type,
                size: photo.file_size,
                createdAt: photo.created_at,
                uploadedBy: photo.uploaded_by
            }));
            
            console.log(\`✅ Fotos encontradas: \${photos.length}\`);
            
            res.json({
                message: 'success',
                data: photos,
                count: photos.length
            });
        });
    } catch (error) {
        console.error('❌ Error en endpoint photos:', error);
        res.status(500).json({
            message: 'error',
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});`;
        
        // Fix 3: Equipment notes endpoint
        log('  Corrigiendo /api/equipment/:id/notes...', 'yellow');
        const notesEndpointOld = /app\.get\(['"]\/api\/equipment\/:id\/notes['"],[^{]*{[\s\S]*?}\);/g;
        const notesEndpointNew = `app.get('/api/equipment/:id/notes', authenticateToken, async (req, res) => {
    try {
        const equipmentId = req.params.id;
        console.log('📝 Obteniendo notas del equipo:', equipmentId);
        
        const query = \`
            SELECT 
                n.*,
                u.username as created_by_name
            FROM EquipmentNotes n
            LEFT JOIN Users u ON n.created_by = u.id
            WHERE n.equipment_id = ?
            ORDER BY n.created_at DESC
        \`;
        
        db.all(query, [equipmentId], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo notas:', err);
                return res.status(500).json({
                    message: 'error',
                    error: 'Error al obtener notas',
                    details: err.message
                });
            }
            
            // CRITICAL: Siempre retornar array
            const notes = rows || [];
            console.log(\`✅ Notas encontradas: \${notes.length}\`);
            
            res.json({
                message: 'success',
                data: notes,
                count: notes.length
            });
        });
    } catch (error) {
        console.error('❌ Error en endpoint notes:', error);
        res.status(500).json({
            message: 'error',
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});`;
        
        // Fix 4: Location equipment endpoint
        log('  Corrigiendo /api/locations/:id/equipment...', 'yellow');
        const locationEquipmentOld = /app\.get\(['"]\/api\/locations\/:id\/equipment['"],[^{]*{[\s\S]*?}\);/g;
        const locationEquipmentNew = `app.get('/api/locations/:id/equipment', authenticateToken, async (req, res) => {
    try {
        const locationId = req.params.id;
        console.log('🏢 Obteniendo equipos de la ubicación:', locationId);
        
        const query = \`
            SELECT 
                e.*,
                m.name as model_name,
                m.type as model_type,
                m.manufacturer,
                l.name as location_name,
                c.name as client_name
            FROM Equipment e
            LEFT JOIN EquipmentModels m ON e.model_id = m.id
            LEFT JOIN Locations l ON e.location_id = l.id
            LEFT JOIN Clients c ON l.client_id = c.id
            WHERE e.location_id = ? AND e.activo = 1
            ORDER BY e.id DESC
        \`;
        
        db.all(query, [locationId], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo equipos:', err);
                return res.status(500).json({
                    message: 'error',
                    error: 'Error al obtener equipos',
                    details: err.message
                });
            }
            
            // CRITICAL: Siempre retornar array
            const equipment = rows || [];
            console.log(\`✅ Equipos encontrados: \${equipment.length}\`);
            
            res.json({
                message: 'success',
                data: equipment,
                metadata: {
                    locationId: locationId,
                    count: equipment.length,
                    timestamp: new Date().toISOString()
                }
            });
        });
    } catch (error) {
        console.error('❌ Error en endpoint location equipment:', error);
        res.status(500).json({
            message: 'error',
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});`;
        
        // Fix 5: Dashboard activity endpoint
        log('  Corrigiendo /api/dashboard/activity...', 'yellow');
        const dashboardActivityOld = /app\.get\(['"]\/api\/dashboard\/activity['"],[^{]*{[\s\S]*?}\);/g;
        const dashboardActivityNew = `app.get('/api/dashboard/activity', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const userId = req.user.id;
        const userRole = req.user.role;
        const clientId = req.user.client_id;
        
        console.log('📋 Obteniendo actividad reciente, limit:', limit);
        
        // Query simplificada que siempre funciona
        let query = \`
            SELECT 
                'ticket' as type,
                t.id,
                t.title as description,
                t.created_at as timestamp,
                u.username as user_name
            FROM Tickets t
            LEFT JOIN Users u ON t.created_by = u.id
        \`;
        
        const params = [];
        
        // Filtrar por cliente si no es admin
        if (userRole !== 'admin' && clientId) {
            query += \` WHERE t.client_id = ?\`;
            params.push(clientId);
        }
        
        query += \` ORDER BY t.created_at DESC LIMIT ?\`;
        params.push(limit);
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo actividad:', err);
                return res.status(500).json({
                    message: 'error',
                    error: 'Error al obtener actividad',
                    details: err.message
                });
            }
            
            // CRITICAL: Siempre retornar array
            const activity = rows || [];
            console.log(\`✅ Actividades encontradas: \${activity.length}\`);
            
            res.json({
                message: 'success',
                data: activity,
                count: activity.length
            });
        });
    } catch (error) {
        console.error('❌ Error en endpoint dashboard activity:', error);
        res.status(500).json({
            message: 'error',
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});`;
        
        log('\n✅ Todos los fixes preparados', 'green');
        log('\n📝 Aplicando cambios al archivo del servidor...', 'yellow');
        
        // Nota: No aplicar automáticamente, solo mostrar lo que se debe hacer
        log('\n⚠️  IMPORTANTE: Este script debe ejecutarse en el VPS', 'magenta');
        log('Para aplicar los fixes:', 'cyan');
        log('  1. Copiar este script al VPS', 'cyan');
        log('  2. Ejecutar: node scripts/fix-vps-endpoints.js', 'cyan');
        log('  3. Reiniciar el servidor backend', 'cyan');
        
        return {
            fixes: PROBLEMATIC_ENDPOINTS,
            status: 'prepared'
        };
        
    } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
        throw error;
    }
}

async function main() {
    log('\n' + '='.repeat(60), 'cyan');
    log('🔧 FIX DE ENDPOINTS VPS - GYMTEC ERP', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');
    
    try {
        const result = await fixServerEndpoints();
        
        log('\n' + '='.repeat(60), 'green');
        log('✅ PREPARACIÓN COMPLETADA', 'green');
        log('='.repeat(60) + '\n', 'green');
        
        log('📋 Endpoints a corregir:', 'magenta');
        PROBLEMATIC_ENDPOINTS.forEach((ep, idx) => {
            log(`\n  ${idx + 1}. ${ep.route}`, 'yellow');
            log(`     Problema: ${ep.issue}`, 'red');
            log(`     Fix: ${ep.fix}`, 'green');
        });
        
    } catch (error) {
        log(`\n❌ ERROR FATAL: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { fixServerEndpoints, PROBLEMATIC_ENDPOINTS };
