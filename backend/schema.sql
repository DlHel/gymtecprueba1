CREATE TABLE EquipmentModels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    model_code TEXT UNIQUE,
    technical_specifications TEXT,
    dimensions TEXT,
    weight REAL,
    power_requirements TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ModelPhotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES EquipmentModels(id) ON DELETE CASCADE
);

CREATE TABLE Tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    location_id INTEGER,
    equipment_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Abierto',
    priority TEXT NOT NULL DEFAULT 'Media',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (location_id) REFERENCES Locations(id),
    FOREIGN KEY (equipment_id) REFERENCES Equipment(id)
);

-- Seed data for EquipmentModels
-- ... existing code ... 