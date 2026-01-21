# Análisis Funcional Profundo (Frontend <-> Backend)

Este documento mapea la lógica exacta que ocurre cuando el usuario interactúa con la interfaz.

## 1. Módulo Tickets (Funcionalidad "Crear/Editar")

### A. Frontend (`tickets.js`)
- **Disparador**: Botón "Guardar" en modal (`#ticket-form`).
- **Función JS**: `handleFormSubmit(e)` (Línea ~808).
- **Lógica de Transformación**:
    - Convierte `FormData` a objeto JSON.
    - **Regla Crítica**: Convierte campos vacíos (`location_id`, `equipment_id`, `due_date`) explícitamente a `null`.
    - **Validación**: No valida obligatoriedad en JS (confía en Backend), excepto por campos HTML `required`.
- **Llamada API**:
    - Crear: `POST /api/tickets`
    - Editar: `PUT /api/tickets/:id`

### B. Backend (`server.js` - slice actual)
- **Endpoint**: `app.post('/api/tickets')` (Línea ~1630).
- **Validación**:
    - `if (!title || !client_id || !priority) return 400`.
- **Query SQL**:
    ```sql
    INSERT INTO Tickets (...) VALUES (...)
    ```
- **Efectos Secundarios (Triggers)**:
    - Llama a `triggerNotificationProcessing('create', ticketId)`.
    - **Riesgo**: Esta función de notificación es externa e importa lógica de alertas. Si falla, ¿se crea el ticket? (Actualmente es una Promesa `.catch()` que solo loguea error, no hace rollback).

---

## 2. Módulo Planificador (Funcionalidad "Ver Calendario")

### A. Frontend (`planificador.js`)
- **Disparador**: Carga de página (`DOMContentLoaded` -> `init()`).
- **Función JS**: `api.fetchTasks()` (Línea ~52).
- **Llamada API**: `GET /api/maintenance-tasks`.
- **Lógica de Renderizado**:
    - Recibe array de objetos.
    - Mapea `scheduled_date` para el calendario.
    - **CRÍTICO**: El frontend NO hace una segunda llamada para `Tickets`. Asume que todo viene en esa única respuesta.

### B. Backend (`server.js` - slice actual)
- **Endpoint**: `app.get('/api/maintenance-tasks')` (Línea ~553).
- **Query SQL Actual (Roto)**:
    ```sql
    SELECT mt.* FROM MaintenanceTasks mt ...
    ```
- **Problema**: FALTA la unión con la tabla `Tickets`.
- **Lógica Faltante (Debe restaurarse en Modularización)**:
    ```sql
    SELECT ... FROM MaintenanceTasks
    UNION ALL
    SELECT id, title, 'ticket' as type, due_date as scheduled_date ... FROM Tickets WHERE due_date IS NOT NULL
    ```

---

## 3. Módulo Finanzas (Funcionalidad "Cotizaciones, Facturas y Gastos")

### A. Frontend (`finanzas-modals.js` y `finanzas.js`)
- **Cotizaciones/Facturas**:
    - **Disparador**: `createQuote()` / `createInvoice()` (Globales).
    - **Lógica**: Clase `FinancialModals` maneja validación y envío.
    - **API**: `POST /api/quotes` y `POST /api/invoices`.
- **Gastos (Expenses)**:
    - **Estado**: **INCOMPLETO / ROTO**.
    - **Hallazgo**: `finanzas.html` llama a `createExpense()`, pero esta función **NO existe** en `finanzas.js` ni `finanzas-modals.js`.
    - **Causa**: Probablemente se borró o no se implementó la modal de gastos en la refactorización reciente del frontend.

### B. Backend (`server.js` - slice actual)
- **Endpoint**: `app.get('/api/expenses')`.
- **Bug Crítico**:
    ```javascript
    // Línea ~6000
    sql += ` ORDER BY ... LIMIT 10${parseInt(limit,10)} ...`;
    ```
    - Esto concatena strings inintencionalmente (`10` + `20` = `"1020"`) o falla si limit es undefined.
- **Acción Corrección**:
    - Frontend: Implementar `createExpense` en `FinancialModals`.
    - Backend: Corregir sintaxis SQL en nuevo `FinanceRepository`.

---

## 4. Conclusión para Modularización
Para respetar estos flujos:
1.  **Tickets**: El nuevo `TicketsController` debe mantener la validación de nulos y asegurar que el `EventBus` emita 'TICKET_CREATED' para las notificaciones (desacoplando la llamada directa).
2.  **Planificador**: El nuevo `PlanningRepository` es el RESPONSABLE de hacer la query compleja con `UNION`. No el frontend. El frontend se mantiene intacto.
3.  **Finanzas**: Requiere reconstrucción de funcionalidad "Nuevo Gasto" en frontend y corrección SQL en backend.
