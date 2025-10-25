/**
 * Script para ejecutar payroll-chile-enhancements.sql
 * Instala las tablas y datos necesarios para el módulo de nómina chilena
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function runPayrollSQL() {
    console.log('🚀 Iniciando instalación de Nómina Chile...\n');
    
    try {
        // Leer el archivo SQL
        const sqlFile = path.join(__dirname, 'database', 'payroll-chile-simple.sql');
        console.log(`📄 Leyendo archivo: ${sqlFile}`);
        
        if (!fs.existsSync(sqlFile)) {
            throw new Error(`Archivo no encontrado: ${sqlFile}`);
        }
        
        const sql = fs.readFileSync(sqlFile, 'utf8');
        console.log(`✅ Archivo leído: ${sql.length} caracteres\n`);
        
        // Conectar a MySQL
        console.log('🔌 Conectando a MySQL...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gymtec_erp',
            multipleStatements: true
        });
        
        console.log(`✅ Conectado a base de datos: ${process.env.DB_NAME}\n`);
        
        // Ejecutar SQL
        console.log('⚙️  Ejecutando script SQL...');
        console.log('   - Ampliando tabla PayrollDetails...');
        console.log('   - Creando tabla PayrollSettings...');
        console.log('   - Creando tabla CurrencyRates...');
        console.log('   - Creando tabla TaxBrackets...');
        console.log('   - Creando tabla EmployeePayrollSettings...');
        console.log('   - Insertando datos iniciales...');
        console.log('   - Creando vistas y funciones...\n');
        
        await connection.query(sql);
        
        console.log('✅ Script ejecutado exitosamente!\n');
        
        // Verificar instalación
        console.log('🔍 Verificando instalación...');
        
        const [tables1] = await connection.query(`SHOW TABLES LIKE 'PayrollSettings'`);
        const [tables2] = await connection.query(`SHOW TABLES LIKE 'CurrencyRates'`);
        const [tables3] = await connection.query(`SHOW TABLES LIKE 'TaxBrackets'`);
        const [tables4] = await connection.query(`SHOW TABLES LIKE 'EmployeePayrollSettings'`);
        
        const allTables = [...tables1, ...tables2, ...tables3, ...tables4];
        console.log(`✅ Tablas creadas: ${allTables.length}`);
        allTables.forEach(t => console.log(`   - ${Object.values(t)[0]}`));
        
        // Verificar datos iniciales
        const [rates] = await connection.query('SELECT COUNT(*) as count FROM CurrencyRates');
        const [settings] = await connection.query('SELECT COUNT(*) as count FROM PayrollSettings');
        const [brackets] = await connection.query('SELECT COUNT(*) as count FROM TaxBrackets');
        
        console.log('\n📊 Datos iniciales:');
        console.log(`   - PayrollSettings: ${settings[0].count} registros`);
        console.log(`   - CurrencyRates: ${rates[0].count} registros (UTM/UF)`);
        console.log(`   - TaxBrackets: ${brackets[0].count} tramos de impuesto único`);
        
        await connection.end();
        
        console.log('\n✅ ¡Instalación completada exitosamente!');
        console.log('🎉 El módulo de Nómina Chile está listo para usar\n');
        
    } catch (error) {
        console.error('\n❌ Error durante la instalación:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Ejecutar
runPayrollSQL();
