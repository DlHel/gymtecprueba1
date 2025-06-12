document.addEventListener("DOMContentLoaded", () => {
    const menuPlaceholder = document.getElementById("menu-placeholder");
    if (!menuPlaceholder) return;

    fetch("menu.html")
        .then(response => response.text())
        .then(data => {
            menuPlaceholder.innerHTML = data;

            const sidebar = document.getElementById('main-sidebar');
            const desktopToggle = document.getElementById('sidebar-toggle');
            const mobileToggle = document.getElementById('mobile-sidebar-toggle');
            
            // Lógica para el botón de minimizar/expandir en escritorio
            if (desktopToggle) {
                desktopToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('is-collapsed');
                    lucide.createIcons(); // Vuelve a renderizar íconos por si cambian
                });
            }

            // Lógica para el botón de menú en móvil
            if (mobileToggle) {
                mobileToggle.addEventListener('click', () => {
                    sidebar.classList.add('is-open');
                });
            }

            // Lógica para cerrar el menú en móvil al hacer clic fuera
            menuPlaceholder.addEventListener('click', (e) => {
                // Si el clic fue en el overlay (el propio placeholder con ::before)
                if (e.target === menuPlaceholder && sidebar.classList.contains('is-open')) {
                    sidebar.classList.remove('is-open');
                }
            });

            // Activar el enlace de la página actual
            const currentPage = window.location.pathname.split("/").pop();
            const navLinks = document.querySelectorAll("#main-nav .nav-link");
            navLinks.forEach(link => {
                if (link.getAttribute("href") === currentPage) {
                    link.classList.add("active");
                }
            });

            // Inicializar íconos
            lucide.createIcons();
        })
        .catch(error => console.error("Error loading navigation:", error));
}); 