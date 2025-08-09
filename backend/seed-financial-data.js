// Seed Financial Data - Datos de ejemplo para cotizaciones y facturas
const mysql = require('mysql2');

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

const connection = mysql.createConnection(config);

const seedFinancialData = () => {
    console.log('🌱 Creando datos de ejemplo para el módulo financiero...');

    // Primero verificar que existan clientes
    connection.query('SELECT COUNT(*) as count FROM Clients', (err, result) => {
        if (err) {
            console.error('❌ Error verificando clientes:', err);
            return;
        }

        const clientCount = result[0].count;
        console.log(`📊 Clientes existentes: ${clientCount}`);

        if (clientCount === 0) {
            console.log('⚠️ No hay clientes. Creando cliente de ejemplo...');
            createSampleClient(() => {
                createFinancialData();
            });
        } else {
            createFinancialData();
        }
    });
};

const createSampleClient = (callback) => {
    const sampleClient = {
        name: 'GymFit Center',
        rut: '12345678-9',
        email: 'contacto@gymfit.cl',
        phone: '+56912345678',
        address: 'Av. Las Condes 1234, Las Condes, Santiago',
        created_at: new Date()
    };

    connection.query('INSERT INTO Clients SET ?', sampleClient, (err, result) => {
        if (err) {
            console.error('❌ Error creando cliente de ejemplo:', err);
            return;
        }
        console.log('✅ Cliente de ejemplo creado con ID:', result.insertId);
        callback();
    });
};

const createFinancialData = () => {
    // Obtener el primer cliente
    connection.query('SELECT id FROM Clients LIMIT 1', (err, clients) => {
        if (err) {
            console.error('❌ Error obteniendo cliente:', err);
            return;
        }

        const clientId = clients[0].id;
        console.log(`👤 Usando cliente ID: ${clientId}`);

        // Crear cotizaciones de ejemplo
        const quotes = [
            {
                client_id: clientId,
                location_id: null,
                title: 'Mantenimiento Equipos Cardiovasculares',
                description: 'Mantenimiento preventivo de cintas de correr, bicicletas estáticas y elípticas',
                total_amount: 450000,
                status: 'approved',
                created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
                items: JSON.stringify([
                    {
                        description: 'Revisión y calibración cintas de correr',
                        quantity: 5,
                        unit_price: 35000,
                        total: 175000
                    },
                    {
                        description: 'Mantenimiento bicicletas estáticas',
                        quantity: 8,
                        unit_price: 25000,
                        total: 200000
                    },
                    {
                        description: 'Limpieza y lubricación elípticas',
                        quantity: 3,
                        unit_price: 30000,
                        total: 90000
                    }
                ])
            },
            {
                client_id: clientId,
                location_id: null,
                title: 'Instalación Sistema de Sonido',
                description: 'Instalación de sistema de audio para clases grupales',
                total_amount: 850000,
                status: 'pending',
                created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 días atrás
                items: JSON.stringify([
                    {
                        description: 'Amplificador profesional 200W',
                        quantity: 1,
                        unit_price: 350000,
                        total: 350000
                    },
                    {
                        description: 'Altavoces de techo',
                        quantity: 6,
                        unit_price: 45000,
                        total: 270000
                    },
                    {
                        description: 'Instalación y cableado',
                        quantity: 1,
                        unit_price: 180000,
                        total: 180000
                    }
                ])
            },
            {
                client_id: clientId,
                location_id: null,
                title: 'Reparación Máquinas de Fuerza',
                description: 'Reparación de multiestación y máquinas de peso libre',
                total_amount: 320000,
                status: 'approved',
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
                items: JSON.stringify([
                    {
                        description: 'Reparación multiestación',
                        quantity: 1,
                        unit_price: 180000,
                        total: 180000
                    },
                    {
                        description: 'Reemplazo cables de acero',
                        quantity: 4,
                        unit_price: 25000,
                        total: 100000
                    },
                    {
                        description: 'Ajuste y calibración',
                        quantity: 1,
                        unit_price: 40000,
                        total: 40000
                    }
                ])
            }
        ];

        // Crear facturas de ejemplo
        const invoices = [
            {
                client_id: clientId,
                location_id: null,
                invoice_number: 'F-2024-001',
                title: 'Factura por Mantenimiento Cardiovascular',
                description: 'Facturación por servicios de mantenimiento preventivo realizados',
                total_amount: 450000,
                status: 'paid',
                due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días adelante
                created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 días atrás
                items: JSON.stringify([
                    {
                        description: 'Mantenimiento equipos cardiovasculares',
                        quantity: 1,
                        unit_price: 378151, // Sin IVA
                        total: 378151
                    }
                ])
            },
            {
                client_id: clientId,
                location_id: null,
                invoice_number: 'F-2024-002',
                title: 'Factura por Reparación de Equipos',
                description: 'Facturación por reparaciones realizadas en máquinas de fuerza',
                total_amount: 320000,
                status: 'pending',
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días adelante
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás
                items: JSON.stringify([
                    {
                        description: 'Reparación máquinas de fuerza',
                        quantity: 1,
                        unit_price: 268908, // Sin IVA
                        total: 268908
                    }
                ])
            },
            {
                client_id: clientId,
                location_id: null,
                invoice_number: 'F-2024-003',
                title: 'Factura por Instalación Audio',
                description: 'Facturación por instalación de sistema de sonido',
                total_amount: 850000,
                status: 'paid',
                due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 días adelante
                created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 días atrás
                items: JSON.stringify([
                    {
                        description: 'Sistema de audio completo',
                        quantity: 1,
                        unit_price: 714286, // Sin IVA
                        total: 714286
                    }
                ])
            }
        ];

        // Insertar cotizaciones
        console.log('💰 Creando cotizaciones de ejemplo...');
        insertQuotes(quotes, () => {
            console.log('📄 Creando facturas de ejemplo...');
            insertInvoices(invoices, () => {
                console.log('✅ Datos financieros de ejemplo creados exitosamente');
                connection.end();
            });
        });
    });
};

const insertQuotes = (quotes, callback) => {
    let completed = 0;
    quotes.forEach((quote, index) => {
        connection.query('INSERT INTO Quotes SET ?', quote, (err, result) => {
            if (err) {
                console.error(`❌ Error creando cotización ${index + 1}:`, err);
            } else {
                console.log(`✅ Cotización ${index + 1} creada con ID: ${result.insertId}`);
            }
            completed++;
            if (completed === quotes.length) {
                callback();
            }
        });
    });
};

const insertInvoices = (invoices, callback) => {
    let completed = 0;
    invoices.forEach((invoice, index) => {
        connection.query('INSERT INTO Invoices SET ?', invoice, (err, result) => {
            if (err) {
                console.error(`❌ Error creando factura ${index + 1}:`, err);
            } else {
                console.log(`✅ Factura ${index + 1} creada con ID: ${result.insertId}`);
            }
            completed++;
            if (completed === invoices.length) {
                callback();
            }
        });
    });
};

// Ejecutar el seeding
connection.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        return;
    }
    console.log('🔌 Conectado a MySQL');
    seedFinancialData();
});
