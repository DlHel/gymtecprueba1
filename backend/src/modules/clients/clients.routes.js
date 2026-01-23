/**
 * GYMTEC ERP - Módulo de Clientes
 * Extraído de server-clean.js para arquitectura modular
 */

const express = require('express');
const router = express.Router();
const db = require('../../db-adapter');
const { authenticateToken } = require('../../core/middleware/auth.middleware');
const { validateClient, validateClientUpdate } = require('../../validators');

// ===================================================================
// RUTAS DE CLIENTES
// ===================================================================

// GET all clients
router.get('/clients', authenticateToken, (req, res) => {
    db.all(`
        SELECT c.*, COUNT(l.id) as location_count
        FROM Clients c
        LEFT JOIN Locations l ON c.id = l.client_id
        GROUP BY c.id
        ORDER BY c.name
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "success", data: rows });
    });
});

// GET a single client by id
router.get("/clients/:id", authenticateToken, (req, res) => {
    const sql = "select * from Clients where id = ?"
    const params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json(row);
      });
});

// POST new client
router.post('/clients', authenticateToken, (req, res) => {
    const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
    
    const validation = validateClient(req.body);
    if (!validation.isValid) {
        res.status(400).json({
            "error": "Datos de cliente inválidos",
            "details": validation.errors
        });
        return;
    }
    const sql = 'INSERT INTO Clients (name, legal_name, rut, address, phone, email, business_activity, contact_name) VALUES (?,?,?,?,?,?,?,?)';
    const params = [name, legal_name, rut, address, phone, email, business_activity, contact_name];
    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: Clients.rut')) {
                return res.status(409).json({ "error": "El RUT ingresado ya se encuentra registrado en el sistema." });
            }
            return res.status(400).json({"error":err.message});
        }
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT update client
router.put("/clients/:id", authenticateToken, (req, res) => {
    const { name, legal_name, rut, address, phone, email, business_activity, contact_name } = req.body;
    
    const validation = validateClientUpdate(req.body);
    if (!validation.isValid) {
        res.status(400).json({
            "error": "Datos de cliente inválidos",
            "details": validation.errors
        });
        return;
    }
    const sql = `UPDATE Clients set 
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
    db.run(sql, params, function (err, result) {
            if (err){
                res.status(400).json({"error": err.message})
                return;
            }
            res.json({
                message: "success",
                data: req.body,
                changes: this.changes
            })
    });
});

// DELETE client (with cascade)
router.delete("/clients/:id", authenticateToken, (req, res) => {
    const clientId = req.params.id;
    console.log(`🗑️ Iniciando eliminación en cascada para cliente ID: ${clientId}`);
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION", (err) => {
            if (err) {
                console.error("❌ Error al iniciar transacción:", err);
                return res.status(500).json({"error": "Error al iniciar transacción: " + err.message});
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
                        res.status(500).json({"error": "Error eliminando fotos de equipos: " + err.message});
                    });
                }
                console.log(`✅ Eliminadas ${this.changes} fotos de equipos`);
                
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
                            res.status(500).json({"error": "Error eliminando tickets: " + err.message});
                        });
                    }
                    console.log(`✅ Eliminados ${this.changes} tickets`);
                    
                    console.log("🔧 Paso 3: Eliminando equipos...");
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
                                res.status(500).json({"error": "Error eliminando equipos: " + err.message});
                            });
                        }
                        console.log(`✅ Eliminados ${this.changes} equipos`);
                        
                        console.log("🏢 Paso 4: Eliminando sedes...");
                        const deleteLocationsSQL = 'DELETE FROM Locations WHERE client_id = ?';
                        
                        db.run(deleteLocationsSQL, [clientId], function(err) {
                            if (err) {
                                console.error("❌ Error eliminando sedes:", err);
                                return db.run("ROLLBACK", () => {
                                    res.status(500).json({"error": "Error eliminando sedes: " + err.message});
                                });
                            }
                            console.log(`✅ Eliminadas ${this.changes} sedes`);
                            
                            console.log("👤 Paso 5: Eliminando cliente...");
                            const deleteClientSQL = 'DELETE FROM Clients WHERE id = ?';
                            
                            db.run(deleteClientSQL, [clientId], function(err) {
                                if (err) {
                                    console.error("❌ Error eliminando cliente:", err);
                                    return db.run("ROLLBACK", () => {
                                        res.status(500).json({"error": "Error eliminando cliente: " + err.message});
                                    });
                                }
                                
                                if (this.changes === 0) {
                                    console.log("⚠️ Cliente no encontrado");
                                    return db.run("ROLLBACK", () => {
                                        res.status(404).json({"error": "Cliente no encontrado"});
                                    });
                                }
                                
                                console.log("✅ Cliente eliminado exitosamente");
                                db.run("COMMIT", (err) => {
                                    if (err) {
                                        console.error("❌ Error al confirmar transacción:", err);
                                        return res.status(500).json({"error": "Error al confirmar eliminación: " + err.message});
                                    }
                                    
                                    console.log("🎉 Eliminación en cascada completada exitosamente");
                                    res.json({
                                        "message": "Cliente y todos sus datos relacionados eliminados exitosamente",
                                        "clientId": clientId,
                                        "changes": this.changes
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// GET locations for a specific client
router.get('/clients/:clientId/locations', authenticateToken, (req, res) => {
    const { clientId } = req.params;
    
    db.all(`
        SELECT 
            l.id,
            l.name,
            l.address,
            l.client_id,
            l.created_at,
            l.updated_at,
            COUNT(e.id) as equipment_count
        FROM Locations l
        LEFT JOIN Equipment e ON l.id = e.location_id
        WHERE l.client_id = ?
        GROUP BY l.id, l.name, l.address, l.client_id, l.created_at, l.updated_at
        ORDER BY l.name
    `, [clientId], (err, rows) => {
        if (err) {
            console.error('❌ Error en consulta de ubicaciones:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "success", data: rows });
    });
});

module.exports = router;
