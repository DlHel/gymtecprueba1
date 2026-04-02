// Script temporal para verificar datos de equipos
const mysql = require('mysql2/promise');

async function checkData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec'
    });

    console.log('\n📊 VERIFICANDO DATOS DE EQUIPOS\n');
    console.log('=' .repeat(80));
    
    // Verificar equipos y sus modelos
    const [equipment] = await connection.execute(`
        SELECT 
            e.id,
            e.name as equipo_nombre,
            e.model_id,
            em.name as modelo_nombre,
            em.category as categoria
        FROM Equipment e
        LEFT JOIN EquipmentModels em ON e.model_id = em.id
        WHERE e.activo = true
        LIMIT 15
    `);
    
    console.log('\n🔧 EQUIPOS EN LA BASE DE DATOS:');
    console.log('-'.repeat(80));
    equipment.forEach(row => {
        console.log(`ID: ${row.id} | Equipo: ${row.equipo_nombre}`);
        console.log(`   model_id: ${row.model_id || 'NULL'}`);
        console.log(`   Modelo: ${row.modelo_nombre || 'Sin modelo'}`);
        console.log(`   Categoría: ${row.categoria || 'Sin categoría'}`);
        console.log('-'.repeat(80));
    });
    
    // Contar equipos sin model_id
    const [countNoModel] = await connection.execute(`
        SELECT COUNT(*) as total 
        FROM Equipment 
        WHERE model_id IS NULL AND activo = true
    `);
    
    console.log(`\n⚠️  Equipos SIN model_id asignado: ${countNoModel[0].total}`);
    
    // Ver modelos disponibles
    const [models] = await connection.execute(`
        SELECT id, name, brand, category 
        FROM EquipmentModels 
        LIMIT 10
    `);
    
    console.log(`\n📦 MODELOS DISPONIBLES EN EquipmentModels:`);
    console.log('-'.repeat(80));
    models.forEach(model => {
        console.log(`ID: ${model.id} | ${model.name} (${model.brand}) - Categoría: ${model.category}`);
    });
    
    await connection.end();
}

checkData().catch(console.error);
