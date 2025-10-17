# Gymtec ERP - GitHub Copilot Configuration v3.1

Sistema ERP profesional para gestión de mantenimiento de equipos de gimnasio con autenticación JWT, 43+ tablas MySQL, y arquitectura modular Vanilla JS.

## 🚀 START HERE - Essential Knowledge

### Tech Stack

- **Backend**: Express.js (`backend/src/server-clean.js`, 7K+ lines) + MySQL2 + JWT Auth → Port 3000
- **Frontend**: Vanilla JavaScript (NO frameworks) + Tailwind CSS → Port 8080  
- **Database**: MySQL 8.0+ with 43+ related tables
- **Development**: `start-servers.bat` validates MySQL, starts both servers

### Critical Commands

```bash
start-servers.bat                      # Main command - starts everything
cd backend && npm start                # Backend only (uses server-clean.js)
cd backend && npm run dev              # Backend with nodemon auto-restart
cd frontend && python -m http.server 8080  # Frontend only
```

### Core Code Patterns (MANDATORY)

1. **Auth Check First**: All pages MUST check `window.authManager.isAuthenticated()` in DOMContentLoaded
2. **API Calls**: Always use `window.authManager.authenticatedFetch()` instead of `fetch()`
3. **DB Queries**: Use adapter callbacks: `db.all(sql, params, callback)` or `db.get(sql, params, callback)`
4. **Module Pattern**: Every frontend module = `state` + `api` + `ui` + `init()` inside DOMContentLoaded

### @bitacora Documentation System

When users mention `@bitacora`, reference `docs/BITACORA_PROYECTO.md` (2474 lines) for complete project context:

- `@bitacora api` → Endpoint patterns
- `@bitacora database` → 43+ table schema
- `@bitacora authentication` → JWT + AuthManager
- `@bitacora frontend` → Vanilla JS patterns
- See also: `docs/COMO_USAR_BITACORA.md` for usage guide

## 🏗️ Architecture Deep Dive

### Critical Data Flow

1. **Environment Auto-Detection**: `frontend/js/config.js` detects localhost/Codespaces, adjusts API_URL (ports 8080→3000)
2. **Database Adapter Layer**: `backend/src/db-adapter.js` wraps mysql2 to provide callback-style interface
   - `db.all(sql, params, callback)` → returns array
   - `db.get(sql, params, callback)` → returns single row
   - `db.run(sql, params, callback)` → for INSERT/UPDATE/DELETE
3. **Auth Flow**: Frontend stores JWT in localStorage → `window.authManager` → adds Bearer token to all API calls
4. **Module Loading**: Each page loads: `config.js` → `auth.js` → `base-modal.js` → `menu.js` → page-specific JS

### Key Architectural Decisions

- **No Frontend Frameworks**: Pure Vanilla JS for transparency and maintainability (see `frontend/js/*.js` - 40+ modules)
- **Single Server Entry**: `backend/src/server-clean.js` (7027 lines) - monolithic but organized by feature
- **DB Callback Pattern**: Adapter maintains SQLite-style callbacks for MySQL2 compatibility
- **Global Auth Object**: `window.authManager` available on all pages after `auth.js` loads
- **Config First**: `frontend/js/config.js` sets `window.API_URL` before other modules load

## 📊 Database Schema Essentials

**43+ Tables** - Key relationships:

**Core Entities:**

- `Users` (id, username, email, password_hash, role ENUM) - Roles: admin, manager, technician, client
- `Clients` (id, name, rut, contact_name, phone, email) - RUT is unique identifier
- `Locations` (id, client_id FK, name, address) - Gyms/branches per client
- `EquipmentModels` (id, name, type ENUM, manufacturer) - Types: Cardio, Fuerza, Funcional, Accesorios
- `Equipment` (id, model_id FK, location_id FK, serial_number, installation_date, activo BOOLEAN)

**Tickets System:**

- `Tickets` (id, title, priority ENUM, status, workflow_stage, sla_status, sla_deadline)
- `TicketChecklist` (id, ticket_id FK, description, is_completed, completed_at)
- `ChecklistTemplates` (id, template_name, items JSON) - Reusable checklist definitions
- `TicketPhotos` (id, ticket_id FK, photo_base64 LONGTEXT) - Photos stored as Base64

**Inventory System:**

- `Inventory` (id, item_code, item_name, current_stock, minimum_stock, unit_cost)
- `InventoryMovements` (id, inventory_id FK, type ENUM, quantity, technician_id FK)
- `Suppliers` (id, name, contact_name, phone, email)
- `PurchaseOrders` (id, supplier_id FK, order_date, status, total)

**CRITICAL NOTES:**

- Equipment table has NO 'status' column - use 'activo' (boolean) instead
- All queries MUST use parameterized statements: `db.all(sql, [params], callback)`
- Dates stored as MySQL DATETIME, use `toMySQLDateTime()` helper in server-clean.js
- Photos are Base64-encoded LONGTEXT (not file paths)

## 🔐 Authentication Patterns (CRITICAL)

### Frontend Auth Flow

**STEP 1** - Page Protection (every protected page):

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL: Auth check FIRST before any other code
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        window.authManager.redirectToLogin();
        return; // Stop execution
    }
    
    // Continue with page initialization...
});
```

**STEP 2** - API Calls (use authenticatedFetch):

```javascript
// ❌ WRONG - missing auth token
const response = await fetch(`${API_URL}/tickets`);

// ✅ CORRECT - includes Bearer token automatically
const response = await window.authManager.authenticatedFetch(`${API_URL}/tickets`);
```

**STEP 3** - Script Loading Order (in HTML):

```html
<script src="js/config.js"></script>          <!-- 1. API_URL -->
<script src="js/auth.js"></script>            <!-- 2. authManager -->
<script src="js/base-modal.js"></script>      <!-- 3. Modals -->
<script src="js/menu.js"></script>            <!-- 4. Navigation -->
<script src="js/your-module.js"></script>     <!-- 5. Page logic -->
```

### Backend Auth Patterns

**All protected routes use middleware**:

```javascript
// Standard pattern in backend/src/server-clean.js
app.get('/api/tickets', authenticateToken, (req, res) => {
    // req.user is populated by authenticateToken middleware
    // Contains: { id, username, role, client_id }
    const sql = `SELECT * FROM Tickets WHERE client_id = ?`;
    db.all(sql, [req.user.client_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", data: rows });
    });
});
```

## 📝 Frontend Module Pattern (MANDATORY)

Every frontend module MUST follow this structure (see `frontend/js/tickets.js` as reference):

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // 1. AUTH CHECK FIRST
    if (!window.authManager?.isAuthenticated()) {
        window.authManager.redirectToLogin();
        return;
    }
    
    // 2. STATE MANAGEMENT
    const state = {
        items: [],
        currentItem: null,
        isLoading: false,
        filters: { search: '', status: '' }
    };
    
    // 3. API FUNCTIONS
    const api = {
        fetchItems: async () => {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/items`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        },
        
        createItem: async (data) => {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create');
            return await response.json();
        }
    };
    
    // 4. UI FUNCTIONS
    const ui = {
        showLoading: () => { /* show spinner */ },
        hideLoading: () => { /* hide spinner */ },
        updateTable: (data) => { /* render data to DOM */ }
    };
    
    // 5. INITIALIZATION
    async function init() {
        try {
            ui.showLoading();
            const result = await api.fetchItems();
            state.items = result.data;
            ui.updateTable(state.items);
        } catch (error) {
            console.error('Init failed:', error);
            ui.showError(error.message);
        } finally {
            ui.hideLoading();
        }
    }
    
    init();
});
```

## 🚀 Development Workflow

### Primary Command (Start Everything)

```bash
start-servers.bat
```

This single command:

- Verifies MySQL is running
- Checks backend/config.env exists
- Installs npm dependencies if needed
- Starts backend on port 3000
- Starts frontend on port 8080

### Individual Server Commands

```bash
# Backend only
cd backend && npm start      # Production mode
cd backend && npm run dev    # Development with nodemon

# Frontend only  
cd frontend && python -m http.server 8080

# Database setup
cd backend && npm run setup-mysql
cd backend && node create-admin-user.js
```

### VS Code Tasks

Access via `Ctrl+Shift+P` → "Tasks: Run Task":

- **🚀 Start Development Servers** - Runs start-servers.bat
- **🔧 Backend Only** - Express server only
- **🌐 Frontend Only** - Static server only
- **🗄️ Setup MySQL Database** - Initialize schema
- **🔄 Reset Database** - Drop and recreate tables

## ⚠️ Common Pitfalls & Solutions

### 1. Equipment Status Column

```javascript
// ❌ WRONG - Equipment table has NO 'status' column
const sql = `SELECT * FROM Equipment WHERE status = 'active'`;

// ✅ CORRECT - Use 'activo' (boolean) column instead
const sql = `SELECT * FROM Equipment WHERE activo = 1`;
```

### 2. Missing Authentication

```javascript
// ❌ WRONG - tickets.js currently missing auth imports
<script src="js/tickets.js"></script>

// ✅ CORRECT - Load auth.js BEFORE module
<script src="js/config.js"></script>
<script src="js/auth.js"></script>
<script src="js/tickets.js"></script>
```

### 3. Database Adapter Pattern

```javascript
// ✅ REQUIRED - Use callback-style adapter for MySQL2
db.all('SELECT * FROM Tickets WHERE id = ?', [ticketId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: rows });
});

// ✅ ALTERNATIVE - Async/await also supported
const rows = await db.allAsync('SELECT * FROM Tickets WHERE id = ?', [ticketId]);
```

### 4. Photo Storage

```javascript
// ✅ Photos are stored as Base64 LONGTEXT in database
INSERT INTO TicketPhotos (ticket_id, photo_base64) VALUES (?, ?)

// NOT as file paths - everything in DB for portability
```

## 🔍 Key Files Reference

### Backend

- `backend/src/server-clean.js` (7027 lines) - Main server, all routes
- `backend/src/db-adapter.js` - MySQL2 callback wrapper
- `backend/src/mysql-database.js` - MySQL connection pool
- `backend/database/mysql-schema.sql` - Complete DB schema

### Frontend  

- `frontend/js/config.js` - Auto-detects environment, sets API_URL
- `frontend/js/auth.js` - AuthManager class, JWT handling
- `frontend/js/base-modal.js` - Reusable modal system
- `frontend/js/tickets.js` (2736 lines) - Example of module pattern

### Documentation

- `docs/BITACORA_PROYECTO.md` (2474 lines) - Complete project history
- `docs/COMO_USAR_BITACORA.md` - @bitacora usage guide
- `.github/copilot-instructions.md` - This file (protected)
