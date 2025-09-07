/**
 * GYMTEC ERP - Setup Service Tickets System
 * Script para crear el sistema de tickets de servicio (mantenimiento completo de gimnasio)
 * 
 * Diferencias:
 * - Ticket de Mantenimiento: 1 máquina específica
 * - Ticket de Servicio: Múltiples máquinas de una sede completa
 */

const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

async function setupServiceTickets() {
    console.log('🎫 Iniciando setup del Sistema de Tickets de Servicio...');
    
    try {
        // Conectar a la base de datos
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Conectado a MySQL');
        
        // 1. Crear tabla ServiceTickets
        console.log('📋 Creando tabla ServiceTickets...');
        const createServiceTicketsTable = `
            CREATE TABLE IF NOT EXISTS ServiceTickets (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                client_id INT NOT NULL,
                location_id INT NOT NULL,
                status ENUM('pendiente', 'en_progreso', 'completado', 'cerrado') DEFAULT 'pendiente',
                priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                assigned_technician_id INT,
                created_by INT NOT NULL,
                scheduled_date DATE,
                estimated_duration_hours DECIMAL(5,2),
                total_equipment_count INT DEFAULT 0,
                completed_equipment_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (client_id) REFERENCES Clients(id) ON DELETE RESTRICT,
                FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE RESTRICT,
                FOREIGN KEY (assigned_technician_id) REFERENCES Users(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE RESTRICT,
                
                INDEX idx_service_tickets_client (client_id),
                INDEX idx_service_tickets_location (location_id),
                INDEX idx_service_tickets_status (status),
                INDEX idx_service_tickets_assigned (assigned_technician_id),
                INDEX idx_service_tickets_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await new Promise((resolve, reject) => {
            connection.query(createServiceTicketsTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Tabla ServiceTickets creada');
        
        // 2. Crear tabla ServiceTicketEquipment (junction table)
        console.log('🔧 Creando tabla ServiceTicketEquipment...');
        const createServiceTicketEquipmentTable = `
            CREATE TABLE IF NOT EXISTS ServiceTicketEquipment (
                id INT PRIMARY KEY AUTO_INCREMENT,
                service_ticket_id INT NOT NULL,
                equipment_id INT NOT NULL,
                status ENUM('pendiente', 'en_progreso', 'completado', 'omitido') DEFAULT 'pendiente',
                notes TEXT,
                technician_notes TEXT,
                estimated_duration_minutes INT DEFAULT 30,
                actual_duration_minutes INT DEFAULT 0,
                started_at TIMESTAMP NULL,
                completed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (service_ticket_id) REFERENCES ServiceTickets(id) ON DELETE CASCADE,
                FOREIGN KEY (equipment_id) REFERENCES Equipment(id) ON DELETE CASCADE,
                
                UNIQUE KEY unique_service_equipment (service_ticket_id, equipment_id),
                INDEX idx_service_equipment_status (status),
                INDEX idx_service_equipment_service_ticket (service_ticket_id),
                INDEX idx_service_equipment_equipment (equipment_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await new Promise((resolve, reject) => {
            connection.query(createServiceTicketEquipmentTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Tabla ServiceTicketEquipment creada');
        
        // 3. Verificar integridad de datos existentes
        console.log('🔍 Verificando integridad de datos...');
        
        const checkClients = `SELECT COUNT(*) as count FROM Clients`;
        const clientsResult = await new Promise((resolve, reject) => {
            connection.query(checkClients, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });
        
        console.log(`✅ Clientes disponibles: ${clientsResult.count}`);
        
        const checkLocations = `SELECT COUNT(*) as count FROM Locations`;
        const locationsResult = await new Promise((resolve, reject) => {
            connection.query(checkLocations, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });
        
        console.log(`✅ Ubicaciones disponibles: ${locationsResult.count}`);
        
        const checkEquipment = `SELECT COUNT(*) as count FROM Equipment`;
        const equipmentResult = await new Promise((resolve, reject) => {
            connection.query(checkEquipment, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });
        
        console.log(`✅ Equipos disponibles: ${equipmentResult.count}`);
        
        // 4. Crear datos de prueba (opcional)
        if (process.argv.includes('--with-test-data')) {
            console.log('🧪 Creando datos de prueba...');
            await createTestData();
        }
        
        // 5. Crear triggers para mantener contadores actualizados
        console.log('⚙️ Creando triggers para contadores automáticos...');
        
        // Trigger para actualizar total_equipment_count al agregar equipos
        const createTriggerInsert = `
            CREATE TRIGGER IF NOT EXISTS update_service_ticket_counts_insert
            AFTER INSERT ON ServiceTicketEquipment
            FOR EACH ROW
            BEGIN
                UPDATE ServiceTickets 
                SET 
                    total_equipment_count = (
                        SELECT COUNT(*) 
                        FROM ServiceTicketEquipment 
                        WHERE service_ticket_id = NEW.service_ticket_id
                    ),
                    completed_equipment_count = (
                        SELECT COUNT(*) 
                        FROM ServiceTicketEquipment 
                        WHERE service_ticket_id = NEW.service_ticket_id 
                        AND status = 'completado'
                    )
                WHERE id = NEW.service_ticket_id;
            END
        `;
        
        await new Promise((resolve, reject) => {
            connection.query(createTriggerInsert, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Trigger para actualizar contadores al cambiar estado de equipos
        const createTriggerUpdate = `
            CREATE TRIGGER IF NOT EXISTS update_service_ticket_counts_update
            AFTER UPDATE ON ServiceTicketEquipment
            FOR EACH ROW
            BEGIN
                UPDATE ServiceTickets 
                SET 
                    completed_equipment_count = (
                        SELECT COUNT(*) 
                        FROM ServiceTicketEquipment 
                        WHERE service_ticket_id = NEW.service_ticket_id 
                        AND status = 'completado'
                    )
                WHERE id = NEW.service_ticket_id;
            END
        `;
        
        await new Promise((resolve, reject) => {
            connection.query(createTriggerUpdate, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Triggers creados para contadores automáticos');
        
        console.log('\n🎉 ¡Setup del Sistema de Tickets de Servicio completado exitosamente!');
        console.log('\n📊 Resumen:');
        console.log('✅ Tabla ServiceTickets: Tickets de servicio de gimnasio completo');
        console.log('✅ Tabla ServiceTicketEquipment: Relación many-to-many con equipos');
        console.log('✅ Triggers: Contadores automáticos de progreso');
        console.log('✅ Índices: Optimizados para consultas frecuentes');
        console.log('\n🚀 Próximos pasos:');
        console.log('1. Integrar APIs en server-clean.js');
        console.log('2. Crear interfaz frontend service-tickets.html');
        console.log('3. Implementar modal de selección múltiple de equipos');
        
    } catch (error) {
        console.error('❌ Error durante el setup:', error);
        process.exit(1);
    } finally {
        connection.end();
    }
}

async function createTestData() {
    console.log('📝 Insertando datos de prueba...');
    
    // Obtener primer cliente y ubicación para datos de prueba
    const getFirstLocation = `
        SELECT l.id as location_id, l.client_id, c.name as client_name, l.name as location_name
        FROM Locations l
        JOIN Clients c ON l.client_id = c.id
        LIMIT 1
    `;
    
    const location = await new Promise((resolve, reject) => {
        connection.query(getFirstLocation, (err, results) => {
            if (err) reject(err);
            else resolve(results[0]);
        });
    });
    
    if (location) {
        // Crear ticket de servicio de prueba
        const insertTestServiceTicket = `
            INSERT INTO ServiceTickets (
                title, 
                description, 
                client_id, 
                location_id, 
                priority, 
                created_by,
                scheduled_date,
                estimated_duration_hours
            ) VALUES (
                'Mantenimiento Preventivo Mensual - ${location.location_name}',
                'Mantenimiento preventivo completo de todas las máquinas del gimnasio. Incluye limpieza, lubricación, ajustes y verificación de seguridad.',
                ${location.client_id},
                ${location.location_id},
                'medium',
                1,
                CURDATE() + INTERVAL 7 DAY,
                4.5
            )
        `;
        
        await new Promise((resolve, reject) => {
            connection.query(insertTestServiceTicket, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        console.log(`✅ Ticket de servicio de prueba creado para ${location.client_name} - ${location.location_name}`);
    }
}

// Ejecutar setup
if (require.main === module) {
    setupServiceTickets();
}

module.exports = { setupServiceTickets };
