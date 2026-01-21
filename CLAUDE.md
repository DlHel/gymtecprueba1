# 📋 GYMTEC ERP - Contexto para IA

> Este archivo es leído automáticamente por asistentes de IA (Claude, Gemini, Copilot, Cursor).
> Actualizar cuando cambie la arquitectura o esquema de base de datos.

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | HTML + JavaScript Vanilla + TailwindCSS |
| Backend | Node.js + Express (server-clean.js) |
| Base de Datos | MySQL 8 (VPS: 91.107.237.159) |
| Testing | Jest + Supertest |

## 📂 Estructura del Proyecto

```
gymtecprueba1/
├── backend/
│   ├── src/
│   │   ├── server-clean.js    # 🎯 Servidor principal (9500+ líneas)
│   │   ├── db-adapter.js      # Conexión MySQL
│   │   ├── routes/
│   │   │   ├── inventory.js   # API inventario
│   │   │   └── purchase-orders.js
│   │   └── services/
│   └── tests/                 # Tests con Jest
├── frontend/
│   ├── js/                    # Módulos por página
│   │   ├── inventario.js
│   │   ├── tickets.js
│   │   └── auth.js
│   └── *.html
└── .cursorrules               # Reglas para Cursor AI
```

## 🗄️ Esquema de Base de Datos (VPS)

### Tablas Principales
| Tabla | Descripción | Columnas Clave |
|-------|-------------|----------------|
| `Tickets` | Órdenes de trabajo | id, title, status, client_id |
| `Equipment` | Equipos de gimnasio | id, custom_id, serial_number, location_id |
| `Inventory` | Stock central | id, item_name, category, current_stock |
| `Clients` | Clientes | id, name, rut, contact_email |
| `Locations` | Sedes de clientes | id, client_id, name, address |
| `Users` | Usuarios del sistema | id, username, role |

### Tablas de Inventario
| Tabla | Descripción | Columnas |
|-------|-------------|----------|
| `Inventory` | Items de stock | item_name, category (VARCHAR), current_stock |
| `InventoryMovements` | Historial de movimientos | inventory_id, movement_type, quantity |
| `spare_part_requests` | Solicitudes de repuestos | ticket_id, spare_part_id, quantity, status |
| `ticketspareparts` | Repuestos usados en tickets | ticket_id, spare_part_id, quantity_used |
| `PurchaseOrders` | Órdenes de compra | supplier, status, total_amount |
| `PurchaseOrderItems` | Items de cada OC | purchase_order_id, spare_part_id |
| `TechnicianInventory` | Stock asignado a técnicos | technician_id, inventory_id |

### ⚠️ IMPORTANTE - Diferencias de Esquema

**La tabla `Inventory` del VPS usa:**
- `category` (VARCHAR) - NO `category_id` (FK)
- `location` (VARCHAR) - NO `location_id` (FK)  
- NO tiene `is_active`

**La tabla `spare_part_requests` del VPS:**
- Usa `quantity` - NO `quantity_needed`
- Usa `notes` - NO `description`
- NO tiene `spare_part_name` (hacer JOIN con Inventory)
- NO tiene `priority`
- NO tiene `purchase_order_id`

## 🔧 Comandos Útiles

```bash
# Ejecutar tests (desde backend/)
npm test

# Ver logs del VPS
ssh root@91.107.237.159 "pm2 logs gymtec-backend --lines 30"

# Reiniciar backend VPS
ssh root@91.107.237.159 "pm2 restart gymtec-backend"

# Subir archivo al VPS
scp archivo.js root@91.107.237.159:/var/www/gymtec/backend/src/
```

## 🚨 Reglas Críticas al Modificar Código

1. **SIEMPRE ejecutar `npm test` después de cambios**
2. **Verificar esquema de BD antes de escribir queries**
3. **Usar `db.all()` y `db.get()` del db-adapter.js**
4. **Subir cambios al VPS después de probar localmente**
5. **Reiniciar PM2 después de subir cambios**

## 🔗 Endpoints API Críticos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Autenticación |
| `/api/inventory` | GET/POST | Inventario central |
| `/api/inventory/movements` | GET | Movimientos + solicitudes |
| `/api/purchase-orders` | GET/POST | Órdenes de compra |
| `/api/tickets` | GET/POST | Tickets de trabajo |
| `/api/equipment` | GET/POST | Equipos |
| `/api/clients` | GET/POST/DELETE | Clientes |

## 📝 Convenciones de Código

- **Idioma**: Respuestas siempre en español
- **SQL**: Nombres de tabla en PascalCase
- **JS**: camelCase para variables, async/await obligatorio
- **Errores**: try-catch en toda operación async
- **Frontend**: JavaScript Vanilla, NO frameworks
