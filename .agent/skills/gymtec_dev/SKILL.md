---
name: GymTec ERP Development
description: Estándares y flujos de trabajo para el desarrollo en GymTec ERP (Node.js/Express + Alpine.js + MySQL).
version: 1.0.0
---

# GymTec ERP Developer Guide

Este skill encapsula las mejores prácticas y arquitecturas definidas para el proyecto GymTec ERP. **Debes** seguir estas guías al modificar o crear nuevo código.

## 1. Stack Tecnológico

- **Backend**: Node.js con Express.
  - **Validación**: OBLIGATORIO usar `Zod` para validar inputs en controladores (`backend/src/middleware/validateResource.js`).
  - **Base de Datos**: MySQL (usando driver `mysql2` o adapter similar).
  - **Módulos**: Preferir estructura modular en `backend/src/modules/` en lugar de agregar todo a `server-clean.js`.

- **Frontend**: HTML5 + Vanilla JS + Alpine.js.
  - **Reactividad**: Usar **Alpine.js** (`x-data`, `x-bind`, `x-model`) para interactividad de UI.
  - **Legacy**: Evitar jQuery. Refactorizar Vanilla JS imperativo (selectores manuales `document.getElementById`) a declarativo con Alpine cuando sea posible.
  - **Estilos**: TailwindCSS.
  - **Iconos**: Lucide Icons (`data-lucide`).

- **Infraestructura**: Docker y Docker Compose para entorno local.

## 2. Convenciones de Código

### Backend
- **Rutas**: Definir en `backend/src/routes/` o módulos específicos.
- **Manejo de Errores**: Retornar JSON con estructura `{ message: "error", error: "detalle" }`.
- **Async/Await**: Usar siempre en operaciones de BD.

### Frontend
- **Componentes Alpine**:
  - Definir lógica en archivos `.js` separados usando `Alpine.data('nombreComponente', () => ({ ... }))`.
  - Inicializar en HTML con `x-data="nombreComponente()"`.
- **Modales**: Usar patrón `x-show` con transición para modales, controlados por variables booleanas (`isOpen`).

## 3. Base de Datos (MySQL)
- **Tabla `InformesTecnicos`**:
  - `ticket_id` es obligatorio.
  - `technician_id` y `generated_by` pueden ser NULL (no asumir valor por defecto).
  - `client_email` debe validarse antes de insertar.

## 4. Flujo de Trabajo
1. **Validación**: Siempre crear esquema Zod antes de tocar el endpoint.
2. **Implementación**: Modificar código siguiendo patrón existente.
3. **Verificación**: Usar `task_boundary` para documentar pruebas.

## 5. Recursos Comunes
- `window.authenticatedFetch`: Usar para todas las llamadas al API (maneja tokens JWT).
- `window.API_URL`: Constante global para endpoints.
