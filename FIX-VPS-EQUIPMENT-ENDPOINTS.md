# Fix VPS Equipment Endpoints

## Errores Detectados

### 1. Equipment Drawer Errors
- `GET /api/equipment/6/tickets` → 500 Internal Server Error  
- `GET /api/equipment/6/photos` → 500 Internal Server Error
- `GET /api/equipment/6/notes` → 500 Internal Server Error
- `GET /api/equipment/6` → 500 Internal Server Error
- `GET /api/models/1/main-photo` → 404 Not Found

### 2. SLA Processor Errors
- Case-sensitive table names: `maintenancetasks` → `MaintenanceTasks`
- Case-sensitive table names: `users` → `Users`
- Case-sensitive table names: `clients` → `Clients`
- Case-sensitive table names: `locations` → `Locations`

## Soluciones Aplicadas

### ✅ Fase 1: Fix SLA Processor (COMPLETADO)
```bash
cd /var/www/gymtec/backend/src/routes
sed -i 's/FROM maintenancetasks/FROM MaintenanceTasks/g' sla-processor.js
sed -i 's/ users u/ Users u/g' sla-processor.js
sed -i 's/ clients c/ Clients c/g' sla-processor.js
sed -i 's/ locations l/ Locations l/g' sla-processor.js
pm2 restart gymtec-backend
```

### ⏳ Fase 2: Fix Equipment Endpoints (EN PROGRESO)

#### Endpoint 1: GET /api/equipment/:id
**Ubicación:** `server-clean.js` línea ~1371
**Problema:** Posiblemente case-sensitive en JOINs
**Solución:** Verificar nombres de tablas en mayúsculas

#### Endpoint 2: GET /api/equipment/:equipmentId/tickets
**Ubicación:** `server-clean.js` línea ~2695
**Problema:** UNION query con TicketEquipmentScope
**Solución:** Verificar que tabla TicketEquipmentScope existe

#### Endpoint 3: GET /api/equipment/:equipmentId/photos
**Ubicación:** `server-clean.js` línea ~2247
**Problema:** Query a EquipmentPhotos
**Solución:** Verificar estructura de tabla

#### Endpoint 4: GET /api/equipment/:equipmentId/notes
**Ubicación:** `server-clean.js` línea ~2349
**Problema:** Query a EquipmentNotes
**Solución:** Verificar estructura de tabla

#### Endpoint 5: GET /api/models/:id/main-photo
**Ubicación:** Falta crear este endpoint
**Problema:** No existe
**Solución:** Crear endpoint nuevo

## Plan de Acción

### 1. Verificar Tablas en Base de Datos
```sql
USE gymtec_erp;
SHOW TABLES;
DESCRIBE Equipment;
DESCRIBE EquipmentPhotos;
DESCRIBE EquipmentNotes;
DESCRIBE TicketEquipmentScope;
DESCRIBE ModelPhotos;
```

### 2. Crear Tablas Faltantes si es necesario
```sql
-- Si no existe TicketEquipmentScope
CREATE TABLE IF NOT EXISTS TicketEquipmentScope (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    equipment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES Equipment(id) ON DELETE CASCADE
);

-- Si no existe ModelPhotos  
CREATE TABLE IF NOT EXISTS ModelPhotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    photo_data LONGTEXT NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES EquipmentModels(id) ON DELETE CASCADE
);
```

### 3. Agregar Endpoint Faltante en server-clean.js
```javascript
// GET main photo for model
app.get('/api/models/:id/main-photo', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = `SELECT photo_data, mime_type FROM ModelPhotos 
                 WHERE model_id = ? AND is_main = 1 
                 LIMIT 1`;
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener foto' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }
        res.json({ message: 'success', data: row });
    });
});
```

### 4. Reiniciar Servicios
```bash
pm2 restart gymtec-backend
systemctl restart nginx
```

## Testing

### Test con curl
```bash
# Get token
TOKEN=$(curl -s -X POST 'http://localhost:3000/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test endpoints
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/equipment/6"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/equipment/6/tickets"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/equipment/6/photos"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/equipment/6/notes"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/models/1/main-photo"
```

## Próximos Pasos

1. ✅ Corregir case-sensitive en SLA processor
2. ⏳ Verificar y crear tablas faltantes
3. ⏳ Agregar endpoint de fotos de modelos
4. ⏳ Probar todos los endpoints
5. ⏳ Continuar con siguiente módulo

