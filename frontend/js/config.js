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
            const backendUrl = baseUrl.replace('-8080', '-3000');
            console.log('Codespaces - Frontend en 8080, backend en:', backendUrl);
            return `${backendUrl}/api`;
        }
        // Si estamos en puerto 3000, usar la misma URL
        if (port === '3000') {
            console.log('Codespaces - Ya en backend:', baseUrl);
            return `${baseUrl}/api`;
        }
        // Por defecto en Codespaces, intentar puerto 3000
        const backendUrl = baseUrl.replace(/:\d+/, '') + ':3000';
        console.log('Codespaces - URL por defecto:', backendUrl);
        return `${backendUrl}/api`;
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