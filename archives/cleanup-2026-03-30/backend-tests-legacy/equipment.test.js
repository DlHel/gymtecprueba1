/**
 * GYMTEC ERP - Tests de Equipos
 * Verifica que los endpoints de equipos funcionen
 */

const { API_BASE_URL, getAuthToken, authRequest } = require('./setup');

describe('API de Equipos', () => {
    let token;
    let api;

    beforeAll(async () => {
        token = await getAuthToken();
        api = authRequest(token);
    });

    describe('GET /api/equipment', () => {
        test('debe listar equipos', async () => {
            const response = await api.get('/api/equipment');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('debe rechazar sin autenticación', async () => {
            const { request } = require('./setup');
            const response = await request(API_BASE_URL)
                .get('/api/equipment');
            
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/equipment/:id', () => {
        test('debe devolver 404 para equipo inexistente', async () => {
            const response = await api.get('/api/equipment/999999');
            
            expect(response.status).toBe(404);
        });
    });
});
