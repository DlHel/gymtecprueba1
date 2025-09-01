// base-modal.js - Sistema básico de modales para Gymtec ERP
// ✅ CRÍTICO: Verificación de autenticación - DESHABILITADA TEMPORALMENTE
// La verificación de autenticación puede estar causando redirecciones no deseadas
/*
if (!window.AuthManager || !AuthManager.isAuthenticated()) {
    console.warn('⚠️ base-modal.js cargado sin autenticación válida');
}
*/

/**
 * Sistema básico de gestión de modales
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
            console.warn(`⚠️ Modal ${this.modalId} no encontrado`);
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
        
        console.log(`📖 Modal ${this.modalId} abierto`);
    }

    close() {
        if (!this.modal) return;
        
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
        this.isOpen = false;
        
        console.log(`📕 Modal ${this.modalId} cerrado`);
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

console.log('✅ base-modal.js cargado correctamente');
