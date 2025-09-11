// clientes.js (entry point)
import { initializeDomElements, setupEventListeners, actions } from './clientes-core.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeDomElements();
    setupEventListeners();
    actions.init(); // Initial load of clients
    // lucide.createIcons(); // This needs to be mocked or handled in test setup
});