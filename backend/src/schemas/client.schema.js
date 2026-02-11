const { z } = require('zod');

const clientSchema = z.object({
    name: z.string().min(1, "El nombre comercial es obligatorio").trim(),
    legal_name: z.string().min(1, "La razón social es obligatoria").trim(),
    rut: z.string().min(8, "RUT inválido").trim(), 
    business_activity: z.string().optional(),
    address: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    phone: z.string().optional(),
    contact_name: z.string().optional()
});

const locationSchema = z.object({
    client_id: z.number({ required_error: "ID de cliente necesario" }).or(z.string().transform(val => parseInt(val, 10))),
    name: z.string().min(1, "Nombre de sede obligatorio").trim(),
    address: z.string().optional()
});

const clientUpdateSchema = clientSchema.partial();
const locationUpdateSchema = locationSchema.partial();

module.exports = { clientSchema, clientUpdateSchema, locationSchema, locationUpdateSchema };
