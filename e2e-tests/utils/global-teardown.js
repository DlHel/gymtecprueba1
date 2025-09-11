const mysql = require('mysql2/promise');

/**
 * Global Teardown para Playwright E2E Tests
 * Limpia datos de testing después de ejecutar las pruebas
 */

async function globalTeardown() {
  console.log('🧹 Iniciando limpieza global después de E2E tests...');
  
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gymtec_erp_test'
    });

    console.log('✅ Conexión a base de datos de testing establecida');

    // Limpiar datos de testing pero mantener estructura
    await cleanupTestData(connection);
    
    await connection.end();
    console.log('✅ Limpieza global completada');

  } catch (error) {
    console.error('❌ Error en limpieza global:', error.message);
    // No lanzar error para no afectar el resultado de los tests
  }
}

async function cleanupTestData(connection) {
  console.log('🗑️ Limpiando datos de testing...');

  try {
    // Desactivar checks de foreign key temporalmente
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Limpiar tablas en orden para evitar conflictos de FK
    const tablesToClean = [
      'Tickets',
      'Equipment', 
      'EquipmentModels',
      'Locations',
      'Users',
      'Clients'
    ];

    for (const table of tablesToClean) {
      try {
        // Verificar si la tabla existe antes de intentar limpiarla
        const [rows] = await connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = 'gymtec_erp_test' AND table_name = ?`,
          [table]
        );
        
        if (rows[0].count > 0) {
          // Eliminar solo datos de testing (que contienen "Test" en el nombre)
          if (table === 'Users') {
            await connection.execute(`DELETE FROM ${table} WHERE email LIKE '%test%' OR username LIKE '%test%'`);
          } else if (table === 'Clients') {
            await connection.execute(`DELETE FROM ${table} WHERE name LIKE '%Test%'`);
          } else if (table === 'Locations') {
            await connection.execute(`DELETE FROM ${table} WHERE name LIKE '%Test%'`);
          } else if (table === 'EquipmentModels') {
            await connection.execute(`DELETE FROM ${table} WHERE name LIKE '%Test%' OR brand LIKE '%Test%'`);
          } else if (table === 'Equipment') {
            await connection.execute(`DELETE FROM ${table} WHERE serial_number LIKE 'TEST-%'`);
          } else if (table === 'Tickets') {
            await connection.execute(`DELETE FROM ${table} WHERE title LIKE '%Test%'`);
          }
          
          console.log(`  ✅ Limpieza de ${table} completada`);
        } else {
          console.log(`  ⚠️ Tabla ${table} no existe, saltando...`);
        }
      } catch (tableError) {
        console.log(`  ⚠️ Error limpiando ${table}: ${tableError.message}, continuando...`);
      }
    }

    // Reactivar checks de foreign key
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Datos de testing eliminados');

  } catch (error) {
    console.error('❌ Error limpiando datos:', error.message);
    
    // Asegurar que las foreign keys estén activadas
    try {
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    } catch (fkError) {
      console.error('❌ Error reactivando FK checks:', fkError.message);
    }
  }
}

module.exports = globalTeardown;
