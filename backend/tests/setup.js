/**
 * GYMTEC ERP - Test Setup
 * Configuración común para todos los tests
 */

const request = require('supertest');

// Configuración de la URL base para tests
const API_BASE_URL = process.env.TEST_API_URL || 'http://91.107.237.159';

// Credenciales de test
const TEST_USER = {
    username: 'admin',
    password: 'admin123'
};

// Helper para obtener token de autenticación
async function getAuthToken() {
    const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send(TEST_USER);
    
    if (response.body.token) {
        return response.body.token;
    }
    throw new Error('No se pudo obtener token de autenticación');
}

// Helper para hacer requests autenticados
function authRequest(token) {
    return {
        get: (url) => request(API_BASE_URL).get(url).set('Authorization', `Bearer ${token}`),
        post: (url) => request(API_BASE_URL).post(url).set('Authorization', `Bearer ${token}`),
        put: (url) => request(API_BASE_URL).put(url).set('Authorization', `Bearer ${token}`),
        delete: (url) => request(API_BASE_URL).delete(url).set('Authorization', `Bearer ${token}`)
    };
}

module.exports = {
    API_BASE_URL,
    TEST_USER,
    getAuthToken,
    authRequest,
    request
};
