/**
 * GYMTEC ERP - APIs para Sistema de Contratos y SLA
 * Implementación de Ideas del Documento LAMP - Fase 1
 * 
 * Funcionalidades:
 * - CRUD completo de contratos
 * - Cálculo automático de SLA por ticket
 * - Gestión de vencimientos de contrato
 * - Reportes de cumplimiento SLA
 */

const express = require('express');
const router = express.Router();
const db = require('../db-adapter');

// Middleware de autenticación simple (reutiliza la lógica de server-clean.js)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'gymtec_secret_key_2024';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token de acceso requerido',
            code: 'MISSING_TOKEN'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({
                error: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
}

// =====================================================
// 1. GESTIÓN DE CONTRATOS
// =====================================================

/**
 * GET /api/contracts - Listar todos los contratos
 * @requires authenticateToken
 */
router.get('/contracts', authenticateToken, (req, res) => {
    try {
        const { client_id, status, active_only } = req.query;
        
        let sql = `
            SELECT c.*, cl.name as client_name 
            FROM Contracts c
            LEFT JOIN Clients cl ON c.client_id = cl.id
            WHERE 1=1
        `;
        const params = [];
        
        if (client_id) {
            sql += ' AND c.client_id = ?';
            params.push(client_id);
        }
        
        if (status) {
            sql += ' AND c.status = ?';
            params.push(status);
        }
        
        if (active_only === 'true') {
            sql += ' AND c.status = "activo" AND c.end_date > NOW()';
        }
        
        sql += ' ORDER BY c.created_at DESC';
        
        db.all(sql, params, (err, contracts) => {
            if (err) {
                console.error('Error fetching contracts:', err);
                return res.status(500).json({ 
                    error: 'Error al obtener contratos',
                    code: 'CONTRACTS_FETCH_ERROR' 
                });
            }
            
            res.json({
                message: 'success',
                data: contracts || [],
                metadata: { 
                    total: (contracts || []).length,
                    timestamp: new Date().toISOString()
                }
            });
        });
        
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ 
            error: 'Error al obtener contratos',
            code: 'CONTRACTS_FETCH_ERROR' 
        });
    }
});

/**
 * GET /api/contracts/:id - Obtener un contrato específico
 * @requires authenticateToken
 */
router.get('/contracts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT c.*, cl.name as client_name, cl.rut as client_rut,
                   u.username as created_by_name
            FROM Contracts c
            LEFT JOIN Clients cl ON c.client_id = cl.id
            LEFT JOIN Users u ON c.created_by = u.id
            WHERE c.id = ?
        `;
        
        const contract = await db.get(sql, [id]);
        
        if (!contract) {
            return res.status(404).json({ 
                error: 'Contrato no encontrado',
                code: 'CONTRACT_NOT_FOUND' 
            });
        }
        
        res.json({
            message: 'success',
            data: contract
        });
        
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ 
            error: 'Error al obtener contrato',
            code: 'CONTRACT_FETCH_ERROR' 
        });
    }
});

/**
 * POST /api/contracts - Crear nuevo contrato
 * @requires authenticateToken
 */
router.post('/contracts', authenticateToken, async (req, res) => {
    try {
        const {
            client_id,
            contract_number,
            contract_name,
            start_date,
            end_date,
            sla_p1_hours = 4,
            sla_p2_hours = 8,
            sla_p3_hours = 24,
            sla_p4_hours = 72,
            monthly_fee = 0,
            currency = 'CLP',
            payment_terms,
            service_description,
            special_conditions,
            // Nuevos campos
            contract_value = 0,
            status = 'borrador',
            service_type = 'mantenimiento_preventivo',
            maintenance_frequency = 'mensual',
            response_time_hours = 24,
            resolution_time_hours = 72,
            services_included,
            equipment_covered,
            sla_level = 'standard'
        } = req.body;
        
        // Validaciones básicas
        if (!client_id || !contract_number || !contract_name || !start_date || !end_date) {
            return res.status(400).json({
                error: 'Faltan campos obligatorios',
                code: 'MISSING_REQUIRED_FIELDS',
                required: ['client_id', 'contract_number', 'contract_name', 'start_date', 'end_date']
            });
        }

        // Validaciones de nuevos campos obligatorios
        if (!service_type || !maintenance_frequency || !sla_level) {
            return res.status(400).json({
                error: 'Faltan especificaciones de servicio obligatorias',
                code: 'MISSING_SERVICE_SPECS',
                required: ['service_type', 'maintenance_frequency', 'sla_level']
            });
        }
        
        // Verificar que el cliente existe
        const clientExists = await db.get('SELECT id, name FROM Clients WHERE id = ?', [client_id]);
        if (!clientExists) {
            return res.status(400).json({
                error: `Cliente con ID ${client_id} no existe. Debe crear el cliente antes de crear el contrato.`,
                code: 'CLIENT_NOT_FOUND'
            });
        }
        
        // Verificar que el número de contrato no existe
        const contractExists = await db.get('SELECT id FROM Contracts WHERE contract_number = ?', [contract_number]);
        if (contractExists) {
            return res.status(400).json({
                error: 'Número de contrato ya existe',
                code: 'CONTRACT_NUMBER_EXISTS'
            });
        }

        // Validar fechas
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        
        if (startDate >= endDate) {
            return res.status(400).json({
                error: 'La fecha de fin debe ser posterior a la fecha de inicio',
                code: 'INVALID_DATE_RANGE'
            });
        }
        
        const sql = `
            INSERT INTO Contracts (
                client_id, contract_number, contract_name, start_date, end_date,
                sla_p1_hours, sla_p2_hours, sla_p3_hours, sla_p4_hours,
                monthly_fee, currency, payment_terms, service_description, special_conditions,
                contract_value, status, service_type, maintenance_frequency,
                response_time_hours, resolution_time_hours, services_included, 
                equipment_covered, sla_level, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(sql, [
            client_id, contract_number, contract_name, start_date, end_date,
            sla_p1_hours, sla_p2_hours, sla_p3_hours, sla_p4_hours,
            monthly_fee, currency, payment_terms, service_description, special_conditions,
            contract_value, status, service_type, maintenance_frequency,
            response_time_hours, resolution_time_hours, services_included,
            equipment_covered, sla_level, req.user?.id || null
        ]);
        
        // Obtener el contrato creado con información del cliente
        const newContract = await db.get(`
            SELECT c.*, cl.name as client_name, cl.email as client_email,
                   cl.company as client_company
            FROM Contracts c
            LEFT JOIN Clients cl ON c.client_id = cl.id
            WHERE c.id = ?
        `, [result.lastID]);
        
        console.log(`✅ Contrato creado: ${contract_number} para cliente ${clientExists.name}`);
        console.log(`📋 Servicios: ${service_type}, Frecuencia: ${maintenance_frequency}, SLA: ${sla_level}`);
        
        res.status(201).json({
            message: 'Contrato creado exitosamente con especificaciones de servicios y tiempos',
            data: newContract
        });
        
    } catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ 
            error: 'Error al crear contrato',
            code: 'CONTRACT_CREATE_ERROR',
            details: error.message
        });
    }
});

/**
 * PUT /api/contracts/:id - Actualizar contrato
 * @requires authenticateToken
 */
router.put('/contracts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            contract_name,
            start_date,
            end_date,
            status,
            sla_p1_hours,
            sla_p2_hours,
            sla_p3_hours,
            sla_p4_hours,
            monthly_fee,
            currency,
            payment_terms,
            service_description,
            special_conditions,
            // Nuevos campos
            contract_value,
            service_type,
            maintenance_frequency,
            response_time_hours,
            resolution_time_hours,
            services_included,
            equipment_covered,
            sla_level
        } = req.body;
        
        // Verificar que el contrato existe
        const contract = await db.get('SELECT id, client_id FROM Contracts WHERE id = ?', [id]);
        if (!contract) {
            return res.status(404).json({
                error: 'Contrato no encontrado',
                code: 'CONTRACT_NOT_FOUND'
            });
        }

        // Validar fechas si se proporcionan
        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            
            if (startDate >= endDate) {
                return res.status(400).json({
                    error: 'La fecha de fin debe ser posterior a la fecha de inicio',
                    code: 'INVALID_DATE_RANGE'
                });
            }
        }
        
        const sql = `
            UPDATE Contracts SET
                contract_name = COALESCE(?, contract_name),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                status = COALESCE(?, status),
                sla_p1_hours = COALESCE(?, sla_p1_hours),
                sla_p2_hours = COALESCE(?, sla_p2_hours),
                sla_p3_hours = COALESCE(?, sla_p3_hours),
                sla_p4_hours = COALESCE(?, sla_p4_hours),
                monthly_fee = COALESCE(?, monthly_fee),
                currency = COALESCE(?, currency),
                payment_terms = COALESCE(?, payment_terms),
                service_description = COALESCE(?, service_description),
                special_conditions = COALESCE(?, special_conditions),
                contract_value = COALESCE(?, contract_value),
                service_type = COALESCE(?, service_type),
                maintenance_frequency = COALESCE(?, maintenance_frequency),
                response_time_hours = COALESCE(?, response_time_hours),
                resolution_time_hours = COALESCE(?, resolution_time_hours),
                services_included = COALESCE(?, services_included),
                equipment_covered = COALESCE(?, equipment_covered),
                sla_level = COALESCE(?, sla_level),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await db.run(sql, [
            contract_name, start_date, end_date, status,
            sla_p1_hours, sla_p2_hours, sla_p3_hours, sla_p4_hours,
            monthly_fee, currency, payment_terms, service_description, special_conditions,
            contract_value, service_type, maintenance_frequency,
            response_time_hours, resolution_time_hours, services_included,
            equipment_covered, sla_level,
            id
        ]);
        
        // Obtener el contrato actualizado con información del cliente
        const updatedContract = await db.get(`
            SELECT c.*, cl.name as client_name, cl.email as client_email,
                   cl.company as client_company
            FROM Contracts c
            LEFT JOIN Clients cl ON c.client_id = cl.id
            WHERE c.id = ?
        `, [id]);
        
        console.log(`✅ Contrato actualizado: ${updatedContract.contract_number}`);
        
        res.json({
            message: 'Contrato actualizado exitosamente',
            data: updatedContract
        });
        
    } catch (error) {
        console.error('Error updating contract:', error);
        res.status(500).json({ 
            error: 'Error al actualizar contrato',
            code: 'CONTRACT_UPDATE_ERROR',
            details: error.message
        });
    }
});

// =====================================================
// 2. SISTEMA SLA AUTOMÁTICO
// =====================================================

/**
 * POST /api/tickets/:ticketId/calculate-sla - Calcular SLA automático para ticket
 * @requires authenticateToken
 */
router.post('/tickets/:ticketId/calculate-sla', authenticateToken, async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // Obtener información del ticket
        const ticket = await db.get(`
            SELECT t.*, c.sla_p1_hours, c.sla_p2_hours, c.sla_p3_hours, c.sla_p4_hours
            FROM Tickets t
            LEFT JOIN Contracts c ON t.contract_id = c.id
            WHERE t.id = ?
        `, [ticketId]);
        
        if (!ticket) {
            return res.status(404).json({
                error: 'Ticket no encontrado',
                code: 'TICKET_NOT_FOUND'
            });
        }
        
        // Determinar horas SLA según prioridad
        let slaHours;
        switch (ticket.priority) {
            case 'Urgente':
                slaHours = ticket.sla_p1_hours || 4;
                break;
            case 'Alta':
                slaHours = ticket.sla_p2_hours || 8;
                break;
            case 'Media':
                slaHours = ticket.sla_p3_hours || 24;
                break;
            case 'Baja':
                slaHours = ticket.sla_p4_hours || 72;
                break;
            default:
                slaHours = 24; // Por defecto
        }
        
        // Calcular deadline SLA
        const createdAt = new Date(ticket.created_at);
        const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
        
        // Determinar estado SLA
        const now = new Date();
        const timeRemaining = slaDeadline.getTime() - now.getTime();
        const percentageUsed = ((now.getTime() - createdAt.getTime()) / (slaDeadline.getTime() - createdAt.getTime())) * 100;
        
        let slaStatus;
        if (now > slaDeadline) {
            slaStatus = 'vencido';
        } else if (percentageUsed >= 75) {
            slaStatus = 'en_riesgo';
        } else {
            slaStatus = 'cumplido';
        }
        
        // Actualizar ticket con información SLA
        await db.run(`
            UPDATE Tickets SET 
                sla_deadline = ?,
                sla_status = ?
            WHERE id = ?
        `, [slaDeadline.toISOString(), slaStatus, ticketId]);
        
        res.json({
            message: 'SLA calculado exitosamente',
            data: {
                ticket_id: ticketId,
                sla_hours: slaHours,
                sla_deadline: slaDeadline.toISOString(),
                sla_status: slaStatus,
                time_remaining_hours: Math.max(0, timeRemaining / (1000 * 60 * 60)),
                percentage_used: Math.min(100, percentageUsed)
            }
        });
        
    } catch (error) {
        console.error('Error calculating SLA:', error);
        res.status(500).json({ 
            error: 'Error al calcular SLA',
            code: 'SLA_CALCULATION_ERROR' 
        });
    }
});

/**
 * GET /api/sla/dashboard - Dashboard de SLA
 * @requires authenticateToken
 */
router.get('/sla/dashboard', authenticateToken, async (req, res) => {
    try {
        // Tickets por estado SLA
        const slaStats = await db.all(`
            SELECT 
                sla_status,
                COUNT(*) as count
            FROM Tickets 
            WHERE status NOT IN ('Cerrado', 'Resuelto')
            GROUP BY sla_status
        `);
        
        // Tickets vencidos
        const expiredTickets = await db.all(`
            SELECT t.id, t.title, t.priority, t.sla_deadline, c.name as client_name
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            WHERE t.sla_status = 'vencido' 
            AND t.status NOT IN ('Cerrado', 'Resuelto')
            ORDER BY t.sla_deadline ASC
            LIMIT 10
        `);
        
        // Tickets en riesgo
        const riskTickets = await db.all(`
            SELECT t.id, t.title, t.priority, t.sla_deadline, c.name as client_name
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            WHERE t.sla_status = 'en_riesgo' 
            AND t.status NOT IN ('Cerrado', 'Resuelto')
            ORDER BY t.sla_deadline ASC
            LIMIT 10
        `);
        
        // Promedio de cumplimiento por cliente
        const clientSlaPerformance = await db.all(`
            SELECT 
                c.name as client_name,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN t.sla_status = 'cumplido' THEN 1 ELSE 0 END) as compliant_tickets,
                ROUND((SUM(CASE WHEN t.sla_status = 'cumplido' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as compliance_percentage
            FROM Tickets t
            LEFT JOIN Clients c ON t.client_id = c.id
            WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY c.id, c.name
            HAVING total_tickets > 0
            ORDER BY compliance_percentage DESC
        `);
        
        res.json({
            message: 'success',
            data: {
                sla_statistics: slaStats,
                expired_tickets: expiredTickets,
                risk_tickets: riskTickets,
                client_performance: clientSlaPerformance,
                generated_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error generating SLA dashboard:', error);
        res.status(500).json({ 
            error: 'Error al generar dashboard SLA',
            code: 'SLA_DASHBOARD_ERROR' 
        });
    }
});

module.exports = router;
