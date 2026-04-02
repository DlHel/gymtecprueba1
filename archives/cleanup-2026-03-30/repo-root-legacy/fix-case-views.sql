-- Fix para case-sensitivity en tablas MySQL
-- Las tablas deben usar PascalCase consistentemente

-- Crear vistas o aliases para tablas que tienen queries con minúsculas
-- Esto permite que el código que usa 'tickets' funcione con la tabla 'Tickets'

-- Verificar si ya existen estas vistas
DROP VIEW IF EXISTS tickets;
DROP VIEW IF EXISTS equipmentnotes;
DROP VIEW IF EXISTS clients;
DROP VIEW IF EXISTS locations;
DROP VIEW IF EXISTS equipment;

-- Crear vistas con nombres en minúsculas que apuntan a las tablas PascalCase
CREATE VIEW tickets AS SELECT * FROM Tickets;
CREATE VIEW equipmentnotes AS SELECT * FROM EquipmentNotes;
CREATE VIEW clients AS SELECT * FROM Clients;
CREATE VIEW locations AS SELECT * FROM Locations;
CREATE VIEW equipment AS SELECT * FROM Equipment;

-- Verificar las vistas creadas
SHOW TABLES LIKE '%ticket%';
SHOW TABLES LIKE '%equipment%';
