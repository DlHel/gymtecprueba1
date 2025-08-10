// Seed Advanced Financial Data - Datos más completos para mejor visualización
const mysql = require('mysql2');

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

const connection = mysql.createConnection(config);

const seedAdvancedFinancialData = () => {
    console.log('🌱 Creando datos financieros avanzados para mejor visualización...');

    // Obtener clientes existentes
    connection.query('SELECT id, name FROM Clients ORDER BY id LIMIT 5', (err, clients) => {
        if (err) {
            console.error('❌ Error obteniendo clientes:', err);
            return;
        }

        console.log(`📊 Clientes disponibles: ${clients.length}`);
        
        if (clients.length < 2) {
            console.log('⚠️ Necesitamos al menos 2 clientes. Creando más clientes...');
            createAdditionalClients(() => {
                seedAdvancedFinancialData();
            });
            return;
        }

        createAdvancedFinancialData(clients);
    });
};

const createAdditionalClients = (callback) => {
    const additionalClients = [
        {
            name: 'FitZone Premium',
            rut: '87654321-0',
            email: 'admin@fitzone.cl',
            phone: '+56987654321',
            address: 'Av. Providencia 2000, Providencia, Santiago',
            business_activity: 'Centro de entrenamiento funcional'
        },
        {
            name: 'PowerGym Elite',
            rut: '11223344-5',
            email: 'contacto@powergym.cl',
            phone: '+56911223344',
            address: 'Av. Vitacura 3500, Vitacura, Santiago',
            business_activity: 'Gimnasio de alto rendimiento'
        },
        {
            name: 'WellnessCenter Spa',
            rut: '55667788-9',
            email: 'info@wellness.cl',
            phone: '+56955667788',
            address: 'Las Condes 1800, Las Condes, Santiago',
            business_activity: 'Centro de bienestar y spa'
        }
    ];

    let completed = 0;
    additionalClients.forEach(client => {
        connection.query('INSERT INTO Clients SET ?', client, (err, result) => {
            if (err && err.code !== 'ER_DUP_ENTRY') {
                console.error('❌ Error creando cliente:', err);
            } else if (!err) {
                console.log(`✅ Cliente "${client.name}" creado con ID: ${result.insertId}`);
            }
            
            completed++;
            if (completed === additionalClients.length) {
                callback();
            }
        });
    });
};

const createAdvancedFinancialData = (clients) => {
    console.log('💰 Creando cotizaciones adicionales...');
    
    // Crear más cotizaciones con variedad de estados y fechas
    const additionalQuotes = [
        {
            client_id: clients[0].id,
            title: 'Renovación Equipamiento Completo',
            description: 'Renovación total del equipamiento cardiovascular y de fuerza',
            total_amount: 1250000,
            status: 'Aprobada',
            quote_number: 'COT-2025-001',
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días desde hoy
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
            items: JSON.stringify([
                { description: 'Cintas de correr profesionales', quantity: 3, unit_price: 250000, total: 750000 },
                { description: 'Máquinas de fuerza multiestación', quantity: 2, unit_price: 180000, total: 360000 },
                { description: 'Instalación y configuración', quantity: 1, unit_price: 140000, total: 140000 }
            ])
        },
        {
            client_id: clients[1].id,
            title: 'Sistema Audio Visual Premium',
            description: 'Instalación de sistema audiovisual para clases grupales',
            total_amount: 680000,
            status: 'Enviada',
            quote_number: 'COT-2025-002',
            valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días desde hoy
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días atrás
            items: JSON.stringify([
                { description: 'Sistema de sonido profesional', quantity: 1, unit_price: 380000, total: 380000 },
                { description: 'Pantallas LED para clases', quantity: 2, unit_price: 120000, total: 240000 },
                { description: 'Instalación especializada', quantity: 1, unit_price: 60000, total: 60000 }
            ])
        },
        {
            client_id: clients[2].id,
            title: 'Mantenimiento Anual Preventivo',
            description: 'Programa de mantenimiento preventivo anual para todos los equipos',
            total_amount: 420000,
            status: 'Borrador',
            quote_number: 'COT-2025-003',
            valid_until: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 días desde hoy
            created_at: new Date(), // Hoy
            items: JSON.stringify([
                { description: 'Mantenimiento equipos cardiovasculares', quantity: 12, unit_price: 25000, total: 300000 },
                { description: 'Mantenimiento equipos de fuerza', quantity: 8, unit_price: 15000, total: 120000 }
            ])
        }
    ];

    let quotesCompleted = 0;
    additionalQuotes.forEach(quote => {
        connection.query('INSERT INTO Quotes SET ?', quote, (err, result) => {
            if (err) {
                console.error('❌ Error creando cotización:', err);
            } else {
                console.log(`✅ Cotización "${quote.title}" creada con ID: ${result.insertId}`);
            }
            
            quotesCompleted++;
            if (quotesCompleted === additionalQuotes.length) {
                createAdvancedInvoices(clients);
            }
        });
    });
};

const createAdvancedInvoices = (clients) => {
    console.log('📄 Creando facturas adicionales...');
    
    const additionalInvoices = [
        {
            client_id: clients[0].id,
            invoice_number: 'F-2025-001',
            title: 'Servicio de Mantenimiento Mensual',
            description: 'Servicios de mantenimiento preventivo realizados en julio 2025',
            total_amount: 185000,
            status: 'paid',
            due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás
            created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 días atrás
            items: JSON.stringify([
                { description: 'Mantenimiento equipos cardiovasculares', quantity: 8, unit_price: 18000, total: 144000 },
                { description: 'Limpieza especializada', quantity: 1, unit_price: 41000, total: 41000 }
            ])
        },
        {
            client_id: clients[1].id,
            invoice_number: 'F-2025-002',
            title: 'Reparación Urgente Equipamiento',
            description: 'Reparación de máquina elíptica y revisión general',
            total_amount: 95000,
            status: 'pending',
            due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días desde hoy
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás
            items: JSON.stringify([
                { description: 'Reparación máquina elíptica', quantity: 1, unit_price: 75000, total: 75000 },
                { description: 'Revisión técnica general', quantity: 1, unit_price: 20000, total: 20000 }
            ])
        },
        {
            client_id: clients[2].id,
            invoice_number: 'F-2025-003',
            title: 'Instalación Equipos Nuevos',
            description: 'Instalación y configuración de equipos nuevos adquiridos',
            total_amount: 125000,
            status: 'paid',
            due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 días atrás
            created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 días atrás
            items: JSON.stringify([
                { description: 'Instalación equipamiento', quantity: 1, unit_price: 85000, total: 85000 },
                { description: 'Configuración y calibración', quantity: 1, unit_price: 40000, total: 40000 }
            ])
        },
        {
            client_id: clients[0].id,
            invoice_number: 'F-2025-004',
            title: 'Suministro Repuestos Varios',
            description: 'Entrega de repuestos y accesorios solicitados',
            total_amount: 67000,
            status: 'overdue',
            due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás (vencida)
            created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 días atrás
            items: JSON.stringify([
                { description: 'Correas para cintas de correr', quantity: 3, unit_price: 15000, total: 45000 },
                { description: 'Lubricantes especializados', quantity: 2, unit_price: 11000, total: 22000 }
            ])
        }
    ];

    let invoicesCompleted = 0;
    additionalInvoices.forEach(invoice => {
        connection.query('INSERT INTO Invoices SET ?', invoice, (err, result) => {
            if (err && err.code !== 'ER_DUP_ENTRY') {
                console.error('❌ Error creando factura:', err);
            } else if (!err) {
                console.log(`✅ Factura "${invoice.title}" creada con ID: ${result.insertId}`);
            }
            
            invoicesCompleted++;
            if (invoicesCompleted === additionalInvoices.length) {
                createExpensesData();
            }
        });
    });
};

const createExpensesData = () => {
    console.log('💳 Creando datos de gastos...');
    
    // Verificar si la tabla de gastos existe
    connection.query('SHOW TABLES LIKE "Expenses"', (err, result) => {
        if (err) {
            console.error('❌ Error verificando tabla de gastos:', err);
            return;
        }
        
        if (result.length === 0) {
            console.log('📝 Creando tabla de gastos...');
            createExpensesTable(() => {
                insertExpensesData();
            });
        } else {
            insertExpensesData();
        }
    });
};

const createExpensesTable = (callback) => {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS \`Expenses\` (
            \`id\` INT(11) NOT NULL AUTO_INCREMENT,
            \`category\` VARCHAR(100) NOT NULL,
            \`description\` TEXT NOT NULL,
            \`amount\` DECIMAL(12,2) NOT NULL,
            \`date\` DATE NOT NULL,
            \`supplier\` VARCHAR(200),
            \`receipt_number\` VARCHAR(50),
            \`status\` ENUM('Pendiente', 'Aprobado', 'Pagado', 'Rechazado') DEFAULT 'Pendiente',
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            INDEX \`idx_expenses_category\` (\`category\`),
            INDEX \`idx_expenses_date\` (\`date\`),
            INDEX \`idx_expenses_status\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    connection.query(createTableSQL, (err) => {
        if (err) {
            console.error('❌ Error creando tabla de gastos:', err);
        } else {
            console.log('✅ Tabla de gastos creada correctamente');
        }
        callback();
    });
};

const insertExpensesData = () => {
    const expenses = [
        {
            category: 'Repuestos',
            description: 'Compra de repuestos para equipos cardiovasculares',
            amount: 85000,
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            supplier: 'TechFit Repuestos SPA',
            receipt_number: 'R-001-2025',
            status: 'Pagado'
        },
        {
            category: 'Herramientas',
            description: 'Set de herramientas especializadas para mantenimiento',
            amount: 125000,
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            supplier: 'Herramientas Industriales Ltda',
            receipt_number: 'H-045-2025',
            status: 'Pagado'
        },
        {
            category: 'Transporte',
            description: 'Combustible y peajes para visitas técnicas',
            amount: 35000,
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            supplier: 'Copec',
            receipt_number: 'T-123-2025',
            status: 'Pendiente'
        },
        {
            category: 'Capacitación',
            description: 'Curso de actualización técnica para equipo',
            amount: 150000,
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            supplier: 'Instituto Técnico Fitness',
            receipt_number: 'C-078-2025',
            status: 'Aprobado'
        },
        {
            category: 'Materiales',
            description: 'Lubricantes y productos de limpieza especializados',
            amount: 45000,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            supplier: 'QuímicosClean SPA',
            receipt_number: 'M-234-2025',
            status: 'Pagado'
        }
    ];

    let expensesCompleted = 0;
    expenses.forEach(expense => {
        connection.query('INSERT INTO Expenses SET ?', expense, (err, result) => {
            if (err) {
                console.error('❌ Error creando gasto:', err);
            } else {
                console.log(`✅ Gasto "${expense.description}" creado con ID: ${result.insertId}`);
            }
            
            expensesCompleted++;
            if (expensesCompleted === expenses.length) {
                console.log('✅ Datos financieros avanzados creados exitosamente');
                console.log('');
                console.log('📊 Resumen de datos creados:');
                console.log(`   • ${additionalQuotes?.length || 0} cotizaciones adicionales`);
                console.log(`   • ${additionalInvoices?.length || 0} facturas adicionales`);
                console.log(`   • ${expenses.length} gastos de ejemplo`);
                console.log('');
                console.log('🎯 Ahora el dashboard de finanzas tendrá mejor visualización de datos');
                connection.end();
            }
        });
    });
};

// Conectar y ejecutar
connection.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        return;
    }
    console.log('🔌 Conectado a MySQL');
    seedAdvancedFinancialData();
});
