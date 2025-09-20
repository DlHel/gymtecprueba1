// generate-frontend-token.js - Generar token válido para el frontend
const jwt = require('jsonwebtoken');

const jwtSecret = 'gymtec_secret_key_2024'; // Secret correcto del backend

const adminToken = jwt.sign(
    { 
        id: 1, 
        username: 'admin', 
        email: 'admin@gymtec.com',
        role: 'admin' 
    }, 
    jwtSecret, 
    { expiresIn: '24h' }
);

console.log('🔑 Token válido para frontend:');
console.log(adminToken);

// También crear el script completo para copiar/pegar en el navegador
const frontendScript = `
// SCRIPT PARA CORREGIR AUTENTICACIÓN - Copiar y pegar en la consola del navegador
console.log('🔧 CORRECCIÓN DE AUTENTICACIÓN FRONTEND');

const validToken = '${adminToken}';
const adminUser = {
    id: 1,
    username: 'admin',
    email: 'admin@gymtec.com',
    role: 'Admin'
};

// Limpiar y configurar
localStorage.removeItem('gymtec_token');
localStorage.removeItem('gymtec_user');
localStorage.setItem('gymtec_token', validToken);
localStorage.setItem('gymtec_user', JSON.stringify(adminUser));

console.log('✅ Autenticación configurada. Recarga la página personal.html');
`;

console.log('\n📋 Script para el navegador:');
console.log('=====================================');
console.log(frontendScript);
console.log('=====================================');