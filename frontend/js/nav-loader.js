// nav-loader.js - Sistema de navegaciÃ³n estandarizado
document.addEventListener("DOMContentLoaded", () => {
    const menuPlaceholder = document.getElementById("menu-placeholder");
    if (!menuPlaceholder) {
        console.warn('nav-loader.js: No se encontrÃ³ el elemento #menu-placeholder');
        return;
    }

    // Cargar el menÃº
    loadMenu();

    async function loadMenu() {
        try {
            console.log('ðŸ”„ Cargando menÃº de navegaciÃ³n...');
            
            const response = await fetch("menu.html");
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const menuHTML = await response.text();
            menuPlaceholder.innerHTML = menuHTML;
            
            // Configurar la navegaciÃ³n despuÃ©s de cargar el menÃº
            setupNavigation();
            
            console.log('âœ… MenÃº cargado correctamente');
        } catch (error) {
            console.error('âŒ Error cargando menÃº:', error);
            // Mostrar un menÃº de fallback bÃ¡sico
            showFallbackMenu();
        }
    }

    function setupNavigation() {
        const sidebar = document.getElementById('main-sidebar');
        const desktopToggle = document.getElementById('sidebar-toggle');
        const mobileToggle = document.getElementById('mobile-sidebar-toggle');
        
        if (!sidebar) {
            console.warn('nav-loader.js: No se encontrÃ³ el elemento #main-sidebar');
            return;
        }

        // Configurar toggle del menÃº para escritorio
        if (desktopToggle) {
            desktopToggle.addEventListener('click', () => {
                sidebar.classList.toggle('is-collapsed');
                saveMenuState(!sidebar.classList.contains('is-collapsed'));
                lucide.createIcons();
            });
        }

        // Configurar toggle del menÃº para mÃ³vil
        if (mobileToggle) {
            mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.add('is-open');
            });
        }

        // Cerrar menÃº mÃ³vil al hacer clic fuera
        menuPlaceholder.addEventListener('click', (e) => {
            if (e.target === menuPlaceholder && sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
            }
        });

        // Cerrar menÃº mÃ³vil al hacer clic en un enlace
        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // DEBUG: Monitorear clics en navegaciÃ³n
                const href = link.getAttribute('href');
                console.log('ðŸ”— Clic en navegaciÃ³n:', {
                    href: href,
                    currentPage: window.location.pathname,
                    target: e.target,
                    isDefaultPrevented: e.defaultPrevented
                });
                
                // IMPORTANTE: No interceptar la navegaciÃ³n normal
                // Solo cerrar el menÃº mÃ³vil si es necesario
                if (window.innerWidth < 1024) {
                    sidebar.classList.remove('is-open');
                }
                // NO hacer preventDefault() ni modificar el comportamiento del enlace
            });
        });

        // Marcar la pÃ¡gina actual como activa
        setActiveNavLink();
        
        // Restaurar el estado del menÃº desde localStorage
        restoreMenuState();
        
        // Inicializar Ã­conos de Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function setActiveNavLink() {
        const currentPage = window.location.pathname.split("/").pop() || 'index.html';
        const navLinks = document.querySelectorAll("#main-nav .nav-link");
        
        navLinks.forEach(link => {
            const linkHref = link.getAttribute("href");
            
            // Remover clase activa de todos los enlaces
            link.classList.remove("active");
            
            // Agregar clase activa al enlace correspondiente
            if (linkHref === currentPage || 
                (currentPage === 'index.html' && linkHref === 'index.html') ||
                (currentPage === '' && linkHref === 'index.html')) {
                link.classList.add("active");
            }
        });
    }

    function saveMenuState(isExpanded) {
        try {
            localStorage.setItem('gymtec-menu-expanded', isExpanded ? 'true' : 'false');
        } catch (error) {
            console.warn('nav-loader.js: No se pudo guardar el estado del menÃº:', error);
        }
    }

    function restoreMenuState() {
        try {
            const sidebar = document.getElementById('main-sidebar');
            const savedState = localStorage.getItem('gymtec-menu-expanded');
            
            if (savedState === 'false' && sidebar) {
                sidebar.classList.add('is-collapsed');
            }
        } catch (error) {
            console.warn('nav-loader.js: No se pudo restaurar el estado del menÃº:', error);
        }
    }

    function showFallbackMenu() {
        const fallbackMenu = `
            <aside id="main-sidebar" class="sidebar-width bg-white border-r border-slate-200 flex flex-col">
                <div class="px-6 py-4 flex items-center space-x-3 border-b border-slate-200">
                    <div class="p-2 bg-sky-600 rounded-lg text-white">
                        <i data-lucide="dumbbell"></i>
                    </div>
                    <h1 class="text-xl font-bold text-slate-800">Gymtec ERP</h1>
                </div>
                <nav class="flex-1 px-4 py-4 space-y-1">
                    <a href="index.html" class="nav-link flex items-center px-4 py-2.5 text-sm font-medium rounded-lg">
                        <i data-lucide="layout-dashboard" class="sidebar-icon"></i>
                        <span class="sidebar-text">Dashboard</span>
                    </a>
                    <div class="text-center text-red-500 text-sm py-4">
                        Error cargando menÃº completo
                    </div>
                </nav>
            </aside>
        `;
        
        menuPlaceholder.innerHTML = fallbackMenu;
        
        // Configurar navegaciÃ³n bÃ¡sica
        setupNavigation();
    }

    // Manejo de cambios de tamaÃ±o de ventana
    window.addEventListener('resize', () => {
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar && window.innerWidth >= 1024) {
            sidebar.classList.remove('is-open');
        }
    });
});

// FunciÃ³n global para limpiar el estado del menÃº (Ãºtil para scripts de pÃ¡gina)
window.clearMenuState = function() {
    try {
        localStorage.removeItem('gymtec-menu-expanded');
    } catch (error) {
        console.warn('No se pudo limpiar el estado del menÃº:', error);
    }
}; 
