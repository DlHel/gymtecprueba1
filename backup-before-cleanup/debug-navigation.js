// debug-navigation.js - Script temporal para depurar problema de redirección al dashboard
console.log('🔧 DEBUG: Iniciando monitoreo de navegación...');

// Monitorear TODOS los clics en la página
document.addEventListener('click', function(e) {
    const target = e.target;
    const link = target.closest('a');
    
    if (link) {
        console.log('🔗 CLICK EN ENLACE DETECTADO:', {
            href: link.getAttribute('href'),
            text: link.textContent.trim(),
            classes: link.className,
            currentPage: window.location.pathname,
            target: target,
            preventDefault: e.defaultPrevented,
            timestamp: new Date().toISOString()
        });
        
        // Si el enlace va al dashboard cuando no debería
        if (link.getAttribute('href') === 'index.html' && target.textContent.trim() !== 'Dashboard') {
            console.error('🚨 PROBLEMA DETECTADO: Enlace incorrecto que va al dashboard');
            console.log('Detalles del elemento problemático:', link);
        }
    }
});

// Monitorear cambios de location
const originalAssign = window.location.assign;
const originalReplace = window.location.replace;

window.location.assign = function(url) {
    console.log('🔄 location.assign() llamado:', url);
    console.trace('Stack trace:');
    return originalAssign.call(this, url);
};

window.location.replace = function(url) {
    console.log('🔄 location.replace() llamado:', url);
    console.trace('Stack trace:');
    return originalReplace.call(this, url);
};

// Monitorear asignaciones directas a href
Object.defineProperty(window.location, 'href', {
    set: function(value) {
        console.log('🔄 window.location.href asignado:', value);
        console.trace('Stack trace:');
        return value;
    },
    get: function() {
        return window.location.toString();
    }
});

console.log('✅ DEBUG: Monitoreo de navegación activo');
