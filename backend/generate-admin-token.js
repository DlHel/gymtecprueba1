const jwt = require('jsonwebtoken');

function generateToken() {
    const user = {
        id: 1,
        username: 'admin',
        email: 'admin@gymtec.com',
        role: 'Admin'
    };
    
    const token = jwt.sign(user, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '24h'
    });
    
    console.log('🔑 Token generado para admin:');
    console.log(token);
    console.log('\n📋 Datos del usuario:');
    console.log(JSON.stringify(user, null, 2));
    
    return token;
}

generateToken();
