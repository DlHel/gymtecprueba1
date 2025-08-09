// Configuración automática de API URL
const getApiUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    console.log('Detectando entorno:', { hostname, port, protocol });
    
    // Detectar si estamos en GitHub Codespaces
    if (hostname.includes('github.dev') || 
        hostname.includes('githubpreview.dev') ||
        hostname.includes('app.github.dev') ||
        hostname.includes('codespaces.github.com')) {
        
        // En Codespaces, construir URL del backend
        const baseUrl = `${protocol}//${hostname}`;
        // Si estamos en puerto 8080, cambiar a 3000 para el backend
        if (port === '8080') {
            const backendUrl = baseUrl.replace('-8080', '-3000') + '/api';
            console.log('Codespaces - Frontend en 8080, backend en:', backendUrl);
            return backendUrl;
        }
        // Si estamos en puerto 3000, usar la misma URL
        if (port === '3000') {
            console.log('Codespaces - Ya en backend:', baseUrl);
            return baseUrl + '/api';
        }
        // Por defecto en Codespaces, intentar puerto 3000
        const backendUrl = baseUrl.replace(/:\d+/, '') + ':3000/api';
        console.log('Codespaces - URL por defecto:', backendUrl);
        return backendUrl;
    }
    
    // Entorno local
    if (port === '8080') {
        console.log('Local - Frontend en 8080, backend en localhost:3000');
        return 'http://localhost:3000/api';
    }
    
    if (port === '3000') {
        console.log('Local - Backend en 3000, usando ruta relativa');
        return '/api';
    }
    
    // Por defecto
    console.log('Por defecto - localhost:3000');
    return 'http://localhost:3000/api';
};

const API_URL = getApiUrl();
console.log('🔗 API URL configurada:', API_URL);

// Configuración de límites de archivos (debe coincidir con backend)
const FILE_LIMITS = {
    // Límites en bytes
    IMAGE_MAX_SIZE: 5 * 1024 * 1024,      // 5MB - mismo que backend
    MANUAL_MAX_SIZE: 10 * 1024 * 1024,    // 10MB - mismo que backend
    
    // Límites formateados para mostrar al usuario
    IMAGE_MAX_SIZE_TEXT: '5MB',
    MANUAL_MAX_SIZE_TEXT: '10MB'
};

console.log('📁 Límites de archivos configurados:', FILE_LIMITS);

// Hacer disponible globalmente
window.config = {
    API_URL,
    FILE_LIMITS
};

// También crear las variables globales directas para compatibilidad
window.API_URL = API_URL;
window.FILE_LIMITS = FILE_LIMITS;

console.log('⚙️ Configuración disponible globalmente:', window.config); 