process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost';

const request = require('supertest');
const { app } = require('../src/server-clean');
const db = require('../src/db-adapter');

afterAll(async () => {
    await db.close();
});

module.exports = {
    request: request(app)
};
