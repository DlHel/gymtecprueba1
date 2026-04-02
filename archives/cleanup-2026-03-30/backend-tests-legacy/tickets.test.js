/**
 * GYMTEC ERP - Tests de Tickets
 * Verifica que los endpoints de tickets funcionen
 */

const { API_BASE_URL, getAuthToken, authRequest } = require('./setup');

describe('API de Tickets', () => {
    let token;
    let api;

    beforeAll(async () => {
        token = await getAuthToken();
        api = authRequest(token);
    });

    describe('GET /api/tickets', () => {
        test('debe listar tickets', async () => {
            const response = await api.get('/api/tickets');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /api/tickets/:id', () => {
        test('debe devolver 404 para ticket inexistente', async () => {
            const response = await api.get('/api/tickets/999999');
            
            expect(response.status).toBe(404);
        });
    });
});
