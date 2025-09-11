/**
 * Test de Conectividad del Backend
 * GymTec ERP v3.0
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

describe('🔌 Backend Connectivity Tests', () => {
    
    // Aumentar timeout para operaciones de red
    jest.setTimeout(30000);

    test('Backend server should be running', async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/test-early`);
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message');
            console.log('✅ Backend server is running:', response.data.message);
        } catch (error) {
            console.error('❌ Backend server test failed:', error.message);
            throw error;
        }
    });

    test('Test login endpoint should work', async () => {
        try {
            const loginData = {
                username: 'admin',
                password: 'admin123'
            };

            const response = await axios.post(`${API_BASE_URL}/auth/test-login`, loginData);
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('message', 'Login successful');
            expect(response.data).toHaveProperty('token');
            expect(response.data).toHaveProperty('user');
            expect(response.data.user).toHaveProperty('username', 'admin');
            
            console.log('✅ Test login successful:', response.data.message);
        } catch (error) {
            console.error('❌ Test login failed:', error.response?.data || error.message);
            throw error;
        }
    });

    test('Invalid login should fail', async () => {
        try {
            const loginData = {
                username: 'invalid',
                password: 'wrong'
            };

            await axios.post(`${API_BASE_URL}/auth/test-login`, loginData);
            // Si llega aquí, el test debe fallar
            throw new Error('Login should have failed');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                expect(error.response.status).toBe(401);
                expect(error.response.data).toHaveProperty('error');
                console.log('✅ Invalid login correctly rejected');
            } else {
                throw error;
            }
        }
    });

    test('API endpoints should be accessible', async () => {
        const endpoints = [
            '/diag',
            '/clients',
            '/locations', 
            '/equipment',
            '/inventory',
            '/expenses',
            '/equipment-models'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${API_BASE_URL}${endpoint}`);
                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty('message', 'success');
                console.log(`✅ Endpoint ${endpoint} is accessible`);
            } catch (error) {
                console.error(`❌ Endpoint ${endpoint} failed:`, error.response?.status);
                throw error;
            }
        }
    });

    test('Protected endpoints should require authentication', async () => {
        try {
            await axios.get(`${API_BASE_URL}/tickets`);
            // Si llega aquí, el test debe fallar
            throw new Error('Protected endpoint should require auth');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                expect(error.response.status).toBe(401);
                console.log('✅ Protected endpoint correctly requires authentication');
            } else {
                throw error;
            }
        }
    });
});
