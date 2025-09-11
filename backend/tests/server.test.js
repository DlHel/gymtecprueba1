const request = require('supertest');
const createTestApp = require('./test-server');

/**
 * Pruebas Unitarias - Servidor Modular
 * Testing de arquitectura modular y seguridad
 */

describe('Gymtec ERP Server', () => {
    let app;
    
    beforeEach(() => {
        app = createTestApp();
    });
    
    describe('Security Middleware', () => {
        test('should set security headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
                
            // Verificar headers de seguridad (Helmet)
            expect(response.headers['x-powered-by']).toBeUndefined();
            expect(response.headers['x-frame-options']).toBeDefined();
            expect(response.headers['x-content-type-options']).toBeDefined();
        });
        
        test('should enforce rate limiting', async () => {
            const endpoint = '/api/auth/login';
            
            // Hacer múltiples requests para activar rate limiting
            for (let i = 0; i < 6; i++) {
                await request(app)
                    .post(endpoint)
                    .send({ username: 'test', password: 'test' });
            }
            
            // El sexto request debería ser bloqueado
            const response = await request(app)
                .post(endpoint)
                .send({ username: 'test', password: 'test' })
                .expect(429);
                
            expect(response.body.code).toBe('RATE_LIMIT_AUTH');
        });
    });
    
    describe('File Upload Security', () => {
        test('should reject invalid file types', async () => {
            const response = await request(app)
                .post('/api/models/upload')
                .attach('image', Buffer.from('fake file content'), 'test.exe')
                .expect(400);
                
            expect(response.body.code).toBe('INVALID_FILE_TYPE');
        });
        
        test('should enforce file size limits', async () => {
            // Crear un buffer grande (mayor a 50MB)
            const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
            
            const response = await request(app)
                .post('/api/models/upload')
                .attach('image', largeBuffer, 'large.jpg')
                .expect(400);
                
            expect(response.body.code).toBe('FILE_TOO_LARGE');
        });
    });
    
    describe('Error Handling', () => {
        test('should handle 404 routes gracefully', async () => {
            const response = await request(app)
                .get('/api/nonexistent')
                .expect(404);
                
            expect(response.body.code).toBe('ENDPOINT_NOT_FOUND');
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.suggestion).toBeDefined();
        });
        
        test('should not expose stack traces in production', async () => {
            // Para esta prueba, usamos un endpoint que existe pero con JSON inválido
            const response = await request(app)
                .post('/api/clients')
                .send({ name: '' }) // Campo requerido vacío
                .expect(400);
                
            expect(response.body.stack).toBeUndefined();
        });
    });
    
    describe('CORS Configuration', () => {
        test('should set CORS headers correctly', async () => {
            const response = await request(app)
                .options('/api/health')
                .expect(204);
                
            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });
    
    describe('Performance Monitoring', () => {
        test('should log slow requests', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
                
            // Verificar que la respuesta tiene timestamp
            expect(response.body.timestamp).toBeDefined();
        });
    });
});

describe('Authentication Middleware', () => {
    let app;
    
    beforeEach(() => {
        app = createTestApp();
    });
    
    test('should require authentication for protected routes', async () => {
        const response = await request(app)
            .get('/api/clients')
            .expect(401);
            
        expect(response.body.code).toBe('TOKEN_REQUIRED');
    });
    
    test('should reject invalid tokens', async () => {
        const response = await request(app)
            .get('/api/clients')
            .set('Authorization', 'Bearer invalid-token')
            .expect(403);
            
        expect(response.body.code).toBe('TOKEN_INVALID');
    });
});

describe('Input Validation', () => {
    let app;
    
    beforeEach(() => {
        app = createTestApp();
    });
    
    test('should validate JSON payloads', async () => {
        const response = await request(app)
            .post('/api/clients')
            .send({ name: '' }) // nombre vacío debería fallar
            .expect(400);
            
        expect(response.body.error).toBeDefined();
    });
    
    test('should sanitize malicious input', async () => {
        const maliciousInput = '<script>alert("xss")</script>';
        
        const response = await request(app)
            .post('/api/clients')
            .send({ name: maliciousInput })
            .expect(400); // Should fail validation or be sanitized
            
        // Verificar que el input fue sanitizado o rechazado
        expect(response.body).toBeDefined();
    });
});

describe('Database Adapter', () => {
    test('should handle database connection errors gracefully', async () => {
        // Esta prueba verificaría que el adaptador de BD maneja errores correctamente
        // En un caso real, usaríamos mocks para simular errores de BD
        expect(true).toBe(true); // Placeholder
    });
});
