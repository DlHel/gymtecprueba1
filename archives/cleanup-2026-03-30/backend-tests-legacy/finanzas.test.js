/**
 * Tests para endpoints de Finanzas
 * Cubre: Cotizaciones, Facturas, Gastos, Nómina
 */

const { getAuthToken, authRequest, request, API_BASE_URL } = require('./setup');

describe('API de Finanzas', () => {
    let authToken;
    let auth;

    beforeAll(async () => {
        authToken = await getAuthToken();
        auth = authRequest(authToken);
    });

    // ========================================
    // COTIZACIONES (Quotes)
    // ========================================
    describe('GET /api/quotes', () => {
        it('debe listar cotizaciones', async () => {
            const response = await auth.get('/api/quotes');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('debe requerir autenticación', async () => {
            const response = await request(API_BASE_URL).get('/api/quotes');
            expect(response.status).toBe(401);
        });
    });

    // ========================================
    // FACTURAS (Invoices)
    // ========================================
    describe('GET /api/invoices', () => {
        it('debe listar facturas', async () => {
            const response = await auth.get('/api/invoices');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('debe requerir autenticación', async () => {
            const response = await request(API_BASE_URL).get('/api/invoices');
            expect(response.status).toBe(401);
        });
    });

    // ========================================
    // GASTOS (Expenses)
    // ========================================
    describe('GET /api/expenses', () => {
        it('debe listar gastos', async () => {
            const response = await auth.get('/api/expenses');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('debe requerir autenticación', async () => {
            const response = await request(API_BASE_URL).get('/api/expenses');
            expect(response.status).toBe(401);
        });
    });

    // ========================================
    // NÓMINA (Payroll)
    // ========================================
    describe('GET /api/payroll/periods', () => {
        it('debe listar períodos de nómina', async () => {
            const response = await auth.get('/api/payroll/periods');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('debe requerir autenticación', async () => {
            const response = await request(API_BASE_URL).get('/api/payroll/periods');
            expect(response.status).toBe(401);
        });
    });

    // ========================================
    // TASAS DE CAMBIO (Currency Rates)
    // ========================================
    describe('GET /api/currency/rates', () => {
        it('debe obtener tasas de cambio', async () => {
            const response = await auth.get('/api/currency/rates');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            // Debe tener valores de UTM y UF
            expect(response.body.data).toHaveProperty('utm_value');
            expect(response.body.data).toHaveProperty('uf_value');
        });
    });
});
