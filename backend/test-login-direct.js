// Test de login directo
const AuthService = require('./src/services/authService');

console.log('🧪 TEST DE LOGIN DIRECTO\n');

async function testLogin() {
    try {
        console.log('📝 Intentando login con:');
        console.log('   Username: admin');
        console.log('   Password: admin123\n');

        const result = await AuthService.login('admin', 'admin123');
        
        console.log('✅ LOGIN EXITOSO!\n');
        console.log('👤 Usuario:', result.user);
        console.log('🔑 Token:', result.token.substring(0, 50) + '...\n');
        
        console.log('✅ El sistema de autenticación funciona correctamente');
        console.log('💡 Si el login falla en el navegador, verifica:');
        console.log('   1. Que el servidor backend esté corriendo en puerto 3000');
        console.log('   2. Que no haya problemas de CORS');
        console.log('   3. Que el frontend esté enviando los datos correctamente');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ LOGIN FALLÓ!\n');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        
        console.log('\n💡 Posibles soluciones:');
        console.log('   1. Verificar credenciales (usuario: admin, password: admin123)');
        console.log('   2. Ejecutar: node create-admin-user.js');
        console.log('   3. Verificar que el usuario esté Activo en la base de datos');
        
        process.exit(1);
    }
}

testLogin();
