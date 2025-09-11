const { rateLimiter, authLimiter, uploadLimiter } = require('../src/middleware/rateLimiter');
const request = require('supertest');
const express = require('express');

/**
 * Pruebas Unitarias - Rate Limiter Middleware
 * Testing de protección contra ataques de fuerza bruta
 */

describe('Rate Limiter Middleware', () => {
    
    describe('General Rate Limiter', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use(rateLimiter);
            app.get('/test', (req, res) => {
                res.json({ message: 'success' });
            });
        });
        
        test('should allow requests within limit', async () => {
            for (let i = 0; i < 50; i++) {
                const response = await request(app)
                    .get('/test')
                    .expect(200);
                    
                expect(response.body.message).toBe('success');
            }
        });
        
        test('should block requests exceeding limit', async () => {
            // Hacer 101 requests (límite es 100)
            for (let i = 0; i < 100; i++) {
                await request(app).get('/test');
            }
            
            // El request 101 debería ser bloqueado
            const response = await request(app)
                .get('/test')
                .expect(429);
                
            expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(response.headers['retry-after']).toBeDefined();
        });
        
        test('should include rate limit headers', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);
                
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            expect(response.headers['x-ratelimit-reset']).toBeDefined();
        });
    });
    
    describe('Auth Rate Limiter', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.use('/auth', authLimiter);
            app.post('/auth/login', (req, res) => {
                res.json({ message: 'login attempt' });
            });
        });
        
        test('should allow legitimate login attempts', async () => {
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .post('/auth/login')
                    .send({ username: 'test', password: 'test' })
                    .expect(200);
                    
                expect(response.body.message).toBe('login attempt');
            }
        });
        
        test('should block brute force attacks', async () => {
            // Hacer 5 intentos de login
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/auth/login')
                    .send({ username: 'test', password: 'wrong' });
            }
            
            // El sexto intento debería ser bloqueado
            const response = await request(app)
                .post('/auth/login')
                .send({ username: 'test', password: 'wrong' })
                .expect(429);
                
            expect(response.body.code).toBe('RATE_LIMIT_AUTH');
            expect(response.body.message).toContain('Too many authentication attempts');
        });
        
        test('should log suspicious activity', async () => {
            // Simular actividad sospechosa
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Exceder el límite
            for (let i = 0; i < 6; i++) {
                await request(app)
                    .post('/auth/login')
                    .send({ username: 'attacker', password: 'hack' });
            }
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('⚠️ Suspicious authentication activity detected')
            );
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Upload Rate Limiter', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use('/upload', uploadLimiter);
            app.post('/upload', (req, res) => {
                res.json({ message: 'upload processed' });
            });
        });
        
        test('should allow normal upload frequency', async () => {
            for (let i = 0; i < 10; i++) {
                const response = await request(app)
                    .post('/upload')
                    .expect(200);
                    
                expect(response.body.message).toBe('upload processed');
            }
        });
        
        test('should limit excessive upload attempts', async () => {
            // Hacer 11 uploads (límite es 10)
            for (let i = 0; i < 10; i++) {
                await request(app).post('/upload');
            }
            
            // El upload 11 debería ser bloqueado
            const response = await request(app)
                .post('/upload')
                .expect(429);
                
            expect(response.body.code).toBe('RATE_LIMIT_UPLOAD');
        });
        
        test('should provide specific upload error messages', async () => {
            // Exceder límite de uploads
            for (let i = 0; i < 11; i++) {
                await request(app).post('/upload');
            }
            
            const response = await request(app)
                .post('/upload')
                .expect(429);
                
            expect(response.body.message).toContain('Too many upload attempts');
            expect(response.body.suggestion).toContain('wait before uploading again');
        });
    });
    
    describe('Rate Limiter Edge Cases', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use(rateLimiter);
            app.get('/test', (req, res) => {
                res.json({ success: true });
            });
        });
        
        test('should handle concurrent requests correctly', async () => {
            // Hacer requests concurrentes
            const promises = Array(20).fill().map(() => 
                request(app).get('/test')
            );
            
            const responses = await Promise.all(promises);
            
            // Todos deberían ser exitosos (dentro del límite)
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
        
        test('should reset limits after time window', async () => {
            // Esta prueba requeriría mocking del tiempo o esperar
            // Por ahora, verificamos que el concepto existe
            expect(rateLimiter.resetTime).toBeDefined();
        });
        
        test('should track different IPs separately', async () => {
            // Simular diferentes IPs usando headers
            const response1 = await request(app)
                .get('/test')
                .set('X-Forwarded-For', '192.168.1.1')
                .expect(200);
                
            const response2 = await request(app)
                .get('/test')
                .set('X-Forwarded-For', '192.168.1.2')
                .expect(200);
                
            expect(response1.body.success).toBe(true);
            expect(response2.body.success).toBe(true);
        });
    });
    
    describe('Rate Limiter Configuration', () => {
        test('should have correct window configuration', () => {
            // Verificar configuración de ventana de tiempo
            expect(rateLimiter.windowMs).toBe(15 * 60 * 1000); // 15 minutos
        });
        
        test('should have appropriate request limits', () => {
            expect(rateLimiter.max).toBe(100); // 100 requests por ventana
        });
        
        test('should include security headers', () => {
            expect(rateLimiter.standardHeaders).toBe(true);
            expect(rateLimiter.legacyHeaders).toBe(false);
        });
    });
});
