// nav-loader.js - Sistema de navegación estandarizado
document.addEventListener("DOMContentLoaded", () => {
    const menuPlaceholder = document.getElementById("menu-placeholder");
    if (!menuPlaceholder) {
        console.warn('nav-loader.js: No se encontró el elemento #menu-placeholder');
        return;
    }

    // Cargar el menú
    loadMenu();

    async function loadMenu() {
        try {
            console.log('🔄 Cargando menú de navegación...');
            
            const response = await fetch("menu.html");
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const menuHTML = await response.text();
            menuPlaceholder.innerHTML = menuHTML;
            
            // Configurar la navegación después de cargar el menú
            setupNavigation();
            
            console.log('✅ Menú cargado correctamente');
        } catch (error) {
            console.error('❌ Error cargando menú:', error);
            // Mostrar un menú de fallback básico
            showFallbackMenu();
        }
    }

    function setupNavigation() {
        const sidebar = document.getElementById('main-sidebar');
        const desktopToggle = document.getElementById('sidebar-toggle');
        const mobileToggle = document.getElementById('mobile-sidebar-toggle');
        
        if (!sidebar) {
            console.warn('nav-loader.js: No se encontró el elemento #main-sidebar');
            return;
        }

        // Configurar toggle del menú para escritorio
        if (desktopToggle) {
            desktopToggle.addEventListener('click', () => {
                sidebar.classList.toggle('is-collapsed');
                saveMenuState(!sidebar.classList.contains('is-collapsed'));
                lucide.createIcons();
            });
        }

        // Configurar toggle del menú para móvil
        if (mobileToggle) {
            mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.add('is-open');
            });
        }

        // Cerrar menú móvil al hacer clic fuera
        menuPlaceholder.addEventListener('click', (e) => {
            if (e.target === menuPlaceholder && sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
            }
        });

        // Cerrar menú móvil al hacer clic en un enlace
        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // DEBUG: Monitorear clics en navegación
                const href = link.getAttribute('href');
                console.log('🔗 Clic en navegación:', {
                    href: href,
                    currentPage: window.location.pathname,
                    target: e.target,
                    isDefaultPrevented: e.defaultPrevented
                });
                
                // IMPORTANTE: No interceptar la navegación normal
                // Solo cerrar el menú móvil si es necesario
                if (window.innerWidth < 1024) {
                    sidebar.classList.remove('is-open');
                }
                // NO hacer preventDefault() ni modificar el comportamiento del enlace
            });
        });

        // Marcar la página actual como activa
        setActiveNavLink();
        
        // Restaurar el estado del menú desde localStorage
        restoreMenuState();
        
        // Inicializar íconos de Lucide
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
            console.warn('nav-loader.js: No se pudo guardar el estado del menú:', error);
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
            console.warn('nav-loader.js: No se pudo restaurar el estado del menú:', error);
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
                        Error cargando menú completo
                    </div>
                </nav>
            </aside>
        `;
        
        menuPlaceholder.innerHTML = fallbackMenu;
        
        // Configurar navegación básica
        setupNavigation();
    }

    // Manejo de cambios de tamaño de ventana
    window.addEventListener('resize', () => {
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar && window.innerWidth >= 1024) {
            sidebar.classList.remove('is-open');
        }
    });
});

// Función global para limpiar el estado del menú (útil para scripts de página)
window.clearMenuState = function() {
    try {
        localStorage.removeItem('gymtec-menu-expanded');
    } catch (error) {
        console.warn('No se pudo limpiar el estado del menú:', error);
    }
}; 