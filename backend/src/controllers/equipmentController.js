const equipmentService = require('../services/equipmentService');

const handleResponse = (res, data, statusCode = 200) => res.status(statusCode).json({ success: true, data });
const handleError = (res, error) => res.status(error.statusCode || 500).json({ success: false, message: error.message });

class EquipmentController {
    async getAll(req, res) {
        try {
            const equipment = await equipmentService.getAll(req.query);
            handleResponse(res, equipment);
        } catch (error) {
            handleError(res, error);
        }
    }

    async getById(req, res) {
        try {
            const equipment = await equipmentService.getById(req.params.id);
            if (!equipment) {
                return res.status(404).json({ success: false, message: 'Equipment not found' });
            }
            handleResponse(res, equipment);
        } catch (error) {
            handleError(res, error);
        }
    }

    async create(req, res) {
        try {
            const newEquipment = await equipmentService.create(req.body);
            handleResponse(res, newEquipment, 201);
        } catch (error) {
            handleError(res, error);
        }
    }

    async update(req, res) {
        try {
            const updatedEquipment = await equipmentService.update(req.params.id, req.body);
            if (!updatedEquipment) {
                return res.status(404).json({ success: false, message: 'Equipment not found' });
            }
            handleResponse(res, updatedEquipment);
        } catch (error) {
            handleError(res, error);
        }
    }

    async remove(req, res) {
        try {
            const changes = await equipmentService.remove(req.params.id);
            if (changes === 0) {
                return res.status(404).json({ success: false, message: 'Equipment not found' });
            }
            res.status(204).send();
        } catch (error) {
            handleError(res, error);
        }
    }

    async getEquipmentNotes(req, res) {
        try {
            const notes = await equipmentService.getNotesByEquipmentId(req.params.id);
            handleResponse(res, notes);
        } catch (error) {
            handleError(res, error);
        }
    }

    async getEquipmentTickets(req, res) {
        try {
            const tickets = await equipmentService.getTicketsByEquipmentId(req.params.id);
            handleResponse(res, tickets);
        } catch (error) {
            handleError(res, error);
        }
    }

    async getEquipmentPhotos(req, res) {
        try {
            const photos = await equipmentService.getPhotosByEquipmentId(req.params.id);
            handleResponse(res, photos);
        } catch (error) {
            handleError(res, error);
        }
    }

    async addEquipmentPhoto(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No photo file uploaded.' });
            }
            const photoMetadata = await equipmentService.addPhotoToEquipment(req.params.id, req.file);
            handleResponse(res, photoMetadata, 201);
        } catch (error) {
            handleError(res, error);
        }
    }
}

module.exports = new EquipmentController();