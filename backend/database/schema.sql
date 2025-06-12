-- Gestión de Usuarios y Roles
CREATE TABLE IF NOT EXISTS Roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role_id INTEGER,
    FOREIGN KEY (role_id) REFERENCES Roles (id)
);

-- Módulo 2: Gestión de Clientes, Sedes y Equipos
CREATE TABLE IF NOT EXISTS Clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, -- Nombre comercial
    legal_name TEXT,     -- Razón Social
    rut TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    business_activity TEXT, -- Giro
    contact_name TEXT
);

CREATE TABLE IF NOT EXISTS Locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    client_id INTEGER,
    FOREIGN KEY (client_id) REFERENCES Clients (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    brand TEXT,
    model TEXT,
    serial_number TEXT UNIQUE,
    custom_id TEXT UNIQUE,
    location_id INTEGER NOT NULL,
    acquisition_date DATE,
    last_maintenance_date DATE,
    notes TEXT,
    FOREIGN KEY (location_id) REFERENCES Locations (id) ON DELETE CASCADE
);

-- Table: SpareParts (Inventario de Repuestos)
CREATE TABLE SpareParts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0
);

-- Módulo 2: Gestión de Contratos y SLAs
CREATE TABLE IF NOT EXISTS Contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    start_date DATE,
    end_date DATE,
    details TEXT,
    FOREIGN KEY (client_id) REFERENCES Clients (id)
);

CREATE TABLE IF NOT EXISTS Contract_Equipment (
    contract_id INTEGER,
    equipment_id INTEGER,
    PRIMARY KEY (contract_id, equipment_id),
    FOREIGN KEY (contract_id) REFERENCES Contracts (id),
    FOREIGN KEY (equipment_id) REFERENCES Equipment (id)
);

CREATE TABLE IF NOT EXISTS SLAs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    response_time_hours INTEGER,
    resolution_time_hours INTEGER,
    FOREIGN KEY (contract_id) REFERENCES Contracts (id)
);

-- Módulo 3: Gestión de Servicios y Tickets
CREATE TABLE IF NOT EXISTS Tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado')),
    priority TEXT CHECK(priority IN ('Baja', 'Media', 'Alta', 'Urgente')),
    client_id INTEGER,
    location_id INTEGER,
    equipment_id INTEGER,
    assigned_technician_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    FOREIGN KEY (client_id) REFERENCES Clients (id),
    FOREIGN KEY (location_id) REFERENCES Locations (id),
    FOREIGN KEY (equipment_id) REFERENCES Equipment (id),
    FOREIGN KEY (assigned_technician_id) REFERENCES Users (id)
); 