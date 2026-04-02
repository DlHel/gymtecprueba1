/**
 * GYMTEC ERP - Tests de Inventario
 * Verifica que los endpoints de inventario funcionen correctamente
 */

const { API_BASE_URL, getAuthToken, authRequest } = require('./setup');

describe('API de Inventario', () => {
    let token;
    let api;

    beforeAll(async () => {
        token = await getAuthToken();
        api = authRequest(token);
    });

    describe('GET /api/inventory', () => {
        test('debe listar items de inventario', async () => {
            const response = await api.get('/api/inventory');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'success');
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('debe incluir paginación', async () => {
            const response = await api.get('/api/inventory');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('pagination');
        });

        test('debe rechazar request sin autenticación', async () => {
            const { request } = require('./setup');
            const response = await request(API_BASE_URL)
                .get('/api/inventory');
            
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/inventory/movements', () => {
        test('debe listar movimientos de inventario', async () => {
            const response = await api.get('/api/inventory/movements');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'success');
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('debe incluir resumen de movimientos', async () => {
            const response = await api.get('/api/inventory/movements');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('summary');
        });
    });
});
