#!/usr/bin/env node

// Create Expenses Table - Script para crear la tabla de gastos
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

const createExpensesTable = () => {
    console.log('📊 Creando tabla Expenses...');
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS \`Expenses\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`category_id\` int DEFAULT NULL,
            \`category\` varchar(100) NOT NULL,
            \`description\` text NOT NULL,
            \`amount\` decimal(10,2) NOT NULL,
            \`date\` date NOT NULL,
            \`supplier\` varchar(255) DEFAULT NULL,
            \`receipt_number\` varchar(100) DEFAULT NULL,
            \`status\` enum('Pendiente','Aprobado','Rechazado','Pagado') DEFAULT 'Pendiente',
            \`payment_method\` enum('Efectivo','Transferencia','Cheque','Tarjeta','Otros') DEFAULT NULL,
            \`reference_type\` enum('Ticket','Equipment','Location','General') DEFAULT 'General',
            \`reference_id\` int DEFAULT NULL,
            \`notes\` text DEFAULT NULL,
            \`receipt_file\` longtext DEFAULT NULL,
            \`approved_by\` int DEFAULT NULL,
            \`approved_at\` datetime DEFAULT NULL,
            \`paid_at\` datetime DEFAULT NULL,
            \`created_by\` int DEFAULT NULL,
            \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`idx_expenses_category\` (\`category\`),
            KEY \`idx_expenses_status\` (\`status\`),
            KEY \`idx_expenses_date\` (\`date\`),
            KEY \`idx_expenses_supplier\` (\`supplier\`),
            KEY \`idx_expenses_reference\` (\`reference_type\`, \`reference_id\`),
            KEY \`fk_expenses_category\` (\`category_id\`),
            KEY \`fk_expenses_approved_by\` (\`approved_by\`),
            KEY \`fk_expenses_created_by\` (\`created_by\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    connection.query(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Error creando tabla Expenses:', err);
            process.exit(1);
        } else {
            console.log('✅ Tabla Expenses creada correctamente');
            createExpenseCategoriesTable();
        }
    });
};

const createExpenseCategoriesTable = () => {
    console.log('📁 Creando tabla ExpenseCategories...');
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS \`ExpenseCategories\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`name\` varchar(100) NOT NULL,
            \`description\` text DEFAULT NULL,
            \`is_active\` tinyint(1) DEFAULT '1',
            \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`unique_category_name\` (\`name\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    connection.query(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Error creando tabla ExpenseCategories:', err);
            process.exit(1);
        } else {
            console.log('✅ Tabla ExpenseCategories creada correctamente');
            insertDefaultCategories();
        }
    });
};

const insertDefaultCategories = () => {
    console.log('🏷️ Insertando categorías por defecto...');
    
    const defaultCategories = [
        { name: 'Repuestos', description: 'Repuestos y componentes para equipos' },
        { name: 'Herramientas', description: 'Herramientas y equipamiento técnico' },
        { name: 'Materiales', description: 'Materiales de mantenimiento y limpieza' },
        { name: 'Transporte', description: 'Gastos de transporte y combustible' },
        { name: 'Servicios', description: 'Servicios externos y consultorías' },
        { name: 'Capacitación', description: 'Cursos y entrenamiento del personal' },
        { name: 'Software', description: 'Licencias y herramientas de software' },
        { name: 'Administración', description: 'Gastos administrativos generales' },
        { name: 'Otros', description: 'Otros gastos no categorizados' }
    ];
    
    let categoriesCompleted = 0;
    
    defaultCategories.forEach(category => {
        connection.query(
            'INSERT INTO ExpenseCategories (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)',
            [category.name, category.description],
            (err, result) => {
                if (err) {
                    console.error('❌ Error insertando categoría:', category.name, err);
                } else {
                    console.log(`✅ Categoría "${category.name}" insertada`);
                }
                
                categoriesCompleted++;
                if (categoriesCompleted === defaultCategories.length) {
                    insertSampleExpenses();
                }
            }
        );
    });
};

const insertSampleExpenses = () => {
    console.log('💰 Insertando gastos de ejemplo...');
    
    const sampleExpenses = [
        {
            category: 'Repuestos',
            description: 'Repuestos para cinta de correr modelo X200',
            amount: 125000,
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            supplier: 'TechFit Repuestos SPA',
            receipt_number: 'R-001-2025',
            status: 'Pagado',
            payment_method: 'Transferencia',
            reference_type: 'General'
        },
        {
            category: 'Herramientas',
            description: 'Set de herramientas especializadas para mantenimiento',
            amount: 85000,
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            supplier: 'Herramientas Pro SPA',
            receipt_number: 'H-045-2025',
            status: 'Pagado',
            payment_method: 'Tarjeta',
            reference_type: 'General'
        },
        {
            category: 'Materiales',
            description: 'Lubricantes y productos de limpieza especializados',
            amount: 45000,
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            supplier: 'QuímicosClean SPA',
            receipt_number: 'M-234-2025',
            status: 'Aprobado',
            payment_method: 'Transferencia',
            reference_type: 'General'
        },
        {
            category: 'Transporte',
            description: 'Combustible para vehículos de servicio técnico',
            amount: 35000,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            supplier: 'Estación Copec',
            receipt_number: 'C-789-2025',
            status: 'Pendiente',
            reference_type: 'General'
        },
        {
            category: 'Servicios',
            description: 'Servicio de calibración de equipos especializados',
            amount: 180000,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            supplier: 'Calibraciones Técnicas SPA',
            receipt_number: 'CAL-012-2025',
            status: 'Aprobado',
            payment_method: 'Transferencia',
            reference_type: 'General'
        }
    ];
    
    let expensesCompleted = 0;
    
    sampleExpenses.forEach(expense => {
        connection.query('INSERT INTO Expenses SET ?', expense, (err, result) => {
            if (err) {
                console.error('❌ Error insertando gasto:', err);
            } else {
                console.log(`✅ Gasto "${expense.description}" creado con ID: ${result.insertId}`);
            }
            
            expensesCompleted++;
            if (expensesCompleted === sampleExpenses.length) {
                console.log('');
                console.log('🎉 ¡Sistema de gastos configurado exitosamente!');
                console.log('');
                console.log('📊 Resumen:');
                console.log(`   ✅ Tabla Expenses creada`);
                console.log(`   ✅ Tabla ExpenseCategories creada`);
                console.log(`   ✅ ${defaultCategories.length} categorías por defecto`);
                console.log(`   ✅ ${sampleExpenses.length} gastos de ejemplo`);
                console.log('');
                connection.end();
            }
        });
    });
};

// Iniciar proceso
console.log('🚀 Iniciando configuración del sistema de gastos...');
console.log('');

connection.connect(err => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        process.exit(1);
    }
    
    console.log('✅ Conectado a MySQL');
    createExpensesTable();
});
