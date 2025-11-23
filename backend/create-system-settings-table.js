const dbAdapter = require('./src/db-adapter');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const createSystemSettingsTable = async () => {
    console.log('🚀 Creando tabla SystemSettings...');

    const sql = `
        CREATE TABLE IF NOT EXISTS SystemSettings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT,
            description TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    try {
        await new Promise((resolve, reject) => {
            dbAdapter.run(sql, [], (err) => {
                if (err) {
                    console.error('❌ Error creando tabla:', err);
                    reject(err);
                } else {
                    console.log('✅ Tabla SystemSettings creada o ya existente');
                    resolve();
                }
            });
        });

        // Insertar valores por defecto si está vacía
        const checkSql = 'SELECT COUNT(*) as count FROM SystemSettings';
        dbAdapter.get(checkSql, [], (err, row) => {
            if (err) {
                console.error('❌ Error verificando tabla:', err);
                return;
            }

            if (row.count === 0) {
                console.log('📝 Tabla vacía, insertando valores por defecto...');
                const defaults = [
                    { key: 'company.name', value: 'Gymtec ERP', desc: 'Nombre de la empresa' },
                    { key: 'company.email', value: 'admin@gymtec.com', desc: 'Email de contacto' },
                    { key: 'company.phone', value: '+1 555-0123', desc: 'Teléfono de contacto' },
                    { key: 'company.timezone', value: 'America/New_York', desc: 'Zona horaria' },
                    { key: 'workSchedule.start', value: '08:00', desc: 'Hora inicio jornada' },
                    { key: 'workSchedule.end', value: '18:00', desc: 'Hora fin jornada' },
                    { key: 'workSchedule.days.monday', value: 'true', desc: 'Lunes laborable' },
                    { key: 'workSchedule.days.tuesday', value: 'true', desc: 'Martes laborable' },
                    { key: 'workSchedule.days.wednesday', value: 'true', desc: 'Miércoles laborable' },
                    { key: 'workSchedule.days.thursday', value: 'true', desc: 'Jueves laborable' },
                    { key: 'workSchedule.days.friday', value: 'true', desc: 'Viernes laborable' },
                    { key: 'workSchedule.days.saturday', value: 'false', desc: 'Sábado laborable' },
                    { key: 'workSchedule.days.sunday', value: 'false', desc: 'Domingo laborable' },
                    { key: 'security.passwordMinLength', value: '8', desc: 'Longitud mínima contraseña' },
                    { key: 'security.sessionTimeout', value: '30', desc: 'Timeout sesión (min)' },
                    { key: 'security.maxLoginAttempts', value: '3', desc: 'Intentos login fallidos' },
                    { key: 'maintenance.autoMaintenance', value: 'true', desc: 'Mantenimiento automático' },
                    { key: 'maintenance.defaultInterval', value: '30', desc: 'Intervalo mantenimiento (días)' },
                    { key: 'maintenance.slaCritical', value: '4', desc: 'SLA Crítico (horas)' },
                    { key: 'maintenance.slaNormal', value: '24', desc: 'SLA Normal (horas)' },
                    { key: 'integrations.whatsappIntegration', value: 'false', desc: 'Integración WhatsApp' },
                    { key: 'integrations.cloudBackup', value: 'true', desc: 'Backup Cloud' }
                ];

                // Insertar secuencialmente para evitar problemas de concurrencia
                const insertNext = (index) => {
                    if (index >= defaults.length) {
                        console.log('✅ Valores por defecto insertados');
                        return;
                    }

                    const setting = defaults[index];
                    const sql = 'INSERT INTO SystemSettings (setting_key, setting_value, description) VALUES (?, ?, ?)';
                    
                    dbAdapter.run(sql, [setting.key, setting.value, setting.desc], (err) => {
                        if (err) console.error(`❌ Error insertando ${setting.key}:`, err.message);
                        insertNext(index + 1);
                    });
                };

                insertNext(0);
            } else {
                console.log('ℹ️ La tabla ya tiene datos, no se insertaron valores por defecto');
            }
        });

    } catch (error) {
        console.error('❌ Error fatal:', error);
    }
};

createSystemSettingsTable();
