// Test simple de rutas de asistencia
const jwt = require('jsonwebtoken');

// Generar token válido
const token = jwt.sign(
    { id: 1, username: 'admin', role: 'Admin' },
    'gymtec_secret_key_2024_production_change_this',
    { expiresIn: '1h' }
);

console.log('🔑 Token generado:', token);
console.log('\n📋 Comandos para probar rutas:\n');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/shift-types`);
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/employee-schedules/1/active`);
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/attendance/today`);
console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:3000/api/attendance?user_id=1"`);
