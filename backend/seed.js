const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database', 'gymtec.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error('Error al abrir la base de datos', err.message);
    }
    console.log('Conectado a la base de datos SQLite para el seeder.');
});

// --- Datos de Prueba ---

const clients = [
    { 
        name: 'Energy Club', 
        legal_name: 'Gimnasios Energy Club SpA',
        rut: '76.123.456-7',
        address: 'Av. Kennedy 5413, Vitacura, Santiago',
        phone: '+56 2 2955 3333',
        email: 'contacto@energyclub.cl',
        business_activity: 'Actividades de gimnasios',
        contact_name: 'Javiera Rojas'
    },
    { 
        name: 'Smart Fit',
        legal_name: 'Smart Fit Chile S.A.',
        rut: '76.555.888-K',
        address: 'Av. Apoquindo 4775, Las Condes, Santiago',
        phone: '+56 2 2760 3000',
        email: 'atencion@smartfit.cl',
        business_activity: 'Explotación de recintos deportivos',
        contact_name: 'Carlos Núñez'
    },
    {
        name: 'Pacific Fitness',
        legal_name: 'Sociedad Comercial Pacific Fitness Ltda.',
        rut: '78.987.654-3',
        address: 'Av. Libertador Bernardo O\'Higgins 949, Santiago',
        phone: '+56 2 2486 8600',
        email: 'info@pacificfitness.cl',
        business_activity: 'Gimnasio y centro de acondicionamiento físico',
        contact_name: 'Sofia Morales'
    },
    {
        name: 'Banco Internacional',
        legal_name: 'Banco Internacional S.A.',
        rut: '96.588.000-4',
        address: 'Av. Andrés Bello 2687, Las Condes, Santiago',
        phone: '+56 2 2290 6000',
        email: 'bienestar@bancointernacional.cl',
        business_activity: 'Banca e instituciones financieras',
        contact_name: 'Andrés Soto'
    }
];

const locations = [
    { name: 'Energy Las Condes', address: 'Apoquindo 5600, Las Condes, Santiago', client_id: 1 },
    { name: 'Energy Providencia', address: 'Av. Providencia 2124, Providencia, Santiago', client_id: 1 },
    { name: 'Energy Vitacura (Sin Equipos)', address: 'Av. Vitacura 2900, Vitacura, Santiago', client_id: 1 },
    { name: 'Smart Fit Ñuñoa', address: 'Av. Irarrázaval 3051, Ñuñoa, Santiago', client_id: 2 },
    { name: 'Pacific Fitness Maipú', address: 'Av. Pajaritos 2643, Maipú, Santiago', client_id: 3 },
    { name: 'Gimnasio Corporativo', address: 'Av. Andrés Bello 2687, Piso -1, Las Condes', client_id: 4 }
];

const equipment = [
    // Energy Las Condes
    { name: 'Trotadora', type: 'Cardio', brand: 'Life Fitness', model: '95T Inspire', serial_number: 'LF-95T-001', location_id: 1, acquisition_date: '2022-01-15', notes: 'Pantalla táctil a veces no responde. Revisar en próxima mantención.' },
    { name: 'Trotadora', type: 'Cardio', brand: 'Life Fitness', model: '95T Inspire', serial_number: 'LF-95T-002', location_id: 1, acquisition_date: '2022-01-15', notes: null },
    { name: 'Elíptica', type: 'Cardio', brand: 'Precor', model: 'EFX 885', serial_number: 'PC-EFX-010', location_id: 1, acquisition_date: '2021-11-20', notes: 'Ruido en el pedal derecho.' },
    { name: 'Prensa de Piernas', type: 'Fuerza', brand: 'Hammer Strength', model: 'Plate-Loaded Leg Press', serial_number: 'HS-PLP-050', location_id: 1, acquisition_date: '2021-11-20', notes: null },
    { name: 'Mancuerna Hexagonal 10kg', type: 'Peso Libre', brand: 'Generic', model: 'Hex', serial_number: 'PL-HEX-10-01', location_id: 1, acquisition_date: '2021-10-01', notes: 'Par' },
    
    // Energy Providencia
    { name: 'Bicicleta de Spinning', type: 'Cardio', brand: 'Keiser', model: 'M3i', serial_number: 'KS-M3i-101', location_id: 2, acquisition_date: '2023-03-10', notes: null },
    { name: 'Bicicleta de Spinning', type: 'Cardio', brand: 'Keiser', model: 'M3i', serial_number: 'KS-M3i-102', location_id: 2, acquisition_date: '2023-03-10', notes: 'Monitor de cadencia reemplazado el 10/05/2024.' },
    { name: 'Máquina de Remo', type: 'Cardio', brand: 'Concept2', model: 'RowErg', serial_number: 'C2-RE-201', location_id: 2, acquisition_date: '2022-08-01', notes: null },
    { name: 'Jaula de Potencia', type: 'Fuerza', brand: 'Rogue', model: 'RML-3', serial_number: 'RG-RML3-01', location_id: 2, acquisition_date: '2022-08-01', notes: 'Incluye barra olímpica' },

    // Smart Fit Ñuñoa (Sede 4)
    { name: 'Trotadora', type: 'Cardio', brand: 'Technogym', model: 'Excite Run 1000', serial_number: 'TG-ER-301', location_id: 4, acquisition_date: '2022-05-25', notes: null },
    { name: 'Prensa de Pecho', type: 'Fuerza', brand: 'Technogym', model: 'Selection Pro Chest Press', serial_number: 'TG-SPCP-305', location_id: 4, acquisition_date: '2022-05-25', notes: null },
    { name: 'Dorsalera', type: 'Musculación', brand: 'Ironside', model: 'Infinity Lat Pulldown', serial_number: 'IR-ILP-411', location_id: 4, acquisition_date: '2023-01-30', notes: 'Tapiz del asiento con desgaste.' },
    
    // Pacific Fitness Maipú (Sede 5)
    { name: 'Trotadora', type: 'Cardio', brand: 'Sport-op', model: 'ST3000', serial_number: 'SP-ST-001', location_id: 5, acquisition_date: '2020-02-10', notes: 'Modelo antiguo pero funcional.' },

    // Gimnasio Corporativo (Sede 6)
    { name: 'Caminadora', type: 'Cardio', brand: 'Precor', model: 'TRM 445', serial_number: 'PC-TRM-001', location_id: 6, acquisition_date: '2023-09-01', notes: null },
    { name: 'Set de Mancuernas', type: 'Peso Libre', brand: 'Bowflex', model: 'SelectTech 552', serial_number: 'BF-ST552-01', location_id: 6, acquisition_date: '2023-09-01', notes: 'Ajustables de 2 a 24 kg.' }
];

const tickets = [
    { title: 'Trotadora LF-95T-001 no enciende', description: 'La trotadora no recibe energía. Se ha revisado el enchufe y está correcto.', status: 'Abierto', priority: 'Alta', client_id: 1, location_id: 1, equipment_id: 1 },
    { title: 'Elíptica PC-EFX-010 con ruido', description: 'Al usarla, se escucha un "clack" constante en la zona del pedal derecho.', status: 'En Progreso', priority: 'Media', client_id: 1, location_id: 1, equipment_id: 3 },
    { title: 'Mantenimiento Preventivo Bicicletas', description: 'Realizar mantenimiento preventivo a todas las bicicletas Keiser de la sede.', status: 'Abierto', priority: 'Baja', client_id: 1, location_id: 2, equipment_id: null },
    { title: 'Tapiz de dorsalera desgastado', description: 'El tapiz del asiento de la máquina Ironside Infinity Lat Pulldown está roto en una esquina.', status: 'Resuelto', priority: 'Baja', client_id: 2, location_id: 4, equipment_id: 12 },
    { title: 'Caminadora se detiene súbitamente', description: 'La caminadora del gimnasio corporativo se apaga a los 10 minutos de uso.', status: 'Cerrado', priority: 'Urgente', client_id: 4, location_id: 6, equipment_id: 15 },
    { title: 'Falta pin de seguridad en Jaula de Potencia', description: 'Falta uno de los pasadores de seguridad (J-cup) de la jaula Rogue.', status: 'Abierto', priority: 'Media', client_id: 1, location_id: 2, equipment_id: 9 }
];


async function runSeed() {
    // Usamos una nueva conexión para el seeder para controlar el flujo
    const dbPath = path.resolve(__dirname, 'database', 'gymtec.db');
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            return console.error('Error al abrir la base de datos', err.message);
        }
        console.log('Conectado a la base de datos SQLite para el seeder.');
    });

    const run = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                resolve({ id: this.lastID, changes: this.changes });
            });
        });
    };

    try {
        console.log('Borrando datos de tablas existentes...');
        const tables = ['Tickets', 'Equipment', 'Locations', 'Clients'];
        for (const table of tables) {
            await run(`DELETE FROM ${table}`);
            await run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table]);
        }
        
        console.log('Insertando nuevos datos de prueba...');

        for (const c of clients) {
            await run("INSERT INTO Clients (name, legal_name, rut, address, phone, email, business_activity, contact_name) VALUES (?,?,?,?,?,?,?,?)", 
                [c.name, c.legal_name, c.rut, c.address, c.phone, c.email, c.business_activity, c.contact_name]);
        }
        console.log(`${clients.length} clientes insertados.`);
        
        for (const l of locations) {
            await run("INSERT INTO Locations (name, address, client_id) VALUES (?, ?, ?)", [l.name, l.address, l.client_id]);
        }
        console.log(`${locations.length} sedes insertadas.`);

        for (const e of equipment) {
            await run("INSERT INTO Equipment (name, type, brand, model, serial_number, location_id, acquisition_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                [e.name, e.type, e.brand, e.model, e.serial_number, e.location_id, e.acquisition_date, e.notes]);
        }
        console.log(`${equipment.length} equipos insertados.`);
        
        for (const t of tickets) {
            await run("INSERT INTO Tickets (title, description, status, priority, client_id, location_id, equipment_id) VALUES (?,?,?,?,?,?,?)",
                [t.title, t.description, t.status, t.priority, t.client_id, t.location_id, t.equipment_id]);
        }
        console.log(`${tickets.length} tickets insertados.`);
        
        console.log('¡Base de datos poblada con éxito!');

    } catch (error) {
        console.error('Error poblando la base de datos:', error.message);
    } finally {
        db.close((err) => {
            if (err) {
                return console.error(err.message);
            }
            console.log('Conexión con la base de datos del seeder cerrada.');
        });
    }
}

runSeed(); 