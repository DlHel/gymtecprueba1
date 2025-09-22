/**
 * Script para verificar la tabla de contratos
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'config.env' });

async function checkContractsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gymtec_erp'
    });

    try {
        console.log('🔍 Verificando tabla de contratos...');
        
        // Verificar si existe la tabla Contracts
        const [tables] = await connection.execute("SHOW TABLES LIKE '%contract%'");
        console.log('📋 Tablas relacionadas con contratos:', tables);
        
        if (tables.length === 0) {
            console.log('❌ No se encontró tabla de contratos');
            console.log('🔧 Creando tabla Contracts...');
            
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS Contracts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    contract_number VARCHAR(50) UNIQUE NOT NULL,
                    client_id INT NOT NULL,
                    status ENUM('activo', 'vencido', 'pendiente', 'cancelado') DEFAULT 'activo',
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    service_type VARCHAR(100) NOT NULL,
                    maintenance_frequency VARCHAR(50) NOT NULL,
                    sla_level ENUM('basico', 'estandar', 'premium', 'enterprise') NOT NULL,
                    monthly_cost DECIMAL(10,2) DEFAULT 0,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES Clients(id) ON DELETE CASCADE
                )
            `);
            
            console.log('✅ Tabla Contracts creada');
            
            // Insertar algunos contratos de ejemplo
            await connection.execute(`
                INSERT INTO Contracts (contract_number, client_id, status, start_date, end_date, service_type, maintenance_frequency, sla_level, monthly_cost, description) VALUES
                ('CONT-2025-001', 1, 'activo', '2025-01-01', '2025-12-31', 'Mantenimiento Preventivo', 'mensual', 'premium', 2500.00, 'Contrato de mantenimiento premium para equipos cardio'),
                ('CONT-2025-002', 2, 'activo', '2025-02-01', '2026-01-31', 'Mantenimiento Correctivo', 'trimestral', 'estandar', 1500.00, 'Contrato estándar para equipos de fuerza'),
                ('CONT-2025-003', 3, 'pendiente', '2025-09-01', '2026-08-31', 'Mantenimiento Integral', 'bimensual', 'enterprise', 3500.00, 'Contrato enterprise con SLA de 2 horas')
            `);
            
            console.log('✅ Datos de ejemplo insertados');
        } else {
            console.log('✅ Tabla de contratos existe');
            
            // Mostrar estructura de la tabla
            const [structure] = await connection.execute('DESCRIBE Contracts');
            console.log('📋 Estructura de la tabla Contracts:');
            structure.forEach(col => {
                console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `KEY: ${col.Key}` : ''}`);
            });
            
            // Contar registros
            const [count] = await connection.execute('SELECT COUNT(*) as total FROM Contracts');
            console.log(`📊 Total de contratos: ${count[0].total}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkContractsTable();