# Gymtec ERP

Este es un Sistema de Gestión (ERP) para Gymtec, diseñado para centralizar y automatizar las operaciones de mantenimiento de equipos de gimnasio.

## Descripción

La aplicación está dividida en un `frontend` (HTML, CSS con Tailwind, JS) y un `backend` (Node.js, Express, SQLite).

### Backend

El backend se encarga de la lógica de negocio, la API y la gestión de la base de datos SQLite.

Para iniciarlo:
1.  Navega a la carpeta `backend`.
2.  Instala las dependencias: `npm install`
3.  Inicia el servidor en modo de desarrollo: `npm run dev`

El servidor se ejecutará en `http://localhost:3000`.

### Frontend

El frontend es una aplicación de múltiples páginas (MPA) que consume la API del backend. Para verla, una vez que el backend esté en ejecución, abre tu navegador y visita `http://localhost:3000`. Esto te llevará al archivo `index.html`, que funciona como Dashboard principal.

La navegación se gestiona de forma centralizada a través de un menú lateral que permite acceder a los distintos módulos, cada uno en su propio archivo (`clientes.html`, `tickets.html`, etc.).

## Hoja de Ruta

El desarrollo sigue la guía proporcionada, y este es el estado actual:

1.  **[Completado]** Estructura del proyecto y configuración inicial del backend y frontend.
2.  **[Completado]** Módulo 2: Gestión completa (CRUD) de Clientes, Sedes y Equipos en `clientes.html`.
3.  **[Completado]** Módulo de Inventario: Gestión completa (CRUD) de Repuestos en `inventario.html`.
4.  **[Completado]** Módulo 3: Gestión completa (CRUD) de Tickets de Servicio en `tickets.html`.
5.  **[Completado]** Refactorización de Arquitectura: Migración de SPA a MPA con un menú de navegación centralizado y dinámico.
6.  **[Pendiente]** Módulo 1: Dashboard y Planificación (implementación de KPIs y calendario).
7.  **[Pendiente]** Módulo de Contratos y SLAs.
8.  ... y más. 