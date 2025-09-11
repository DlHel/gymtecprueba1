const mysql = require('mysql2/promise');

/**
 * Global Setup para Playwright E2E Tests
 * Configura base de datos de testing y datos iniciales
 */

async function globalSetup() {
  console.log('🚀 Iniciando configuración global para E2E tests...');
  
  try {
    // Configuración de base de datos de testing
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gymtec_erp_test'
    });

    console.log('✅ Conexión a base de datos de testing establecida');

    // Limpiar y preparar datos de testing
    await setupTestData(connection);
    
    await connection.end();
    console.log('✅ Configuración global completada');

  } catch (error) {
    console.error('❌ Error en configuración global:', error.message);
    
    // Si no existe la base de datos de testing, crearla
    if (error.code === 'ER_BAD_DB_ERROR') {
      await createTestDatabase();
    } else {
      throw error;
    }
  }
}

async function createTestDatabase() {
  console.log('🔧 Creando base de datos de testing...');
  
  // Conectar como root para crear la DB
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    multipleStatements: true
  });

  try {
    // Crear la base de datos si no existe
    await connection.execute('CREATE DATABASE IF NOT EXISTS gymtec_erp_test');
    console.log('✅ Base de datos de testing creada');
    
    await connection.end();
    
    // Conectar directamente a la nueva base de datos
    const testConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gymtec_erp_test',
      multipleStatements: true
    });
    
    // Crear tablas básicas para testing
    await createTestTables(testConnection);
    
    // Insertar datos de testing
    await setupTestData(testConnection);
    
    await testConnection.end();
    console.log('✅ Base de datos de testing configurada exitosamente');
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error);
    await connection.end();
    throw error;
  }
}

async function createTestTables(connection) {
  console.log('📋 Creando tablas de testing...');

  // Tabla Users
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'manager', 'technician', 'client') NOT NULL,
      client_id INT NULL,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Tabla Clients
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Tabla Locations
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      client_id INT NOT NULL,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES Clients(id)
    )
  `);

  // Tabla EquipmentModels
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS EquipmentModels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255) NOT NULL,
      category ENUM('Cardio', 'Fuerza', 'Funcional', 'Accesorio') NOT NULL,
      specifications TEXT,
      warranty_period INT DEFAULT 12,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Tabla Equipment
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Equipment (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      model_id INT NOT NULL,
      location_id INT NOT NULL,
      serial_number VARCHAR(255) UNIQUE NOT NULL,
      installation_date DATE,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES EquipmentModels(id),
      FOREIGN KEY (location_id) REFERENCES Locations(id)
    )
  `);

  // Tabla Tickets
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
      priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
      workflow_stage VARCHAR(100) DEFAULT 'initial',
      sla_status ENUM('on_time', 'at_risk', 'overdue') DEFAULT 'on_time',
      sla_deadline DATETIME NULL,
      equipment_id INT NOT NULL,
      technician_id INT NULL,
      client_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (equipment_id) REFERENCES Equipment(id),
      FOREIGN KEY (technician_id) REFERENCES Users(id),
      FOREIGN KEY (client_id) REFERENCES Clients(id)
    )
  `);

  console.log('✅ Tablas de testing creadas');
}

async function setupTestData(connection) {
  console.log('📊 Insertando datos de testing...');

  // Insertar usuario administrador de testing
  await connection.execute(`
    INSERT IGNORE INTO Users (username, email, password_hash, role) 
    VALUES (
      'admin@gymtec.com', 
      'admin@gymtec.com', 
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
      'admin'
    )
  `);

  // Insertar cliente de testing
  await connection.execute(`
    INSERT IGNORE INTO Clients (name, contact_person, email, phone, address) 
    VALUES (
      'Gym Test Center', 
      'Juan Pérez', 
      'contacto@gymtest.com', 
      '+1234567890', 
      'Calle Test 123, Ciudad Test'
    )
  `);

  // Obtener ID del cliente para referencias
  const [clientRows] = await connection.execute('SELECT id FROM Clients WHERE name = "Gym Test Center"');
  const clientId = clientRows[0]?.id;

  if (clientId) {
    // Insertar ubicación de testing
    await connection.execute(`
      INSERT IGNORE INTO Locations (name, address, client_id) 
      VALUES (
        'Sede Principal Test', 
        'Av. Principal 456, Ciudad Test', 
        ?
      )
    `, [clientId]);

    // Insertar modelos de equipos
    await connection.execute(`
      INSERT IGNORE INTO EquipmentModels (name, brand, category, specifications) 
      VALUES 
      ('Cinta Test Pro', 'TestBrand', 'Cardio', 'Cinta de correr profesional para testing'),
      ('Banco Press Test', 'TestBrand', 'Fuerza', 'Banco de press para testing'),
      ('Mancuernas Test', 'TestBrand', 'Fuerza', 'Set de mancuernas para testing')
    `);

    // Obtener ID de ubicación
    const [locationRows] = await connection.execute('SELECT id FROM Locations WHERE client_id = ?', [clientId]);
    const locationId = locationRows[0]?.id;

    if (locationId) {
      // Obtener IDs de modelos
      const [modelRows] = await connection.execute('SELECT id, name FROM EquipmentModels LIMIT 3');
      
      // Insertar equipos de testing
      for (let i = 0; i < modelRows.length; i++) {
        const model = modelRows[i];
        await connection.execute(`
          INSERT IGNORE INTO Equipment (name, model_id, location_id, serial_number, installation_date) 
          VALUES (?, ?, ?, ?, CURDATE())
        `, [
          `${model.name} #${i + 1}`,
          model.id,
          locationId,
          `TEST-${Date.now()}-${i + 1}`
        ]);
      }

      // Insertar tickets de testing
      const [equipmentRows] = await connection.execute('SELECT id FROM Equipment LIMIT 2');
      
      for (let i = 0; i < equipmentRows.length; i++) {
        const equipment = equipmentRows[i];
        await connection.execute(`
          INSERT IGNORE INTO Tickets (title, description, priority, equipment_id, client_id) 
          VALUES (?, ?, ?, ?, ?)
        `, [
          `Ticket de Mantenimiento Test #${i + 1}`,
          `Descripción detallada del problema de mantenimiento para testing E2E #${i + 1}`,
          i === 0 ? 'high' : 'medium',
          equipment.id,
          clientId
        ]);
      }
    }
  }

  console.log('✅ Datos de testing insertados');
}

module.exports = globalSetup;
