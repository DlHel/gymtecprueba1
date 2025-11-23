/**
 * Gestor de Notificaciones Tipo Toast (Estilo Windows)
 * Permite mostrar notificaciones emergentes en la esquina inferior derecha.
 */
class ToastNotificationManager {
    constructor() {
        this.containerId = 'toast-container';
        this.container = null;
        this.init();
    }

    init() {
        // Crear el contenedor si no existe
        if (!document.getElementById(this.containerId)) {
            this.container = document.createElement('div');
            this.container.id = this.containerId;
            this.container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById(this.containerId);
        }

        // Exponer la instancia globalmente
        window.showToast = this.show.bind(this);
    }

    /**
     * Muestra una notificación toast
     * @param {string} title - Título de la notificación
     * @param {string} message - Mensaje descriptivo
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duración en ms (default 2000ms)
     */
    show(title, message, type = 'info', duration = 2000) {
        const toast = document.createElement('div');
        
        // Configuración de estilos según el tipo
        const styles = {
            success: {
                bg: 'bg-white',
                border: 'border-l-4 border-green-500',
                icon: '<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
                titleColor: 'text-gray-900'
            },
            error: {
                bg: 'bg-white',
                border: 'border-l-4 border-red-500',
                icon: '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
                titleColor: 'text-gray-900'
            },
            warning: {
                bg: 'bg-white',
                border: 'border-l-4 border-yellow-500',
                icon: '<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
                titleColor: 'text-gray-900'
            },
            info: {
                bg: 'bg-white',
                border: 'border-l-4 border-blue-500',
                icon: '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
                titleColor: 'text-gray-900'
            }
        };

        const style = styles[type] || styles.info;

        // Estructura del toast con Tailwind CSS
        toast.className = `
            ${style.bg} ${style.border} 
            shadow-lg rounded-r-lg p-4 mb-3 
            transform transition-all duration-300 ease-in-out translate-x-full opacity-0
            flex items-start min-w-[300px] max-w-md pointer-events-auto
            cursor-pointer hover:shadow-xl
        `;

        toast.innerHTML = `
            <div class="flex-shrink-0 mr-3">
                ${style.icon}
            </div>
            <div class="flex-1">
                <h4 class="text-sm font-bold ${style.titleColor}">${title}</h4>
                <p class="text-sm text-gray-600 mt-1">${message}</p>
            </div>
            <div class="ml-3 flex-shrink-0 flex">
                <button class="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
                    <span class="sr-only">Cerrar</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;

        // Añadir al contenedor
        this.container.appendChild(toast);

        // Animación de entrada (next frame)
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        });

        // Configurar eliminación automática
        let timeoutId;
        
        const removeToast = () => {
            toast.classList.remove('translate-x-0', 'opacity-100');
            toast.classList.add('translate-x-full', 'opacity-0');
            
            // Esperar a que termine la transición CSS (300ms)
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        };

        timeoutId = setTimeout(removeToast, duration);

        // Permitir cerrar manualmente
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(timeoutId);
            removeToast();
        });

        // Pausar temporizador al pasar el mouse (opcional, estilo Windows lo hace a veces)
        toast.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
        });

        toast.addEventListener('mouseleave', () => {
            timeoutId = setTimeout(removeToast, duration);
        });
    }
}

// Inicializar automáticamente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.toastManager = new ToastNotificationManager();
    console.log('🍞 Toast Notification Manager initialized');
});
