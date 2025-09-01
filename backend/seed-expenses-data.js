#!/usr/bin/env node

// Script para insertar gastos de prueba
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

const insertSampleExpenses = () => {
    console.log('💸 Insertando gastos de prueba adicionales...');
    
    const sampleExpenses = [
        {
            category: 'Repuestos',
            description: 'Correa de transmisión para cinta de correr TechnoGym',
            amount: 75000,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // hace 2 días
            supplier: 'TechnoGym Chile SPA',
            receipt_number: 'TG-2025-034',
            status: 'Pendiente',
            payment_method: null,
            reference_type: 'Equipment',
            reference_id: 1,
            notes: 'Urgente: equipo fuera de servicio',
            created_by: 1
        },
        {
            category: 'Herramientas',
            description: 'Multímetro digital para diagnóstico de equipos',
            amount: 45000,
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // hace 5 días
            supplier: 'Ferretería Industrial SPA',
            receipt_number: 'FI-5678',
            status: 'Aprobado',
            payment_method: null,
            reference_type: 'General',
            reference_id: null,
            notes: 'Herramienta necesaria para mantenimiento preventivo',
            created_by: 1,
            approved_by: 1,
            approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
            category: 'Materiales',
            description: 'Kit de limpieza especializada para equipos cardiovasculares',
            amount: 28000,
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // ayer
            supplier: 'CleanFit Solutions',
            receipt_number: 'CF-2025-012',
            status: 'Pagado',
            payment_method: 'Transferencia',
            reference_type: 'Location',
            reference_id: 1,
            notes: 'Productos biodegradables certificados',
            created_by: 1,
            approved_by: 1,
            approved_at: new Date(Date.now() - 12 * 60 * 60 * 1000), // hace 12 horas
            paid_at: new Date(Date.now() - 6 * 60 * 60 * 1000) // hace 6 horas
        },
        {
            category: 'Transporte',
            description: 'Combustible para vehículo de servicio técnico - Enero 2025',
            amount: 65000,
            date: new Date(), // hoy
            supplier: 'Copec',
            receipt_number: 'CP-8901234',
            status: 'Pendiente',
            payment_method: null,
            reference_type: 'General',
            reference_id: null,
            notes: 'Incluye viajes a 3 sedes durante la semana',
            created_by: 1
        },
        {
            category: 'Servicios',
            description: 'Calibración de equipos de precisión - Servicio externo',
            amount: 120000,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // hace 1 semana
            supplier: 'MetroChile Calibraciones',
            receipt_number: 'MC-2025-456',
            status: 'Rechazado',
            payment_method: null,
            reference_type: 'Equipment',
            reference_id: 2,
            notes: 'RECHAZADO: Precio muy elevado. Buscar alternativas.',
            created_by: 1,
            approved_by: 1,
            approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }
    ];
    
    let completed = 0;
    
    sampleExpenses.forEach((expense, index) => {
        const sql = `
            INSERT INTO Expenses (
                category, description, amount, date, supplier, receipt_number,
                status, payment_method, reference_type, reference_id, notes,
                created_by, approved_by, approved_at, paid_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            expense.category,
            expense.description,
            expense.amount,
            expense.date,
            expense.supplier,
            expense.receipt_number,
            expense.status,
            expense.payment_method,
            expense.reference_type,
            expense.reference_id,
            expense.notes,
            expense.created_by,
            expense.approved_by || null,
            expense.approved_at || null,
            expense.paid_at || null
        ];
        
        connection.query(sql, params, (err, result) => {
            if (err) {
                console.error(`❌ Error creando gasto ${index + 1}:`, err.message);
            } else {
                console.log(`✅ Gasto "${expense.description.substring(0, 50)}..." creado con ID: ${result.insertId}`);
            }
            
            completed++;
            if (completed === sampleExpenses.length) {
                showSummary();
            }
        });
    });
};

const showSummary = () => {
    console.log('\n📊 Resumen de gastos insertados:');
    
    const sql = `
        SELECT 
            status,
            COUNT(*) as count,
            SUM(amount) as total_amount
        FROM Expenses
        GROUP BY status
        ORDER BY status
    `;
    
    connection.query(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo resumen:', err);
        } else {
            console.log('\n📈 Estadísticas por estado:');
            rows.forEach(row => {
                console.log(`   ${row.status}: ${row.count} gastos - $${new Intl.NumberFormat('es-CL').format(row.total_amount)}`);
            });
        }
        
        console.log('\n🎉 ¡Gastos de prueba insertados exitosamente!');
        console.log('📱 Ahora puedes probar el sistema en: http://localhost:8080/finanzas.html');
        console.log('📋 Ve a la pestaña "Gastos" para ver los datos');
        
        connection.end();
    });
};

// Verificar conexión y ejecutar
connection.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        process.exit(1);
    }
    
    console.log('✅ Conectado a MySQL');
    
    // Verificar que la tabla existe
    connection.query('SHOW TABLES LIKE "Expenses"', (err, result) => {
        if (err) {
            console.error('❌ Error verificando tabla:', err);
            process.exit(1);
        }
        
        if (result.length === 0) {
            console.error('❌ La tabla Expenses no existe. Ejecuta primero: node create-expenses-table.js');
            process.exit(1);
        }
        
        insertSampleExpenses();
    });
});
