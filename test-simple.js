const { execSync } = require('child_process');

async function testGetOnly() {
    try {
        console.log('🧪 PRUEBA SIMPLE - GET TEMPLATES');
        
        // Login
        const loginData = { username: 'admin', password: 'admin123' };
        const loginCommand = `curl -X POST -H "Content-Type: application/json" -d "${JSON.stringify(loginData).replace(/"/g, '\\"')}" http://localhost:3000/api/auth/login --silent`;
        const loginResponse = execSync(loginCommand, { encoding: 'utf8' });
        const loginResult = JSON.parse(loginResponse);
        const token = loginResult.token;
        
        if (!token) {
            throw new Error('No token received');
        }
        
        console.log('✅ Token obtenido');
        
        // GET templates
        const getCommand = `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/gimnacion/checklist-templates --silent`;
        const getResponse = execSync(getCommand, { encoding: 'utf8' });
        console.log('✅ GET Response:', getResponse);
        
        // GET items del template 1
        const getItemsCommand = `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/gimnacion/checklist-templates/1/items --silent`;
        const itemsResponse = execSync(getItemsCommand, { encoding: 'utf8' });
        console.log('✅ GET Items Response:', itemsResponse);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testGetOnly();