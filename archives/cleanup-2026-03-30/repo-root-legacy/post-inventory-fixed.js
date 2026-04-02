
// POST /api/inventory - Crear nuevo item de inventario
app.post('/api/inventory', authenticateToken, (req, res) => {
    console.log('📦 POST /api/inventory - Creando nuevo item');
    console.log('📋 Body recibido:', req.body);
    
    const { name, sku, current_stock, min_stock, minimum_stock } = req.body;
    
    if (!name || !sku) {
        return res.status(400).json({
            error: 'Nombre y SKU son requeridos'
        });
    }
    
    // Usar minimum_stock o min_stock (compatibilidad)
    const minStock = minimum_stock || min_stock || 0;
    
    const sql = `
        INSERT INTO SpareParts (name, sku, current_stock, minimum_stock)
        VALUES (?, ?, ?, ?)
    `;
    
    const params = [name, sku, current_stock || 0, minStock];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Error al crear item:', err.message);
            
            if (err.message.includes('Duplicate entry') || err.message.includes('ER_DUP_ENTRY')) {
                return res.status(409).json({
                    error: 'Ya existe un item con ese SKU'
                });
            }
            
            return res.status(500).json({
                error: 'Error interno del servidor',
                details: err.message
            });
        }
        
        console.log('✅ Item creado con ID:', this.lastID);
        res.status(201).json({
            message: 'success',
            data: { id: this.lastID, name, sku }
        });
    });
});

