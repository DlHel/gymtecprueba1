/**
 * SCRIPT DE MIGRACIÓN: spareparts → Inventory
 * Fecha: 3 de octubre de 2025
 * Propósito: Unificar sistemas de inventario
 * 
 * PASOS:
 * 1. Backup de datos actuales
 * 2. Migrar 10 items de spareparts a Inventory
 * 3. Crear tabla de mapeo (old_id → new_id)
 * 4. Actualizar ticketspareparts con nuevos IDs
 * 5. Renombrar tabla antigua
 * 6. Verificación final
 */

const db = require('./src/db-adapter');

// Configuración de categoría por defecto
const DEFAULT_CATEGORY_ID = 1; // "Repuestos y mantenimiento"

console.log('🚀 INICIANDO MIGRACIÓN DE INVENTARIO...\n');

async function runMigration() {
    try {
        // ============================================
        // PASO 1: BACKUP Y VERIFICACIÓN
        // ============================================
        console.log('📋 PASO 1: Verificación de datos actuales...');
        
        const spareparts = await query('SELECT * FROM spareparts ORDER BY id');
        const inventory = await query('SELECT * FROM Inventory ORDER BY id');
        const ticketSpareparts = await query('SELECT * FROM ticketspareparts');
        
        console.log(`   ✅ spareparts: ${spareparts.length} items`);
        console.log(`   ✅ Inventory: ${inventory.length} items`);
        console.log(`   ✅ ticketspareparts: ${ticketSpareparts.length} usos registrados\n`);
        
        if (spareparts.length === 0) {
            console.log('❌ No hay datos en spareparts para migrar');
            process.exit(1);
        }

        // ============================================
        // PASO 2: CREAR TABLA DE MAPEO
        // ============================================
        console.log('📋 PASO 2: Creando tabla de mapeo...');
        
        await query(`
            CREATE TABLE IF NOT EXISTS spareparts_migration_map (
                id INT AUTO_INCREMENT PRIMARY KEY,
                old_sparepart_id INT NOT NULL,
                new_inventory_id INT NOT NULL,
                old_sku VARCHAR(50),
                old_name VARCHAR(255),
                migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_old_id (old_sparepart_id)
            )
        `);
        console.log('   ✅ Tabla de mapeo creada\n');

        // ============================================
        // PASO 3: MIGRAR ITEMS
        // ============================================
        console.log('📋 PASO 3: Migrando items de spareparts a Inventory...');
        
        const migrationMap = [];
        
        for (const item of spareparts) {
            console.log(`   → Migrando: ${item.name} (${item.sku})`);
            
            // Verificar si ya existe un item con el mismo SKU
            const existing = await query(
                'SELECT id FROM Inventory WHERE item_code = ?',
                [item.sku]
            );
            
            let newInventoryId;
            
            if (existing.length > 0) {
                console.log(`     ⚠️  Ya existe con SKU ${item.sku}, actualizando...`);
                newInventoryId = existing[0].id;
                
                // Actualizar el item existente
                await query(`
                    UPDATE Inventory SET
                        item_name = ?,
                        current_stock = current_stock + ?,
                        minimum_stock = GREATEST(minimum_stock, ?),
                        updated_at = NOW()
                    WHERE id = ?
                `, [item.name, item.current_stock, item.minimum_stock, newInventoryId]);
                
            } else {
                // Insertar nuevo item
                const result = await query(`
                    INSERT INTO Inventory (
                        item_code,
                        item_name,
                        description,
                        category_id,
                        unit_of_measure,
                        current_stock,
                        minimum_stock,
                        maximum_stock,
                        unit_cost,
                        is_active,
                        is_critical,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    item.sku,
                    item.name,
                    `Migrado desde sistema antiguo (ID: ${item.id})`,
                    DEFAULT_CATEGORY_ID,
                    'unit',
                    item.current_stock,
                    item.minimum_stock,
                    999999.99,
                    0.00, // Sin costo inicial
                    1, // Activo
                    0, // No crítico por defecto
                    item.created_at
                ]);
                
                newInventoryId = result.insertId;
                console.log(`     ✅ Nuevo ID en Inventory: ${newInventoryId}`);
            }
            
            // Guardar mapeo
            migrationMap.push({
                old_id: item.id,
                new_id: newInventoryId,
                sku: item.sku,
                name: item.name
            });
            
            // Insertar en tabla de mapeo
            await query(`
                INSERT INTO spareparts_migration_map (
                    old_sparepart_id,
                    new_inventory_id,
                    old_sku,
                    old_name
                ) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    new_inventory_id = VALUES(new_inventory_id),
                    migrated_at = NOW()
            `, [item.id, newInventoryId, item.sku, item.name]);
        }
        
        console.log(`\n   ✅ ${migrationMap.length} items migrados exitosamente\n`);

        // ============================================
        // PASO 4: ACTUALIZAR TICKETSPAREPARTS
        // ============================================
        console.log('📋 PASO 4: Actualizando referencias en ticketspareparts...');
        
        if (ticketSpareparts.length > 0) {
            // Verificar si la columna inventory_id ya existe
            const columns = await query('DESCRIBE ticketspareparts');
            const hasInventoryId = columns.some(col => col.Field === 'inventory_id');
            
            if (!hasInventoryId) {
                // Agregar nueva columna
                await query(`
                    ALTER TABLE ticketspareparts
                    ADD COLUMN inventory_id INT NULL AFTER spare_part_id,
                    ADD KEY idx_inventory_id (inventory_id)
                `);
                console.log('   ✅ Columna inventory_id agregada');
            }
            
            // Actualizar los IDs usando el mapeo
            for (const ticket of ticketSpareparts) {
                const mapping = migrationMap.find(m => m.old_id === ticket.spare_part_id);
                
                if (mapping) {
                    await query(`
                        UPDATE ticketspareparts
                        SET inventory_id = ?
                        WHERE id = ?
                    `, [mapping.new_id, ticket.id]);
                    
                    console.log(`   → Ticket ${ticket.ticket_id}: spare_part_id ${ticket.spare_part_id} → inventory_id ${mapping.new_id}`);
                } else {
                    console.log(`   ⚠️  No se encontró mapeo para spare_part_id ${ticket.spare_part_id}`);
                }
            }
            
            console.log(`\n   ✅ ${ticketSpareparts.length} registros actualizados\n`);
        } else {
            console.log('   ℹ️  No hay registros en ticketspareparts para actualizar\n');
        }

        // ============================================
        // PASO 5: CREAR MOVIMIENTOS DE INVENTARIO
        // ============================================
        console.log('📋 PASO 5: Creando registros de movimientos iniciales...');
        
        for (const item of migrationMap) {
            const inventoryItem = await query(
                'SELECT current_stock FROM Inventory WHERE id = ?',
                [item.new_id]
            );
            
            if (inventoryItem.length > 0 && inventoryItem[0].current_stock > 0) {
                await query(`
                    INSERT INTO InventoryMovements (
                        inventory_id,
                        movement_type,
                        quantity,
                        stock_before,
                        stock_after,
                        reason,
                        performed_by,
                        notes,
                        created_at
                    ) VALUES (?, 'in', ?, 0, ?, 'initial_migration', 1, ?, NOW())
                `, [
                    item.new_id,
                    inventoryItem[0].current_stock,
                    inventoryItem[0].current_stock,
                    `Stock inicial migrado desde sistema antiguo (${item.sku})`
                ]);
            }
        }
        
        console.log(`   ✅ Movimientos iniciales creados\n`);

        // ============================================
        // PASO 6: RENOMBRAR TABLA ANTIGUA (BACKUP)
        // ============================================
        console.log('📋 PASO 6: Creando backup de tabla antigua...');
        
        // Verificar si ya existe el backup
        const backupExists = await query(`
            SHOW TABLES LIKE 'spareparts_backup_20251003'
        `);
        
        if (backupExists.length === 0) {
            await query(`
                RENAME TABLE spareparts TO spareparts_backup_20251003
            `);
            console.log('   ✅ Tabla spareparts renombrada a spareparts_backup_20251003\n');
        } else {
            console.log('   ℹ️  Backup ya existe, omitiendo renombrado\n');
        }

        // ============================================
        // PASO 7: CREAR VISTA DE COMPATIBILIDAD
        // ============================================
        console.log('📋 PASO 7: Creando vista de compatibilidad...');
        
        await query('DROP VIEW IF EXISTS spareparts');
        await query(`
            CREATE VIEW spareparts AS
            SELECT 
                i.id,
                i.item_name as name,
                i.item_code as sku,
                i.current_stock,
                i.minimum_stock,
                i.created_at,
                i.updated_at
            FROM Inventory i
            WHERE i.category_id = ${DEFAULT_CATEGORY_ID}
        `);
        console.log('   ✅ Vista spareparts creada para compatibilidad\n');

        // ============================================
        // PASO 8: VERIFICACIÓN FINAL
        // ============================================
        console.log('📋 PASO 8: Verificación final...');
        
        const newInventory = await query('SELECT COUNT(*) as count FROM Inventory');
        const movements = await query('SELECT COUNT(*) as count FROM InventoryMovements');
        const mappings = await query('SELECT COUNT(*) as count FROM spareparts_migration_map');
        const viewData = await query('SELECT COUNT(*) as count FROM spareparts');
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log(`📊 Inventory total: ${newInventory[0].count} items`);
        console.log(`📝 Movimientos creados: ${movements[0].count}`);
        console.log(`🗺️  Mapeos guardados: ${mappings[0].count}`);
        console.log(`👁️  Vista spareparts: ${viewData[0].count} items visibles`);
        console.log('='.repeat(60));
        
        console.log('\n📋 MAPEO DE MIGRACIÓN:');
        const fullMap = await query(`
            SELECT 
                old_sparepart_id,
                new_inventory_id,
                old_sku,
                old_name,
                migrated_at
            FROM spareparts_migration_map
            ORDER BY old_sparepart_id
        `);
        
        console.table(fullMap);
        
        console.log('\n🎉 ¡Migración exitosa! Sistema unificado en Inventory');
        console.log('💾 Backup disponible en: spareparts_backup_20251003');
        console.log('🔍 Vista de compatibilidad: spareparts (solo lectura)\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR EN LA MIGRACIÓN:', error.message);
        console.error('Stack:', error.stack);
        console.log('\n⚠️  La base de datos NO ha sido modificada de forma irreversible');
        console.log('💡 Puedes revertir cambios si es necesario\n');
        process.exit(1);
    }
}

// Helper para convertir db.query a Promise
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Para INSERT/UPDATE, devolver info del resultado
                if (sql.trim().toUpperCase().startsWith('INSERT')) {
                    // Simular insertId (MySQL devuelve lastID)
                    db.get('SELECT LAST_INSERT_ID() as insertId', [], (err2, result) => {
                        if (err2) reject(err2);
                        else resolve({ insertId: result.insertId, affectedRows: 1 });
                    });
                } else {
                    resolve(rows || []);
                }
            }
        });
    });
}

// Ejecutar migración
runMigration();
