const security = require('../src/middleware/security');
const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet'); // Importar helmet

/**
 * Pruebas Unitarias - Security Middleware
 * Testing de configuración de seguridad y logging
 */

describe('Security Middleware', () => {
    
    describe('Helmet Security Headers', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            // Usar helmet(security.helmetConfig) para obtener el middleware
            app.use(helmet(security.helmetConfig));
            app.get('/test', (req, res) => {
                res.json({ message: 'test' });
            });
        });
        
        test('should remove X-Powered-By header', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);
                
            expect(response.headers['x-powered-by']).toBeUndefined();
        });
        
        test('should set Content Security Policy', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);
                
            expect(response.headers['content-security-policy']).toBeDefined();
            expect(response.headers['content-security-policy']).toContain("default-src 'self'");
        });
        
        test('should set X-Frame-Options', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);
                
            expect(response.headers['x-frame-options']).toBe('DENY');
        });
        
        test('should set X-Content-Type-Options', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);
                
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });
        
        test('should set Strict-Transport-Security', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);
                
            expect(response.headers['strict-transport-security']).toBeDefined();
            expect(response.headers['strict-transport-security']).toContain('max-age=');
        });
        
        test('should set Referrer-Policy', async () => {
            const response = await request(app)
                .get('/test')
                .expect(200);
                
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        });
    });
    
    describe('Performance Monitoring', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use(security.performanceMonitor);
            app.get('/fast', (req, res) => {
                res.json({ message: 'fast response' });
            });
            app.get('/slow', (req, res) => {
                // Simular respuesta lenta
                setTimeout(() => {
                    res.json({ message: 'slow response' });
                }, 100);
            });
        });
        
        test('should add response time header', async () => {
            const response = await request(app)
                .get('/fast')
                .expect(200);
                
            expect(response.headers['x-response-time']).toBeDefined();
            expect(parseFloat(response.headers['x-response-time'])).toBeGreaterThan(0);
        });
        
        test('should log slow requests', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            await request(app)
                .get('/slow')
                .expect(200);
            
            // Verificar que se loggeó la respuesta lenta
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('⚠️ Slow response detected')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should track request performance metrics', async () => {
            const response = await request(app)
                .get('/fast')
                .expect(200);
            
            // Verificar que la métrica de tiempo está presente
            expect(response.headers['x-response-time']).toMatch(/^\d+\.\d+ms$/);
        });
    });
    
    describe('Request Logging', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use(security.requestLogger);
            app.get('/test', (req, res) => {
                res.json({ message: 'logged request' });
            });
            app.post('/secure', (req, res) => {
                res.json({ message: 'secure endpoint' });
            });
        });
        
        test('should log incoming requests', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            
            await request(app)
                .get('/test')
                .expect(200);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('📥 Request')
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should log request details', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            
            await request(app)
                .post('/secure')
                .send({ data: 'test' })
                .expect(200);
            
            const logCall = consoleSpy.mock.calls.find(call => 
                call[0].includes('📥 Request')
            );
            
            expect(logCall).toBeDefined();
            expect(logCall[0]).toContain('POST');
            expect(logCall[0]).toContain('/secure');
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Winston Logger Configuration', () => {
        test('should create logger with correct configuration', () => {
            expect(security.logger).toBeDefined();
            expect(security.logger.level).toBe('info');
        });
        
        test('should create logs directory if not exists', () => {
            const logsDir = path.join(__dirname, '../logs');
            expect(fs.existsSync(logsDir)).toBe(true);
        });
        
        test('should write error logs to file', async () => {
            security.logger.error('Test error log', {
                testId: 'winston-test',
                timestamp: new Date().toISOString()
            });
            
            // Verificar que el archivo de log existe
            const errorLogPath = path.join(__dirname, '../logs/error.log');
            expect(fs.existsSync(errorLogPath)).toBe(true);
        });
        
        test('should write combined logs to file', async () => {
            security.logger.info('Test info log', {
                testId: 'winston-test',
                timestamp: new Date().toISOString()
            });
            
            // Verificar que el archivo de log combinado existe
            const combinedLogPath = path.join(__dirname, '../logs/combined.log');
            expect(fs.existsSync(combinedLogPath)).toBe(true);
        });
    });
    
    describe('Error Monitoring', () => {
        let app;
        
        beforeEach(() => {
            app = express();
            app.use(security.errorMonitor);
            app.get('/error', (req, res, next) => {
                const error = new Error('Test error');
                error.status = 500;
                next(error);
            });
            app.use((err, req, res, next) => {
                res.status(err.status || 500).json({
                    error: err.message,
                    code: 'TEST_ERROR'
                });
            });
        });
        
        test('should monitor and log errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            await request(app)
                .get('/error')
                .expect(500);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('💥 Error detected')
            );
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Security Utilities', () => {
        test('should provide sanitization functions', () => {
            expect(security.sanitizeInput).toBeDefined();
            expect(typeof security.sanitizeInput).toBe('function');
        });
        
        test('should sanitize dangerous input', () => {
            const maliciousInput = '<script>alert("xss")</script>';
            const sanitized = security.sanitizeInput(maliciousInput);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('alert(');
        });
        
        test('should validate file types', () => {
            expect(security.isValidFileType).toBeDefined();
            expect(security.isValidFileType('image.jpg', ['jpg', 'png'])).toBe(true);
            expect(security.isValidFileType('script.exe', ['jpg', 'png'])).toBe(false);
        });
        
        test('should check file size limits', () => {
            expect(security.isValidFileSize).toBeDefined();
            expect(security.isValidFileSize(1024, 2048)).toBe(true); // 1KB < 2KB limit
            expect(security.isValidFileSize(3072, 2048)).toBe(false); // 3KB > 2KB limit
        });
    });
    
    describe('CORS Security', () => {
        test('should provide secure CORS configuration', () => {
            expect(security.corsOptions).toBeDefined();
            expect(security.corsOptions.credentials).toBe(true);
            expect(security.corsOptions.optionsSuccessStatus).toBe(200);
        });
        
        test('should validate origins correctly', () => {
            const { origin } = security.corsOptions;
            
            if (typeof origin === 'function') {
                // Test allowed origins
                const allowedOrigins = [
                    'http://localhost:8080',
                    'http://127.0.0.1:8080'
                ];
                
                allowedOrigins.forEach(testOrigin => {
                    let callbackCalled = false;
                    origin(testOrigin, (err, allow) => {
                        callbackCalled = true;
                        expect(err).toBeFalsy();
                        expect(allow).toBe(true);
                    });
                    expect(callbackCalled).toBe(true);
                });
            }
        });
    });
});
