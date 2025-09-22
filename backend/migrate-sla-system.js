// Migración para Sistema de Reglas SLA
const mysql = require('mysql2');
require('dotenv').config({ path: '../config.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

async function migrateSLASystem() {
    let connection;
    
    try {
        connection = mysql.createConnection(dbConfig);
        
        console.log('🔄 Iniciando migración del Sistema SLA...');

        // 1. Tabla para violaciones SLA
        const createViolationsTable = `
            CREATE TABLE IF NOT EXISTS sla_violations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                rule_id VARCHAR(100) NOT NULL,
                rule_name VARCHAR(255) NOT NULL,
                severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
                violation_data JSON,
                resolved BOOLEAN DEFAULT FALSE,
                resolved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_task_id (task_id),
                INDEX idx_severity (severity),
                INDEX idx_created_at (created_at),
                INDEX idx_resolved (resolved),
                
                FOREIGN KEY (task_id) REFERENCES maintenancetasks(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await executeQuery(connection, createViolationsTable);
        console.log('✅ Tabla sla_violations creada');

        // 2. Tabla para log de acciones SLA
        const createActionLogTable = `
            CREATE TABLE IF NOT EXISTS sla_action_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id INT NOT NULL,
                violation_id INT NULL,
                action_type ENUM('escalate', 'notify', 'reassign', 'priority_boost', 'log') NOT NULL,
                action_data JSON,
                message TEXT,
                executed_by VARCHAR(100) DEFAULT 'system',
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_task_id (task_id),
                INDEX idx_action_type (action_type),
                INDEX idx_executed_at (executed_at),
                
                FOREIGN KEY (task_id) REFERENCES maintenancetasks(id) ON DELETE CASCADE,
                FOREIGN KEY (violation_id) REFERENCES sla_violations(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await executeQuery(connection, createActionLogTable);
        console.log('✅ Tabla sla_action_log creada');

        // 3. Tabla para configuración de reglas SLA
        const createRulesConfigTable = `
            CREATE TABLE IF NOT EXISTS sla_rules_config (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                conditions JSON NOT NULL,
                actions JSON NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                priority INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_enabled (enabled),
                INDEX idx_priority (priority)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await executeQuery(connection, createRulesConfigTable);
        console.log('✅ Tabla sla_rules_config creada');

        // 4. Agregar columnas adicionales a maintenancetasks para escalación
        const addEscalationColumns = `
            ALTER TABLE maintenancetasks 
            ADD COLUMN IF NOT EXISTS escalated_to INT NULL,
            ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS priority_boosted_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS sla_violations_count INT DEFAULT 0,
            ADD INDEX IF NOT EXISTS idx_escalated_to (escalated_to),
            ADD INDEX IF NOT EXISTS idx_escalated_at (escalated_at)
        `;

        try {
            await executeQuery(connection, addEscalationColumns);
            console.log('✅ Columnas de escalación agregadas a maintenancetasks');
        } catch (error) {
            if (!error.message.includes('Duplicate column name')) {
                throw error;
            }
            console.log('ℹ️  Columnas de escalación ya existen en maintenancetasks');
        }

        // 5. Insertar reglas SLA por defecto
        const insertDefaultRules = `
            INSERT IGNORE INTO sla_rules_config (id, name, description, conditions, actions, priority) VALUES
            ('critical_immediate', 'Tareas Críticas - Respuesta Inmediata', 
             'Tareas críticas requieren atención inmediata dentro de 30 minutos',
             '{"priority": "critical", "timeThreshold": 30, "status": ["pending", "scheduled"]}',
             '[{"type": "escalate", "target": "supervisor"}, {"type": "notify", "recipients": ["admin", "manager"]}, {"type": "reassign", "criteria": "best_available"}]',
             100),
             
            ('high_priority_4h', 'Tareas Alta Prioridad - 4 Horas',
             'Tareas de alta prioridad deben iniciarse dentro de 4 horas',
             '{"priority": "high", "timeThreshold": 240, "status": ["pending", "scheduled"]}',
             '[{"type": "notify", "recipients": ["manager"]}, {"type": "reassign", "criteria": "available_specialist"}]',
             80),
             
            ('medium_priority_24h', 'Tareas Prioridad Media - 24 Horas',
             'Tareas de prioridad media deben atenderse dentro de 24 horas',
             '{"priority": "medium", "timeThreshold": 1440, "status": ["pending", "scheduled"]}',
             '[{"type": "notify", "recipients": ["assigned_technician"]}, {"type": "log", "message": "Tarea próxima a vencer SLA"}]',
             60),
             
            ('overdue_tasks', 'Tareas Vencidas',
             'Tareas que han superado su deadline establecido',
             '{"overdue": true, "status": ["pending", "scheduled", "in_progress"]}',
             '[{"type": "escalate", "target": "manager"}, {"type": "notify", "recipients": ["admin", "client"]}, {"type": "priority_boost", "newPriority": "high"}]',
             120),
             
            ('long_running_tasks', 'Tareas en Progreso Demasiado Tiempo',
             'Tareas que están en progreso por más de 8 horas',
             '{"status": ["in_progress"], "timeThreshold": 480}',
             '[{"type": "notify", "recipients": ["assigned_technician", "manager"]}, {"type": "log", "message": "Tarea en progreso excesivo"}]',
             40)
        `;

        await executeQuery(connection, insertDefaultRules);
        console.log('✅ Reglas SLA por defecto insertadas');

        // 6. Crear tabla para métricas SLA
        const createMetricsTable = `
            CREATE TABLE IF NOT EXISTS sla_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                metric_type ENUM('compliance_rate', 'avg_response_time', 'violation_count', 'escalation_rate') NOT NULL,
                metric_value DECIMAL(10,2) NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                category VARCHAR(100),
                calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_metric_type (metric_type),
                INDEX idx_period (period_start, period_end),
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await executeQuery(connection, createMetricsTable);
        console.log('✅ Tabla sla_metrics creada');

        // 7. Crear vista para dashboard SLA
        const createSLADashboardView = `
            CREATE OR REPLACE VIEW sla_dashboard AS
            SELECT 
                DATE(mt.created_at) as date,
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN mt.status = 'completed' AND mt.completed_at <= mt.sla_deadline THEN 1 END) as on_time_completions,
                COUNT(CASE WHEN mt.sla_deadline < NOW() AND mt.status != 'completed' THEN 1 END) as overdue_tasks,
                COUNT(CASE WHEN sv.id IS NOT NULL THEN 1 END) as tasks_with_violations,
                ROUND(
                    COUNT(CASE WHEN mt.status = 'completed' AND mt.completed_at <= mt.sla_deadline THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(CASE WHEN mt.status = 'completed' THEN 1 END), 0), 2
                ) as compliance_rate,
                AVG(CASE 
                    WHEN mt.status = 'completed' THEN 
                        TIMESTAMPDIFF(MINUTE, mt.created_at, mt.completed_at)
                    ELSE NULL 
                END) as avg_completion_time_minutes
            FROM maintenancetasks mt
            LEFT JOIN sla_violations sv ON mt.id = sv.task_id
            WHERE mt.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(mt.created_at)
            ORDER BY date DESC
        `;

        await executeQuery(connection, createSLADashboardView);
        console.log('✅ Vista sla_dashboard creada');

        // 8. Crear triggers para actualización automática de métricas
        const createViolationCountTrigger = `
            CREATE TRIGGER IF NOT EXISTS update_violation_count_after_insert
            AFTER INSERT ON sla_violations
            FOR EACH ROW
            BEGIN
                UPDATE maintenancetasks 
                SET sla_violations_count = sla_violations_count + 1
                WHERE id = NEW.task_id;
            END
        `;

        try {
            await executeQuery(connection, createViolationCountTrigger);
            console.log('✅ Trigger de conteo de violaciones creado');
        } catch (error) {
            if (!error.message.includes('already exists')) {
                console.warn('⚠️  No se pudo crear trigger:', error.message);
            }
        }

        // 9. Verificar estructura de tablas creadas
        console.log('\n📊 Verificando estructura de tablas SLA...');
        
        const tables = ['sla_violations', 'sla_action_log', 'sla_rules_config', 'sla_metrics'];
        
        for (const table of tables) {
            const describeResult = await executeQuery(connection, `DESCRIBE ${table}`);
            console.log(`\n📋 Estructura de ${table}:`);
            describeResult.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Extra}`);
            });
        }

        console.log('\n✅ Migración del Sistema SLA completada exitosamente');
        console.log('\n📈 Características implementadas:');
        console.log('  • Monitoreo automático de violaciones SLA');
        console.log('  • Escalación automática de tareas críticas');
        console.log('  • Sistema de notificaciones configurable');
        console.log('  • Reasignación inteligente de tareas');
        console.log('  • Métricas y dashboard de cumplimiento');
        console.log('  • Reglas SLA configurables y personalizables');
        console.log('  • Log completo de acciones automáticas');

    } catch (error) {
        console.error('❌ Error en migración SLA:', error);
        throw error;
    } finally {
        if (connection) {
            connection.end();
        }
    }
}

function executeQuery(connection, sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    migrateSLASystem()
        .then(() => {
            console.log('\n🎉 Sistema SLA listo para uso');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Error fatal en migración:', error);
            process.exit(1);
        });
}

module.exports = { migrateSLASystem };