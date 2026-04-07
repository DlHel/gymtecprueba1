const express = require('express');

const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');
const { validateLocation, validateLocationUpdate } = require('../../validators');

router.use(authenticateToken);

let locationColumnsCache = null;

async function getLocationColumns() {
    if (locationColumnsCache) {
        return locationColumnsCache;
    }

    const rows = await db.allAsync('SHOW COLUMNS FROM Locations');
    locationColumnsCache = new Set((rows || []).map((row) => row.Field));
    return locationColumnsCache;
}

function buildLocationPayload(columns, payload, { includeDefaults = false } = {}) {
    const fieldMap = {
        name: payload.name,
        address: payload.address,
        client_id: payload.client_id,
        city: payload.city,
        state: payload.state,
        postal_code: payload.postal_code,
        country: payload.country,
        contact_person: payload.contact_person,
        contact_phone: payload.contact_phone,
        contact_email: payload.contact_email,
        description: payload.description,
        operating_hours: payload.operating_hours,
        activo: payload.activo
    };

    const entries = [];

    Object.entries(fieldMap).forEach(([field, value]) => {
        if (!columns.has(field)) {
            return;
        }

        if (value !== undefined) {
            entries.push([field, value]);
            return;
        }

        if (includeDefaults && field === 'country') {
            entries.push([field, 'Chile']);
        }

        if (includeDefaults && field === 'activo') {
            entries.push([field, 1]);
        }
    });

    return entries;
}

router.get('/locations', async (req, res) => {
    try {
        const { client_id, search, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        let sql = `
            SELECT
                l.*,
                c.name AS client_name,
                COUNT(DISTINCT e.id) AS equipment_count,
                COUNT(DISTINCT t.id) AS active_tickets
            FROM Locations l
            LEFT JOIN Clients c ON l.client_id = c.id
            LEFT JOIN Equipment e ON l.id = e.location_id
            LEFT JOIN Tickets t ON e.id = t.equipment_id AND t.status NOT IN ('Cerrado', 'Completado')
            WHERE 1=1
        `;
        const params = [];

        if (client_id) {
            sql += ' AND l.client_id = ?';
            params.push(client_id);
        }

        if (search) {
            sql += ' AND (l.name LIKE ? OR l.address LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term);
        }

        sql += `
            GROUP BY l.id, l.name, l.address, l.client_id, l.created_at, l.updated_at, c.name
            ORDER BY c.name ASC, l.name ASC
            LIMIT ? OFFSET ?
        `;
        params.push(parseInt(limit, 10), offset);

        const rows = await db.allAsync(sql, params);

        res.json({
            message: 'success',
            data: rows || [],
            metadata: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total: rows ? rows.length : 0
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATIONS_LIST_ERROR',
            details: error.message
        });
    }
});

router.get('/locations/:id', async (req, res) => {
    try {
        const sql = `
            SELECT
                l.*,
                c.name AS client_name,
                c.email AS client_email,
                c.phone AS client_phone,
                COUNT(DISTINCT e.id) AS equipment_count,
                COUNT(DISTINCT t.id) AS active_tickets,
                COUNT(DISTINCT CASE WHEN t.status = 'Abierto' THEN t.id END) AS pending_tickets,
                COUNT(DISTINCT CASE WHEN t.priority IN ('Crítica', 'critical') THEN t.id END) AS critical_tickets
            FROM Locations l
            LEFT JOIN Clients c ON l.client_id = c.id
            LEFT JOIN Equipment e ON l.id = e.location_id
            LEFT JOIN Tickets t ON e.id = t.equipment_id AND t.status NOT IN ('Cerrado', 'Completado')
            WHERE l.id = ?
            GROUP BY l.id
        `;

        const row = await db.getAsync(sql, [req.params.id]);

        if (!row) {
            return res.status(404).json({
                error: 'Ubicación no encontrada',
                code: 'LOCATION_NOT_FOUND'
            });
        }

        res.json({ message: 'success', data: row });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_FETCH_ERROR',
            details: error.message
        });
    }
});

router.post('/locations', async (req, res) => {
    try {
        const validation = validateLocation(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Datos de ubicación inválidos',
                details: validation.errors,
                code: 'VALIDATION_ERROR'
            });
        }

        const columns = await getLocationColumns();
        const payloadEntries = buildLocationPayload(columns, req.body, { includeDefaults: true });
        const insertColumns = payloadEntries.map(([field]) => field);
        const insertValues = payloadEntries.map(([, value]) => value);

        const result = await db.runAsync(
            `
                INSERT INTO Locations (${insertColumns.join(', ')})
                VALUES (${insertColumns.map(() => '?').join(', ')})
            `,
            insertValues
        );

        res.status(201).json({
            message: 'Ubicación creada exitosamente',
            data: {
                id: result.lastID,
                name: req.body.name,
                address: req.body.address,
                client_id: req.body.client_id
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_CREATE_ERROR',
            details: error.message
        });
    }
});

router.put('/locations/:id', async (req, res) => {
    try {
        const validation = validateLocationUpdate(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Datos de ubicación inválidos',
                details: validation.errors,
                code: 'VALIDATION_ERROR'
            });
        }

        const columns = await getLocationColumns();
        const payloadEntries = buildLocationPayload(columns, req.body);
        const updateClauses = payloadEntries.map(([field]) => `${field} = ?`);
        const updateValues = payloadEntries.map(([, value]) => value);

        if (columns.has('updated_at')) {
            updateClauses.push('updated_at = NOW()');
        }

        if (!updateClauses.length) {
            return res.status(400).json({
                error: 'No se enviaron campos válidos para actualizar la ubicación',
                code: 'VALIDATION_ERROR'
            });
        }

        const result = await db.runAsync(
            `
                UPDATE Locations
                SET ${updateClauses.join(', ')}
                WHERE id = ?
            `,
            [...updateValues, req.params.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'Ubicación no encontrada',
                code: 'LOCATION_NOT_FOUND'
            });
        }

        res.json({
            message: 'success',
            changes: result.changes
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_UPDATE_ERROR',
            details: error.message
        });
    }
});

router.delete('/locations/:id', async (req, res) => {
    try {
        const result = await db.runAsync('DELETE FROM Locations WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'Ubicación no encontrada',
                code: 'LOCATION_NOT_FOUND'
            });
        }

        res.json({
            message: 'deleted',
            changes: result.changes
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_DELETE_ERROR',
            details: error.message
        });
    }
});

router.get('/locations/:id/equipment', async (req, res) => {
    try {
        const rows = await db.allAsync(
            `
                SELECT e.*, em.name AS model_name, em.brand AS model_brand
                FROM Equipment e
                LEFT JOIN EquipmentModels em ON e.model_id = em.id
                WHERE e.location_id = ?
                ORDER BY e.name ASC
            `,
            [req.params.id]
        );

        res.json({ message: 'success', data: rows || [] });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_EQUIPMENT_ERROR',
            details: error.message
        });
    }
});

router.get('/locations/:id/stats', async (req, res) => {
    try {
        const stats = await db.getAsync(
            `
                SELECT
                    COUNT(DISTINCT e.id) AS equipment_count,
                    COUNT(DISTINCT t.id) AS ticket_count,
                    COUNT(DISTINCT CASE WHEN t.status NOT IN ('Cerrado', 'Completado') THEN t.id END) AS open_ticket_count
                FROM Locations l
                LEFT JOIN Equipment e ON l.id = e.location_id
                LEFT JOIN Tickets t ON e.id = t.equipment_id
                WHERE l.id = ?
            `,
            [req.params.id]
        );

        res.json({ message: 'success', data: stats || {} });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_STATS_ERROR',
            details: error.message
        });
    }
});

router.get('/locations/:locationId/equipment', async (req, res) => {
    try {
        const { locationId } = req.params;
        const { contractId } = req.query;

        const rows = await db.allAsync(
            `
                SELECT
                    e.id,
                    COALESCE(NULLIF(e.name, ''), em.name) AS name,
                    COALESCE(NULLIF(e.type, ''), 'Equipment') AS type,
                    COALESCE(NULLIF(e.brand, ''), em.brand) AS brand,
                    COALESCE(NULLIF(e.model, ''), em.model_code, em.name) AS model,
                    COALESCE(NULLIF(e.serial_number, ''), e.custom_id, 'N/A') AS serial_number,
                    e.custom_id,
                    COALESCE(em.category, 'Sin categoría') AS category,
                    CASE
                        WHEN ce.equipment_id IS NOT NULL THEN true
                        ELSE false
                    END AS is_in_contract
                FROM Equipment e
                LEFT JOIN EquipmentModels em ON e.model_id = em.id
                LEFT JOIN contract_equipment ce ON e.id = ce.equipment_id AND ce.contract_id = ?
                WHERE e.location_id = ?
                ORDER BY COALESCE(NULLIF(e.name, ''), em.name)
            `,
            [contractId || null, locationId]
        );

        res.json({
            message: 'success',
            data: rows || [],
            metadata: {
                locationId: parseInt(locationId, 10),
                contractId: contractId ? parseInt(contractId, 10) : null,
                totalEquipment: rows ? rows.length : 0,
                contractEquipment: (rows || []).filter((row) => row.is_in_contract).length
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_EQUIPMENT_ERROR',
            details: error.message
        });
    }
});

router.get('/locations/:id/tickets', async (req, res) => {
    try {
        const rows = await db.allAsync(
            `
                SELECT t.*, e.serial_number
                FROM Tickets t
                LEFT JOIN Equipment e ON t.equipment_id = e.id
                WHERE e.location_id = ?
                ORDER BY t.created_at DESC
            `,
            [req.params.id]
        );

        res.json({
            message: 'success',
            data: rows || []
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'LOCATION_TICKETS_ERROR',
            details: error.message
        });
    }
});

module.exports = router;
