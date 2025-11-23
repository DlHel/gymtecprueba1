const axios = require('axios');

// Configuración
const API_URL = 'http://localhost:3004/api';
const USERNAME = 'admin';
const PASSWORD = 'admin123'; // Contraseña reseteada

async function runTests() {
    console.log('🚀 Iniciando pruebas de API de Configuración...');

    try {
        // 1. Autenticación
        console.log('\n1️⃣ Autenticando...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            username: USERNAME,
            password: PASSWORD
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login exitoso. Token obtenido.');

        const headers = {
            'Authorization': `Bearer ${token}`
        };

        // 2. Obtener configuraciones actuales
        console.log('\n2️⃣ Obteniendo configuraciones actuales...');
        const getResponse = await axios.get(`${API_URL}/system-settings`, { headers });
        console.log('✅ Configuraciones obtenidas:', JSON.stringify(getResponse.data.data, null, 2));
        
        // Verificar estructura
        if (!getResponse.data.data.company || !getResponse.data.data.security) {
            throw new Error('❌ Estructura de respuesta inválida');
        }

        // 3. Actualizar configuraciones
        console.log('\n3️⃣ Actualizando configuraciones...');
        const newSettings = {
            ...getResponse.data.data,
            company: {
                ...getResponse.data.data.company,
                name: 'Gymtec ERP Updated ' + Date.now()
            },
            maintenance: {
                ...getResponse.data.data.maintenance,
                slaCritical: 5
            }
        };

        const putResponse = await axios.put(`${API_URL}/system-settings`, newSettings, { headers });
        console.log('✅ Respuesta de actualización:', putResponse.data);

        // 4. Verificar persistencia
        console.log('\n4️⃣ Verificando persistencia...');
        const verifyResponse = await axios.get(`${API_URL}/system-settings`, { headers });
        
        if (verifyResponse.data.data.company.name === newSettings.company.name &&
            verifyResponse.data.data.maintenance.slaCritical === 5) {
            console.log('✅ Persistencia verificada correctamente!');
        } else {
            console.error('❌ Error: Los datos no persistieron correctamente.');
            console.error('Esperado:', newSettings.company.name);
            console.error('Obtenido:', verifyResponse.data.data.company.name);
        }

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        if (error.response) {
            console.error('Detalles del error:', error.response.data);
        }
    }
}

runTests();
