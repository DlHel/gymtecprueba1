const { createApp } = require('./core/bootstrap/create-app');
const { createServerRuntime } = require('./core/runtime/server-runtime');

const { app, db, moduleRuntime } = createApp({
    env: process.env,
    logger: console
});

const { startServer, shutdown } = createServerRuntime({
    app,
    db,
    port: process.env.PORT || 3000,
    advancedRuntime: moduleRuntime,
    env: process.env,
    logger: console
});

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    startServer,
    shutdown
};
