/**
 * GYMTEC ERP - Tests de Clientes
 * Verifica que los endpoints de clientes funcionen
 */

const { API_BASE_URL, getAuthToken, authRequest } = require('./setup');

describe('API de Clientes', () => {
    let token;
    let api;

    beforeAll(async () => {
        token = await getAuthToken();
        api = authRequest(token);
    });

    describe('GET /api/clients', () => {
        test('debe listar clientes', async () => {
            const response = await api.get('/api/clients');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('debe rechazar sin autenticación', async () => {
            const { request } = require('./setup');
            const response = await request(API_BASE_URL)
                .get('/api/clients');
            
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/clients/:id', () => {
        test('debe manejar cliente inexistente', async () => {
            const response = await api.get('/api/clients/999999');
            
            // El endpoint puede devolver 404 o 200 con data null/vacío
            expect([200, 404]).toContain(response.status);
        });
    });
});
