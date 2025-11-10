/**
 * Sistema de Cambio de Contraseña
 * Permite a los usuarios cambiar su propia contraseña
 */

// Crear el modal de cambio de contraseña dinámicamente
function createPasswordModal() {
    // Verificar si ya existe
    if (document.getElementById('change-password-modal')) {
        return;
    }

    const modalHTML = `
        <div id="change-password-modal" class="base-modal">
            <div class="base-modal-content modal-small">
                <div class="base-modal-header">
                    <h3 class="base-modal-title">Cambiar Contraseña</h3>
                    <button type="button" class="base-modal-close" id="close-password-modal">
                        <i data-lucide="x" class="h-5 w-5"></i>
                    </button>
                </div>
                <div class="base-modal-body">
                    <form id="change-password-form" class="space-y-4">
                        <!-- Contraseña Actual -->
                        <div class="base-form-group">
                            <label class="base-form-label" for="current-password">
                                Contraseña Actual <span class="text-red-500">*</span>
                            </label>
                            <div class="relative">
                                <input 
                                    type="password" 
                                    id="current-password" 
                                    name="current_password"
                                    class="base-form-input pr-10" 
                                    required
                                    autocomplete="current-password"
                                    placeholder="Ingresa tu contraseña actual"
                                >
                                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onclick="togglePasswordVisibility('current-password')">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Nueva Contraseña -->
                        <div class="base-form-group">
                            <label class="base-form-label" for="new-password">
                                Nueva Contraseña <span class="text-red-500">*</span>
                            </label>
                            <div class="relative">
                                <input 
                                    type="password" 
                                    id="new-password" 
                                    name="new_password"
                                    class="base-form-input pr-10" 
                                    required
                                    autocomplete="new-password"
                                    minlength="6"
                                    placeholder="Mínimo 6 caracteres"
                                >
                                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onclick="togglePasswordVisibility('new-password')">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                            <small class="base-form-help">Mínimo 6 caracteres</small>
                        </div>

                        <!-- Confirmar Nueva Contraseña -->
                        <div class="base-form-group">
                            <label class="base-form-label" for="confirm-password">
                                Confirmar Nueva Contraseña <span class="text-red-500">*</span>
                            </label>
                            <div class="relative">
                                <input 
                                    type="password" 
                                    id="confirm-password" 
                                    name="confirm_password"
                                    class="base-form-input pr-10" 
                                    required
                                    autocomplete="new-password"
                                    minlength="6"
                                    placeholder="Repite la nueva contraseña"
                                >
                                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onclick="togglePasswordVisibility('confirm-password')">
                                    <i data-lucide="eye" class="w-5 h-5"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Indicador de fortaleza -->
                        <div id="password-strength" class="hidden">
                            <div class="flex items-center gap-2 mb-1">
                                <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div id="strength-bar" class="h-full transition-all duration-300" style="width: 0%"></div>
                                </div>
                            </div>
                            <p id="strength-text" class="text-xs text-gray-600"></p>
                        </div>

                        <!-- Mensajes -->
                        <div id="password-message" class="hidden rounded-lg p-3"></div>
                    </form>
                </div>
                <div class="base-modal-footer">
                    <button type="button" id="cancel-password-change" class="base-btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" form="change-password-form" id="submit-password-change" class="base-btn-primary">
                        <i data-lucide="check" class="w-4 h-4 mr-2"></i>
                        Cambiar Contraseña
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Toggle para mostrar/ocultar contraseña
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// Validar fortaleza de contraseña
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];

    // Longitud
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    
    // Mayúsculas
    if (/[A-Z]/.test(password)) {
        strength += 20;
    } else {
        feedback.push('Agregar mayúsculas');
    }
    
    // Minúsculas
    if (/[a-z]/.test(password)) {
        strength += 20;
    } else {
        feedback.push('Agregar minúsculas');
    }
    
    // Números
    if (/[0-9]/.test(password)) {
        strength += 15;
    } else {
        feedback.push('Agregar números');
    }
    
    // Caracteres especiales
    if (/[^A-Za-z0-9]/.test(password)) {
        strength += 15;
    } else {
        feedback.push('Agregar caracteres especiales');
    }

    return { strength, feedback };
}

// Actualizar indicador de fortaleza
function updatePasswordStrength() {
    const newPassword = document.getElementById('new-password').value;
    const strengthContainer = document.getElementById('password-strength');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    if (!newPassword) {
        strengthContainer.classList.add('hidden');
        return;
    }

    strengthContainer.classList.remove('hidden');
    const { strength, feedback } = checkPasswordStrength(newPassword);

    strengthBar.style.width = `${strength}%`;

    if (strength < 40) {
        strengthBar.className = 'h-full transition-all duration-300 bg-red-500';
        strengthText.textContent = 'Débil - ' + feedback.join(', ');
        strengthText.className = 'text-xs text-red-600';
    } else if (strength < 70) {
        strengthBar.className = 'h-full transition-all duration-300 bg-yellow-500';
        strengthText.textContent = 'Media - ' + feedback.join(', ');
        strengthText.className = 'text-xs text-yellow-600';
    } else {
        strengthBar.className = 'h-full transition-all duration-300 bg-green-500';
        strengthText.textContent = '¡Fuerte!';
        strengthText.className = 'text-xs text-green-600';
    }
}

// Abrir modal
window.openChangePasswordModal = function() {
    console.log('🔑 Abriendo modal de cambio de contraseña...');
    
    createPasswordModal();
    
    const modal = document.getElementById('change-password-modal');
    const form = document.getElementById('change-password-form');
    
    // Reset form
    form.reset();
    document.getElementById('password-message').classList.add('hidden');
    document.getElementById('password-strength').classList.add('hidden');
    
    // Show modal
    modal.classList.add('is-open');
    
    // Focus en primer campo
    setTimeout(() => {
        document.getElementById('current-password').focus();
    }, 100);
};

// Cerrar modal
function closePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.classList.remove('is-open');
    }
}

// Mostrar mensaje
function showPasswordMessage(message, type = 'success') {
    const messageEl = document.getElementById('password-message');
    messageEl.className = `rounded-lg p-3 ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`;
    messageEl.textContent = message;
    messageEl.classList.remove('hidden');
}

// Manejar submit del formulario
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submit-password-change');
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
        showPasswordMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    // Validar longitud mínima
    if (newPassword.length < 6) {
        showPasswordMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    // Validar que sea diferente a la actual
    if (currentPassword === newPassword) {
        showPasswordMessage('La nueva contraseña debe ser diferente a la actual', 'error');
        return;
    }
    
    // Deshabilitar botón
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 mr-2 animate-spin"></i>Cambiando...';
    
    try {
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showPasswordMessage('✅ Contraseña cambiada exitosamente', 'success');
            
            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                closePasswordModal();
            }, 2000);
        } else {
            showPasswordMessage(data.error || 'Error al cambiar contraseña', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showPasswordMessage('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        // Rehabilitar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 mr-2"></i>Cambiar Contraseña';
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔑 Sistema de cambio de contraseña cargado');
    
    // Crear modal
    createPasswordModal();
    
    // Event listeners
    const form = document.getElementById('change-password-form');
    if (form) {
        form.addEventListener('submit', handlePasswordChange);
        
        // Listener para fortaleza de contraseña
        const newPasswordInput = document.getElementById('new-password');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', updatePasswordStrength);
        }
    }
    
    // Botones de cerrar
    const closeBtn = document.getElementById('close-password-modal');
    const cancelBtn = document.getElementById('cancel-password-change');
    
    if (closeBtn) closeBtn.addEventListener('click', closePasswordModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closePasswordModal);
    
    // Cerrar al hacer click fuera del modal
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePasswordModal();
            }
        });
    }
});

console.log('✅ change-password.js cargado');
