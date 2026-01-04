// Configuración automática de API URL para Gymtec ERP
// Detecta automáticamente el entorno y configura la URL correcta

const getApiUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    // Producción VPS - usa proxy Nginx
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isCodespaces = hostname.includes('github.dev') || 
                         hostname.includes('githubpreview.dev') ||
                         hostname.includes('codespaces.github.com');
    
    // Si es producción (no localhost, no codespaces) → usar proxy /api
    if (!isLocalhost && !isCodespaces) {
        console.log('🌐 Entorno: Producción VPS - Usando proxy /api');
        return '/api';
    }
    
    // GitHub Codespaces
    if (isCodespaces) {
        const baseUrl = `${protocol}//${hostname}`;
        if (port === '8080') {
            const backendUrl = baseUrl.replace('-8080', '-3000') + '/api';
            console.log('☁️ Entorno: Codespaces - Backend:', backendUrl);
            return backendUrl;
        }
        console.log('☁️ Entorno: Codespaces - URL:', baseUrl + '/api');
        return baseUrl + '/api';
    }
    
    // Desarrollo local
    if (port === '8080') {
        console.log('💻 Entorno: Local - Frontend 8080, Backend 3000');
        return 'http://localhost:3000/api';
    }
    
    if (port === '3000') {
        console.log('💻 Entorno: Local - Backend directo');
        return '/api';
    }
    
    console.log('💻 Entorno: Local - Por defecto localhost:3000');
    return 'http://localhost:3000/api';
};

const API_URL = getApiUrl();
console.log('🔧 API URL configurada:', API_URL);

// Límites de archivos
const FILE_LIMITS = {
    IMAGE_MAX_SIZE: 5 * 1024 * 1024,      // 5MB
    MANUAL_MAX_SIZE: 10 * 1024 * 1024,    // 10MB
    IMAGE_MAX_SIZE_TEXT: '5MB',
    MANUAL_MAX_SIZE_TEXT: '10MB'
};

// Hacer disponible globalmente
window.config = { API_URL, FILE_LIMITS };
window.API_URL = API_URL;
window.FILE_LIMITS = FILE_LIMITS;

console.log('✅ Configuración cargada correctamente');
