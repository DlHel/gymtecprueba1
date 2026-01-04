# Gymtec ERP - Documentación Rigurosa de APIs

## Índice
1. [Autenticación](#1-autenticación)
2. [Dashboard](#2-dashboard)
3. [Tickets](#3-tickets)
4. [Clientes](#4-clientes)
5. [Sedes/Locations](#5-sedeslocations)
6. [Equipos](#6-equipos)
7. [Modelos de Equipo](#7-modelos-de-equipo)
8. [Inventario](#8-inventario)
9. [Órdenes de Compra](#9-órdenes-de-compra)
10. [Finanzas/Gastos](#10-finanzasgastos)
11. [Contratos](#11-contratos)
12. [Personal/Usuarios](#12-personalusuarios)
13. [Asistencia](#13-asistencia)
14. [Notificaciones](#14-notificaciones)
15. [SLA](#15-sla)
16. [Workflows Inter-Módulos](#16-workflows-inter-módulos)

---

## 1. Autenticación

### Backend: `authRoutes.js` montado en `/api/auth`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| POST | `/api/auth/login` | Login usuario | `auth.js` → `login()` |
| POST | `/api/auth/logout` | Logout | `auth.js` → `logout()` |
| GET | `/api/auth/verify` | Verificar token | `auth.js` → `verifyToken()` |
| POST | `/api/auth/refresh` | Renovar token | `auth.js` |
| POST | `/api/auth/change-password` | Cambiar contraseña | `change-password.js` |

### Tablas: `Users`, `Roles`, `menu_roles`

---

## 2. Dashboard

### Backend: `server-clean.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/dashboard/kpis-enhanced` | KPIs principales | `dashboard.js:45` |
| GET | `/api/dashboard/critical-alerts` | Alertas críticas | `dashboard.js:61` |
| GET | `/api/dashboard/resources-summary` | Resumen recursos | `dashboard.js:75` |
| GET | `/api/dashboard/financial-summary` | Resumen financiero | `dashboard.js:89` |
| GET | `/api/dashboard/inventory-summary` | Resumen inventario | `dashboard.js:103` |
| GET | `/api/dashboard/contracts-sla-summary` | Resumen SLA | `dashboard.js:117` |
| GET | `/api/dashboard/activity` | Actividad reciente | `dashboard.js:131` |

### Tablas: Agregaciones de `Tickets`, `Clients`, `Equipment`, `Expenses`, `Inventory`

---

## 3. Tickets

### Backend: `server-clean.js`

| Método | Endpoint | Descripción | Frontend | Línea Backend |
|--------|----------|-------------|----------|---------------|
| GET | `/api/tickets` | Listar tickets | `tickets.js` | 1630 |
| GET | `/api/tickets/:id` | Detalle ticket | `ticket-detail.js` | 1680 |
| GET | `/api/tickets/:id/detail` | Detalle extendido | `ticket-detail.js` | 1712 |
| POST | `/api/tickets` | Crear ticket individual | `tickets.js` | 1828 |
| PUT | `/api/tickets/:id` | Actualizar ticket | `tickets.js` | 1901 |
| DELETE | `/api/tickets/:id` | Eliminar ticket | `tickets.js` | 1946 |
| GET | `/api/tickets/:id/equipment-scope` | Equipos gimnación | `ticket-detail.js` | 1862 |
| POST | `/api/tickets/gimnacion` | Crear ticket gimnación | `tickets.js` | 3320 |
| GET | `/api/tickets/:id/gimnacion-details` | Detalle gimnación | `ticket-detail.js` | 3456 |
| GET | `/api/tickets/:id/informe-data` | Datos para informe | `informes-tecnicos.js` | 9218 |

### Notas de Ticket
| Método | Endpoint | Frontend |
|--------|----------|----------|
| GET | `/api/tickets/:ticketId/notes` | `ticket-detail.js` |
| POST | `/api/tickets/:ticketId/notes` | `ticket-detail.js` |
| DELETE | `/api/tickets/notes/:noteId` | `ticket-detail.js` |

### Fotos de Ticket
| Método | Endpoint | Frontend |
|--------|----------|----------|
| GET | `/api/tickets/:ticketId/photos` | `ticket-detail.js` |
| POST | `/api/tickets/:ticketId/photos` | `ticket-detail.js` |
| DELETE | `/api/tickets/photos/:photoId` | `ticket-detail.js` |

### Repuestos de Ticket
| Método | Endpoint | Frontend |
|--------|----------|----------|
| POST | `/api/tickets/:ticketId/spare-parts` | `ticket-detail.js` |
| GET | `/api/tickets/:ticketId/spare-parts/requests` | `ticket-detail.js` |

### Tablas: `Tickets`, `TicketNotes`, `TicketPhotos`, `TicketSpareParts`, `TicketEquipmentScope`, `TicketTimeEntries`, `TicketChecklist`, `spare_part_requests`

---

## 4. Clientes

### Backend: `server-clean.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/clients` | Listar clientes | `clientes.js:270` |
| GET | `/api/clients/:id` | Detalle cliente | `clientes.js:317` |
| POST | `/api/clients` | Crear cliente | `clientes.js` |
| PUT | `/api/clients/:id` | Actualizar cliente | `clientes.js:1326` |
| DELETE | `/api/clients/:id` | Eliminar cliente | `clientes.js:429` |
| GET | `/api/clients/:id/locations` | Sedes de cliente | `clientes.js:329` |

### Tablas: `Clients`

---

## 5. Sedes/Locations

### Backend: `routes/locations.js` montado en `/api/locations`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/locations` | Listar sedes | `equipos.js:66` |
| GET | `/api/locations/:id` | Detalle sede | `clientes.js:342` |
| POST | `/api/locations` | Crear sede | `clientes.js` |
| PUT | `/api/locations/:id` | Actualizar sede | `clientes.js` |
| DELETE | `/api/locations/:id` | Eliminar sede | `clientes.js` |
| GET | `/api/locations/:id/equipment` | Equipos de sede | `clientes.js:355` |
| GET | `/api/locations/:id/stats` | Estadísticas sede | `clientes.js` |

### Tablas: `Locations`

---

## 6. Equipos

### Backend: `server-clean.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/equipment` | Listar equipos | `equipos.js:36` |
| GET | `/api/equipment/:id` | Detalle equipo | `equipo.js:23`, `equipment-drawer.js:116` |
| POST | `/api/equipment` | Crear equipo | `equipo.js:532` |
| PUT | `/api/equipment/:id` | Actualizar equipo | `equipos.js` |
| DELETE | `/api/equipment/:id` | Eliminar equipo | `equipos.js` |
| GET | `/api/equipment/:id/tickets` | Tickets del equipo | `equipo.js:24`, `equipment-drawer.js:405` |
| GET | `/api/equipment/:id/notes` | Notas del equipo | `equipo.js:25`, `equipment-drawer.js:360` |
| POST | `/api/equipment/:id/notes` | Agregar nota | `equipo.js:26`, `equipment-drawer.js:666` |
| DELETE | `/api/equipment/notes/:noteId` | Eliminar nota | `equipo.js:31`, `equipment-drawer.js:703` |
| GET | `/api/equipment/:id/photos` | Fotos equipo | `equipment-drawer.js:775` |
| POST | `/api/equipment/:id/photos` | Subir foto | `equipment-drawer.js:873` |
| DELETE | `/api/equipment/photos/:photoId` | Eliminar foto | `equipment-drawer.js:962` |

### Tablas: `Equipment`, `EquipmentNotes`, `EquipmentPhotos`

---

## 7. Modelos de Equipo

### Backend: `server-clean.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/models` | Listar modelos | `modelos.js`, `clientes.js:778` |
| GET | `/api/models/:id` | Detalle modelo | `modelos.js` |
| POST | `/api/models` | Crear modelo | `modelos.js` |
| PUT | `/api/models/:id` | Actualizar modelo | `modelos.js` |
| DELETE | `/api/models/:id` | Eliminar modelo | `modelos.js` |
| GET | `/api/models/:id/main-photo` | Foto principal | `equipment-drawer.js:737` |
| GET | `/api/models/:id/photos` | Fotos del modelo | `modelos.js` |
| GET | `/api/models/:id/manuals` | Manuales | `modelos.js` |

### Tablas: `EquipmentModels`, `ModelPhotos`, `ModelManuals`

---

## 8. Inventario

### Backend: `routes/inventory.js` montado en `/api/inventory`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/inventory` | Listar inventario | `inventario.js`, `ticket-detail.js` |
| POST | `/api/inventory` | Crear item | `inventario.js` |
| PUT | `/api/inventory/:id` | Actualizar item | `inventario.js` |
| GET | `/api/inventory/movements` | Movimientos | `inventario.js` |
| GET | `/api/inventory/low-stock` | Items bajo stock | `inventario.js` |
| GET | `/api/inventory/spare-parts` | Lista repuestos | `inventario.js` |
| GET | `/api/inventory/technicians` | Técnicos | `inventario.js` |
| GET | `/api/inventory/spare-part-requests` | Solicitudes | `inventario.js` |
| POST | `/api/inventory/spare-part-requests` | Crear solicitud | `ticket-detail.js` |
| PUT | `/api/inventory/spare-part-requests/:id/approve` | Aprobar | `inventario.js` |
| PUT | `/api/inventory/spare-part-requests/:id/reject` | Rechazar | `inventario.js` |
| GET | `/api/inventory/categories` | Categorías | `inventario.js` |

### Tablas: `Inventory`, `InventoryCategories`, `InventoryTransactions`, `SpareParts`, `SparePartRequests`, `spare_part_requests`

---

## 9. Órdenes de Compra

### Backend: `routes/purchase-orders.js` montado en `/api/purchase-orders`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/purchase-orders` | Listar órdenes | `inventario.js` |
| GET | `/api/purchase-orders/:id` | Detalle orden | `inventario.js` |
| POST | `/api/purchase-orders` | Crear orden | `inventario.js` |
| PUT | `/api/purchase-orders/:id` | Actualizar orden | `inventario.js` |
| PUT | `/api/purchase-orders/:id/status` | Cambiar estado | `inventario.js` |

### Tablas: `PurchaseOrders`, `PurchaseOrderItems`

---

## 10. Finanzas/Gastos

### Backend: `routes/expenses.js` y `server-clean.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/expenses` | Listar gastos | `finanzas.js` |
| POST | `/api/expenses` | Crear gasto | `finanzas.js` |
| PUT | `/api/expenses/:id` | Actualizar gasto | `finanzas.js` |
| DELETE | `/api/expenses/:id` | Eliminar gasto | `finanzas.js` |
| PUT | `/api/expenses/:id/approve` | Aprobar gasto | `finanzas.js` |
| PUT | `/api/expenses/:id/reject` | Rechazar gasto | `finanzas.js` |
| GET | `/api/expense-categories` | Categorías | `finanzas.js` |
| GET | `/api/invoices` | Facturas | `finanzas.js` |
| GET | `/api/quotes` | Cotizaciones | `finanzas.js` |

### Tablas: `Expenses`, `ExpenseCategories`, `Invoices`, `Quotes`

---

## 11. Contratos

### Backend: `server-clean.js`, `routes/contracts-sla.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/contracts` | Listar contratos | `contratos.js:90` |
| GET | `/api/contracts/:id` | Detalle contrato | `contratos.js` |
| POST | `/api/contracts` | Crear contrato | `contratos.js:118` |
| PUT | `/api/contracts/:id` | Actualizar contrato | `contratos.js:137` |
| DELETE | `/api/contracts/:id` | Eliminar contrato | `contratos.js:156` |
| GET | `/api/contracts/:id/equipment` | Equipos del contrato | `contratos.js` |
| POST | `/api/contracts/:id/generate-tasks` | Generar tareas | `task-generator.js` |

### Tablas: `Contracts`, `Contract_Equipment`, `SLAs`

---

## 12. Personal/Usuarios

### Backend: `server-clean.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/users` | Listar usuarios | `personal.js` |
| GET | `/api/users/:id` | Detalle usuario | `personal.js` |
| POST | `/api/users` | Crear usuario | `personal.js` |
| PUT | `/api/users/:id` | Actualizar usuario | `personal.js` |
| DELETE | `/api/users/:id` | Eliminar usuario | `personal.js` |
| GET | `/api/roles` | Listar roles | `personal.js` |
| GET | `/api/technicians` | Listar técnicos | `tickets.js` |

### Tablas: `Users`, `Roles`

---

## 13. Asistencia

### Backend: `server-clean.js`

| Método | Endpoint | Descripción | Frontend |
|--------|----------|-------------|----------|
| GET | `/api/attendance` | Registros asistencia | `asistencia.js` |
| POST | `/api/attendance/check-in` | Marcar entrada | `asistencia.js` |
| POST | `/api/attendance/check-out` | Marcar salida | `asistencia.js` |
| GET | `/api/attendance/today` | Asistencia hoy | `asistencia.js` |
| GET | `/api/schedules` | Horarios | `asistencia.js` |
| GET | `/api/employee-schedules` | Horarios empleados | `asistencia.js` |

### Tablas: `Attendance`, `EmployeeSchedules`, `WorkSchedules`, `ShiftTypes`

---

## 14. Notificaciones

### Backend: `routes/notifications.js` montado en `/api/notifications`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/notifications` | Listar notificaciones |
| GET | `/api/notifications/templates` | Plantillas |
| POST | `/api/notifications/templates` | Crear plantilla |
| PUT | `/api/notifications/templates/:id` | Actualizar plantilla |
| DELETE | `/api/notifications/templates/:id` | Eliminar plantilla |
| GET | `/api/notifications/queue` | Cola de envío |
| POST | `/api/notifications/send` | Enviar notificación |
| GET | `/api/notifications/logs` | Logs |
| GET | `/api/notifications/stats` | Estadísticas |

---

## 15. SLA

### Backend: `routes/sla-processor.js` montado en `/api/sla`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/sla/monitor` | Ejecutar monitoreo |
| GET | `/api/sla/statistics` | Estadísticas |
| GET | `/api/sla/rules` | Reglas SLA |
| GET | `/api/sla/violations` | Violaciones |
| GET | `/api/sla/dashboard` | Dashboard SLA |
| GET | `/api/sla/trends` | Tendencias |
| GET | `/api/sla/priority-distribution` | Distribución prioridad |
| GET | `/api/sla/predict` | Predicciones |

---

## 16. Workflows Inter-Módulos

### Ticket → Solicitud Repuesto → Inventario → Orden Compra
```
1. Usuario abre ticket (tickets.js)
2. Solicita repuesto (ticket-detail.js → POST /api/tickets/:id/spare-parts)
   o crea solicitud (ticket-detail.js → POST /api/inventory/spare-part-requests)
3. Admin aprueba en inventario (inventario.js → PUT /api/inventory/spare-part-requests/:id/approve)
4. Se genera orden de compra (inventario.js → POST /api/purchase-orders)
```

### Cliente → Sede → Equipos → Tickets
```
1. Crear cliente (clientes.js → POST /api/clients)
2. Agregar sede (clientes.js → POST /api/locations)
3. Agregar equipo a sede (clientes.js → POST /api/equipment)
4. Crear ticket asociado a equipo (tickets.js → POST /api/tickets)
```

### Contrato → SLA → Tickets
```
1. Crear contrato (contratos.js → POST /api/contracts)
2. Definir SLA del contrato (contracts-sla.js)
3. Tickets heredan tiempos SLA del contrato del cliente
4. Monitor SLA verifica cumplimiento (sla-processor.js)
```

---

## Botones y Acciones por Módulo

### tickets.html
| Botón | Acción | Endpoint |
|-------|--------|----------|
| Nuevo Ticket | Abre modal crear | POST /api/tickets |
| Ticket Gimnación | Abre modal gimnación | POST /api/tickets/gimnacion |
| Editar (icono) | Abre modal editar | PUT /api/tickets/:id |
| Eliminar (icono) | Confirma y elimina | DELETE /api/tickets/:id |
| Ver (icono) | Navega a detalle | - |

### ticket-detail.html
| Botón | Acción | Endpoint |
|-------|--------|----------|
| Cambiar Estado | Dropdown estados | PUT /api/tickets/:id |
| Agregar Nota | Input y enviar | POST /api/tickets/:id/notes |
| Subir Foto | Modal upload | POST /api/tickets/:id/photos |
| Solicitar Repuesto | Modal repuesto | POST /api/inventory/spare-part-requests |
| Eliminar Nota | Confirma | DELETE /api/tickets/notes/:id |
| Eliminar Foto | Confirma | DELETE /api/tickets/photos/:id |

### clientes.html
| Botón | Acción | Endpoint |
|-------|--------|----------|
| Nuevo Cliente | Modal crear | POST /api/clients |
| Editar Cliente | Modal editar | PUT /api/clients/:id |
| Eliminar Cliente | Confirma | DELETE /api/clients/:id |
| Agregar Sede | Modal sede | POST /api/locations |
| Ver Equipos | Expande | GET /api/locations/:id/equipment |

### inventario.html
| Botón | Acción | Endpoint |
|-------|--------|----------|
| Nuevo Item | Modal crear | POST /api/inventory |
| Editar Item | Modal editar | PUT /api/inventory/:id |
| Ver Solicitudes | Cambia tab | GET /api/inventory/spare-part-requests |
| Aprobar Solicitud | Confirma | PUT /api/inventory/spare-part-requests/:id/approve |
| Rechazar Solicitud | Confirma | PUT /api/inventory/spare-part-requests/:id/reject |

---

*Documento generado: 2026-01-02*
*Total endpoints documentados: 100+*
