const { request } = require('../setup');

describe('Smoke auth guards', () => {
    test('rechaza login sin credenciales', async () => {
        const response = await request.post('/api/auth/login').send({});

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');
    });

    test.each([
        '/api/clients',
        '/api/tickets',
        '/api/inventory',
        '/api/purchase-orders',
        '/api/notifications',
        '/api/checklist/templates',
        '/api/tickets/1/workflow/status'
    ])('protege %s sin token', async (endpoint) => {
        const response = await request.get(endpoint);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
    });
});
