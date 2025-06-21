# 🎨 Sistema Unificado de Modales - Gymtec ERP

## 📋 Resumen

Este documento describe el nuevo sistema unificado de modales que **elimina la duplicación de código CSS** y proporciona una base consistente para todos los modales del sistema.

## 🔧 Clases Base

### Modal Container
```html
<div class="base-modal" id="my-modal">
    <div class="base-modal-content">
        <!-- Contenido del modal -->
    </div>
</div>
```

### Tamaños Disponibles
```html
<!-- Pequeño (500px) -->
<div class="base-modal-content modal-small">

<!-- Mediano (700px) - Por defecto -->
<div class="base-modal-content">

<!-- Grande (900px) -->
<div class="base-modal-content modal-large">

<!-- Extra Grande (1200px) -->
<div class="base-modal-content modal-extra-large">
```

## 🏗️ Estructura Completa

```html
<div class="base-modal" id="example-modal">
    <div class="base-modal-content modal-large">
        
        <!-- Header -->
        <div class="base-modal-header">
            <h3 class="base-modal-title">Título del Modal</h3>
            <button class="base-modal-close" onclick="closeModal()">
                <i data-lucide="x"></i>
            </button>
        </div>

        <!-- Pestañas (Opcional) -->
        <div class="base-modal-tabs">
            <nav class="base-tab-nav">
                <button class="base-tab-button active" data-tab="general">General</button>
                <button class="base-tab-button" data-tab="details">Detalles</button>
            </nav>
        </div>
        
        <!-- Body -->
        <div class="base-modal-body">
            
            <!-- Pestaña 1 -->
            <div id="tab-general" class="base-tab-content active">
                <form class="base-form-grid">
                    
                    <div class="base-form-group">
                        <label class="base-form-label">
                            Campo Requerido <span class="required">*</span>
                        </label>
                        <input type="text" class="base-form-input" required>
                    </div>

                    <div class="base-form-group">
                        <label class="base-form-label">Selección</label>
                        <select class="base-form-select">
                            <option>Opción 1</option>
                        </select>
                    </div>

                    <div class="base-form-group full-width">
                        <label class="base-form-label">Descripción</label>
                        <textarea class="base-form-textarea"></textarea>
                    </div>

                </form>
            </div>

            <!-- Pestaña 2 -->
            <div id="tab-details" class="base-tab-content">
                <!-- Área de subida de archivos -->
                <div class="base-file-upload-area">
                    <input type="file" multiple class="hidden">
                    <p>Arrastra archivos aquí o haz clic para seleccionar</p>
                </div>
            </div>

        </div>
        
        <!-- Footer -->
        <div class="base-modal-footer">
            <button class="base-btn-cancel">Cancelar</button>
            <button class="base-btn-save">Guardar</button>
        </div>
        
    </div>
</div>
```

## 🎨 Variantes de Botones

```html
<!-- Botón Guardar Verde (por defecto) -->
<button class="base-btn-save">Guardar</button>

<!-- Botón Azul -->
<button class="base-btn-save btn-primary">Crear</button>

<!-- Botón Rojo -->
<button class="base-btn-save btn-danger">Eliminar</button>

<!-- Botón Cancelar -->
<button class="base-btn-cancel">Cancelar</button>
```

## ⚙️ JavaScript Básico

```javascript
// Abrir modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
}

// Cerrar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
}

// Cambiar pestaña
function switchTab(tabId) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.base-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.base-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar pestaña seleccionada
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}
```

## 🔄 Migración desde Modales Existentes

### Antes (Duplicado)
```html
<div class="ticket-modal">
    <div class="ticket-modal-content">
        <div class="ticket-modal-header">
            <h3 class="ticket-modal-title">Título</h3>
            <button class="ticket-modal-close">×</button>
        </div>
        <div class="ticket-modal-body">
            <div class="ticket-form-grid">
                <div class="ticket-form-group">
                    <label class="ticket-form-label">Campo</label>
                    <input class="ticket-form-input">
                </div>
            </div>
        </div>
        <div class="ticket-modal-footer">
            <button class="ticket-btn-cancel">Cancelar</button>
            <button class="ticket-btn-save">Guardar</button>
        </div>
    </div>
</div>
```

### Después (Unificado)
```html
<div class="base-modal">
    <div class="base-modal-content">
        <div class="base-modal-header">
            <h3 class="base-modal-title">Título</h3>
            <button class="base-modal-close">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="base-modal-body">
            <div class="base-form-grid">
                <div class="base-form-group">
                    <label class="base-form-label">Campo</label>
                    <input class="base-form-input">
                </div>
            </div>
        </div>
        <div class="base-modal-footer">
            <button class="base-btn-cancel">Cancelar</button>
            <button class="base-btn-save">Guardar</button>
        </div>
    </div>
</div>
```

## 📊 Beneficios del Sistema Unificado

### ✅ Antes vs Después

| Aspecto | Antes | Después |
|---------|--------|---------|
| **Líneas de CSS** | ~2,000 líneas duplicadas | ~300 líneas base |
| **Archivos CSS** | 6 archivos con duplicación | 1 sistema central |
| **Mantenimiento** | Cambios en 6 lugares | Cambios en 1 lugar |
| **Consistencia** | Estilos diferentes | Estilos idénticos |
| **Tamaño** | ~45KB CSS modales | ~12KB CSS modales |

### 🎯 Ventajas Técnicas

1. **DRY (Don't Repeat Yourself)**: Eliminación total de duplicación
2. **Mantenibilidad**: Un solo lugar para cambios
3. **Consistencia**: Todos los modales lucen igual
4. **Performance**: Menor tamaño de CSS
5. **Escalabilidad**: Fácil agregar nuevos modales
6. **Responsividad**: Mobile-first incluido

## 🚀 Próximos Pasos

1. **Migrar modales existentes** uno por uno
2. **Actualizar JavaScript** para usar nuevas clases
3. **Eliminar CSS duplicado** de archivos específicos
4. **Documentar casos especiales** si los hay

## 📝 Notas Importantes

- **Compatibilidad**: Mantener modales existentes hasta migración completa
- **Testing**: Probar cada modal migrado en mobile y desktop
- **Customización**: Usar variables CSS para ajustes específicos
- **Accesibilidad**: Incluir ARIA labels y keyboard navigation

---

*Sistema creado para eliminar ~1,700 líneas de CSS duplicado y unificar la experiencia de usuario.* 