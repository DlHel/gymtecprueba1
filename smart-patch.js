const fs = require('fs');
const path = require('path');

const SERVER_FILE = '/var/www/gymtec/backend/src/server-clean.js';

// New implementations
const NEW_POST = `
// POST /api/inventory - CREATED VIA PATCH
app.post('/api/inventory', authenticateToken, (req, res) => {
    console.log('📦 POST /api/inventory - Creando nuevo item COMPLETO');
    const {
        name, sku, category, brand, 
        current_stock, min_stock, 
        unit_price, location, description
    } = req.body;

    if (!name || !sku) {
        return res.status(400).json({ error: 'Nombre y SKU son requeridos' });
    }

    const sql = \`
        INSERT INTO SpareParts
        (name, sku, category, brand, current_stock, minimum_stock, unit_price, location, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`;
    
    const params = [
        name, sku, category || 'General', brand || '', 
        current_stock || 0, min_stock || 0,
        unit_price || 0, location || '', description || ''
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error creando item:', err.message);
            if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU duplicado' });
            return res.status(500).json({ error: err.message });
        }
        
        // Registrar movimiento inicial si stock > 0
        if (current_stock > 0) {
            db.run(\`INSERT INTO SparePartsMovements 
                (spare_part_id, movement_type, quantity, previous_stock, new_stock, notes, created_by)
                VALUES (?, 'in', ?, 0, ?, 'Stock inicial', ?)\`,
                [this.lastID, current_stock, current_stock, req.user.id]
            );
        }

        console.log(\`✅ Item creado: \${this.lastID}\`);
        res.status(201).json({ message: 'success', data: { id: this.lastID } });
    });
});
`;

const NEW_TECHS_BLOCK = `
// GET /api/inventory/movements - CREATED VIA PATCH
app.get('/api/inventory/movements', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory/movements - Historial');
    const sql = \`
        SELECT 
            m.*,
            s.name as spare_part_name,
            s.sku,
            u.username as created_by_name
        FROM SparePartsMovements m
        JOIN SpareParts s ON m.spare_part_id = s.id
        LEFT JOIN Users u ON m.created_by = u.id
        ORDER BY m.created_at DESC
        LIMIT 100
    \`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows || [] });
    });
});

// GET /api/inventory/technicians - CREATED VIA PATCH
app.get('/api/inventory/technicians', authenticateToken, (req, res) => {
    console.log('📦 GET /api/inventory/technicians - Listando técnicos con inventario');

    const sql = \`
        SELECT
            u.id,
            u.username,
            u.email,
            u.first_name,
            u.last_name,
            COUNT(ti.id) as items_count,
            COALESCE(SUM(ti.quantity), 0) as total_quantity
        FROM Users u
        LEFT JOIN TechnicianInventory ti ON u.id = ti.technician_id
        WHERE u.role = 'Technician' AND u.is_active = 1
        GROUP BY u.id, u.username, u.email
        ORDER BY u.username
    \`;

    db.all(sql, [], (err, rows) => {
         if (err) {
            console.error('❌ Error al obtener técnicos:', err.message);
            return res.json({ message: 'success', data: [] });
        }
        res.json({ message: 'success', data: rows || [] });
    });
});
`;

function replaceBlock(content, startMarker, newContent) {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) {
        console.error('❌ Marker not found:', startMarker);
        return content;
    }

    // Find detailed end of block by counting braces
    let openBraces = 0;
    let endIndex = startIndex;
    let foundStart = false;

    // Fast-forward to the first {
    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
            openBraces++;
            foundStart = true;
            endIndex = i;
            break;
        }
    }

    if (!foundStart) return content;

    for (let i = endIndex + 1; i < content.length; i++) {
        if (content[i] === '{') openBraces++;
        if (content[i] === '}') openBraces--;

        if (openBraces === 0) {
            // Found matching closing brace for the function body
            // We need to verify if there is a closing parenthesis and semicolon
            endIndex = i;
            // Look ahead for );
            const nextPart = content.substring(endIndex + 1, endIndex + 20);
            const closeMatch = nextPart.match(/^\s*\);/);
            if (closeMatch) {
                endIndex += closeMatch[0].length + 1; // Include );
            }
            break;
        }
    }

    console.log(`✅ Replaced block starting at ${startIndex} ending at ${endIndex}`);
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex + 1);
    return before + newContent + after;
}

try {
    let content = fs.readFileSync(SERVER_FILE, 'utf8');

    // 1. Replace POST
    const POST_MARKER = "app.post('/api/inventory', authenticateToken,";
    content = replaceBlock(content, POST_MARKER, NEW_POST);

    // 2. Replace Technicians (and add movements)
    const TECH_MARKER = "app.get('/api/inventory/technicians', authenticateToken,";
    content = replaceBlock(content, TECH_MARKER, NEW_TECHS_BLOCK);

    fs.writeFileSync(SERVER_FILE, content);
    console.log('✅ File patched successfully');

} catch (err) {
    console.error('❌ Error patching:', err);
    process.exit(1);
}
