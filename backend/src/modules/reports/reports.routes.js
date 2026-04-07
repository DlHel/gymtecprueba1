const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const router = express.Router();
const db = require('../../db-adapter');
const {
    authenticateToken,
    getTokenFromRequest,
    verifyAccessToken
} = require('../../core/middleware/auth.middleware');
const { uploadReports, reportsDirectory } = require('../../core/http/uploads');
const { matchesAnyRole } = require('../../core/auth/identity');

const TECHNICAL_REPORTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS InformesTecnicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    technician_id INT NULL,
    filename VARCHAR(255) NULL,
    notas_adicionales TEXT NULL,
    client_email VARCHAR(255) NULL,
    report_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_to_client TINYINT(1) NOT NULL DEFAULT 0,
    sent_at DATETIME NULL,
    INDEX idx_informes_ticket_id (ticket_id),
    INDEX idx_informes_technician_id (technician_id),
    INDEX idx_informes_report_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

function isTechnicalReportAdmin(user) {
    return matchesAnyRole(user && user.role, ['Admin', 'Manager', 'Supervisor']);
}

function canAccessTechnicalReport(user, report) {
    if (!user || !report) {
        return false;
    }

    if (isTechnicalReportAdmin(user)) {
        return true;
    }

    return Number(report.technician_id) === Number(user.id);
}

async function ensureTechnicalReportsTable() {
    await db.runAsync(TECHNICAL_REPORTS_TABLE_SQL);
}

async function getTechnicalReportById(informeId) {
    const sql = `
        SELECT
            i.*,
            t.title AS ticket_title,
            t.client_id,
            c.name AS client_name,
            u.username AS generated_by_name
        FROM InformesTecnicos i
        LEFT JOIN Tickets t ON i.ticket_id = t.id
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Users u ON i.technician_id = u.id
        WHERE i.id = ?
    `;

    return db.getAsync(sql, [informeId]);
}

async function authorizeTechnicalReportWrite(req, res, next) {
    try {
        await ensureTechnicalReportsTable();

        const report = await getTechnicalReportById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'error', error: 'Informe no encontrado' });
        }

        if (!canAccessTechnicalReport(req.user, report)) {
            return res.status(403).json({ message: 'error', error: 'No tienes permisos para actualizar este informe' });
        }

        req.technicalReport = report;
        return next();
    } catch (error) {
        console.error('❌ Error autorizando acceso al informe:', error);
        return res.status(500).json({ message: 'error', error: error.message });
    }
}

router.get('/tickets/:id/informe-data', authenticateToken, async (req, res) => {
    const ticketId = req.params.id;

    try {
        const [ticket, comments, photos] = await Promise.all([
            db.getAsync(
                `SELECT t.*, c.name as client_name, c.rut as client_rut, c.contact_name as client_contact, c.phone as client_phone,
                        l.name as location_name, l.address as location_address,
                        em.name as equipment_model, em.brand as equipment_brand, e.serial_number, e.type as equipment_type,
                        u.username as technician_name
                 FROM Tickets t
                 LEFT JOIN Clients c ON t.client_id = c.id
                 LEFT JOIN Locations l ON t.location_id = l.id
                 LEFT JOIN Equipment e ON t.equipment_id = e.id
                 LEFT JOIN EquipmentModels em ON e.model_id = em.id
                 LEFT JOIN Users u ON t.assigned_technician_id = u.id
                 WHERE t.id = ?`,
                [ticketId]
            ),
            db.allAsync('SELECT * FROM TicketNotes WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId]),
            db.allAsync('SELECT id, photo_data AS photo_base64, created_at AS uploaded_at FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId])
        ]);

        if (!ticket) {
            return res.status(404).json({ message: 'error', error: 'Ticket no encontrado' });
        }

        return res.json({ message: 'success', data: { ticket, comments, photos } });
    } catch (error) {
        console.error('❌ Error obteniendo datos para informe:', error);
        return res.status(500).json({ message: 'error', error: error.message });
    }
});

router.get('/tickets/:id/generate-pdf', async (req, res) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    try {
        req.user = verifyAccessToken(token);
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    const ticketId = req.params.id;

    try {
        const [ticket, comments, photos] = await Promise.all([
            db.getAsync(
                `SELECT t.*, c.name as client_name, c.rut as client_rut, c.contact_name as client_contact, c.phone as client_phone,
                        l.name as location_name, l.address as location_address,
                        em.name as equipment_model, em.brand as equipment_brand, e.serial_number, e.type as equipment_type,
                        u.username as technician_name
                 FROM Tickets t
                 LEFT JOIN Clients c ON t.client_id = c.id
                 LEFT JOIN Locations l ON t.location_id = l.id
                 LEFT JOIN Equipment e ON t.equipment_id = e.id
                 LEFT JOIN EquipmentModels em ON e.model_id = em.id
                 LEFT JOIN Users u ON t.assigned_technician_id = u.id
                 WHERE t.id = ?`,
                [ticketId]
            ),
            db.allAsync('SELECT * FROM TicketNotes WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId]),
            db.allAsync('SELECT id, photo_data, file_name, mime_type, description, created_at FROM TicketPhotos WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId])
        ]);

        if (!ticket) {
            return res.status(404).json({ message: 'error', error: 'Ticket no encontrado' });
        }

        const filename = `Informe_Tecnico_${ticketId}_${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 50, bufferPages: true });
        doc.pipe(res);

        doc.fontSize(20).text('GYMTEC - Informe Técnico', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Ticket: #${ticketId}`);
        doc.text(`Cliente: ${ticket.client_name || 'N/A'}`);
        doc.text(`Contacto: ${ticket.client_contact || 'N/A'}`);
        doc.text(`Ubicación: ${ticket.location_name || 'N/A'}`);
        doc.text(`Equipo: ${ticket.equipment_model || 'N/A'} ${ticket.equipment_brand || ''}`);
        doc.text(`Serie: ${ticket.serial_number || 'N/A'}`);
        doc.text(`Estado: ${ticket.status || 'N/A'}`);
        doc.text(`Técnico: ${ticket.technician_name || 'N/A'}`);
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Descripción del problema');
        doc.font('Helvetica').text(ticket.description || 'Sin descripción');

        if ((comments || []).length > 0) {
            doc.moveDown();
            doc.font('Helvetica-Bold').text('Trabajo realizado');
            doc.font('Helvetica');

            comments.forEach((comment, index) => {
                doc.text(`${index + 1}. ${(comment.author || comment.author_name || 'Técnico')} - ${comment.note || comment.comment || comment.comment_text || ''}`);
            });
        }

        if ((photos || []).length > 0) {
            for (const [index, photo] of photos.entries()) {
                try {
                    let base64Data = photo.photo_data || '';
                    if (base64Data.includes(',')) {
                        base64Data = base64Data.split(',')[1];
                    }

                    if (!base64Data) {
                        continue;
                    }

                    const imgBuffer = Buffer.from(base64Data, 'base64');
                    doc.addPage();
                    doc.font('Helvetica-Bold').fontSize(14).text(`Evidencia fotográfica ${index + 1}`);
                    doc.moveDown(0.5);
                    doc.image(imgBuffer, {
                        fit: [500, 650],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (error) {
                    console.warn(`⚠️ No fue posible renderizar una foto del ticket ${ticketId}:`, error.message);
                }
            }
        }

        doc.end();
        return undefined;
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        if (!res.headersSent) {
            return res.status(500).json({ message: 'error', error: error.message });
        }

        return undefined;
    }
});

router.post('/informes', authenticateToken, async (req, res) => {
    try {
        await ensureTechnicalReportsTable();

        const { ticket_id, filename, notas_adicionales, client_email } = req.body;
        const result = await db.runAsync(
            `
                INSERT INTO InformesTecnicos (
                    ticket_id,
                    technician_id,
                    filename,
                    notas_adicionales,
                    client_email
                ) VALUES (?, ?, ?, ?, ?)
            `,
            [
                ticket_id,
                req.user?.id || null,
                filename || null,
                notas_adicionales || null,
                client_email || null
            ]
        );

        return res.json({
            message: 'success',
            data: { id: result.lastID, ticket_id, filename }
        });
    } catch (error) {
        return res.status(500).json({ message: 'error', error: error.message });
    }
});

router.get('/informes', authenticateToken, async (req, res) => {
    try {
        await ensureTechnicalReportsTable();

        const { ticket_id, date_from, date_to } = req.query;
        let sql = `
            SELECT i.*, t.title as ticket_title, c.name as client_name, u.username as generated_by_name
            FROM InformesTecnicos i
            LEFT JOIN Tickets t ON i.ticket_id = t.id
            LEFT JOIN Clients c ON t.client_id = c.id
            LEFT JOIN Users u ON i.technician_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (ticket_id) {
            sql += ' AND i.ticket_id = ?';
            params.push(ticket_id);
        }
        if (date_from) {
            sql += ' AND i.report_date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            sql += ' AND i.report_date <= ?';
            params.push(date_to);
        }
        if (!isTechnicalReportAdmin(req.user)) {
            sql += ' AND i.technician_id = ?';
            params.push(req.user.id);
        }
        sql += ' ORDER BY i.report_date DESC';

        const rows = await db.allAsync(sql, params);
        return res.json({ message: 'success', data: rows || [] });
    } catch (error) {
        return res.status(500).json({ message: 'error', error: error.message });
    }
});

router.get('/informes/:id', authenticateToken, async (req, res) => {
    try {
        await ensureTechnicalReportsTable();
        const row = await getTechnicalReportById(req.params.id);

        if (!row) {
            return res.status(404).json({ message: 'error', error: 'Informe no encontrado' });
        }

        if (!canAccessTechnicalReport(req.user, row)) {
            return res.status(403).json({ message: 'error', error: 'No tienes permisos para ver este informe' });
        }

        return res.json({ message: 'success', data: row });
    } catch (error) {
        return res.status(500).json({ message: 'error', error: error.message });
    }
});

router.get('/informes/:id/pdf', authenticateToken, async (req, res) => {
    try {
        await ensureTechnicalReportsTable();

        const report = await getTechnicalReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'error', error: 'Informe no encontrado' });
        }

        if (!canAccessTechnicalReport(req.user, report)) {
            return res.status(403).json({ message: 'error', error: 'No tienes permisos para descargar este informe' });
        }

        if (!report.filename) {
            return res.status(404).json({ message: 'error', error: 'El informe no tiene PDF almacenado' });
        }

        const pdfPath = path.join(reportsDirectory, path.basename(report.filename));
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ message: 'error', error: 'Archivo PDF no encontrado' });
        }

        return res.download(pdfPath, `Informe_Tecnico_${report.ticket_id}.pdf`);
    } catch (error) {
        console.error('❌ Error descargando PDF de informe:', error);
        return res.status(500).json({ message: 'error', error: error.message });
    }
});

router.post('/informes/:id/pdf', authenticateToken, authorizeTechnicalReportWrite, uploadReports.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'error', error: 'No se subió ningún archivo PDF' });
        }

        await db.runAsync('UPDATE InformesTecnicos SET filename = ? WHERE id = ?', [req.file.filename, req.params.id]);

        return res.json({
            message: 'success',
            data: {
                id: req.params.id,
                filename: req.file.filename,
                download_url: `/api/informes/${req.params.id}/pdf`
            }
        });
    } catch (error) {
        console.error('❌ Error actualizando informe con PDF:', error);
        return res.status(500).json({ message: 'error', error: error.message });
    }
});

router.patch('/informes/:id/enviar', authenticateToken, async (req, res) => {
    const { client_email } = req.body;

    if (!client_email) {
        return res.status(400).json({ message: 'error', error: 'Email del cliente es requerido' });
    }

    try {
        await ensureTechnicalReportsTable();

        const report = await getTechnicalReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'error', error: 'Informe no encontrado' });
        }

        if (!canAccessTechnicalReport(req.user, report)) {
            return res.status(403).json({ message: 'error', error: 'No tienes permisos para enviar este informe' });
        }

        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            await db.runAsync(
                'UPDATE InformesTecnicos SET sent_to_client = TRUE, sent_at = CURRENT_TIMESTAMP, client_email = ? WHERE id = ?',
                [client_email, req.params.id]
            );

            return res.json({
                message: 'success',
                warning: 'SMTP no configurado, envío simulado',
                data: { id: req.params.id, sent: true }
            });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const pdfPath = report.filename ? path.join(reportsDirectory, path.basename(report.filename)) : null;
        const attachments = [];

        if (pdfPath && fs.existsSync(pdfPath)) {
            attachments.push({
                filename: `Informe_Tecnico_${report.ticket_id}.pdf`,
                path: pdfPath
            });
        }

        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"GymTec ERP" <noreply@gymtecerp.com>',
            to: client_email,
            subject: `Informe Técnico - Ticket #${report.ticket_id} - ${report.client_name || 'Cliente'}`,
            text: `Estimado cliente,\n\nAdjunto encontrará el informe técnico correspondiente al servicio realizado (Ticket #${report.ticket_id}).\n\nAtentamente,\nEquipo GymTec`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Informe Técnico de Servicio</h2>
                    <p>Estimado cliente,</p>
                    <p>Adjunto encontrará el informe técnico detallado correspondiente al servicio realizado.</p>
                    <ul>
                        <li><strong>Ticket:</strong> #${report.ticket_id}</li>
                        <li><strong>Título:</strong> ${report.ticket_title || 'Sin título'}</li>
                    </ul>
                    <p>Atentamente,<br><strong>Equipo GymTec</strong></p>
                </div>
            `,
            attachments
        });

        await db.runAsync(
            'UPDATE InformesTecnicos SET sent_to_client = TRUE, sent_at = CURRENT_TIMESTAMP, client_email = ? WHERE id = ?',
            [client_email, req.params.id]
        );

        return res.json({ message: 'success', data: { id: req.params.id, sent: true } });
    } catch (error) {
        console.error('❌ Error enviando informe por correo:', error);
        return res.status(500).json({ message: 'error', error: `Error al enviar correo: ${error.message}` });
    }
});

module.exports = router;
