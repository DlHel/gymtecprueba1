const express = require('express');

const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');

router.use(authenticateToken);

router.get('/models', async (req, res) => {
    try {
        const rows = await db.allAsync(
            `
                SELECT
                    id,
                    name,
                    brand,
                    category,
                    model_code,
                    description,
                    weight,
                    dimensions,
                    voltage,
                    power,
                    specifications AS technical_specs,
                    created_at,
                    updated_at
                FROM EquipmentModels
                ORDER BY brand ASC, name ASC
            `
        );

        res.json({
            message: 'success',
            data: rows || [],
            count: rows ? rows.length : 0
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al obtener modelos',
            code: 'MODEL_LIST_ERROR',
            details: error.message
        });
    }
});

router.get('/models/:id', async (req, res) => {
    try {
        const row = await db.getAsync('SELECT * FROM EquipmentModels WHERE id = ?', [req.params.id]);

        if (!row) {
            return res.status(404).json({
                error: 'Modelo no encontrado',
                code: 'MODEL_NOT_FOUND'
            });
        }

        res.json({ message: 'success', data: row });
    } catch (error) {
        res.status(500).json({
            error: 'Error al obtener modelo',
            code: 'MODEL_FETCH_ERROR',
            details: error.message
        });
    }
});

router.post('/models', async (req, res) => {
    try {
        const { name, brand, category, model_code, description, weight, dimensions, voltage, power, technical_specs } = req.body;

        if (!name || !brand || !category) {
            return res.status(400).json({
                error: 'Nombre, marca y categoría son requeridos',
                code: 'VALIDATION_ERROR'
            });
        }

        if (model_code) {
            const existing = await db.getAsync('SELECT id FROM EquipmentModels WHERE model_code = ?', [model_code]);
            if (existing) {
                return res.status(409).json({
                    error: 'El código del modelo ya existe',
                    code: 'MODEL_CODE_EXISTS'
                });
            }
        }

        const result = await db.runAsync(
            `
                INSERT INTO EquipmentModels
                (name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                name,
                brand,
                category,
                model_code || null,
                description || null,
                weight || null,
                dimensions || null,
                voltage || null,
                power || null,
                technical_specs || null
            ]
        );

        res.status(201).json({
            message: 'success',
            data: {
                id: result.lastID,
                name,
                brand,
                category,
                model_code,
                description,
                weight,
                dimensions,
                voltage,
                power,
                technical_specs
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al crear modelo',
            code: 'MODEL_CREATE_ERROR',
            details: error.message
        });
    }
});

router.put('/models/:id', async (req, res) => {
    try {
        const modelId = req.params.id;
        const existing = await db.getAsync('SELECT * FROM EquipmentModels WHERE id = ?', [modelId]);

        if (!existing) {
            return res.status(404).json({
                error: 'Modelo no encontrado',
                code: 'MODEL_NOT_FOUND'
            });
        }

        const { name, brand, category, model_code, description, weight, dimensions, voltage, power, technical_specs } = req.body;

        if (!name || !brand || !category) {
            return res.status(400).json({
                error: 'Nombre, marca y categoría son requeridos',
                code: 'VALIDATION_ERROR'
            });
        }

        if (model_code && model_code !== existing.model_code) {
            const conflict = await db.getAsync('SELECT id FROM EquipmentModels WHERE model_code = ? AND id != ?', [model_code, modelId]);
            if (conflict) {
                return res.status(409).json({
                    error: 'El código del modelo ya existe',
                    code: 'MODEL_CODE_EXISTS'
                });
            }
        }

        await db.runAsync(
            `
                UPDATE EquipmentModels SET
                    name = ?,
                    brand = ?,
                    category = ?,
                    model_code = ?,
                    description = ?,
                    weight = ?,
                    dimensions = ?,
                    voltage = ?,
                    power = ?,
                    specifications = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            [
                name,
                brand,
                category,
                model_code || null,
                description || null,
                weight || null,
                dimensions || null,
                voltage || null,
                power || null,
                technical_specs || null,
                modelId
            ]
        );

        res.json({
            message: 'success',
            data: {
                id: modelId,
                name,
                brand,
                category,
                model_code,
                description,
                weight,
                dimensions,
                voltage,
                power,
                technical_specs
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al actualizar modelo',
            code: 'MODEL_UPDATE_ERROR',
            details: error.message
        });
    }
});

router.delete('/models/:id', async (req, res) => {
    try {
        const modelId = req.params.id;
        const existing = await db.getAsync('SELECT id FROM EquipmentModels WHERE id = ?', [modelId]);

        if (!existing) {
            return res.status(404).json({
                error: 'Modelo no encontrado',
                code: 'MODEL_NOT_FOUND'
            });
        }

        const linkedEquipment = await db.getAsync('SELECT COUNT(*) AS count FROM Equipment WHERE model_id = ?', [modelId]);
        if ((linkedEquipment && linkedEquipment.count) > 0) {
            return res.status(409).json({
                error: `No se puede eliminar el modelo. Hay ${linkedEquipment.count} equipos usando este modelo.`,
                code: 'MODEL_IN_USE'
            });
        }

        await db.runAsync('DELETE FROM EquipmentModels WHERE id = ?', [modelId]);

        res.json({
            message: 'success',
            data: { deleted: true, id: modelId }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al eliminar modelo',
            code: 'MODEL_DELETE_ERROR',
            details: error.message
        });
    }
});

router.get('/models/:id/photos', async (req, res) => {
    try {
        const rows = await db.allAsync(
            `
                SELECT id, photo_data, file_name, mime_type, file_size, is_primary, created_at
                FROM ModelPhotos
                WHERE model_id = ?
                ORDER BY is_primary DESC, created_at ASC
            `,
            [req.params.id]
        );

        const photos = (rows || []).map((row) => ({
            id: row.id,
            url: `data:${row.mime_type};base64,${row.photo_data}`,
            fileName: row.file_name,
            isPrimary: row.is_primary,
            size: row.file_size,
            createdAt: row.created_at
        }));

        res.json(photos);
    } catch (error) {
        res.status(500).json({
            error: 'Error al obtener fotos del modelo',
            code: 'MODEL_PHOTOS_ERROR',
            details: error.message
        });
    }
});

router.get('/models/:id/main-photo', async (req, res) => {
    try {
        const primary = await db.getAsync(
            `
                SELECT id, photo_data, file_name, mime_type, file_size, created_at
                FROM ModelPhotos
                WHERE model_id = ? AND is_primary = 1
                LIMIT 1
            `,
            [req.params.id]
        );

        const fallback = primary || await db.getAsync(
            `
                SELECT id, photo_data, file_name, mime_type, file_size, created_at
                FROM ModelPhotos
                WHERE model_id = ?
                ORDER BY created_at ASC
                LIMIT 1
            `,
            [req.params.id]
        );

        if (!fallback) {
            return res.status(404).json({
                error: 'No se encontró foto para este modelo',
                code: 'MODEL_PHOTO_NOT_FOUND'
            });
        }

        res.json({
            message: 'success',
            data: {
                id: fallback.id,
                url: `data:${fallback.mime_type};base64,${fallback.photo_data}`,
                fileName: fallback.file_name,
                isPrimary: !!primary,
                size: fallback.file_size,
                createdAt: fallback.created_at
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error al obtener foto principal',
            code: 'MODEL_MAIN_PHOTO_ERROR',
            details: error.message
        });
    }
});

module.exports = router;
