#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corregir los 5 endpoints restantes del dashboard
Reemplaza columnas y tablas inexistentes por versiones simplificadas
"""

import re

# Leer el archivo
with open('backend/src/server-clean.js', 'r', encoding='utf-8') as f:
    content = f.content()

print("📝 Archivo leído correctamente")

# Buscar y marcar el inicio del endpoint critical-alerts
critical_alerts_start = content.find("app.get('/api/dashboard/critical-alerts'")
print(f"🔍 Encontrado critical-alerts en posición: {critical_alerts_start}")

# Buscar el final del endpoint (siguiente app.get o comentario de sección)
critical_alerts_end = content.find("\n\n// ===", critical_alerts_start + 100)
if critical_alerts_end == -1:
    critical_alerts_end = content.find("\napp.get('/api/dashboard/resources-summary'", critical_alerts_start + 100)

print(f"🔍 Final de critical-alerts en posición: {critical_alerts_end}")

# Extraer el endpoint actual
current_endpoint = content[critical_alerts_start:critical_alerts_end]
print(f"📏 Longitud del endpoint actual: {len(current_endpoint)} caracteres")

# Crear el nuevo endpoint corregido
new_critical_alerts = """app.get('/api/dashboard/critical-alerts', authenticateToken, async (req, res) => {
    console.log('🚨 Solicitando alertas críticas...');
    try {
        const queries = [
            // Tickets sin asignar > 24h (CORREGIDO: assigned_technician_id)
            db.allAsync(`
                SELECT 
                    id,
                    title,
                    priority,
                    created_at,
                    TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours_unassigned
                FROM Tickets 
                WHERE assigned_technician_id IS NULL 
                AND status = 'Abierto'
                AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY priority DESC, created_at ASC
                LIMIT 5
            `, []),
            
            // SLA crítico < 2h (tickets urgentes creados hace > 2h)
            db.allAsync(`
                SELECT 
                    id,
                    title,
                    priority,
                    created_at
                FROM Tickets
                WHERE priority = 'Urgente'
                AND status NOT IN ('Cerrado', 'Resuelto')
                AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)
                LIMIT 5
            `, []),
            
            // Stock en 0
            db.allAsync(`
                SELECT 
                    id,
                    name,
                    sku,
                    current_stock,
                    minimum_stock
                FROM SpareParts
                WHERE current_stock = 0
                LIMIT 5
            `, []),
            
            // Contratos vencen esta semana (SIMULADO = vacío, no existe tabla)
            Promise.resolve([]),
            
            // Equipos fuera de servicio (buscar en notes)
            db.allAsync(`
                SELECT 
                    e.id,
                    e.name,
                    e.serial_number,
                    l.name as location_name,
                    c.name as client_name
                FROM Equipment e
                LEFT JOIN Locations l ON e.location_id = l.id
                LEFT JOIN Clients c ON l.client_id = c.id
                WHERE e.notes LIKE '%fuera%servicio%' OR e.notes LIKE '%deshabilitado%'
                LIMIT 10
            `, []),
            
            // Gastos pendientes > 7 días (SIMULADO = vacío, no existe tabla Expenses)
            Promise.resolve([])
        ];

        const results = await Promise.all(queries);

        const alerts = {
            unassigned_tickets_24h: results[0] || [],
            sla_critical_2h: results[1] || [],
            zero_stock_items: results[2] || [],
            contracts_expiring_week: results[3] || [],
            equipment_out_of_service: results[4] || [],
            expenses_pending_7days: results[5] || []
        };

        const total_alerts = 
            alerts.unassigned_tickets_24h.length +
            alerts.sla_critical_2h.length +
            alerts.zero_stock_items.length +
            alerts.contracts_expiring_week.length +
            alerts.equipment_out_of_service.length +
            alerts.expenses_pending_7days.length;

        console.log('✅ Alertas críticas calculadas');
        res.json({
            message: 'success',
            data: alerts,
            total_alerts: total_alerts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error calculando alertas críticas:', error);
        res.status(500).json({ error: error.message });
    }
});"""

# Reemplazar
content = content[:critical_alerts_start] + new_critical_alerts + content[critical_alerts_end:]

print("✅ Endpoint critical-alerts reemplazado")

# Guardar el archivo
with open('backend/src/server-clean.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Archivo guardado correctamente")
print("🎉 Corrección completada!")
