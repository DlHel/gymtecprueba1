/**
 * Script simple para generar token de admin
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gymtec_secret_key_2024'; // El mismo que usa el servidor

const adminUser = {
    id: 1,
    username: 'admin',
    role: 'admin'
};

const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '24h' });

console.log('🔑 Token de admin generado:');
console.log(token);
console.log('\n📋 Comando curl para probar correlaciones:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/dashboard/correlations/sla-planning`);