/**
 * MAPEO COMPLETO DE COMUNICACIÓN FRONTEND-BACKEND
 * Sistema de Tickets - Gymtec ERP v3.0
 */

// =============================================================================
// CONFIGURACIÓN BASE
// =============================================================================

// 1. config.js - Detección automática de entorno
const API_URL = (() => {
    // localhost → http://localhost:3000/api
    // Codespaces → https://[workspace]-3000.github.dev/api
    // Producción → /api
})();

// 2. auth.js - Sistema de autenticación global
window.authManager = new AuthManager();
window.AuthManager = window.authManager;

// Funciones globales exportadas
window.protectPage = async (requiredRole) => authManager.protectPage(requiredRole);
window.authenticatedFetch = async (url, options) => authManager.authenticatedFetch(url, options);

// =============================================================================
// FLUJO DE AUTENTICACIÓN
// =============================================================================

/*
FRONTEND: tickets.js
┌─────────────────────────────────────────────────────────────────────────────┐
│ document.addEventListener('DOMContentLoaded', async () => {                 │
│   // 🔒 PROTECCIÓN OBLIGATORIA                                             │
│   if (typeof window.protectPage === 'function') {                          │
│     const hasAccess = await window.protectPage();                          │
│     if (!hasAccess) return; // → Redirige a login.html                     │
│   }                                                                         │
│                                                                             │
│   // ✅ Usuario autenticado                                                │
│   await fetchAllInitialData();                                             │
│ });                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
BACKEND: server-clean.js
┌─────────────────────────────────────────────────────────────────────────────┐
│ function authenticateToken(req, res, next) {                               │
│   const authHeader = req.headers['authorization'];                         │
│   const token = authHeader && authHeader.split(' ')[1];                    │
│                                                                             │
│   if (!token) {                                                             │
│     return res.status(401).json({                                          │
│       error: 'Token de acceso requerido',                                  │
│       code: 'MISSING_TOKEN'                                                │
│     });                                                                     │
│   }                                                                         │
│                                                                             │
│   jwt.verify(token, JWT_SECRET, (err, user) => {                           │
│     if (err) {                                                              │
│       return res.status(403).json({                                        │
│         error: 'Token inválido o expirado',                                │
│         code: 'INVALID_TOKEN'                                              │
│       });                                                                   │
│     }                                                                       │
│     req.user = user; // Usuario disponible en endpoints                    │
│     next();                                                                 │
│   });                                                                       │
│ }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
*/

// =============================================================================
// ENDPOINTS PRINCIPALES - TICKETS
// =============================================================================

const TICKETS_API_MAPPING = {
    
    // 📋 OBTENER TODOS LOS TICKETS
    'GET /api/tickets': {
        frontend: {
            function: 'fetchTickets()',
            location: 'tickets.js:614',
            call: `
                const response = await authenticatedFetch(\`\${API_URL}/tickets\`);
                const result = await response.json();
                state.tickets = result.data || [];
            `
        },
        backend: {
            endpoint: 'app.get(\'/api/tickets\', authenticateToken, ...)',
            location: 'server-clean.js:1222',
            query: `
                SELECT 
                    t.*,
                    c.name as client_name,
                    l.name as location_name,
                    e.name as equipment_name,
                    COALESCE(t.ticket_type, 'normal') as ticket_type
                FROM Tickets t
                LEFT JOIN Clients c ON t.client_id = c.id
                LEFT JOIN Equipment e ON t.equipment_id = e.id
                LEFT JOIN Locations l ON t.location_id = l.id
                ORDER BY t.created_at DESC
            `,
            response: `
                res.json({ 
                    message: "success", 
                    data: rows 
                });
            `
        }
    },

    // 🎫 CREAR NUEVO TICKET
    'POST /api/tickets': {
        frontend: {
            function: 'handleFormSubmit(form)',
            location: 'tickets.js:784',
            call: `
                const body = Object.fromEntries(new FormData(form));
                const response = await authenticatedFetch(\`\${API_URL}/tickets\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            `
        },
        backend: {
            endpoint: 'app.post(\'/api/tickets\', authenticateToken, ...)',
            location: 'server-clean.js:1412',
            validation: `
                if (!title || !client_id || !priority) {
                    return res.status(400).json({ 
                        error: "Título, Cliente y Prioridad son campos obligatorios." 
                    });
                }
            `,
            query: `
                INSERT INTO Tickets (
                    client_id, location_id, equipment_id, title, description, 
                    priority, due_date, status, ticket_type, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `,
            params: '[client_id, location_id || null, equipment_id || null, title, description, priority, due_date || null, \'Abierto\', \'individual\']',
            response: `
                res.status(201).json({
                    message: "success",
                    data: { id: this.lastID, ...req.body, status: 'Abierto' }
                });
            `
        }
    },

    // 📝 ACTUALIZAR TICKET
    'PUT /api/tickets/:id': {
        frontend: {
            function: 'handleFormSubmit(form) - edit mode',
            location: 'tickets.js:784',
            call: `
                const url = \`\${API_URL}/tickets/\${id}\`;
                const response = await authenticatedFetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            `
        },
        backend: {
            endpoint: 'app.put(\'/api/tickets/:id\', authenticateToken, ...)',
            location: 'server-clean.js:1446'
        }
    },

    // 🗑️ ELIMINAR TICKET
    'DELETE /api/tickets/:id': {
        frontend: {
            function: 'deleteItem(type, id)',
            location: 'tickets.js:2592',
            call: `
                const response = await authenticatedFetch(\`\${API_URL}/tickets/\${id}\`, { 
                    method: 'DELETE' 
                });
            `
        },
        backend: {
            endpoint: 'app.delete(\'/api/tickets/:id\', authenticateToken, ...)',
            location: 'server-clean.js:1491'
        }
    }
};

// =============================================================================
// ENDPOINTS AUXILIARES
// =============================================================================

const AUXILIARY_API_MAPPING = {
    
    // 👥 CLIENTES
    'GET /api/clients': {
        frontend: 'fetchClients() - tickets.js:634',
        backend: 'server-clean.js:595',
        purpose: 'Poblar selector de clientes en formulario'
    },
    
    'POST /api/clients': {
        frontend: 'handleNewClientSubmit() - tickets.js:808',
        backend: 'server-clean.js:623',
        purpose: 'Crear nuevo cliente desde modal'
    },

    // 🏢 UBICACIONES/SEDES
    'GET /api/locations?client_id=X': {
        frontend: 'fetchLocations(clientId) - tickets.js:656',
        backend: 'server-clean.js:805',
        purpose: 'Cargar sedes cuando se selecciona cliente'
    },
    
    'POST /api/locations': {
        frontend: 'handleNewLocationSubmit() - tickets.js:847',
        backend: 'server-clean.js:879',
        purpose: 'Crear nueva sede desde modal'
    },

    // 🔧 EQUIPOS
    'GET /api/equipment?location_id=X': {
        frontend: 'fetchEquipment(locationId) - tickets.js:685',
        backend: 'server-clean.js:960+',
        purpose: 'Cargar equipos cuando se selecciona sede'
    },
    
    'POST /api/equipment': {
        frontend: 'handleNewEquipmentSubmit() - tickets.js:882',
        backend: 'server-clean.js:1050+',
        purpose: 'Crear nuevo equipo desde modal'
    },

    // 🏋️ GIMNACIÓN (Sistema especializado)
    'POST /api/tickets/gimnacion': {
        frontend: 'handleGimnacionFormSubmit() - tickets.js:2463',
        backend: 'server-clean.js:1700+ (gimnacion-routes.js)',
        purpose: 'Crear tickets con checklist para gimnación'
    },
    
    'GET /api/gimnacion/checklist-templates': {
        frontend: 'fetchChecklistTemplates() - tickets.js:2502',
        backend: 'gimnacion-routes.js',
        purpose: 'Obtener templates de checklist'
    },
    
    'GET /api/gimnacion/checklist-templates/:id/items': {
        frontend: 'fetchTemplateItems(templateId) - tickets.js:2522',
        backend: 'gimnacion-routes.js',
        purpose: 'Obtener items específicos de template'
    }
};

// =============================================================================
// FLUJO DE DEPENDENCIAS EN CASCADA
// =============================================================================

const CASCADE_FLOW = `
USUARIO INTERACTÚA CON FORMULARIO:

1️⃣ Selecciona Cliente
   ┌─ clientSelect.addEventListener('change')
   │  └─ fetchLocations(clientId)
   │     └─ GET /api/locations?client_id=X
   │        └─ Poblar locationSelect
   │           └─ Limpiar equipmentSelect

2️⃣ Selecciona Sede
   ┌─ locationSelect.addEventListener('change')
   │  └─ fetchEquipment(locationId)
   │     └─ GET /api/equipment?location_id=X
   │        └─ Poblar equipmentSelect

3️⃣ Llena Formulario
   ┌─ Título ✅ (obligatorio)
   ├─ Descripción
   ├─ Prioridad ✅ (obligatorio)
   ├─ Fecha vencimiento
   └─ Archivos (opcional)

4️⃣ Submit Formulario
   ┌─ handleFormSubmit(form)
   │  ├─ Validación frontend
   │  ├─ POST /api/tickets
   │  ├─ Validación backend
   │  ├─ INSERT INTO Tickets
   │  ├─ Trigger notificaciones
   │  └─ Response success
   │     ├─ closeModal('ticket-modal')
   │     └─ fetchTickets() // Recargar lista
`;

// =============================================================================
// MANEJO DE ESTADOS Y ERRORES
// =============================================================================

const STATE_MANAGEMENT = {
    
    // Estado global del módulo
    globalState: `
        let state = {
            tickets: [],              // Todos los tickets de la BD
            clients: [],              // Lista de clientes disponibles  
            locations: [],            // Sedes del cliente seleccionado
            equipment: [],            // Equipos de la sede seleccionada
            filteredTickets: [],      // Tickets mostrados (con filtros)
            currentFilters: {         // Filtros aplicados
                search: '',
                status: '',
                priority: '',
                client: '',
                type: ''
            }
        };
    `,
    
    // Flujo de actualización
    updateFlow: `
        API Call Success → Update State → Trigger Render
        
        fetchTickets() success:
        ├─ state.tickets = result.data
        ├─ state.filteredTickets = [...state.tickets]
        ├─ populateClientFilter()
        ├─ renderTickets(state.filteredTickets)
        └─ updateStatistics()
    `,
    
    // Manejo de errores
    errorHandling: `
        // Nivel 1: authenticatedFetch() - Auto-logout si 401
        if (response.status === 401) {
            this.logout();
            window.location.href = '/login.html';
            throw new Error('Sesión expirada');
        }
        
        // Nivel 2: Función específica - Manejo local
        try {
            const response = await authenticatedFetch(...);
            if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
            // Proceso normal...
        } catch (error) {
            console.error('❌ Error específico:', error);
            // Fallback state o mensaje al usuario
            state.tickets = [];
            renderTickets([]);
        }
        
        // Nivel 3: UI - Feedback visual al usuario
        // Loading states, mensajes de error, estados vacíos
    `
};

// =============================================================================
// PUNTOS DE INTEGRACIÓN CRÍTICOS
// =============================================================================

const CRITICAL_INTEGRATION_POINTS = {
    
    scripts_loading_order: [
        '1. config.js    → Define API_URL global',
        '2. auth.js      → Define AuthManager y funciones globales', 
        '3. base-modal.js → Sistema de modales',
        '4. menu.js      → Navegación (si aplica)',
        '5. tickets.js   → Lógica principal (usa todo lo anterior)'
    ],
    
    authentication_checkpoints: [
        '✅ DOMContentLoaded → protectPage() o manual check',
        '✅ Cada API call → authenticatedFetch() con token',
        '✅ Backend middleware → authenticateToken() en cada endpoint',
        '✅ Token expiration → Auto-logout y redirect'
    ],
    
    data_consistency: [
        '🔄 After CREATE → fetchTickets() para recargar lista',
        '🔄 After UPDATE → fetchTickets() para mostrar cambios',
        '🔄 After DELETE → fetchTickets() para actualizar lista',
        '🔄 Cascade updates → Cliente → Sedes → Equipos'
    ],
    
    performance_optimizations: [
        '⚡ Promise.all() para cargas paralelas en fetchAllInitialData()',
        '⚡ Debounce en filtros de búsqueda',
        '⚡ Caching de selectores DOM',
        '⚡ Lazy loading de modales pesados'
    ]
};

// =============================================================================
// DEBUGGING Y TROUBLESHOOTING
// =============================================================================

const DEBUGGING_GUIDE = {
    
    common_issues: {
        'Tickets no cargan': [
            '1. Verificar autenticación: localStorage.getItem("gymtec_token")',
            '2. Verificar backend corriendo: http://localhost:3000/api/tickets',
            '3. Verificar CORS en Network tab',
            '4. Verificar consola por errores JS'
        ],
        
        'Error 401 Unauthorized': [
            '1. Token expirado → Re-login necesario',
            '2. Token inválido → Limpiar localStorage y re-login',
            '3. Backend no encuentra token → Verificar headers'
        ],
        
        'Formulario no envía': [
            '1. Verificar validación frontend',
            '2. Verificar campos obligatorios',
            '3. Verificar formato JSON en Network',
            '4. Verificar validación backend'
        ],
        
        'Selects en cascada no funcionan': [
            '1. Verificar event listeners',
            '2. Verificar fetchLocations/fetchEquipment',
            '3. Verificar endpoints backend con parámetros',
            '4. Verificar DOM elements existen'
        ]
    },
    
    debug_tools: [
        'console.log en cada función importante',
        'Network tab para ver requests/responses', 
        'Application tab → Local Storage para tokens',
        'debug-auth.html para diagnóstico completo'
    ]
};

export default {
    API_URL,
    TICKETS_API_MAPPING,
    AUXILIARY_API_MAPPING,
    CASCADE_FLOW,
    STATE_MANAGEMENT,
    CRITICAL_INTEGRATION_POINTS,
    DEBUGGING_GUIDE
};