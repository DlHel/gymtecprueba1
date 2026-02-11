const { z } = require('zod');

/**
 * Middleware para validar requests contra un esquema Zod
 * @param {z.AnyZodObject} schema - El esquema Zod a validar
 */
const validateResource = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (e) {
        if (e instanceof z.ZodError) {
            // Log para debug
            console.error('❌ Error de validación Zod:', JSON.stringify(e.errors, null, 2));
            
            return res.status(400).json({
                message: 'error',
                error: 'Datos inválidos',
                details: e.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        return res.status(500).json({ message: 'error', error: 'Error interno de validación' });
    }
};

module.exports = validateResource;
