# Gymtec ERP - Mapeo Arquitectura Frontend ↔ Backend

## Resumen del Sistema

| Componente | Tecnología | Ubicación |
|------------|------------|-----------|
| Frontend | HTML + Vanilla JS + TailwindCSS | `/frontend/` |
| Backend | Node.js + Express | `/backend/src/` |
| Database | MySQL | VPS: `gymtec_erp` |
| Deploy | PM2 + Nginx | `91.107.237.159` |

---

## 📄 Módulos Frontend → Backend

### Autenticación
| Frontend | Backend | Tablas |
|----------|---------|--------|
| login.html | `/api/auth/*` | `Users`, `Roles` |
| auth.js | `authRoutes.js` | `menu_roles` |

---

### Dashboard
| Frontend | Backend | Tablas |
|----------|---------|--------|
| index.html | `/api/dashboard/*` | Múltiples (agregaciones) |
| dashboard.js | `server-clean.js` | `Tickets`, `Clients`, `Equipment` |

---

### Tickets
| Frontend | Backend | Tablas |
|----------|---------|--------|
| tickets.html | `/api/tickets/*` | `Tickets` |
| tickets.js | `server-clean.js` | `TicketNotes`, `TicketPhotos` |
| ticket-detail.html | `/api/tickets/:id/*` | `TicketSpareParts`, `TicketChecklist` |
| ticket-detail.js | | `TicketEquipmentScope`, `TicketTimeEntries` |
| ticket-detail-modals.js | | `spare_part_requests` |

**Endpoints de Tickets:**
```
GET    /api/tickets                    → Lista tickets
GET    /api/tickets/:id                → Detalle ticket
POST   /api/tickets                    → Crear ticket individual
POST   /api/tickets/gimnacion          → Crear ticket gimnación
PUT    /api/tickets/:id                → Actualizar ticket
DELETE /api/tickets/:id                → Eliminar ticket
GET    /api/tickets/:id/equipment-scope → Equipos asociados (gimnación)
GET    /api/tickets/:id/spare-parts/requests → Solicitudes repuestos
POST   /api/tickets/:id/notes          → Agregar nota
POST   /api/tickets/:id/photos         → Subir foto
```

---

### Clientes
| Frontend | Backend | Tablas |
|----------|---------|--------|
| clientes.html | `/api/clients/*` | `Clients` |
| clientes.js | `server-clean.js` | `Locations`, `Contracts` |

---

### Equipos
| Frontend | Backend | Tablas |
|----------|---------|--------|
| equipos.html | `/api/equipment/*` | `Equipment` |
| equipos.js | `server-clean.js` | `EquipmentModels`, `EquipmentNotes` |
| equipo.html (detalle) | `/api/equipment/:id` | `EquipmentPhotos` |

---

### Modelos de Equipo
| Frontend | Backend | Tablas |
|----------|---------|--------|
| modelos.html | `/api/models/*` | `EquipmentModels` |
| modelos.js | `server-clean.js` | `ModelManuals`, `ModelPhotos` |

---

### Inventario
| Frontend | Backend | Tablas |
|----------|---------|--------|
| inventario.html | `/api/inventory/*` | `Inventory` |
| inventario.js | inventory.js (routes) | `InventoryCategories` |
| | | `InventoryTransactions`, `Suppliers` |

**Endpoints:**
```
GET    /api/inventory                  → Lista inventario
POST   /api/inventory                  → Crear item
PUT    /api/inventory/:id              → Actualizar item
DELETE /api/inventory/:id              → Eliminar item
GET    /api/inventory/spare-part-requests → Solicitudes repuestos
POST   /api/inventory/spare-part-requests → Crear solicitud
```

---

### Finanzas
| Frontend | Backend | Tablas |
|----------|---------|--------|
| finanzas.html | `/api/expenses/*` | `Expenses` |
| finanzas.js | expenses.js (routes) | `ExpenseCategories` |
| finanzas-modals.js | | `Invoices`, `Quotes` |

---

### Contratos
| Frontend | Backend | Tablas |
|----------|---------|--------|
| contratos.html | `/api/contracts/*` | `Contracts` |
| contratos.js | `server-clean.js` | `Contract_Equipment` |
| | contracts-sla.js | `SLAs` |

---

### Personal
| Frontend | Backend | Tablas |
|----------|---------|--------|
| personal.html | `/api/users/*` | `Users` |
| personal.js | `server-clean.js` | `Roles` |
| | | `WorkSchedules`, `ShiftTypes` |

---

### Asistencia
| Frontend | Backend | Tablas |
|----------|---------|--------|
| asistencia.html | `/api/attendance/*` | `Attendance` |
| asistencia.js | `server-clean.js` | `EmployeeSchedules` |
| | | `LeaveRequests`, `Overtime` |

---

### Órdenes de Compra
| Frontend | Backend | Tablas |
|----------|---------|--------|
| (dentro de inventario) | `/api/purchase-orders/*` | `PurchaseOrders` |
| | purchase-orders.js | `PurchaseOrderItems` |

---

## 🔗 Componentes Compartidos

### JavaScript Compartido
| Archivo | Usado por | Función |
|---------|-----------|---------|
| config.js | **Todos** | API_URL, authenticatedFetch |
| auth.js | **Todos** | authManager, token handling |
| nav-loader.js | **Todos** | Carga menú lateral |
| base-modal.js | **Todos** | Sistema de modales |
| toast-notifications.js | **Todos** | showNotification() |
| permissions.js | Varios | Control permisos UI |

### Tablas Compartidas
| Tabla | Usada por módulos |
|-------|-------------------|
| `Users` | Auth, Personal, Tickets, Asistencia |
| `Clients` | Dashboard, Tickets, Contratos, Equipos |
| `Locations` | Clientes, Equipos, Inventario, Tickets |
| `Equipment` | Equipos, Tickets (gimnación), Contratos |
| `SpareParts` | Inventario, Tickets |

---

## 🗄️ Estructura de Tablas (56 total)

### Diagrama de Relaciones
```
Clients ──┬── Locations ── Equipment ── EquipmentModels
          └── Contracts ── Contract_Equipment
          
Tickets ──┬── TicketNotes
          ├── TicketPhotos
          ├── TicketSpareParts ── SpareParts
          ├── TicketEquipmentScope ── Equipment
          └── spare_part_requests

Users ──┬── Attendance
        └── Tickets (assigned_to)
        
Inventory ── InventoryTransactions
PurchaseOrders ── PurchaseOrderItems
```

---

## ⚠️ Problemas Conocidos / Inconsistencias

| Problema | Ubicación | Estado |
|----------|-----------|--------|
| Tabla `Inventory` usa columnas simples (strings) vs código espera JOINs | `inventory.js` | ✅ Corregido |
| `TicketEquipmentScope` no tiene `is_included` | `server-clean.js` | ✅ Corregido |
| `spare_part_requests.requested_by` es INT, no username | `server-clean.js` | ✅ Corregido |
| Tablas duplicadas (mayús/minús): `TicketNotes` vs `ticketnotes` | BD | ⚠️ Pendiente cleanup |
| `EquipmentModels` a veces no existe para equipos | JOINs | Usar LEFT JOIN |

---

## 📁 Archivos del Backend

### Rutas Principales (server-clean.js)
- Autenticación
- Usuarios
- Clientes y Sedes
- Equipos
- Tickets (CRUD + gimnación)
- Dashboard

### Rutas Modulares (/routes/)
| Archivo | Endpoints |
|---------|-----------|
| `authRoutes.js` | /api/auth/* |
| `inventory.js` | /api/inventory/* |
| `purchase-orders.js` | /api/purchase-orders/* |
| `expenses.js` | /api/expenses/* |
| `contracts-sla.js` | /api/contracts/*/sla |
| `locations.js` | /api/locations/* |

---

*Documento generado: 2026-01-02*
