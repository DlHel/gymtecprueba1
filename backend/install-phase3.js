/**
 * GYMTEC ERP - INSTALADOR FASE 3
 * Sistema de Inventario Inteligente y Reportes Avanzados
 * 
 * Funcionalidades:
 * ✅ Instalación de 8 nuevas tablas
 * ✅ Inserción de datos iniciales
 * ✅ Verificación de integridad
 * ✅ Rollback en caso de error
 * ✅ Logging detallado
 */

const fs = require('fs');
const path = require('path');
const db = require('./src/mysql-database');

class Phase3Installer {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.installed = [];
        this.sqlFile = path.join(__dirname, 'database', 'phase3-simple.sql');
    }

    async install() {
        console.log('🚀 GYMTEC ERP - INSTALADOR FASE 3');
        console.log('   Sistema de Inventario Inteligente y Reportes Avanzados');
        console.log('=' * 60);

        try {
            // Verificar conexión
            await this.verifyConnection();
            
            // Verificar prerequisitos
            await this.verifyPrerequisites();
            
            // Ejecutar instalación
            await this.runInstallation();
            
            // Verificar instalación
            await this.verifyInstallation();
            
            // Generar reporte
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Error durante la instalación:', error.message);
            await this.rollback();
            process.exit(1);
        }
    }

    async verifyConnection() {
        console.log('🔍 [1/5] Verificando conexión a base de datos...');
        
        try {
            await db.testConnection();
            console.log('✅ Conexión MySQL verificada');
        } catch (error) {
            throw new Error(`No se pudo conectar a MySQL: ${error.message}`);
        }
    }

    async verifyPrerequisites() {
        console.log('🔍 [2/5] Verificando prerequisitos...');
        
        // Verificar que Fase 1 esté instalada
        const phase1Tables = [
            'Users', 'Clients', 'Locations', 'Equipment', 'Tickets'
        ];
        
        for (let table of phase1Tables) {
            const exists = await this.tableExists(table);
            if (!exists) {
                throw new Error(`Tabla de Fase 1 faltante: ${table}. Instale Fase 1 primero.`);
            }
        }
        
        // Verificar que Fase 2 esté instalada
        const phase2Tables = [
            'NotificationTemplates', 'NotificationQueue', 'AutomatedAlerts'
        ];
        
        for (let table of phase2Tables) {
            const exists = await this.tableExists(table);
            if (!exists) {
                console.log(`⚠️ Tabla de Fase 2 faltante: ${table}`);
                this.warnings.push(`Fase 2 no completamente instalada: ${table}`);
            }
        }
        
        console.log('✅ Prerequisitos verificados');
    }

    async runInstallation() {
        console.log('📦 [3/5] Ejecutando instalación...');
        
        // Leer archivo SQL
        if (!fs.existsSync(this.sqlFile)) {
            throw new Error(`Archivo SQL no encontrado: ${this.sqlFile}`);
        }
        
        const sqlContent = fs.readFileSync(this.sqlFile, 'utf8');
        
        // Dividir en statements individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📋 Ejecutando ${statements.length} statements SQL...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            try {
                // Saltar comentarios y statements vacíos
                if (statement.startsWith('--') || 
                    statement.toLowerCase().includes('delimiter') ||
                    statement.trim() === '') {
                    continue;
                }
                
                await db.query(statement);
                successCount++;
                
                // Mostrar progreso cada 10 statements
                if (i % 10 === 0) {
                    console.log(`   ⏳ Progreso: ${i}/${statements.length} (${Math.round(i/statements.length*100)}%)`);
                }
                
            } catch (error) {
                // Algunos errores son esperados (como DROP TABLE IF EXISTS)
                if (error.message.includes('Unknown table') || 
                    error.message.includes('already exists')) {
                    this.warnings.push(`Statement ${i}: ${error.message}`);
                } else {
                    console.error(`❌ Error en statement ${i}:`, error.message);
                    this.errors.push(`Statement ${i}: ${error.message}`);
                    errorCount++;
                }
            }
        }
        
        console.log(`✅ Instalación completada: ${successCount} exitosos, ${errorCount} errores`);
        
        if (errorCount > 5) {
            throw new Error(`Demasiados errores durante la instalación: ${errorCount}`);
        }
    }

    async verifyInstallation() {
        console.log('🔍 [4/5] Verificando instalación...');
        
        const expectedTables = [
            'InventoryCategories',
            'Suppliers', 
            'Inventory',
            'InventoryMovements',
            'PurchaseOrders',
            'PurchaseOrderLines',
            'ReportDefinitions',
            'ReportHistory'
        ];
        
        let installedCount = 0;
        
        for (let table of expectedTables) {
            const exists = await this.tableExists(table);
            if (exists) {
                const count = await this.getTableCount(table);
                console.log(`   ✅ ${table}: instalada (${count} registros)`);
                this.installed.push({table, count});
                installedCount++;
            } else {
                console.log(`   ❌ ${table}: NO instalada`);
                this.errors.push(`Tabla no instalada: ${table}`);
            }
        }
        
        // Verificar vistas
        const expectedViews = [
            'v_inventory_extended',
            'v_purchase_orders_extended'
        ];
        
        for (let view of expectedViews) {
            const exists = await this.viewExists(view);
            if (exists) {
                console.log(`   ✅ Vista ${view}: creada`);
            } else {
                console.log(`   ⚠️ Vista ${view}: no creada`);
                this.warnings.push(`Vista no creada: ${view}`);
            }
        }
        
        console.log(`✅ Verificación completada: ${installedCount}/${expectedTables.length} tablas instaladas`);
        
        if (installedCount < expectedTables.length) {
            throw new Error(`Instalación incompleta: ${installedCount}/${expectedTables.length} tablas`);
        }
    }

    generateReport() {
        console.log('📊 [5/5] Generando reporte de instalación...');
        console.log('');
        console.log('=' * 60);
        console.log('🎉 FASE 3 INSTALADA EXITOSAMENTE');
        console.log('=' * 60);
        console.log('');
        
        console.log('📋 TABLAS INSTALADAS:');
        this.installed.forEach(item => {
            console.log(`   ✅ ${item.table.padEnd(25)} - ${item.count} registros`);
        });
        console.log('');
        
        if (this.warnings.length > 0) {
            console.log('⚠️ ADVERTENCIAS:');
            this.warnings.forEach(warning => {
                console.log(`   • ${warning}`);
            });
            console.log('');
        }
        
        if (this.errors.length > 0) {
            console.log('❌ ERRORES:');
            this.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
            console.log('');
        }
        
        console.log('🚀 FUNCIONALIDADES DISPONIBLES:');
        console.log('   • 🏪 Sistema de Inventario Inteligente');
        console.log('   • 📊 11 Reportes Predefinidos');
        console.log('   • 🛒 Gestión de Órdenes de Compra');
        console.log('   • 👥 Gestión de Proveedores');
        console.log('   • 📈 Analytics de Inventario');
        console.log('   • ⚠️ Alertas de Stock Mínimo');
        console.log('');
        
        console.log('🎯 PRÓXIMOS PASOS:');
        console.log('   1. Reiniciar servidor backend');
        console.log('   2. Acceder a dashboard de inventario');
        console.log('   3. Configurar categorías y proveedores');
        console.log('   4. Cargar inventario inicial');
        console.log('   5. Generar primeros reportes');
        console.log('');
        
        console.log('📊 ESTADÍSTICAS FINALES:');
        console.log(`   • Tablas instaladas: ${this.installed.length}`);
        console.log(`   • Total registros: ${this.installed.reduce((sum, item) => sum + item.count, 0)}`);
        console.log(`   • Advertencias: ${this.warnings.length}`);
        console.log(`   • Errores: ${this.errors.length}`);
        console.log('');
        
        console.log('✅ INSTALACIÓN FASE 3 COMPLETADA');
        console.log('   Sistema listo para inventario inteligente y reportes avanzados');
    }

    async rollback() {
        console.log('🔄 Iniciando rollback...');
        
        const tablesToDrop = [
            'ReportHistory',
            'ReportDefinitions', 
            'PurchaseOrderLines',
            'PurchaseOrders',
            'InventoryMovements',
            'Inventory',
            'Suppliers',
            'InventoryCategories'
        ];
        
        for (let table of tablesToDrop) {
            try {
                await db.query(`DROP TABLE IF EXISTS ${table}`);
                console.log(`   ✅ Tabla ${table} eliminada`);
            } catch (error) {
                console.log(`   ⚠️ No se pudo eliminar ${table}: ${error.message}`);
            }
        }
        
        // Eliminar vistas
        const viewsToDrop = ['v_inventory_extended', 'v_purchase_orders_extended'];
        for (let view of viewsToDrop) {
            try {
                await db.query(`DROP VIEW IF EXISTS ${view}`);
                console.log(`   ✅ Vista ${view} eliminada`);
            } catch (error) {
                console.log(`   ⚠️ No se pudo eliminar vista ${view}: ${error.message}`);
            }
        }
        
        console.log('🔄 Rollback completado');
    }

    async tableExists(tableName) {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM information_schema.tables 
                 WHERE table_schema = DATABASE() AND table_name = ?`,
                [tableName]
            );
            return result[0].count > 0;
        } catch (error) {
            return false;
        }
    }

    async viewExists(viewName) {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM information_schema.views 
                 WHERE table_schema = DATABASE() AND table_name = ?`,
                [viewName]
            );
            return result[0].count > 0;
        } catch (error) {
            return false;
        }
    }

    async getTableCount(tableName) {
        try {
            const result = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            return result[0].count;
        } catch (error) {
            return 0;
        }
    }
}

// Ejecutar instalación si se llama directamente
if (require.main === module) {
    const installer = new Phase3Installer();
    installer.install().then(() => {
        console.log('🎉 Instalación completada exitosamente');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error en instalación:', error.message);
        process.exit(1);
    });
}

module.exports = Phase3Installer;
