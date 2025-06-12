const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database', 'gymtec.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

const clients = [
    { name: 'Energy Club', contact: 'Javiera Rojas', email: 'javiera.rojas@energyclub.cl', phone: '+56987654321' },
    { name: 'Smart Fit', contact: 'Carlos Núñez', email: 'carlos.nunez@smartfit.cl', phone: '+56912345678' },
    { name: 'Pacific Fitness', contact: 'Sofia Morales', email: 'sofia.morales@pacificfitness.cl', phone: '+56955554444' }
];

const locations = [
    { name: 'Energy Las Condes', address: 'Apoquindo 5600, Santiago', client_id: 1 },
    { name: 'Energy Providencia', address: 'Av. Providencia 2124, Santiago', client_id: 1 },
    { name: 'Smart Fit Ñuñoa', address: 'Irarrázaval 3051, Santiago', client_id: 2 },
    { name: 'Pacific Fitness Maipú', address: 'Av. Pajaritos 2643, Santiago', client_id: 3 }
];

const equipment = [
    // Energy Las Condes
    { name: 'Trotadora', type: 'Cardio', brand: 'Life Fitness', model: '95T Inspire', serial: 'LF-95T-001', location_id: 1 },
    { name: 'Trotadora', type: 'Cardio', brand: 'Life Fitness', model: '95T Inspire', serial: 'LF-95T-002', location_id: 1 },
    { name: 'Elíptica', type: 'Cardio', brand: 'Precor', model: 'EFX 885', serial: 'PC-EFX-010', location_id: 1 },
    { name: 'Prensa de Piernas', type: 'Fuerza', brand: 'Hammer Strength', model: 'Plate-Loaded Leg Press', serial: 'HS-PLP-050', location_id: 1 },
    
    // Energy Providencia
    { name: 'Bicicleta de Spinning', type: 'Cardio', brand: 'Keiser', model: 'M3i', serial: 'KS-M3i-101', location_id: 2 },
    { name: 'Bicicleta de Spinning', type: 'Cardio', brand: 'Keiser', model: 'M3i', serial: 'KS-M3i-102', location_id: 2 },
    { name: 'Máquina de Remo', type: 'Cardio', brand: 'Concept2', model: 'RowErg', serial: 'C2-RE-201', location_id: 2 },

    // Smart Fit Ñuñoa
    { name: 'Trotadora', type: 'Cardio', brand: 'Technogym', model: 'Excite Run 1000', serial: 'TG-ER-301', location_id: 3 },
    { name: 'Prensa de Pecho', type: 'Fuerza', brand: 'Technogym', model: 'Selection Pro Chest Press', serial: 'TG-SPCP-305', location_id: 3 },
    { name: 'Dorsalera', type: 'Fuerza', brand: 'Ironside', model: 'Infinity Lat Pulldown', serial: 'IR-ILP-411', location_id: 3 },

    // Pacific Fitness Maipú
    { name: 'Trotadora', type: 'Cardio', brand: 'Obelix', model: 'Movment 2.0', serial: 'OB-M2-551', location_id: 4 },
    { name: 'Elíptica', type: 'Cardio', brand: 'Obelix', model: 'Movment 2.0', serial: 'OB-M2-552', location_id: 4 },
    { name: 'Mancuernas (Par)', type: 'Peso Libre', brand: 'Ironside', model: 'Hexagonales 10kg', serial: 'IR-HEX-601', location_id: 4 }
];


db.serialize(() => {
    // Limpiar tablas para evitar duplicados
    console.log('Limpiando tablas existentes...');
    db.run(`DELETE FROM Equipment`);
    db.run(`DELETE FROM Locations`);
    db.run(`DELETE FROM Clients`);
    // Resetear secuencias de autoincremento
    db.run(`DELETE FROM sqlite_sequence WHERE name IN ('Clients', 'Locations', 'Equipment');`);


    console.log('Insertando datos de prueba...');

    // Insertar Clientes
    const clientStmt = db.prepare("INSERT INTO Clients (name, contact_person, email, phone) VALUES (?, ?, ?, ?)");
    clients.forEach(c => clientStmt.run(c.name, c.contact, c.email, c.phone));
    clientStmt.finalize();
    console.log(`${clients.length} clientes insertados.`);

    // Insertar Sedes
    const locationStmt = db.prepare("INSERT INTO Locations (name, address, client_id) VALUES (?, ?, ?)");
    locations.forEach(l => locationStmt.run(l.name, l.address, l.client_id));
    locationStmt.finalize();
    console.log(`${locations.length} sedes insertadas.`);

    // Insertar Equipos
    const equipStmt = db.prepare("INSERT INTO Equipment (name, type, brand, model, serial_number, location_id) VALUES (?, ?, ?, ?, ?, ?)");
    equipment.forEach(e => equipStmt.run(e.name, e.type, e.brand, e.model, e.serial, e.location_id));
    equipStmt.finalize();
    console.log(`${equipment.length} equipos insertados.`);

    console.log('¡Base de datos poblada con éxito!');
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Close the database connection.');
}); 