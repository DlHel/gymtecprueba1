/**
 * Controlador para la gestión de Tickets
 * @class TicketController
 */
class TicketController {

    /**
     * Obtener todos los tickets
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    static getAll(req, res) {
        const db = require('../db-adapter');
        const { location_id } = req.query;
    
        let sql = `
            SELECT 
                t.*,
                c.name as client_name,
                l.name as location_name,
                e.name as equipment_name,
                e.custom_id as equipment_custom_id
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            LEFT JOIN Equipment e ON t.equipment_id = e.id
            LEFT JOIN Locations l ON t.location_id = l.id
        `;
        
        let params = [];
        
        if (location_id) {
            sql += ` WHERE t.location_id = ?`;
            params.push(location_id);
        }
        
        sql += ` ORDER BY t.created_at DESC`;
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Error en consulta de tickets:', err.message);
                res.status(500).json({ 
                    error: "Error interno del servidor al obtener tickets",
                    code: "DATABASE_ERROR"
                });
                return;
            }
            console.log(`✅ Tickets encontrados: ${rows.length}`);
            res.json({
                message: "success",
                data: rows
            });
        });
    }
}

module.exports = TicketController;
