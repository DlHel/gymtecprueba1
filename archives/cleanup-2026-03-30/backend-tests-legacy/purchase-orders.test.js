/**
 * GYMTEC ERP - Tests de Órdenes de Compra
 * Verifica que los endpoints de purchase orders funcionen
 */

const { API_BASE_URL, getAuthToken, authRequest } = require('./setup');

describe('API de Órdenes de Compra', () => {
    let token;
    let api;

    beforeAll(async () => {
        token = await getAuthToken();
        api = authRequest(token);
    });

    describe('GET /api/purchase-orders', () => {
        test('debe listar órdenes de compra', async () => {
            const response = await api.get('/api/purchase-orders');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'success');
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('debe incluir estadísticas', async () => {
            const response = await api.get('/api/purchase-orders');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('stats');
            expect(response.body.stats).toHaveProperty('total_orders');
        });

        test('debe rechazar sin autenticación', async () => {
            const { request } = require('./setup');
            const response = await request(API_BASE_URL)
                .get('/api/purchase-orders');
            
            expect(response.status).toBe(401);
        });
    });
});
