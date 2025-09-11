/**
 * Pruebas Unitarias - Funciones Core
 * Testing de validaciones y autenticación
 */

describe('Core Security Functions', () => {
    
    describe('Input Sanitization', () => {
        const sanitizeInput = (input) => {
            if (typeof input !== 'string') return input;
            
            return input
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/[<>]/g, '');
        };
        
        test('should remove script tags', () => {
            const maliciousInput = '<script>alert("xss")</script>Hello';
            const sanitized = sanitizeInput(maliciousInput);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('alert(');
            expect(sanitized).toBe('Hello');
        });
        
        test('should remove javascript protocol', () => {
            const maliciousInput = 'javascript:alert("xss")';
            const sanitized = sanitizeInput(maliciousInput);
            
            expect(sanitized).not.toContain('javascript:');
            expect(sanitized).toBe('alert("xss")');
        });
        
        test('should remove event handlers', () => {
            const maliciousInput = 'onload=alert("xss")';
            const sanitized = sanitizeInput(maliciousInput);
            
            expect(sanitized).not.toContain('onload=');
            expect(sanitized).toBe('alert("xss")');
        });
        
        test('should remove angle brackets', () => {
            const maliciousInput = '<div>content</div>';
            const sanitized = sanitizeInput(maliciousInput);
            
            expect(sanitized).not.toContain('<');
            expect(sanitized).not.toContain('>');
            expect(sanitized).toBe('divcontent/div');
        });
        
        test('should handle non-string input', () => {
            expect(sanitizeInput(123)).toBe(123);
            expect(sanitizeInput(null)).toBe(null);
            expect(sanitizeInput(undefined)).toBe(undefined);
        });
    });
    
    describe('File Validation', () => {
        const isValidFileType = (filename, allowedTypes) => {
            const extension = filename.split('.').pop().toLowerCase();
            return allowedTypes.includes(extension);
        };
        
        const isValidFileSize = (size, maxSize) => {
            return size <= maxSize;
        };
        
        test('should validate file types correctly', () => {
            const allowedTypes = ['jpg', 'png', 'gif'];
            
            expect(isValidFileType('image.jpg', allowedTypes)).toBe(true);
            expect(isValidFileType('image.PNG', allowedTypes)).toBe(true);
            expect(isValidFileType('script.exe', allowedTypes)).toBe(false);
            expect(isValidFileType('document.pdf', allowedTypes)).toBe(false);
        });
        
        test('should validate file sizes correctly', () => {
            const maxSize = 1024 * 1024; // 1MB
            
            expect(isValidFileSize(500 * 1024, maxSize)).toBe(true); // 500KB
            expect(isValidFileSize(2 * 1024 * 1024, maxSize)).toBe(false); // 2MB
            expect(isValidFileSize(0, maxSize)).toBe(true);
        });
    });
    
    describe('JWT Token Validation', () => {
        const jwt = require('jsonwebtoken');
        const SECRET = 'test-secret';
        
        test('should generate valid tokens', () => {
            const payload = { id: 1, username: 'test', role: 'admin' };
            const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
        });
        
        test('should verify valid tokens', () => {
            const payload = { id: 1, username: 'test', role: 'admin' };
            const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
            
            const decoded = jwt.verify(token, SECRET);
            
            expect(decoded.id).toBe(1);
            expect(decoded.username).toBe('test');
            expect(decoded.role).toBe('admin');
        });
        
        test('should reject invalid tokens', () => {
            expect(() => {
                jwt.verify('invalid-token', SECRET);
            }).toThrow();
        });
        
        test('should reject expired tokens', () => {
            const payload = { id: 1, username: 'test' };
            const token = jwt.sign(payload, SECRET, { expiresIn: '1ms' });
            
            // Wait for expiration
            setTimeout(() => {
                expect(() => {
                    jwt.verify(token, SECRET);
                }).toThrow();
            }, 10);
        });
    });
    
    describe('Password Security', () => {
        const bcrypt = require('bcryptjs');
        
        test('should hash passwords securely', async () => {
            const password = 'testPassword123';
            const hashedPassword = await bcrypt.hash(password, 10);
            
            expect(hashedPassword).toBeDefined();
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(50);
        });
        
        test('should verify correct passwords', async () => {
            const password = 'testPassword123';
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const isValid = await bcrypt.compare(password, hashedPassword);
            expect(isValid).toBe(true);
        });
        
        test('should reject incorrect passwords', async () => {
            const password = 'testPassword123';
            const wrongPassword = 'wrongPassword';
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
            expect(isValid).toBe(false);
        });
    });
    
    describe('Environment Configuration', () => {
        test('should have test environment configured', () => {
            expect(process.env.NODE_ENV).toBe('test');
        });
        
        test('should have JWT secret configured', () => {
            expect(process.env.JWT_SECRET).toBeDefined();
        });
        
        test('should have database configuration', () => {
            expect(process.env.DB_HOST).toBe('localhost');
            expect(process.env.DB_NAME).toBe('gymtec_erp_test');
        });
    });
    
    describe('HTTP Status Code Validation', () => {
        test('should recognize success codes', () => {
            const isSuccessCode = (code) => code >= 200 && code < 300;
            
            expect(isSuccessCode(200)).toBe(true);
            expect(isSuccessCode(201)).toBe(true);
            expect(isSuccessCode(204)).toBe(true);
            expect(isSuccessCode(400)).toBe(false);
            expect(isSuccessCode(500)).toBe(false);
        });
        
        test('should recognize error codes', () => {
            const isErrorCode = (code) => code >= 400;
            
            expect(isErrorCode(400)).toBe(true);
            expect(isErrorCode(401)).toBe(true);
            expect(isErrorCode(403)).toBe(true);
            expect(isErrorCode(404)).toBe(true);
            expect(isErrorCode(500)).toBe(true);
            expect(isErrorCode(200)).toBe(false);
        });
    });
});
