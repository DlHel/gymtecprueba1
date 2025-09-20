// base-modal.js - Sistema bÃ¡sico de modales para Gymtec ERP
// âœ… VerificaciÃ³n de autenticaciÃ³n eliminada - Los modales no requieren autenticaciÃ³n directa
// La autenticaciÃ³n se maneja a nivel de pÃ¡gina, no de componentes individuales

/**
 * Sistema bÃ¡sico de gestiÃ³n de modales
 */
class BaseModal {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = document.getElementById(modalId);
        this.isOpen = false;
        this.init();
    }

    init() {
        if (!this.modal) {
            console.warn(`âš ï¸ Modal ${this.modalId} no encontrado`);
            return;
        }

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Cerrar modal clickeando fuera
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Botones de cerrar
        const closeButtons = this.modal.querySelectorAll('[data-close-modal]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close());
        });
    }

    open() {
        if (!this.modal) return;
        
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        this.isOpen = true;
        
        // Focus en el primer input si existe
        const firstInput = this.modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        console.log(`ðŸ“– Modal ${this.modalId} abierto`);
    }

    close() {
        if (!this.modal) return;
        
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
        this.isOpen = false;
        
        console.log(`ðŸ“• Modal ${this.modalId} cerrado`);
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

/**
 * Funciones globales de utilidad para modales
 */
window.BaseModal = BaseModal;

// Funciones de conveniencia globales
window.openModal = function(modalId) {
    const modal = new BaseModal(modalId);
    modal.open();
    return modal;
};

window.closeModal = function(modalId) {
    const modal = new BaseModal(modalId);
    modal.close();
};

window.toggleModal = function(modalId) {
    const modal = new BaseModal(modalId);
    modal.toggle();
};

console.log('âœ… base-modal.js cargado correctamente');
