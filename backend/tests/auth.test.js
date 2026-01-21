/**
 * GYMTEC ERP - Tests de Autenticación
 * Verifica que el sistema de login funcione correctamente
 */

const { API_BASE_URL, TEST_USER, request } = require('./setup');

describe('API de Autenticación', () => {
    
    describe('POST /api/auth/login', () => {
        
        test('debe autenticar usuario válido y devolver token', async () => {
            const response = await request(API_BASE_URL)
                .post('/api/auth/login')
                .send(TEST_USER);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('username', TEST_USER.username);
        });

        test('debe rechazar credenciales inválidas', async () => {
            const response = await request(API_BASE_URL)
                .post('/api/auth/login')
                .send({ username: 'invalid', password: 'wrong' });
            
            expect(response.status).toBe(401);
        });

        test('debe rechazar request sin credenciales', async () => {
            const response = await request(API_BASE_URL)
                .post('/api/auth/login')
                .send({});
            
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });
});
