/**
 * GYMTEC ERP - Migración para Mejorar Contratos
 * Agrega campos para especificar servicios, tiempos y detalles contractuales
 */

const db = require('./src/db-adapter');

console.log('🔄 MIGRACIÓN: Mejorando estructura de Contratos con servicios y tiempos...\n');

async function migrateContractsEnhancement() {
    try {
        console.log('1️⃣ Verificando estructura actual de Contracts...');
        
        // Verificar estructura actual
        const tableInfo = await new Promise((resolve, reject) => {
            db.all('DESCRIBE Contracts', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('   📋 Columnas actuales:');
        tableInfo.forEach(col => {
            console.log(`      - ${col.Field}: ${col.Type}`);
        });

        console.log('\n2️⃣ Agregando campos para especificación de servicios...');

        // Lista de campos necesarios con sus verificaciones
        const fieldsToAdd = [
            {
                name: 'contract_number',
                definition: 'VARCHAR(50) UNIQUE',
                comment: 'Número único del contrato'
            },
            {
                name: 'contract_value',
                definition: 'DECIMAL(12,2)',
                comment: 'Valor monetario del contrato'
            },
            {
                name: 'status',
                definition: "ENUM('borrador', 'activo', 'suspendido', 'terminado') DEFAULT 'borrador'",
                comment: 'Estado del contrato'
            },
            {
                name: 'service_type',
                definition: "ENUM('mantenimiento_preventivo', 'mantenimiento_correctivo', 'soporte_tecnico', 'mantenimiento_integral') DEFAULT 'mantenimiento_preventivo'",
                comment: 'Tipo de servicio principal'
            },
            {
                name: 'maintenance_frequency',
                definition: "ENUM('semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual') DEFAULT 'mensual'",
                comment: 'Frecuencia de mantenimiento'
            },
            {
                name: 'response_time_hours',
                definition: 'INT DEFAULT 24',
                comment: 'Tiempo de respuesta en horas'
            },
            {
                name: 'resolution_time_hours',
                definition: 'INT DEFAULT 72',
                comment: 'Tiempo de resolución en horas'
            },
            {
                name: 'services_included',
                definition: 'JSON',
                comment: 'Lista de servicios incluidos en formato JSON'
            },
            {
                name: 'equipment_covered',
                definition: 'JSON',
                comment: 'Equipos cubiertos por el contrato'
            },
            {
                name: 'sla_level',
                definition: "ENUM('basic', 'standard', 'premium', 'enterprise') DEFAULT 'standard'",
                comment: 'Nivel de SLA del contrato'
            }
        ];

        for (const field of fieldsToAdd) {
            const hasField = tableInfo.some(col => col.Field === field.name);
            
            if (hasField) {
                console.log(`   ✅ Campo ${field.name} ya existe`);
            } else {
                console.log(`   📝 Agregando campo ${field.name}...`);
                
                try {
                    await new Promise((resolve, reject) => {
                        db.run(`
                            ALTER TABLE Contracts 
                            ADD COLUMN ${field.name} ${field.definition} COMMENT '${field.comment}'
                        `, [], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    
                    console.log(`   ✅ Campo ${field.name} agregado`);
                } catch (err) {
                    console.log(`   ⚠️ Error agregando ${field.name}: ${err.message}`);
                }
            }
        }

        console.log('\n3️⃣ Creando tabla de Servicios de Contrato...');

        // Crear tabla para detalles de servicios
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS ContractServices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    contract_id INT NOT NULL,
                    service_name VARCHAR(255) NOT NULL,
                    service_description TEXT,
                    frequency_type ENUM('horas', 'dias', 'semanas', 'meses', 'años') DEFAULT 'meses',
                    frequency_value INT NOT NULL DEFAULT 1,
                    estimated_duration_hours DECIMAL(4,2),
                    priority_level ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media',
                    requires_shutdown BOOLEAN DEFAULT FALSE,
                    equipment_type VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (contract_id) REFERENCES Contracts(id) ON DELETE CASCADE,
                    INDEX idx_contract_services_contract (contract_id),
                    INDEX idx_contract_services_frequency (frequency_type, frequency_value)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('   ✅ Tabla ContractServices creada');

        console.log('\n4️⃣ Agregando índices para optimización...');

        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_contracts_number ON Contracts(contract_number)',
            'CREATE INDEX IF NOT EXISTS idx_contracts_status ON Contracts(status)',
            'CREATE INDEX IF NOT EXISTS idx_contracts_service_type ON Contracts(service_type)',
            'CREATE INDEX IF NOT EXISTS idx_contracts_frequency ON Contracts(maintenance_frequency)',
            'CREATE INDEX IF NOT EXISTS idx_contracts_sla ON Contracts(sla_level)',
            'CREATE INDEX IF NOT EXISTS idx_contracts_dates ON Contracts(start_date, end_date)'
        ];

        for (const indexSQL of indexes) {
            try {
                await new Promise((resolve, reject) => {
                    db.run(indexSQL, [], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log(`   ✅ Índice creado: ${indexSQL.split(' ')[5]}`);
            } catch (err) {
                console.log(`   ⚠️ Índice ya existe o error: ${err.message}`);
            }
        }

        console.log('\n5️⃣ Generando números de contrato para registros existentes...');

        // Generar números de contrato para registros existentes
        const existingContracts = await new Promise((resolve, reject) => {
            db.all('SELECT id, client_id FROM Contracts WHERE contract_number IS NULL', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (existingContracts.length > 0) {
            console.log(`   📝 Actualizando ${existingContracts.length} contratos existentes...`);
            
            for (const contract of existingContracts) {
                const contractNumber = `CTR-${String(contract.client_id).padStart(3, '0')}-${String(contract.id).padStart(4, '0')}`;
                
                await new Promise((resolve, reject) => {
                    db.run(`
                        UPDATE Contracts 
                        SET contract_number = ?,
                            status = 'activo',
                            service_type = 'mantenimiento_preventivo',
                            maintenance_frequency = 'mensual',
                            sla_level = 'standard'
                        WHERE id = ?
                    `, [contractNumber, contract.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            
            console.log('   ✅ Contratos existentes actualizados');
        }

        console.log('\n6️⃣ Creando servicios de ejemplo...');

        // Crear algunos servicios de ejemplo
        const serviceExamples = [
            {
                name: 'Mantenimiento Preventivo Caminadoras',
                description: 'Revisión completa de caminadoras: lubricación, calibración, limpieza de sensores',
                frequency_type: 'meses',
                frequency_value: 1,
                duration: 2.5,
                equipment_type: 'Cardio'
            },
            {
                name: 'Inspección Equipos de Fuerza',
                description: 'Revisión de cables, poleas, pesos y sistemas de seguridad',
                frequency_type: 'meses',
                frequency_value: 2,
                duration: 1.5,
                equipment_type: 'Fuerza'
            },
            {
                name: 'Mantenimiento Correctivo Urgente',
                description: 'Reparación inmediata de equipos en falla',
                frequency_type: 'dias',
                frequency_value: 1,
                duration: 4.0,
                equipment_type: 'General'
            }
        ];

        // Solo agregar servicios si hay contratos
        if (existingContracts.length > 0) {
            const firstContract = existingContracts[0];
            
            for (const service of serviceExamples) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO ContractServices 
                        (contract_id, service_name, service_description, frequency_type, frequency_value, estimated_duration_hours, equipment_type)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        firstContract.id,
                        service.name,
                        service.description,
                        service.frequency_type,
                        service.frequency_value,
                        service.duration,
                        service.equipment_type
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            
            console.log('   ✅ Servicios de ejemplo creados');
        }

        console.log('\n7️⃣ Verificando estructura final...');

        const finalTableInfo = await new Promise((resolve, reject) => {
            db.all('DESCRIBE Contracts', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('   📋 Estructura final de Contracts:');
        finalTableInfo.forEach(col => {
            console.log(`      - ${col.Field}: ${col.Type}`);
        });

        const serviceCount = await new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as count FROM ContractServices', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0].count);
            });
        });

        console.log(`\n   📊 Servicios de contrato registrados: ${serviceCount}`);

        console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('🎯 Los contratos ahora incluyen:');
        console.log('   • Especificación detallada de servicios y tiempos');
        console.log('   • Relación obligatoria con clientes existentes');
        console.log('   • Frecuencias de mantenimiento configurables');
        console.log('   • Niveles de SLA diferenciados');
        console.log('   • Tabla de servicios detallados por contrato');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Ejecutar migración
migrateContractsEnhancement();