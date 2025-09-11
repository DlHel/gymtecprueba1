const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Crear app de Express para testing
 * No inicia el servidor en puerto específico
 */
function createTestApp() {
    const app = express();
    
    // Configuración básica para testing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Seguridad básica con Helmet
    app.use(helmet({
        frameguard: { action: 'deny' },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"]
            }
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));
    
    // CORS para testing
    app.use(cors({
        origin: true,
        credentials: true
    }));
    
    // Rate limiting para testing
    const testRateLimit = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100, // límite de requests por ventana
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED'
        }
    });
    
    app.use(testRateLimit);
    
    // Middleware de autenticación mock para testing
    const mockAuthMiddleware = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_REQUIRED'
            });
        }
        
        const token = authHeader.split(' ')[1];
        if (token === 'invalid-token') {
            return res.status(403).json({
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        }
        
        req.user = { id: 1, username: 'test', role: 'admin' };
        next();
    };
    
    // Rutas de testing
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    app.get('/api/clients', mockAuthMiddleware, (req, res) => {
        res.json({
            message: 'success',
            data: [
                { id: 1, name: 'Test Client', email: 'test@client.com' }
            ]
        });
    });
    
    app.post('/api/clients', (req, res) => {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({
                error: 'Name is required',
                code: 'VALIDATION_ERROR'
            });
        }
        
        if (name.includes('<script>')) {
            return res.status(400).json({
                error: 'Invalid input detected',
                code: 'MALICIOUS_INPUT'
            });
        }
        
        res.status(201).json({
            message: 'Client created',
            data: { id: 123, name: name.trim() }
        });
    });
    
    // Ruta para test de archivos
    app.post('/api/models/upload', (req, res) => {
        res.status(400).json({
            error: 'Invalid file type',
            code: 'INVALID_FILE_TYPE'
        });
    });
    
    // Manejo de rutas no encontradas
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Endpoint not found',
            code: 'ENDPOINT_NOT_FOUND',
            timestamp: new Date().toISOString(),
            suggestion: 'Check the API documentation for valid endpoints'
        });
    });
    
    // Manejo de errores
    app.use((err, req, res, next) => {
        console.error('Error:', err.message);
        
        res.status(err.status || 500).json({
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        });
    });
    
    return app;
}

module.exports = createTestApp;
