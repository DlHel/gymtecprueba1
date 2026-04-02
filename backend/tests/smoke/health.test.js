const { request } = require('../setup');

describe('Smoke /api/health', () => {
    test('responde con estado operativo del backend', async () => {
        const response = await request.get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            status: 'ok',
            service: 'gymtec-backend'
        });
        expect(response.body).toHaveProperty('timestamp');
    });
});
