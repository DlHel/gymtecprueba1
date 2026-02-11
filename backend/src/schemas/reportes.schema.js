const { z } = require('zod');

/**
 * Esquema para crear un informe técnico
 */
const createInformeSchema = z.object({
    body: z.object({
        ticket_id: z.union([
            z.number({ required_error: "Ticket ID es requerido" }),
            z.string({ required_error: "Ticket ID es requerido" }).regex(/^\d+$/).transform(val => parseInt(val, 10))
        ]),
        filename: z.string({ required_error: "Nombre de archivo es requerido" })
            .min(1, "Nombre de archivo no puede estar vacío"),
        notas_adicionales: z.string().optional().nullable(),
        client_email: z.union([
            z.string().email("Email inválido"),
            z.string().length(0), // Permitir string vacío
            z.null(),
            z.undefined()
        ]).optional().transform(e => e === "" ? null : e) // Convertir string vacío a null
    })
});

module.exports = {
    createInformeSchema
};
