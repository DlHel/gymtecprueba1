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
            
            // Filtrar menú según permisos del usuario
            filterMenuByRole();
            
            // Mostrar información del usuario
            displayUserInfo();
            
            // Configurar logout
            setupLogout();
            
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

    function filterMenuByRole() {
        // Verificar que exista el sistema de permisos y el usuario esté autenticado
        if (!window.PERMISSIONS || !window.authManager || !window.authManager.isAuthenticated()) {
            console.warn('⚠️ Sistema de permisos no disponible o usuario no autenticado');
            return;
        }

        const userRole = window.authManager.getUserRole();
        if (!userRole) {
            console.warn('⚠️ No se pudo obtener el rol del usuario');
            return;
        }

        console.log(`🔒 Filtrando menú para rol: ${userRole}`);

        const navLinks = document.querySelectorAll("#main-nav .nav-link");
        let removedCount = 0;

        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            if (!href) return;

            const page = href.split('/').pop();
            
            // Verificar si el usuario tiene acceso a esta página
            if (!window.PERMISSIONS.canAccessPage(page, userRole)) {
                link.remove();
                removedCount++;
                console.log(`  ❌ Removido: ${page}`);
            } else {
                console.log(`  ✅ Permitido: ${page}`);
            }
        });

        // Limpiar separadores vacíos (si una sección quedó sin elementos)
        cleanEmptySections();

        console.log(`✅ Menú filtrado: ${removedCount} enlaces removidos`);
    }

    function cleanEmptySections() {
        const nav = document.getElementById('main-nav');
        if (!nav) return;

        const sections = nav.querySelectorAll('p.text-xs.font-semibold.text-slate-400');
        sections.forEach(section => {
            let nextElement = section.nextElementSibling;
            let hasLinks = false;

            // Verificar si hay enlaces después de este separador
            while (nextElement && !nextElement.classList.contains('text-xs')) {
                if (nextElement.classList.contains('nav-link')) {
                    hasLinks = true;
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }

            // Si no hay enlaces, remover el separador
            if (!hasLinks) {
                section.remove();
            }
        });
    }

    function displayUserInfo() {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            return;
        }

        const user = window.authManager.getUser();
        const role = window.authManager.getUserRole();
        
        if (!user) return;

        // Buscar el contenedor de user-info en el header
        let userInfoContainer = document.getElementById('user-info');
        
        // Si no existe, buscar en otros lugares comunes del header
        if (!userInfoContainer) {
            userInfoContainer = document.querySelector('.user-info');
        }
        
        // Si aún no existe, buscar el header y agregarlo
        if (!userInfoContainer) {
            const header = document.querySelector('header');
            if (header) {
                const headerContent = header.querySelector('.flex.justify-between');
                if (headerContent) {
                    const userDiv = document.createElement('div');
                    userDiv.className = 'user-info';
                    userDiv.id = 'user-info';
                    headerContent.appendChild(userDiv);
                    userInfoContainer = userDiv;
                }
            }
        }

        if (!userInfoContainer) {
            console.warn('⚠️ No se encontró contenedor para user-info en el header');
            return;
        }

        // Traducir rol
        const roleNames = {
            'Admin': 'Administrador',
            'Manager': 'Gerente',
            'Technician': 'Técnico',
            'Client': 'Cliente'
        };
        const roleName = roleNames[role] || role;
        const initials = user.username.substring(0, 2).toUpperCase();

        // Crear el HTML del componente de usuario
        userInfoContainer.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="hidden md:block text-right">
                    <p class="text-sm font-medium text-gray-800">${user.username}</p>
                    <p class="text-xs text-gray-500">${roleName}</p>
                </div>
                <div class="relative">
                    <button id="user-menu-button" class="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <div class="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-semibold">
                            ${initials}
                        </div>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-gray-600"></i>
                    </button>
                    <!-- Dropdown Menu -->
                    <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div class="px-4 py-3 border-b border-gray-200">
                            <p class="text-sm font-medium text-gray-900">${user.username}</p>
                            <p class="text-xs text-gray-500">${user.email || ''}</p>
                            <span class="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-sky-100 text-sky-800">
                                ${roleName}
                            </span>
                        </div>
                        <div class="py-2">
                            <button id="change-password-btn-header" class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <i data-lucide="key" class="w-4 h-4 mr-3"></i>
                                Cambiar Contraseña
                            </button>
                            <button id="logout-btn-header" class="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                <i data-lucide="log-out" class="w-4 h-4 mr-3"></i>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inicializar iconos de Lucide para los nuevos elementos
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Setup del dropdown
        setupUserDropdown();

        console.log('✅ Información de usuario mostrada en header:', user.username, role);
    }

    function setupUserDropdown() {
        const userMenuButton = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (!userMenuButton || !userDropdown) return;

        // Toggle dropdown
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });

        // Configurar botón de cambiar contraseña
        const changePasswordBtn = document.getElementById('change-password-btn-header');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                userDropdown.classList.add('hidden'); // Cerrar dropdown
                if (typeof window.openChangePasswordModal === 'function') {
                    window.openChangePasswordModal();
                } else {
                    console.error('❌ Función openChangePasswordModal no encontrada');
                }
            });
        }
        
        // Configurar botón de logout del dropdown
        const logoutBtnHeader = document.getElementById('logout-btn-header');
        if (logoutBtnHeader) {
            logoutBtnHeader.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
    }

    function setupLogout() {
        // Esta función ahora es manejada por setupUserDropdown
        // Se mantiene por compatibilidad pero ya no es necesaria
        console.log('✅ Sistema de logout configurado (en header)');
    }

    function handleLogout() {
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
            console.log('🚪 Cerrando sesión...');
            
            // Usar el método de authManager para logout
            if (window.authManager && typeof window.authManager.logout === 'function') {
                window.authManager.logout();
            } else {
                // Fallback manual
                localStorage.removeItem('gymtec_token');
                localStorage.removeItem('gymtec_user');
                window.location.href = 'login.html';
            }
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
