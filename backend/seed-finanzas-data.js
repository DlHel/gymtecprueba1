// Script para generar datos de prueba del módulo de finanzas
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config({ path: 'config.env' });

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('🚀 Iniciando creación de datos de finanzas...\n');

async function seedFinanzasData() {
    return new Promise((resolve, reject) => {
        db.connect((err) => {
            if (err) {
                console.error('❌ Error conectando a la base de datos:', err);
                reject(err);
                return;
            }
            
            console.log('✅ Conectado a MySQL\n');
            
            // Verificar si existen clientes
            db.query('SELECT COUNT(*) as count FROM Clients', (err, results) => {
                if (err) {
                    console.error('❌ Error verificando clientes:', err);
                    reject(err);
                    return;
                }
                
                const clientCount = results[0].count;
                console.log(`📊 Clientes existentes: ${clientCount}`);
                
                if (clientCount === 0) {
                    console.log('⚠️  No hay clientes en la BD. Creando clientes de prueba...\n');
                    createSampleClients(() => {
                        createFinanzasData(resolve, reject);
                    });
                } else {
                    createFinanzasData(resolve, reject);
                }
            });
        });
    });
}

function createSampleClients(callback) {
    const clients = [
        ['Gimnasio PowerFit', '76.123.456-7', 'contacto@powerfit.cl', '+56912345678', 'Av. Providencia 1234, Santiago'],
        ['SportCenter Elite', '77.234.567-8', 'info@sportcenter.cl', '+56923456789', 'Av. Apoquindo 5678, Las Condes'],
        ['FitnessZone Premium', '78.345.678-9', 'ventas@fitnesszone.cl', '+56934567890', 'Av. Kennedy 9012, Vitacura']
    ];
    
    let completed = 0;
    
    clients.forEach((client) => {
        const sql = `INSERT INTO Clients (name, rut, email, phone, address, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
        
        db.query(sql, client, (err, result) => {
            if (err) {
                console.error(`❌ Error creando cliente ${client[0]}:`, err);
            } else {
                console.log(`✅ Cliente creado: ${client[0]} (ID: ${result.insertId})`);
            }
            
            completed++;
            if (completed === clients.length) {
                console.log('\n');
                callback();
            }
        });
    });
}

function createFinanzasData(resolve, reject) {
    // Obtener IDs de clientes existentes
    db.query('SELECT id FROM Clients LIMIT 3', (err, clients) => {
        if (err) {
            console.error('❌ Error obteniendo clientes:', err);
            reject(err);
            return;
        }
        
        if (clients.length === 0) {
            console.error('❌ No hay clientes disponibles');
            reject(new Error('No clients available'));
            return;
        }
        
        const clientIds = clients.map(c => c.id);
        console.log(`📋 Usando clientes: ${clientIds.join(', ')}\n`);
        
        // Crear cotizaciones
        createQuotes(clientIds, () => {
            // Crear facturas
            createInvoices(clientIds, () => {
                // Crear categorías de gastos si no existen
                createExpenseCategories(() => {
                    // Crear gastos
                    createExpenses(() => {
                        console.log('\n✅ DATOS DE FINANZAS CREADOS EXITOSAMENTE');
                        console.log('=' .repeat(50));
                        
                        // Mostrar resumen
                        showSummary(() => {
                            db.end();
                            resolve();
                        });
                    });
                });
            });
        });
    });
}

function createQuotes(clientIds, callback) {
    console.log('📋 Creando cotizaciones...');
    
    const quotes = [
        {
            client_id: clientIds[0],
            quote_number: 'COT-2025-001',
            created_date: '2025-01-15',
            valid_until: '2025-02-15',
            description: 'Mantenimiento preventivo anual de equipos',
            subtotal: 2500000,
            tax: 475000,
            total: 2975000,
            payment_terms: '30 días',
            status: 'Enviada',
            notes: 'Incluye limpieza profunda y ajuste de 20 equipos'
        },
        {
            client_id: clientIds[1],
            quote_number: 'COT-2025-002',
            created_date: '2025-01-20',
            valid_until: '2025-02-20',
            description: 'Instalación de nuevo sistema de cardio',
            subtotal: 5000000,
            tax: 950000,
            total: 5950000,
            payment_terms: '50% anticipo, 50% contra entrega',
            status: 'Aprobada',
            notes: '10 cintas treadmill profesionales con instalación'
        },
        {
            client_id: clientIds[2],
            quote_number: 'COT-2025-003',
            created_date: '2025-01-25',
            valid_until: '2025-02-25',
            description: 'Reparación de equipos de fuerza',
            subtotal: 1200000,
            tax: 228000,
            total: 1428000,
            payment_terms: '15 días',
            status: 'Borrador',
            notes: 'Cambio de cables y poleas en 5 máquinas'
        },
        {
            client_id: clientIds[0],
            quote_number: 'COT-2025-004',
            created_date: '2025-02-01',
            valid_until: '2025-03-01',
            description: 'Contrato de mantenimiento mensual',
            subtotal: 800000,
            tax: 152000,
            total: 952000,
            payment_terms: 'Mensual',
            status: 'Enviada',
            notes: 'Revisión mensual de todos los equipos'
        },
        {
            client_id: clientIds[1],
            quote_number: 'COT-2025-005',
            created_date: '2025-02-05',
            valid_until: '2025-03-05',
            description: 'Actualización de software de equipos',
            subtotal: 450000,
            tax: 85500,
            total: 535500,
            payment_terms: '7 días',
            status: 'Aprobada',
            notes: 'Actualización firmware en equipos electrónicos'
        }
    ];
    
    let completed = 0;
    
    quotes.forEach((quote) => {
        const sql = `
            INSERT INTO Quotes (
                client_id, quote_number, created_date, valid_until, description,
                subtotal, tax_amount, total, payment_terms, status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const values = [
            quote.client_id, quote.quote_number, quote.created_date, quote.valid_until,
            quote.description, quote.subtotal, quote.tax, quote.total,
            quote.payment_terms, quote.status, quote.notes
        ];
        
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(`❌ Error creando cotización ${quote.quote_number}:`, err);
            } else {
                console.log(`✅ Cotización creada: ${quote.quote_number} (ID: ${result.insertId})`);
            }
            
            completed++;
            if (completed === quotes.length) {
                console.log('');
                callback();
            }
        });
    });
}

function createInvoices(clientIds, callback) {
    console.log('🧾 Creando facturas...');
    
    const invoices = [
        {
            client_id: clientIds[0],
            invoice_number: 'FAC-2025-001',
            issue_date: '2025-01-15',
            due_date: '2025-02-15',
            description: 'Mantenimiento preventivo trimestral',
            subtotal: 1500000,
            tax: 285000,
            total: 1785000,
            payment_terms: '30 días',
            status: 'Pagada'
        },
        {
            client_id: clientIds[1],
            invoice_number: 'FAC-2025-002',
            issue_date: '2025-01-20',
            due_date: '2025-02-20',
            description: 'Reparación de equipos de cardio',
            subtotal: 2200000,
            tax: 418000,
            total: 2618000,
            payment_terms: '30 días',
            status: 'Pendiente'
        },
        {
            client_id: clientIds[2],
            invoice_number: 'FAC-2025-003',
            issue_date: '2025-01-25',
            due_date: '2025-02-25',
            description: 'Instalación de nuevos equipos',
            subtotal: 3500000,
            tax: 665000,
            total: 4165000,
            payment_terms: '45 días',
            status: 'Pendiente'
        },
        {
            client_id: clientIds[0],
            invoice_number: 'FAC-2025-004',
            issue_date: '2025-02-01',
            due_date: '2025-03-01',
            description: 'Servicio de mantenimiento preventivo',
            subtotal: 950000,
            tax: 180500,
            total: 1130500,
            payment_terms: '30 días',
            status: 'Pagada'
        },
        {
            client_id: clientIds[1],
            invoice_number: 'FAC-2025-005',
            issue_date: '2025-02-05',
            due_date: '2025-01-25',
            description: 'Reparación urgente de equipos',
            subtotal: 650000,
            tax: 123500,
            total: 773500,
            payment_terms: '15 días',
            status: 'Vencida'
        }
    ];
    
    let completed = 0;
    
    invoices.forEach((invoice) => {
        const sql = `
            INSERT INTO Invoices (
                client_id, invoice_number, issue_date, due_date, description,
                subtotal, tax_amount, total, payment_terms, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const values = [
            invoice.client_id, invoice.invoice_number, invoice.issue_date, invoice.due_date,
            invoice.description, invoice.subtotal, invoice.tax, invoice.total,
            invoice.payment_terms, invoice.status
        ];
        
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(`❌ Error creando factura ${invoice.invoice_number}:`, err);
            } else {
                console.log(`✅ Factura creada: ${invoice.invoice_number} (ID: ${result.insertId})`);
            }
            
            completed++;
            if (completed === invoices.length) {
                console.log('');
                callback();
            }
        });
    });
}

function createExpenseCategories(callback) {
    console.log('📁 Verificando categorías de gastos...');
    
    db.query('SELECT COUNT(*) as count FROM ExpenseCategories', (err, results) => {
        if (err) {
            console.error('❌ Error verificando categorías:', err);
            callback();
            return;
        }
        
        if (results[0].count > 0) {
            console.log(`✅ Ya existen ${results[0].count} categorías\n`);
            callback();
            return;
        }
        
        const categories = [
            ['Repuestos y Piezas', 'Compra de repuestos para equipos'],
            ['Herramientas', 'Herramientas de mantenimiento'],
            ['Transporte', 'Gastos de transporte y combustible'],
            ['Servicios Externos', 'Servicios de terceros'],
            ['Material de Oficina', 'Papelería y materiales de oficina'],
            ['Capacitación', 'Cursos y capacitaciones técnicas']
        ];
        
        let completed = 0;
        
        categories.forEach((cat) => {
            const sql = `INSERT INTO ExpenseCategories (name, description, is_active, created_at) VALUES (?, ?, 1, NOW())`;
            
            db.query(sql, cat, (err, result) => {
                if (err) {
                    console.error(`❌ Error creando categoría ${cat[0]}:`, err);
                } else {
                    console.log(`✅ Categoría creada: ${cat[0]} (ID: ${result.insertId})`);
                }
                
                completed++;
                if (completed === categories.length) {
                    console.log('');
                    callback();
                }
            });
        });
    });
}

function createExpenses(callback) {
    console.log('💸 Creando gastos...');
    
    // Obtener categorías
    db.query('SELECT id FROM ExpenseCategories LIMIT 6', (err, categories) => {
        if (err || categories.length === 0) {
            console.error('❌ Error obteniendo categorías de gastos');
            callback();
            return;
        }
        
        const catIds = categories.map(c => c.id);
        
        const expenses = [
            {
                category_id: catIds[0],
                description: 'Repuestos para cintas treadmill',
                amount: 250000,
                date: '2025-01-10',
                supplier: 'Importadora Fitness SPA',
                receipt_number: 'FAC-12345',
                payment_method: 'Transferencia',
                status: 'Aprobado'
            },
            {
                category_id: catIds[1],
                description: 'Set de herramientas profesionales',
                amount: 180000,
                date: '2025-01-15',
                supplier: 'Herramientas Industriales Ltda',
                receipt_number: 'FAC-67890',
                payment_method: 'Tarjeta Crédito',
                status: 'Aprobado'
            },
            {
                category_id: catIds[2],
                description: 'Combustible vehículo de servicio',
                amount: 75000,
                date: '2025-01-20',
                supplier: 'Copec',
                receipt_number: 'BOL-54321',
                payment_method: 'Tarjeta Combustible',
                status: 'Pagado'
            },
            {
                category_id: catIds[3],
                description: 'Servicio de calibración de básculas',
                amount: 120000,
                date: '2025-01-25',
                supplier: 'Metrología Chile',
                receipt_number: 'FAC-98765',
                payment_method: 'Transferencia',
                status: 'Pendiente'
            },
            {
                category_id: catIds[4],
                description: 'Material de oficina y papelería',
                amount: 45000,
                date: '2025-02-01',
                supplier: 'Office Depot',
                receipt_number: 'FAC-11111',
                payment_method: 'Efectivo',
                status: 'Aprobado'
            },
            {
                category_id: catIds[5],
                description: 'Curso de actualización técnica',
                amount: 350000,
                date: '2025-02-05',
                supplier: 'Centro de Capacitación TechFit',
                receipt_number: 'FAC-22222',
                payment_method: 'Transferencia',
                status: 'Pagado'
            }
        ];
        
        let completed = 0;
        
        expenses.forEach((expense) => {
            const sql = `
                INSERT INTO Expenses (
                    category_id, description, amount, date, supplier,
                    receipt_number, payment_method, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const values = [
                expense.category_id, expense.description, expense.amount, expense.date,
                expense.supplier, expense.receipt_number, expense.payment_method, expense.status
            ];
            
            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error(`❌ Error creando gasto:`, err);
                } else {
                    console.log(`✅ Gasto creado: ${expense.description.substring(0, 40)}... (ID: ${result.insertId})`);
                }
                
                completed++;
                if (completed === expenses.length) {
                    console.log('');
                    callback();
                }
            });
        });
    });
}

function showSummary(callback) {
    const queries = [
        { name: 'Cotizaciones', sql: 'SELECT COUNT(*) as count, SUM(total) as total FROM Quotes' },
        { name: 'Facturas', sql: 'SELECT COUNT(*) as count, SUM(total) as total FROM Invoices' },
        { name: 'Gastos', sql: 'SELECT COUNT(*) as count, SUM(amount) as total FROM Expenses' },
        { name: 'Categorías', sql: 'SELECT COUNT(*) as count FROM ExpenseCategories' }
    ];
    
    console.log('\n📊 RESUMEN DE DATOS CREADOS:');
    console.log('=' .repeat(50));
    
    let completed = 0;
    
    queries.forEach((query) => {
        db.query(query.sql, (err, results) => {
            if (err) {
                console.error(`❌ Error en ${query.name}:`, err);
            } else {
                const count = results[0].count;
                const total = results[0].total ? ` - Total: $${results[0].total.toLocaleString('es-CL')}` : '';
                console.log(`${query.name}: ${count} registros${total}`);
            }
            
            completed++;
            if (completed === queries.length) {
                console.log('=' .repeat(50));
                callback();
            }
        });
    });
}

// Ejecutar
seedFinanzasData()
    .then(() => {
        console.log('\n🎉 Proceso completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error en el proceso:', error);
        process.exit(1);
    });
