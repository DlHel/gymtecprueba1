// base-modal.js - Sistema básico de modales para Gymtec ERP

class BaseModal {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = document.getElementById(modalId);
        this.isOpen = false;
        this.init();
    }

    init() {
        if (!this.modal) {
            console.warn('Modal no encontrado');
            return;
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

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
        const firstInput = this.modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    close() {
        if (!this.modal) return;
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
        this.isOpen = false;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

window.BaseModal = BaseModal;

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

window.showModal = function(title, contentHtml, onConfirm, options = {}) {
    const modalId = 'dynamic-modal-' + Date.now();
    const confirmText = options.confirmText || 'Confirmar';
    const cancelText = options.cancelText || 'Cancelar';
    const size = options.size || 'max-w-2xl';
    
    const modalHtml = '<div id="' + modalId + '" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50" style="display: none;"><div class="' + size + ' w-full mx-4"><div class="bg-white rounded-lg shadow-xl"><div class="flex items-center justify-between p-5 border-b border-gray-200"><h3 class="text-xl font-semibold text-gray-900">' + title + '</h3><button type="button" class="text-gray-400 hover:text-gray-600" onclick="window.closeAndRemoveModal(\'' + modalId + '\')"><i class="fas fa-times text-xl"></i></button></div><div class="p-6"><div id="' + modalId + '-content">' + contentHtml + '</div></div><div class="flex justify-end space-x-3 p-5 border-t border-gray-200"><button type="button" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" onclick="window.closeAndRemoveModal(\'' + modalId + '\')">' + cancelText + '</button><button type="button" id="' + modalId + '-confirm" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">' + confirmText + '</button></div></div></div></div>';
    
    const container = document.getElementById('modal-container') || document.body;
    container.insertAdjacentHTML('beforeend', modalHtml);
    
    const modalElement = document.getElementById(modalId);
    const confirmBtn = document.getElementById(modalId + '-confirm');
    
    confirmBtn.addEventListener('click', async () => {
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
            
            if (onConfirm) {
                await onConfirm();
            }
            
            window.closeAndRemoveModal(modalId);
        } catch (error) {
            console.error('Error en confirmación del modal:', error);
            alert('Error: ' + error.message);
            confirmBtn.disabled = false;
            confirmBtn.textContent = confirmText;
        }
    });
    
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            window.closeAndRemoveModal(modalId);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            window.closeAndRemoveModal(modalId);
        }
    });
    
    modalElement.style.display = 'flex';
    
    setTimeout(() => {
        const firstInput = modalElement.querySelector('input, textarea, select');
        if (firstInput) firstInput.focus();
    }, 100);
    
    return modalId;
};

window.closeAndRemoveModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        setTimeout(() => modal.remove(), 300);
    }
};

console.log('base-modal.js cargado correctamente');
