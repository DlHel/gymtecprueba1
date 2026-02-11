const { z } = require('zod');

const equipmentSchema = z.object({
    location_id: z.number().or(z.string().transform(v => parseInt(v, 10))),
    model_id: z.number().or(z.string().transform(v => parseInt(v, 10))),
    serial_number: z.string().optional(),
    acquisition_date: z.string().optional().transform(str => str ? new Date(str) : null),
    notes: z.string().optional(),
    status: z.enum(['active', 'maintenance', 'retired']).default('active')
});

const equipmentUpdateSchema = equipmentSchema.partial();

module.exports = { equipmentSchema, equipmentUpdateSchema };
