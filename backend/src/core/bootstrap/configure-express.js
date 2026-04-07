const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const { modelsDirectory } = require('../http/uploads');

function buildCorsOptions(corsOrigin = '', env = process.env) {
    const configuredOrigins = corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configuredOrigins.length === 0 || configuredOrigins.includes('*')) {
        if ((env.NODE_ENV || '').toLowerCase() === 'production') {
            return { origin: false };
        }

        return { origin: true, credentials: true };
    }

    return {
        credentials: true,
        origin(origin, callback) {
            if (!origin || configuredOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error('Origen no permitido por CORS'));
        }
    };
}

function registerHealthRoute(app, env = process.env) {
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'gymtec-backend',
            timestamp: new Date().toISOString(),
            environment: env.NODE_ENV || 'development'
        });
    });
}

function configureExpressApp({ app, db, env = process.env }) {
    app.locals.db = db;

    app.disable('x-powered-by');

    if ((env.NODE_ENV || '').toLowerCase() === 'production') {
        app.set('trust proxy', env.TRUST_PROXY ? env.TRUST_PROXY : 1);
    }

    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    }));
    app.use(cors(buildCorsOptions(env.CORS_ORIGIN || '', env)));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.use(express.static(path.resolve(__dirname, '../../../../frontend')));
    app.use('/uploads/models', express.static(modelsDirectory));

    registerHealthRoute(app, env);
}

module.exports = {
    buildCorsOptions,
    configureExpressApp
};
