const db = require('../db-adapter');

class EquipmentService {
    async getAll(queryParams) {
        const { location_id } = queryParams;
        let sql = "SELECT * FROM Equipment";
        const params = [];

        if (location_id) {
            sql += " WHERE location_id = ?";
            params.push(location_id);
        }

        try {
            const equipment = await db.all(sql, params);
            return equipment;
        } catch (error) {
            console.error("Error fetching equipment:", error);
            throw new Error("Failed to retrieve equipment.");
        }
    }

    async getById(id) {
        const sql = "SELECT * FROM Equipment WHERE id = ?";
        try {
            const equipment = await db.get(sql, [id]);
            return equipment;
        } catch (error) {
            console.error(`Error fetching equipment with id ${id}:`, error);
            throw new Error("Failed to retrieve equipment.");
        }
    }

    async create(equipmentData) {
        const {
            name, type, brand, model, serial_number, 
            custom_id, location_id, acquisition_date, 
            last_maintenance_date, notes
        } = equipmentData;

        const sql = `INSERT INTO Equipment (name, type, brand, model, serial_number, custom_id, location_id, acquisition_date, last_maintenance_date, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
            name, type, brand, model, serial_number, 
            custom_id, location_id, acquisition_date, 
            last_maintenance_date, notes
        ];

        try {
            const result = await db.run(sql, params);
            return await this.getById(result.lastID);
        } catch (error) {
            console.error("Error creating equipment:", error);
            if (error.code === 'SQLITE_CONSTRAINT') { // Adjust for MySQL
                throw new Error("Failed to create equipment due to a conflict.");
            }
            throw new Error("Failed to create equipment.");
        }
    }

    async update(id, equipmentData) {
        const fields = [];
        const params = [];

        Object.entries(equipmentData).forEach(([key, value]) => {
            const validColumns = ['name', 'type', 'brand', 'model', 'serial_number', 'custom_id', 'location_id', 'acquisition_date', 'last_maintenance_date', 'notes'];
            if (validColumns.includes(key)) {
                fields.push(`${key} = ?`);
                params.push(value);
            }
        });

        if (fields.length === 0) {
            throw new Error("No valid fields provided for update.");
        }

        params.push(id);
        const sql = `UPDATE Equipment SET ${fields.join(', ')} WHERE id = ?`;

        try {
            const result = await db.run(sql, params);
            if (result.changes === 0) {
                return null;
            }
            return await this.getById(id);
        } catch (error) {
            console.error(`Error updating equipment with id ${id}:`, error);
            throw new Error("Failed to update equipment.");
        }
    }

    async remove(id) {
        const sql = "DELETE FROM Equipment WHERE id = ?";
        try {
            const result = await db.run(sql, [id]);
            return result.changes;
        } catch (error) {
            console.error(`Error deleting equipment with id ${id}:`, error);
            throw new Error("Failed to delete equipment.");
        }
    }

    async getNotesByEquipmentId(equipmentId) {
        const sql = "SELECT * FROM EquipmentNotes WHERE equipment_id = ? ORDER BY created_at DESC";
        try {
            const notes = await db.all(sql, [equipmentId]);
            return notes;
        } catch (error) {
            console.error(`Error fetching notes for equipment id ${equipmentId}:`, error);
            throw new Error("Failed to retrieve equipment notes.");
        }
    }

    async getTicketsByEquipmentId(equipmentId) {
        const sql = "SELECT * FROM Tickets WHERE equipment_id = ? ORDER BY created_at DESC";
        try {
            const tickets = await db.all(sql, [equipmentId]);
            return tickets;
        } catch (error) {
            console.error(`Error fetching tickets for equipment id ${equipmentId}:`, error);
            throw new Error("Failed to retrieve equipment tickets.");
        }
    }

    async getPhotosByEquipmentId(equipmentId) {
        const sql = "SELECT id, equipment_id, file_name, mime_type, file_size, created_at FROM EquipmentPhotos WHERE equipment_id = ? ORDER BY created_at DESC";
        try {
            const photos = await db.all(sql, [equipmentId]);
            return photos;
        } catch (error) {
            console.error(`Error fetching photos for equipment id ${equipmentId}:`, error);
            throw new Error("Failed to retrieve equipment photos.");
        }
    }

    async addPhotoToEquipment(equipmentId, file) {
        const { originalname, mimetype, size, buffer } = file;
        const photoData = buffer.toString('base64');

        const sql = `INSERT INTO EquipmentPhotos (equipment_id, photo_data, file_name, mime_type, file_size)
                     VALUES (?, ?, ?, ?, ?)`;
        
        const params = [equipmentId, photoData, originalname, mimetype, size];

        try {
            const result = await db.run(sql, params);
            return { 
                id: result.lastID, 
                equipment_id: equipmentId, 
                file_name: originalname, 
                mime_type: mimetype, 
                file_size: size 
            };
        } catch (error) {
            console.error(`Error adding photo to equipment id ${equipmentId}:`, error);
            throw new Error("Failed to add photo.");
        }
    }
}

module.exports = new EquipmentService();