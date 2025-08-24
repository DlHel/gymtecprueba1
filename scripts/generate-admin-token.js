const jwt = require('jsonwebtoken');

// Configuración del JWT (misma que en middleware/auth.js)
const JWT_SECRET = process.env.JWT_SECRET || 'gymtec_secret_key_2024';

// Crear usuario admin
const adminUser = {
    id: 1,
    username: 'admin',
    email: 'admin@gymtec.cl',
    role: 'Admin'
};

// Generar token para el admin
const token = jwt.sign(
    { 
        userId: adminUser.id, 
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
);

console.log('🔑 Token de Admin generado:');
console.log(token);
console.log('\n📝 Para usar en el frontend, agregar este header:');
console.log(`Authorization: Bearer ${token}`);

console.log('\n Credenciales de login:');
console.log('Usuario: admin');
console.log('Contraseña: admin123');
