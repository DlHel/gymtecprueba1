/**
 * Sistema de Autocompletado de Direcciones usando Nominatim (OpenStreetMap)
 * Alternativa gratuita a Google Maps Places API
 */

class AddressAutocomplete {
    constructor() {
        this.debounceTimer = null;
        this.currentSuggestions = [];
        this.activeSuggestionIndex = -1;
        this.init();
    }

    init() {
        // Agregar estilos CSS para las sugerencias
        this.addStyles();
        
        // Configurar autocompletado cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAutocomplete());
        } else {
            this.setupAutocomplete();
        }
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .address-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #d1d5db;
                border-top: none;
                border-radius: 0 0 6px 6px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
            }
            
            .address-suggestion {
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f3f4f6;
                transition: background-color 0.15s ease;
            }
            
            .address-suggestion:hover,
            .address-suggestion.active {
                background-color: #f3f4f6;
            }
            
            .address-suggestion:last-child {
                border-bottom: none;
            }
            
            .address-main {
                font-weight: 500;
                color: #374151;
                margin-bottom: 2px;
            }
            
            .address-details {
                font-size: 0.875rem;
                color: #6b7280;
            }
            
            .address-input-container {
                position: relative;
            }
            
            .address-loading {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                display: none;
            }
            
            @keyframes spin {
                0% { transform: translateY(-50%) rotate(0deg); }
                100% { transform: translateY(-50%) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    setupAutocomplete() {
        // Buscar todos los campos de dirección
        const addressFields = document.querySelectorAll('#client-address, #location-address');
        
        addressFields.forEach(field => {
            this.setupField(field);
        });
    }

    setupField(field) {
        // Crear contenedor para el campo si no existe
        if (!field.parentElement.classList.contains('address-input-container')) {
            const container = document.createElement('div');
            container.className = 'address-input-container';
            field.parentNode.insertBefore(container, field);
            container.appendChild(field);
        }

        const container = field.parentElement;
        
        // Crear indicador de carga
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'address-loading';
        container.appendChild(loadingIndicator);

        // Crear contenedor de sugerencias
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'address-suggestions';
        container.appendChild(suggestionsContainer);

        // Event listeners
        field.addEventListener('input', (e) => this.handleInput(e, suggestionsContainer, loadingIndicator));
        field.addEventListener('keydown', (e) => this.handleKeydown(e, suggestionsContainer));
        field.addEventListener('blur', (e) => this.handleBlur(e, suggestionsContainer));
        field.addEventListener('focus', (e) => this.handleFocus(e, suggestionsContainer));
    }

    handleInput(event, suggestionsContainer, loadingIndicator) {
        const query = event.target.value.trim();
        
        // Limpiar timer anterior
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (query.length < 3) {
            this.hideSuggestions(suggestionsContainer);
            return;
        }

        // Mostrar indicador de carga
        loadingIndicator.style.display = 'block';

        // Debounce para evitar demasiadas consultas
        this.debounceTimer = setTimeout(() => {
            this.searchAddresses(query, suggestionsContainer, loadingIndicator);
        }, 300);
    }

    async searchAddresses(query, suggestionsContainer, loadingIndicator) {
        try {
            // Agregar "Chile" al final de la búsqueda para mejores resultados locales
            const searchQuery = `${query}, Chile`;
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)}&` +
                `format=json&` +
                `addressdetails=1&` +
                `limit=5&` +
                `countrycodes=cl&` +
                `accept-language=es`
            );

            if (!response.ok) {
                throw new Error('Error en la búsqueda de direcciones');
            }

            const results = await response.json();
            this.displaySuggestions(results, suggestionsContainer);
            
        } catch (error) {
            console.error('Error al buscar direcciones:', error);
            this.hideSuggestions(suggestionsContainer);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    displaySuggestions(results, suggestionsContainer) {
        this.currentSuggestions = results;
        this.activeSuggestionIndex = -1;

        if (results.length === 0) {
            this.hideSuggestions(suggestionsContainer);
            return;
        }

        suggestionsContainer.innerHTML = '';

        results.forEach((result, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'address-suggestion';
            suggestionElement.dataset.index = index;

            // Formatear la dirección
            const mainAddress = this.formatMainAddress(result);
            const details = this.formatAddressDetails(result);

            suggestionElement.innerHTML = `
                <div class="address-main">${mainAddress}</div>
                <div class="address-details">${details}</div>
            `;

            suggestionElement.addEventListener('click', () => {
                this.selectSuggestion(result, suggestionsContainer);
            });

            suggestionsContainer.appendChild(suggestionElement);
        });

        suggestionsContainer.style.display = 'block';
    }

    formatMainAddress(result) {
        const address = result.address || {};
        const parts = [];

        // Priorizar información más específica
        if (address.house_number && address.road) {
            parts.push(`${address.road} ${address.house_number}`);
        } else if (address.road) {
            parts.push(address.road);
        } else if (result.display_name) {
            // Tomar la primera parte del display_name
            parts.push(result.display_name.split(',')[0]);
        }

        return parts.join(', ') || result.display_name;
    }

    formatAddressDetails(result) {
        const address = result.address || {};
        const parts = [];

        if (address.neighbourhood) parts.push(address.neighbourhood);
        if (address.suburb) parts.push(address.suburb);
        if (address.city || address.town || address.village) {
            parts.push(address.city || address.town || address.village);
        }
        if (address.state) parts.push(address.state);

        return parts.join(', ');
    }

    formatSelectedAddress(result) {
        const address = result.address || {};
        const parts = [];

        // Dirección principal (calle + número)
        if (address.house_number && address.road) {
            parts.push(`${address.road} ${address.house_number}`);
        } else if (address.road) {
            parts.push(address.road);
        }

        // Comuna/Ciudad
        if (address.city || address.town || address.village || address.municipality) {
            const city = address.city || address.town || address.village || address.municipality;
            parts.push(city);
        } else if (address.suburb) {
            parts.push(address.suburb);
        }

        // Si no tenemos información suficiente, usar solo la primera parte del display_name
        if (parts.length === 0) {
            const firstPart = result.display_name.split(',')[0];
            return firstPart.trim();
        }

        return parts.join(', ');
    }

    selectSuggestion(result, suggestionsContainer) {
        const field = suggestionsContainer.parentElement.querySelector('input');
        field.value = this.formatSelectedAddress(result);
        this.hideSuggestions(suggestionsContainer);
        
        // Disparar evento change para que otros scripts puedan reaccionar
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    handleKeydown(event, suggestionsContainer) {
        const suggestions = suggestionsContainer.querySelectorAll('.address-suggestion');
        
        if (suggestions.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.activeSuggestionIndex = Math.min(
                    this.activeSuggestionIndex + 1, 
                    suggestions.length - 1
                );
                this.updateActiveSuggestion(suggestions);
                break;

            case 'ArrowUp':
                event.preventDefault();
                this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, -1);
                this.updateActiveSuggestion(suggestions);
                break;

            case 'Enter':
                event.preventDefault();
                if (this.activeSuggestionIndex >= 0) {
                    const activeResult = this.currentSuggestions[this.activeSuggestionIndex];
                    this.selectSuggestion(activeResult, suggestionsContainer);
                }
                break;

            case 'Escape':
                this.hideSuggestions(suggestionsContainer);
                break;
        }
    }

    updateActiveSuggestion(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('active', index === this.activeSuggestionIndex);
        });
    }

    handleBlur(event, suggestionsContainer) {
        // Delay para permitir clicks en sugerencias
        setTimeout(() => {
            this.hideSuggestions(suggestionsContainer);
        }, 150);
    }

    handleFocus(event, suggestionsContainer) {
        // Si hay sugerencias y el campo tiene contenido, mostrarlas
        if (this.currentSuggestions.length > 0 && event.target.value.trim().length >= 3) {
            suggestionsContainer.style.display = 'block';
        }
    }

    hideSuggestions(suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
        this.activeSuggestionIndex = -1;
    }
}

// Inicializar el autocompletado
window.addressAutocomplete = new AddressAutocomplete(); 