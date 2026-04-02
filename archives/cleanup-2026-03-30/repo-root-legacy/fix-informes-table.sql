-- Agregar columnas faltantes a InformesTecnicos
ALTER TABLE InformesTecnicos ADD COLUMN notas_adicionales TEXT DEFAULT NULL;
ALTER TABLE InformesTecnicos ADD COLUMN client_email VARCHAR(255) DEFAULT NULL;
