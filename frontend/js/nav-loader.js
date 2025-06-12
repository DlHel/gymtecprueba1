document.addEventListener("DOMContentLoaded", () => {
    const menuPlaceholder = document.getElementById("menu-placeholder");
    if (menuPlaceholder) {
        fetch("menu.html")
            .then(response => response.text())
            .then(data => {
                menuPlaceholder.innerHTML = data;
                
                // Activate current page link
                const currentPage = window.location.pathname.split("/").pop();
                const navLinks = document.querySelectorAll("#main-nav .nav-link");
                
                navLinks.forEach(link => {
                    if (link.getAttribute("href") === currentPage) {
                        link.classList.add("active");
                    }
                });

                // Initialize icons
                lucide.createIcons();
            })
            .catch(error => console.error("Error loading navigation:", error));
    }
}); 