/**
 * COMPLETAR MIGRACIÓN - Paso 5 y 6
 * Crear movimientos y backup
 */

const db = require('./src/db-adapter');

async function completeMigration() {
    try {
        console.log('🔄 Completando migración...\n');

        // ============================================
        // PASO 5: CREAR MOVIMIENTOS (CORREGIDO)
        // ============================================
        console.log('📋 PASO 5: Creando registros de movimientos iniciales...');
        
        const mappings = await query('SELECT * FROM spareparts_migration_map');
        
        for (const map of mappings) {
            const item = await query(
                'SELECT current_stock FROM Inventory WHERE id = ?',
                [map.new_inventory_id]
            );
            
            if (item.length > 0 && parseFloat(item[0].current_stock) > 0) {
                await query(`
                    INSERT INTO InventoryMovements (
                        inventory_id,
                        movement_type,
                        quantity,
                        stock_before,
                        stock_after,
                        reference_type,
                        reference_id,
                        notes,
                        performed_by,
                        performed_at
                    ) VALUES (?, 'in', ?, 0, ?, 'migration', ?, ?, 1, NOW())
                `, [
                    map.new_inventory_id,
                    item[0].current_stock,
                    item[0].current_stock,
                    map.old_sparepart_id,
                    `Stock inicial migrado: ${map.old_name} (${map.old_sku})`
                ]);
                
                console.log(`   ✅ Movimiento creado para: ${map.old_name}`);
            }
        }
        
        console.log('\n');

        // ============================================
        // PASO 6: RENOMBRAR TABLA ANTIGUA (BACKUP)
        // ============================================
        console.log('📋 PASO 6: Creando backup de tabla antigua...');
        
        const backupExists = await query(`
            SHOW TABLES LIKE 'spareparts_backup_20251003'
        `);
        
        if (backupExists.length === 0) {
            await query(`
                RENAME TABLE spareparts TO spareparts_backup_20251003
            `);
            console.log('   ✅ Tabla spareparts renombrada a spareparts_backup_20251003\n');
        } else {
            console.log('   ℹ️  Backup ya existe\n');
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
            WHERE i.category_id = 1
        `);
        console.log('   ✅ Vista spareparts creada\n');

        // ============================================
        // VERIFICACIÓN FINAL
        // ============================================
        console.log('📋 VERIFICACIÓN FINAL:');
        
        const inventory = await query('SELECT COUNT(*) as count FROM Inventory');
        const movements = await query('SELECT COUNT(*) as count FROM InventoryMovements');
        const viewData = await query('SELECT COUNT(*) as count FROM spareparts');
        const ticketData = await query('SELECT COUNT(*) as count FROM ticketspareparts WHERE inventory_id IS NOT NULL');
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log(`📊 Inventory total: ${inventory[0].count} items`);
        console.log(`📝 Movimientos: ${movements[0].count} registros`);
        console.log(`🎫 Tickets actualizados: ${ticketData[0].count}`);
        console.log(`👁️  Vista spareparts: ${viewData[0].count} items`);
        console.log('='.repeat(60));
        
        console.log('\n📋 RESUMEN DE ITEMS MIGRADOS:');
        const migrated = await query(`
            SELECT 
                i.id,
                i.item_code,
                i.item_name,
                i.current_stock,
                i.minimum_stock,
                ic.name as category
            FROM Inventory i
            LEFT JOIN InventoryCategories ic ON i.category_id = ic.id
            ORDER BY i.id
        `);
        
        console.table(migrated);
        
        console.log('\n🎉 ¡Sistema de inventario unificado exitosamente!');
        console.log('💾 Backup: spareparts_backup_20251003');
        console.log('🔄 Vista de compatibilidad: spareparts (activa)\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

completeMigration();
