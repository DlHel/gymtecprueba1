-- Crear tabla SystemSettings
CREATE TABLE IF NOT EXISTS SystemSettings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar configuración de CRON
INSERT IGNORE INTO SystemSettings (setting_key, setting_value, description)
VALUES ('cron_jobs_enabled', 'true', 'Habilitar jobs CRON');

-- Verificar
SELECT 'SystemSettings creada' AS status;
SELECT COUNT(*) AS registros FROM SystemSettings;
