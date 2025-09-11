const { validateClient, validateClientUpdate } = require('../validators');

/**
 * Controlador de Clientes
 * @bitacora: Módulo separado para gestión de clientes
 */
class ClientController {

    /**
     * Obtener todos los clientes con conteo de ubicaciones
     */
    static getAll(req, res) {
        const db = require('../db-adapter');
        
        db.all(`
            SELECT c.*, COUNT(l.id) as location_count
            FROM Clients c
            LEFT JOIN Locations l ON c.id = l.client_id
            GROUP BY c.id
            ORDER BY c.name
        `, (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo clientes:', err);
                res.status(500).json({ 
                    error: 'Error interno del servidor', 
                    code: 'DATABASE_ERROR' 
                });
                return;
            }
            console.log(`✅ Obtenidos ${rows.length} clientes`);
            res.json({ message: "success", data: rows });
        });
    }

    /**
     * Obtener cliente por ID
     */
    static getById(req, res) {
        const db = require('../db-adapter');
        const sql = "SELECT * FROM Clients WHERE id = ?";
        const params = [req.params.id];
        
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('❌ Error obteniendo cliente:', err);
                res.status(500).json({ 
                    error: 'Error interno del servidor', 
                    code: 'DATABASE_ERROR' 
                });
                return;
            }
            
            if (!row) {
                return res.status(404).json({
                    error: 'Cliente no encontrado',
                    code: 'CLIENT_NOT_FOUND'
                });
            }
            
            console.log(`✅ Cliente obtenido: ${row.name} (ID: ${row.id})`);
            res.json({ message: "success", data: row });
        });
    }

    /**
     * Crear nuevo cliente
     */
    static create(req, res) {
        const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
        
        // Validación
        const validation = validateClient(req.body);
        if (!validation.isValid) {
            console.log('❌ Validación fallida para cliente:', validation.errors);
            return res.status(400).json({
                error: "Datos de cliente inválidos",
                details: validation.errors,
                code: 'VALIDATION_ERROR'
            });
        }

        const db = require('../db-adapter');
        const sql = 'INSERT INTO Clients (name, legal_name, rut, address, phone, email, business_activity, contact_name) VALUES (?,?,?,?,?,?,?,?)';
        const params = [name, legal_name, rut, address, phone, email, business_activity, contact_name];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error creando cliente:', err);
                
                if (err.message.includes('UNIQUE constraint failed: Clients.rut')) {
                    return res.status(409).json({ 
                        error: "El RUT ingresado ya se encuentra registrado en el sistema.",
                        code: 'RUT_ALREADY_EXISTS'
                    });
                }
                
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DATABASE_ERROR'
                });
            }
            
            console.log(`✅ Cliente creado exitosamente: ${name} (ID: ${this.lastID})`);
            res.status(201).json({ 
                message: 'Cliente creado exitosamente',
                data: { id: this.lastID, ...req.body }
            });
        });
    }

    /**
     * Actualizar cliente existente
     */
    static update(req, res) {
        const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
        
        // Validación
        const validation = validateClientUpdate(req.body);
        if (!validation.isValid) {
            console.log('❌ Validación fallida para actualización de cliente:', validation.errors);
            return res.status(400).json({
                error: "Datos de cliente inválidos",
                details: validation.errors,
                code: 'VALIDATION_ERROR'
            });
        }

        const db = require('../db-adapter');
        const sql = `UPDATE Clients SET 
                     name = COALESCE(?,name),
                     legal_name = COALESCE(?,legal_name),
                     rut = COALESCE(?,rut),
                     address = COALESCE(?,address),
                     phone = COALESCE(?,phone),
                     email = COALESCE(?,email),
                     business_activity = COALESCE(?,business_activity),
                     contact_name = COALESCE(?,contact_name)
                     WHERE id = ?`;
        const params = [name, legal_name, rut, address, phone, email, business_activity, contact_name, req.params.id];
        
        db.run(sql, params, function (err) {
            if (err) {
                console.error('❌ Error actualizando cliente:', err);
                return res.status(500).json({
                    error: 'Error interno del servidor',
                    code: 'DATABASE_ERROR'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Cliente no encontrado',
                    code: 'CLIENT_NOT_FOUND'
                });
            }
            
            console.log(`✅ Cliente actualizado: ID ${req.params.id}`);
            res.json({
                message: "Cliente actualizado exitosamente",
                data: req.body,
                changes: this.changes
            });
        });
    }

    /**
     * Eliminar cliente (con eliminación en cascada)
     */
    static delete(req, res) {
        const clientId = req.params.id;
        console.log(`🗑️ Iniciando eliminación en cascada para cliente ID: ${clientId}`);
        
        const db = require('../db-adapter');
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION", (err) => {
                if (err) {
                    console.error("❌ Error al iniciar transacción:", err);
                    return res.status(500).json({
                        error: "Error al iniciar transacción",
                        code: 'TRANSACTION_ERROR'
                    });
                }
                
                console.log("📋 Paso 1: Eliminando fotos de equipos...");
                const deleteEquipmentPhotosSQL = `
                    DELETE FROM EquipmentPhotos 
                    WHERE equipment_id IN (
                        SELECT e.id FROM Equipment e 
                        JOIN Locations l ON e.location_id = l.id 
                        WHERE l.client_id = ?
                    )
                `;
                
                db.run(deleteEquipmentPhotosSQL, [clientId], function(err) {
                    if (err) {
                        console.error("❌ Error eliminando fotos de equipos:", err);
                        return db.run("ROLLBACK", () => {
                            res.status(500).json({
                                error: "Error eliminando fotos de equipos",
                                code: 'DELETE_PHOTOS_ERROR'
                            });
                        });
                    }
                    console.log(`✅ Eliminadas ${this.changes} fotos de equipos`);
                    
                    // Continuar con eliminación de tickets
                    ClientController._deleteTickets(db, clientId, res);
                });
            });
        });
    }

    /**
     * Método auxiliar para eliminar tickets (parte de eliminación en cascada)
     */
    static _deleteTickets(db, clientId, res) {
        console.log("🎫 Paso 2: Eliminando tickets...");
        const deleteTicketsSQL = `
            DELETE FROM Tickets 
            WHERE equipment_id IN (
                SELECT e.id FROM Equipment e 
                JOIN Locations l ON e.location_id = l.id 
                WHERE l.client_id = ?
            )
        `;
        
        db.run(deleteTicketsSQL, [clientId], function(err) {
            if (err) {
                console.error("❌ Error eliminando tickets:", err);
                return db.run("ROLLBACK", () => {
                    res.status(500).json({
                        error: "Error eliminando tickets",
                        code: 'DELETE_TICKETS_ERROR'
                    });
                });
            }
            console.log(`✅ Eliminados ${this.changes} tickets`);
            
            // Continuar con eliminación de equipos
            ClientController._deleteEquipment(db, clientId, res);
        });
    }

    /**
     * Método auxiliar para eliminar equipos (parte de eliminación en cascada)
     */
    static _deleteEquipment(db, clientId, res) {
        console.log("🏋️ Paso 3: Eliminando equipos...");
        const deleteEquipmentSQL = `
            DELETE FROM Equipment 
            WHERE location_id IN (
                SELECT id FROM Locations WHERE client_id = ?
            )
        `;
        
        db.run(deleteEquipmentSQL, [clientId], function(err) {
            if (err) {
                console.error("❌ Error eliminando equipos:", err);
                return db.run("ROLLBACK", () => {
                    res.status(500).json({
                        error: "Error eliminando equipos",
                        code: 'DELETE_EQUIPMENT_ERROR'
                    });
                });
            }
            console.log(`✅ Eliminados ${this.changes} equipos`);
            
            // Continuar con eliminación de ubicaciones
            ClientController._deleteLocations(db, clientId, res);
        });
    }

    /**
     * Método auxiliar para eliminar ubicaciones (parte de eliminación en cascada)
     */
    static _deleteLocations(db, clientId, res) {
        console.log("📍 Paso 4: Eliminando ubicaciones...");
        const deleteLocationsSQL = "DELETE FROM Locations WHERE client_id = ?";
        
        db.run(deleteLocationsSQL, [clientId], function(err) {
            if (err) {
                console.error("❌ Error eliminando ubicaciones:", err);
                return db.run("ROLLBACK", () => {
                    res.status(500).json({
                        error: "Error eliminando ubicaciones",
                        code: 'DELETE_LOCATIONS_ERROR'
                    });
                });
            }
            console.log(`✅ Eliminadas ${this.changes} ubicaciones`);
            
            // Finalmente eliminar el cliente
            ClientController._deleteClient(db, clientId, res);
        });
    }

    /**
     * Método auxiliar para eliminar cliente (paso final de eliminación en cascada)
     */
    static _deleteClient(db, clientId, res) {
        console.log("👤 Paso 5: Eliminando cliente...");
        const deleteClientSQL = "DELETE FROM Clients WHERE id = ?";
        
        db.run(deleteClientSQL, [clientId], function(err) {
            if (err) {
                console.error("❌ Error eliminando cliente:", err);
                return db.run("ROLLBACK", () => {
                    res.status(500).json({
                        error: "Error eliminando cliente",
                        code: 'DELETE_CLIENT_ERROR'
                    });
                });
            }
            
            if (this.changes === 0) {
                return db.run("ROLLBACK", () => {
                    res.status(404).json({
                        error: "Cliente no encontrado",
                        code: 'CLIENT_NOT_FOUND'
                    });
                });
            }
            
            console.log("✅ Cliente eliminado exitosamente");
            
            // Confirmar transacción
            db.run("COMMIT", (err) => {
                if (err) {
                    console.error("❌ Error confirmando transacción:", err);
                    return res.status(500).json({
                        error: "Error confirmando eliminación",
                        code: 'COMMIT_ERROR'
                    });
                }
                
                console.log("🎉 Eliminación en cascada completada exitosamente");
                res.json({
                    message: "Cliente y todos sus datos asociados eliminados exitosamente",
                    deleted_client_id: clientId,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }
}

module.exports = ClientController;
