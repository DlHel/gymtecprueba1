const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../config.env') });

const express = require('express');
const db = require('../../db-adapter');
const { configureExpressApp } = require('./configure-express');
const { registerModules } = require('../../modules');

function registerFallbackHandlers(app, env = process.env) {
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Endpoint no encontrado',
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    });

    app.use((err, req, res, next) => {
        console.error('💥 Error no manejado:', err);

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (err.type === 'validation') {
            return res.status(400).json({
                error: 'Error de validación',
                details: err.details
            });
        }

        return res.status(500).json({
            error: 'Error interno del servidor',
            message: (env.NODE_ENV || '').toLowerCase() === 'development' ? err.message : 'Error interno',
            timestamp: new Date().toISOString()
        });
    });
}

function createApp({ env = process.env, logger = console } = {}) {
    const app = express();

    configureExpressApp({ app, db, env });

    const moduleRuntime = registerModules({
        app,
        db,
        env,
        logger
    });

    registerFallbackHandlers(app, env);

    return {
        app,
        db,
        moduleRuntime
    };
}

module.exports = {
    createApp
};
