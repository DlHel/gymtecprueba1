const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'frontend'
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// --- API Routes for Clients ---
// GET all clients with location count
app.get('/api/clients', (req, res) => {
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
        res.json(rows);
    });
});

// GET a single client by id
app.get("/api/clients/:id", (req, res) => {
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
app.post('/api/clients', (req, res) => {
    const { name, contact_person, email, phone } = req.body;
    if (!name) {
        res.status(400).json({"error": "Missing required field: name"});
        return;
    }
    const sql = 'INSERT INTO Clients (name, contact_person, email, phone) VALUES (?,?,?,?)';
    const params = [name, contact_person, email, phone];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT (update) a client
app.put("/api/clients/:id", (req, res) => {
    const { name, contact_person, email, phone } = req.body;
    const sql = `UPDATE Clients set 
                 name = COALESCE(?,name), 
                 contact_person = COALESCE(?,contact_person), 
                 email = COALESCE(?,email), 
                 phone = COALESCE(?,phone) 
                 WHERE id = ?`;
    const params = [name, contact_person, email, phone, req.params.id];
    db.run(sql, params, function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({
                message: "success",
                data: req.body,
                changes: this.changes
            })
    });
});

// DELETE a client
app.delete("/api/clients/:id", (req, res) => {
    const sql = 'DELETE FROM Clients WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": res.message})
            return;
        }
        res.json({"message":"deleted", changes: this.changes})
    });
});


// --- API Routes for Locations (Sedes) ---
// GET all locations for a specific client with equipment summary
app.get('/api/clients/:clientId/locations', (req, res) => {
    const { clientId } = req.params;
    db.all(`
        SELECT 
            l.*,
            (SELECT GROUP_CONCAT(e.type || ' (' || type_count || ')', '; ') 
             FROM (
                SELECT type, COUNT(*) as type_count 
                FROM Equipment 
                WHERE location_id = l.id 
                GROUP BY type
             ) e
            ) as equipment_summary
        FROM Locations l
        WHERE l.client_id = ?
        ORDER BY l.name
    `, [clientId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET a single location by id
app.get("/api/locations/:id", (req, res) => {
    const sql = "SELECT * FROM Locations WHERE id = ?"
    const params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json(row);
      });
});

// POST new location for a client
app.post('/api/locations', (req, res) => {
    const { name, address, client_id } = req.body;
     if (!name || !client_id) {
        res.status(400).json({"error": "Missing required field: name and client_id"});
        return;
    }
    const sql = 'INSERT INTO Locations (name, address, client_id) VALUES (?,?,?)';
    const params = [name, address, client_id];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT (update) a location
app.put("/api/locations/:id", (req, res) => {
    const { name, address } = req.body;
    const sql = `UPDATE Locations set 
                 name = COALESCE(?,name), 
                 address = COALESCE(?,address)
                 WHERE id = ?`;
    const params = [name, address, req.params.id];
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

// DELETE a location
app.delete("/api/locations/:id", (req, res) => {
    // We should also delete equipment in this location, but for now we'll just delete the location.
    // This can be improved with cascading deletes in the DB schema.
    const sql = 'DELETE FROM Locations WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({"message":"deleted", changes: this.changes})
    });
});


// --- API Routes for Equipment ---
// GET equipment for a specific location
app.get('/api/locations/:locationId/equipment', (req, res) => {
    const { locationId } = req.params;
    const sql = "SELECT * FROM Equipment WHERE location_id = ?";
    db.all(sql, [locationId], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json(rows);
    });
});

// GET a single piece of equipment by id
app.get("/api/equipment/:id", (req, res) => {
    const sql = "SELECT * FROM Equipment WHERE id = ?"
    const params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json(row);
      });
});

// POST new equipment for a location
app.post('/api/equipment', (req, res) => {
    const { name, type, brand, model, serial_number, location_id } = req.body;
     if (!name || !location_id) {
        res.status(400).json({"error": "Missing required field: name and location_id"});
        return;
    }
    const sql = 'INSERT INTO Equipment (name, type, brand, model, serial_number, location_id) VALUES (?,?,?,?,?,?)';
    const params = [name, type, brand, model, serial_number, location_id];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT (update) a piece of equipment
app.put("/api/equipment/:id", (req, res) => {
    const { name, type, brand, model, serial_number } = req.body;
    const sql = `UPDATE Equipment set 
                 name = COALESCE(?,name), 
                 type = COALESCE(?,type),
                 brand = COALESCE(?,brand),
                 model = COALESCE(?,model),
                 serial_number = COALESCE(?,serial_number)
                 WHERE id = ?`;
    const params = [name, type, brand, model, serial_number, req.params.id];
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

// DELETE a piece of equipment
app.delete("/api/equipment/:id", (req, res) => {
    const sql = 'DELETE FROM Equipment WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({"message":"deleted", changes: this.changes})
    });
});


// --- API Routes for Spare Parts (Inventory) ---

// GET all spare parts
app.get('/api/inventory', (req, res) => {
    const sql = "SELECT * FROM SpareParts ORDER BY name";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        });
    });
});

// POST new spare part
app.post('/api/inventory', (req, res) => {
    const { name, sku, current_stock, minimum_stock } = req.body;
    if (!name) {
        return res.status(400).json({"error": "El campo 'name' es obligatorio."});
    }
    const sql = 'INSERT INTO SpareParts (name, sku, current_stock, minimum_stock) VALUES (?,?,?,?)';
    const params = [name, sku, current_stock, minimum_stock];
    db.run(sql, params, function(err) {
        if (err) {
            return res.status(400).json({"error":err.message});
        }
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID, ...req.body }
        });
    });
});

// PUT (update) a spare part
app.put("/api/inventory/:id", (req, res) => {
    const { name, sku, current_stock, minimum_stock } = req.body;
    const sql = `UPDATE SpareParts set 
                 name = COALESCE(?,name), 
                 sku = COALESCE(?,sku),
                 current_stock = COALESCE(?,current_stock),
                 minimum_stock = COALESCE(?,minimum_stock)
                 WHERE id = ?`;
    const params = [name, sku, current_stock, minimum_stock, req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            return res.status(400).json({"error": err.message});
        }
        res.json({
            message: "success",
            data: req.body,
            changes: this.changes
        });
    });
});

// DELETE a spare part
app.delete("/api/inventory/:id", (req, res) => {
    const sql = 'DELETE FROM SpareParts WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err){
            return res.status(400).json({"error": err.message});
        }
        res.json({"message":"deleted", changes: this.changes});
    });
});


// --- API Routes for Tickets ---

// GET all tickets
app.get('/api/tickets', (req, res) => {
    const sql = `
        SELECT 
            t.*, 
            c.name as client_name 
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        ORDER BY t.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({ message: "success", data: rows });
    });
});

// GET a single ticket by id
app.get("/api/tickets/:id", (req, res) => {
    const sql = "SELECT * FROM Tickets WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({ message:"success", data:row });
    });
});

// POST new ticket
app.post('/api/tickets', (req, res) => {
    const { title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date } = req.body;
    if (!title || !client_id) {
        return res.status(400).json({"error": "Missing required fields: title, client_id"});
    }
    const sql = `INSERT INTO Tickets (title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date) VALUES (?,?,?,?,?,?,?,?,?)`;
    const params = [title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.status(201).json({ message: "success", data: { id: this.lastID, ...req.body } });
    });
});

// PUT (update) a ticket
app.put("/api/tickets/:id", (req, res) => {
    const { title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date } = req.body;
    const sql = `UPDATE Tickets set 
                 title = COALESCE(?,title), 
                 description = COALESCE(?,description), 
                 status = COALESCE(?,status), 
                 priority = COALESCE(?,priority), 
                 client_id = COALESCE(?,client_id), 
                 location_id = COALESCE(?,location_id), 
                 equipment_id = COALESCE(?,equipment_id),
                 assigned_technician_id = COALESCE(?, assigned_technician_id),
                 due_date = COALESCE(?, due_date),
                 updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    const params = [title, description, status, priority, client_id, location_id, equipment_id, assigned_technician_id, due_date, req.params.id];
    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({ message: "success", data: req.body, changes: this.changes });
    });
});

// DELETE a ticket
app.delete("/api/tickets/:id", (req, res) => {
    const sql = 'DELETE FROM Tickets WHERE id = ?';
    db.run(sql, [req.params.id], function (err) {
        if (err){
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({ message:"deleted", changes: this.changes });
    });
});


// --- Server ---
app.listen(port, () => {
    console.log(`Gymtec ERP backend listening at http://localhost:${port}`);
}); 