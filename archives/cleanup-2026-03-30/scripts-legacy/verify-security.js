
const jwt = require('../backend/node_modules/jsonwebtoken');

const API_URL = 'http://localhost:3000/api';
// Secret from config.env
const JWT_SECRET = 'tu_jwt_secret_aqui';

// Colores para consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

function generateToken() {
    log('🔑 Generando token de admin manualmente...', colors.yellow);
    // Asumiendo ID 1 es admin, o al menos un usuario válido
    const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    log('✅ Token generado exitosamente', colors.green);
    return token;
}

async function run() {
    const token = generateToken();
    if (token) {
        await verifyClientSecurity(token);
        await verifyEquipmentSecurity(token);
    }
}


async function verifyClientSecurity(token) {
    log('\n🛡️ Probando Validación Zod en Clientes...', colors.yellow);
    
    // CASO 1: Datos Inválidos
    const invalidClient = {
        name: "Test Malo",
        // Falta RUT
        email: "no-es-un-email" // Email inválido
    };

    try {
        const response = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(invalidClient)
        });

        const data = await response.json();

        if (response.status === 400 && data.details) {
            log('✅ Zod bloqueó petición inválida (Status 400)', colors.green);
            log(`   Detalles: ${JSON.stringify(data.details)}`);
        } else {
            log(`❌ FALLO DETECTADO: Se esperaba 400, recibió ${response.status}`, colors.red);
            console.log(data);
        }

    } catch (e) {
        log(`❌ Error de conexión: ${e.message}`, colors.red);
    }
}

async function verifyEquipmentSecurity(token) {
    log('\n🛡️ Probando Validación Zod en Equipos...', colors.yellow);
    
    // CASO 2: Datos Faltantes
    const invalidEquipment = {
        model_id: "1" 
        // Falta location_id
    };

    try {
        const response = await fetch(`${API_URL}/equipment`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(invalidEquipment)
        });

        const data = await response.json();

        if (response.status === 400 && data.details) {
            log('✅ Zod bloqueó equipo incompleto (Status 400)', colors.green);
        } else {
            log(`❌ FALLO DETECTADO: Se esperaba 400, recibió ${response.status}`, colors.red);
            console.log(data);
        }
    } catch (e) {
        log(`❌ Error de conexión: ${e.message}`, colors.red);
    }
}

run();

