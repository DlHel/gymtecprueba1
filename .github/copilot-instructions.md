# Gymtec ERP - GitHub Copilot Instructions

Este es un sistema ERP completo para gestión de mantenimiento de equipos de gimnasio.

## 🏗️ Arquitectura del Sistema

**Stack**: Node.js + Express + MySQL2 + JavaScript Vanilla (NO frameworks frontend)
- **Backend**: `backend/src/server.js` (2700+ líneas) con APIs REST completas
- **Frontend**: HTML/CSS/JS vanilla modular, un archivo por módulo (`frontend/js/`)
- **Base de datos**: MySQL con esquema específico (`backend/database/mysql-schema.sql`)

### Flujo de Datos Crítico
1. Frontend usa detección automática de entorno (`frontend/js/config.js`)
2. Backend usa adaptador de compatibilidad SQLite→MySQL (`backend/src/db-adapter.js`)
3. Todos los módulos frontend siguen patrón: `state` + `api` + `DOMContentLoaded`

## 🚀 Comandos de Desarrollo

```bash
# Iniciar servidores (comando principal)
start-servers.bat  # Verifica MySQL, inicia backend:3000 + frontend:8080

# Backend individual
cd backend && npm start  # node src/server.js

# Setup inicial MySQL (solo una vez)
cd backend && npm run setup-mysql
```

## 📋 Patrones Específicos del Proyecto

### Frontend JavaScript Vanilla
```javascript
// Patrón estándar en cada módulo (ej: clientes.js, tickets.js)
document.addEventListener('DOMContentLoaded', () => {
    const state = {
        data: [],
        currentItem: null
    };
    
    const api = {
        getData: async () => {
            const response = await fetch(`${API_URL}/endpoint`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        }
    };
});
```

### Backend Express con MySQL
```javascript
// Patrón típico de ruta API (usar db-adapter, no mysql2 directo)
app.get('/api/endpoint', (req, res) => {
    const sql = `SELECT col FROM table WHERE condition = ?`;
    db.all(sql, [param], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "success", data: rows });
    });
});
```

### Sistema de Archivos
- **Imágenes**: Multer → `uploads/models/` → luego convertir a base64 en BD
- **Manuales**: Multer memory → directo base64 en tabla `ModelManuals`
- **Límites**: 5MB imágenes, 10MB manuales

## 🗃️ Estructura de Base de Datos

**Tablas principales**: `Clients`, `Locations`, `Equipment`, `EquipmentModels`, `Tickets`, `Users`
- **RUT único**: Validación chilena en `validators.js`
- **Custom IDs**: Equipos tienen `custom_id` + `id` numérico
- **Estados**: ENUMs específicos (tickets: "Pendiente", "En Progreso", "Cerrado")

### Relaciones Críticas
```sql
Equipment.location_id → Locations.id → Clients.id
Equipment.model_id → EquipmentModels.id
Tickets.equipment_id → Equipment.id
```

## 🔧 Configuración de Entorno

**Archivo clave**: `backend/config.env` (copiar de `.example`)
```env
DB_HOST=localhost  # XAMPP local
DB_NAME=gymtec_erp
DB_USER=root
DB_PASSWORD=
```

### Detección de Entorno Frontend
`config.js` detecta automáticamente:
- Puerto 8080 → backend en localhost:3000
- Puerto 3000 → rutas relativas `/api`
- GitHub Codespaces → manejo específico de URLs

## 🎯 Módulos Funcionales

- **`clientes.html`**: CRUD completo con RUT, drawer de equipos
- **`tickets.html`**: Sistema de servicios con SLA, fotos, repuestos
- **`modelos.html`**: Catálogo equipos con fotos/manuales base64
- **`inventario.html`**: Control stock repuestos
- **`personal.html`**: Gestión usuarios y roles

### Sistema de Modales
Patrón unificado en `css/style.css`:
```css
.modal { /* backdrop */ }
.modal-content { /* contenedor principal */ }
.modal-header, .modal-body, .modal-footer { /* estructura */ }
```

## ⚠️ Convenciones Críticas

1. **NO usar frameworks**: React, Vue, jQuery - solo vanilla JS
2. **MySQL via adaptador**: Usar `db.all()`, `db.get()`, `db.run()` del adaptador
3. **Un archivo por módulo**: `nombre.html` + `js/nombre.js` + `css/nombre.css`
4. **Manejo de errores**: Siempre `response.ok` check + `try/catch`
5. **Estados loading**: Cada módulo maneja `loading-state` y `empty-state`

## 🔍 Debugging

- **Test páginas**: `test-*.html` para probar funcionalidades
- **Logs backend**: Console con emojis (✅ ❌ 💡)
- **Config debug**: `debug-*.html` para diagnóstico específico
