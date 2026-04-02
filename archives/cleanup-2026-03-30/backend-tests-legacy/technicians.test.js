/**
 * GYMTEC ERP - Tests de Técnicos (Inventario)
 * Verifica que el endpoint de inventario de técnicos funcione
 */

const { API_BASE_URL, getAuthToken, authRequest } = require('./setup');

describe('API de Inventario Técnicos', () => {
    let token;
    let api;

    beforeAll(async () => {
        token = await getAuthToken();
        api = authRequest(token);
    });

    describe('GET /api/inventory/technicians', () => {
        test('debe listar inventario de técnicos', async () => {
            const response = await api.get('/api/inventory/technicians');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'success');
            expect(response.body).toHaveProperty('data');
        });
    });
});
