const jwt = require('jsonwebtoken');

async function testPhotoUpload() {
    try {
        // Generar token de prueba
        const token = jwt.sign(
            { 
                id: 1, 
                username: 'admin', 
                role: 'admin' 
            }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        console.log('🔑 Token generado para test');

        // Datos de prueba para una foto pequeña (imagen 1x1 pixel transparente)
        const testPhotoData = {
            photo_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            file_name: 'test.png',
            mime_type: 'image/png',
            file_size: 100,
            description: 'Foto de prueba para debug',
            photo_type: 'Evidencia'
        };

        console.log('📤 Enviando petición de prueba...');

        // Hacer petición de prueba
        const response = await fetch('http://localhost:3000/api/tickets/7/photos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(testPhotoData)
        });

        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Datos de respuesta:', data);
        } else {
            const errorData = await response.json();
            console.log('❌ Error del servidor:', errorData);
        }

    } catch (error) {
        console.error('❌ Error en la petición:', error.message);
    }
}

testPhotoUpload();
