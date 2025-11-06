const http = require('http');

// Simular un token JWT válido (esto es solo para pruebas locales)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwNjg0MDAwMCwiZXhwIjoxNzA2OTI2NDAwfQ';

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/inventory/movements',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

setTimeout(() => {
    console.log('🔍 Testing /api/inventory/movements endpoint...\n');
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log(`✅ Status Code: ${res.statusCode}\n`);
                console.log(`📊 Response Summary:`);
                console.log(`   - Total items: ${response.count}`);
                console.log(`   - Pending requests: ${response.summary?.pendingRequests || 0}`);
                console.log(`   - Total movements: ${response.summary?.totalMovements || 0}\n`);
                
                if (response.data && response.data.length > 0) {
                    console.log('🔍 First 3 items:');
                    response.data.slice(0, 3).forEach((item, index) => {
                        const type = item.is_pending_request === 1 ? '🔔 PENDING REQUEST' : `✓ ${item.movement_type}`;
                        console.log(`   ${index + 1}. [${type}] ${item.item_name || 'No name'}`);
                        if (item.is_pending_request === 1) {
                            console.log(`      Request ID: ${item.request_id}, Status: ${item.request_status}`);
                            console.log(`      Ticket: #${item.related_ticket_id} - ${item.related_ticket_title}`);
                        }
                    });
                }
                
            } catch (error) {
                console.error('❌ Error parsing response:', error.message);
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Request Error:', error.message);
        console.log('⚠️  Make sure backend is running on port 3000');
    });
    
    req.end();
}, 3000); // Esperar 3 segundos para que el servidor inicie

console.log('⏳ Waiting for backend to start...');
