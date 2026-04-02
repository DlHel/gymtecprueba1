// Script para corregir AMBOS parsers (json y urlencoded) para ignorar multipart
const fs = require('fs');

const FILE_PATH = '/var/www/gymtec/backend/src/server-clean.js';

let content = fs.readFileSync(FILE_PATH, 'utf8');

// Buscar el bloque actual de middlewares
const currentBlock = `// Middleware JSON que ignora multipart/form-data para permitir multer
app.use((req, res, next) => {
    // Si es multipart/form-data, pasar directo a multer
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        return next();
    }
    // Para otros content-types, usar express.json
    express.json({ limit: '50mb' })(req, res, next);
});
app.use(express.urlencoded({ limit: '50mb', extended: true }));`;

// Nuevo bloque que ignora multipart en AMBOS parsers
const newBlock = `// Helper para detectar peticiones multipart
const isMultipart = (req) => {
    const ct = req.headers['content-type'];
    return ct && (ct.includes('multipart/form-data') || ct.includes('application/octet-stream'));
};

// Middleware JSON condicionado (ignora multipart para permitir multer)
app.use((req, res, next) => {
    if (isMultipart(req)) return next();
    express.json({ limit: '50mb' })(req, res, next);
});

// Middleware urlencoded condicionado (ignora multipart para permitir multer)
app.use((req, res, next) => {
    if (isMultipart(req)) return next();
    express.urlencoded({ limit: '50mb', extended: true })(req, res, next);
});`;

if (content.includes(currentBlock)) {
    content = content.replace(currentBlock, newBlock);
    fs.writeFileSync(FILE_PATH, content);
    console.log('✅ Ambos middlewares (json y urlencoded) corregidos exitosamente');
} else {
    console.log('⚠️ No se encontró el bloque exacto a reemplazar');
    // Intentar encontrar partes del código
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Middleware JSON que ignora')) {
            console.log('Encontrado en línea', i+1, ':', lines[i]);
            console.log('Siguientes líneas:');
            for (let j = i; j < Math.min(i+15, lines.length); j++) {
                console.log(j+1, ':', lines[j]);
            }
            break;
        }
    }
}
