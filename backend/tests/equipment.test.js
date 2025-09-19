const request = require('supertest');
const app = require('../src/server-modular');
const jwt = require('jsonwebtoken');

// Mock a token for authenticated routes
const generateTestToken = (userId = 1, role = 'Admin') => {
    const payload = { id: userId, role: role };
    return jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkeyforlocaldev', { expiresIn: '1h' });
};

describe('Equipment API', () => {
    let token;
    let createdEquipmentId;

    beforeAll(() => {
        token = generateTestToken();
    });

    it('should create a new equipment', async () => {
        const res = await request(app)
            .post('/api/equipment')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Test Treadmill',
                type: 'Cardio',
                brand: 'TestBrand',
                model: 'T-1000',
                serial_number: `SN-${Date.now()}`,
                custom_id: null,
                location_id: 1, // Assuming a location with id 1 exists
                acquisition_date: '2023-01-01',
                last_maintenance_date: null,
                notes: null
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        createdEquipmentId = res.body.data.id;
    });

    it('should fetch a specific equipment by id', async () => {
        const res = await request(app)
            .get(`/api/equipment/${createdEquipmentId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(createdEquipmentId);
    });

    it('should fetch all equipment', async () => {
        const res = await request(app)
            .get('/api/equipment')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should update an equipment', async () => {
        const res = await request(app)
            .put(`/api/equipment/${createdEquipmentId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Updated Test Treadmill'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Updated Test Treadmill');
    });

    it('should delete an equipment', async () => {
        const res = await request(app)
            .delete(`/api/equipment/${createdEquipmentId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(204);
    });

    it('should return 404 when trying to fetch deleted equipment', async () => {
        const res = await request(app)
            .get(`/api/equipment/${createdEquipmentId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(404);
    });
});