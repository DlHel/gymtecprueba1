# Arquitectura API Profesional - GymTec ERP

## Objetivo
Eliminar **PARA SIEMPRE** el problema de "toco un módulo y rompo otro".

---

## 1. Problemas Detectados (Auditoría)

| # | Problema | Archivo(s) Afectado(s) | Riesgo |
|---|---|---|---|
| 1 | **JWT_SECRET inconsistente** | `inventory.js` usa `gymtec-erp-secret-key-2024`, `purchase-orders.js` usa `gymtec_secret_key_2024_production_change_this`, `contracts-sla.js` usa `gymtec_secret_key_2024` | 🔴 Crítico: Tokens válidos en un módulo son inválidos en otro |
| 2 | **`authenticateToken` duplicado 6 veces** | Cada archivo tiene su propia copia con lógica ligeramente distinta | 🔴 Crítico: Bug en auth requiere arreglarlo en 6 lugares |
| 3 | **`triggerNotificationProcessing` crea acoplamiento** | `server-clean.js` líneas 1894, 1987 | 🟠 Alto: Si falla el hook de notificaciones, ¿se crea el ticket? |
| 4 | **`logTicketChange` es global** | `server-clean.js` línea 1533 | 🟠 Alto: Cualquier módulo que necesite loguear cambios depende del monolito |
| 5 | **Múltiples copias de `server-clean*.js`** | `server-clean.js`, `server-clean-vps.js`, `server-clean-vps-sync.js`, etc. | 🔴 Crítico: ¿Cuál es la correcta? Drift de código garantizado |

---

## 2. Arquitectura Propuesta: "Módulos Blindados"

### 2.1 Estructura de Directorios Final

```
backend/src/
├── core/                          # SHARED KERNEL (Solo lo mínimo)
│   ├── config/
│   │   └── env.js                 # ÚNICA fuente de JWT_SECRET, DB config, etc.
│   ├── middleware/
│   │   └── auth.middleware.js     # ÚNICA implementación de authenticateToken
│   ├── database/
│   │   └── db-adapter.js          # Pool de conexiones MySQL (ya existe)
│   ├── events/
│   │   └── event-bus.js           # Sistema de eventos para comunicación
│   └── errors/
│       └── app-error.js           # Clase de error estándar
│
├── modules/                       # VERTICAL SLICES (Independientes)
│   ├── tickets/
│   │   ├── tickets.routes.js      # Rutas Express
│   │   ├── tickets.service.js     # Lógica de negocio
│   │   ├── tickets.repository.js  # Queries SQL
│   │   └── tickets.events.js      # Eventos que emite: TICKET_CREATED, etc.
│   ├── planning/
│   │   ├── planning.routes.js
│   │   ├── planning.service.js
│   │   └── planning.repository.js # Query con UNION (Tickets + Tasks)
│   ├── inventory/                 # (Ya existe, solo mover)
│   ├── purchase-orders/           # (Ya existe, solo mover)
│   ├── contracts/                 # (Despertar contracts-sla.js)
│   ├── payroll/                   # (Despertar payroll-chile.js)
│   ├── finance/
│   ├── reports/
│   └── notifications/             # Escucha eventos, NO es llamado directamente
│
└── server.js                      # SOLO monta rutas, NADA de lógica
```

### 2.2 Las 5 Reglas de Oro (NO NEGOCIABLES)

#### Regla 1: Configuración Centralizada
```javascript
// ❌ PROHIBIDO: Cada módulo define su secreto
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_local';

// ✅ CORRECTO: Todos usan la misma fuente
const { JWT_SECRET } = require('../../core/config/env');
```

#### Regla 2: Middleware Único
```javascript
// ❌ PROHIBIDO: Copiar/pegar authenticateToken en cada módulo
function authenticateToken(req, res, next) { ... } // Duplicado

// ✅ CORRECTO: Importar del core
const { authenticateToken } = require('../../core/middleware/auth.middleware');
```

#### Regla 3: Sin Imports Cruzados Entre Módulos
```javascript
// ❌ PROHIBIDO: planning importa de tickets
const { getTicketById } = require('../tickets/tickets.service');

// ✅ CORRECTO: planning hace su propia query SQL
// En planning.repository.js
async getCalendarItems() {
  return db.all(`
    SELECT id, title, 'task' as type, scheduled_date FROM MaintenanceTasks
    UNION ALL
    SELECT id, title, 'ticket' as type, due_date FROM Tickets WHERE due_date IS NOT NULL
  `);
}
```

#### Regla 4: Comunicación por Eventos (No llamadas directas)
```javascript
// ❌ PROHIBIDO: Tickets llama directamente a notificaciones
triggerNotificationProcessing('create', ticketId);

// ✅ CORRECTO: Tickets emite un evento, notificaciones escucha
// En tickets.service.js
eventBus.emit('TICKET_CREATED', { ticketId, clientId, priority });

// En notifications/notifications.listener.js
eventBus.on('TICKET_CREATED', async (data) => {
  await sendNotification(data);
});
```

#### Regla 5: Try/Catch en Cada Router
```javascript
// ❌ PROHIBIDO: Un error en un endpoint tumba el server
router.get('/:id', authenticateToken, async (req, res) => {
  const data = await service.getById(req.params.id); // Si falla, 💥
  res.json(data);
});

// ✅ CORRECTO: Errores contenidos
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    res.json({ message: 'success', data });
  } catch (error) {
    next(error); // Pasa al error handler global, no tumba server
  }
});
```

---

## 3. Plan de Migración (Fases)

### Fase 0: Limpieza Inmediata (1-2 horas)
- [ ] Eliminar archivos duplicados (`server-clean-vps*.js`).
- [ ] Definir cuál es el `server-clean.js` oficial.
- [ ] Crear `core/config/env.js` con todas las variables de entorno.

### Fase 1: Core Seeding (2-3 horas)
- [ ] Crear `core/middleware/auth.middleware.js` (copia oficial de `authenticateToken`).
- [ ] Crear `core/events/event-bus.js` (patrón EventEmitter).
- [ ] Crear `core/errors/app-error.js`.

### Fase 2: Migración Inventory/Purchase-Orders (Ya existen)
- [ ] Mover `routes/inventory.js` a `modules/inventory/`.
- [ ] Mover `routes/purchase-orders.js` a `modules/purchase-orders/`.
- [ ] Actualizar imports para usar `core/`.
- [ ] Verificar que funcionan igual que antes.

### Fase 3: Extracción Planificador (Arregla el calendario)
- [ ] Crear `modules/planning/` desde líneas 553-839 de `server-clean.js`.
- [ ] Implementar query UNION en `planning.repository.js`.
- [ ] Probar calendario con tickets y tareas.

### Fase 4: Despertar Contratos y Nómina
- [ ] Conectar `contracts-sla.js` a `server.js`.
- [ ] Conectar `payroll-chile.js` a `server.js`.
- [ ] Crear frontends faltantes (JS para contratos).

### Fase 5: Reconstruir Finanzas
- [ ] Arreglar bug SQL de LIMIT.
- [ ] Implementar `createExpense()` en frontend.

---

## 4. Verificación de Cambios

### Tests Automatizados
No se detectaron tests unitarios existentes en el proyecto. Se propone:
1. **Crear tests básicos** para cada módulo con Jest o Mocha.
2. **Test de humo por módulo**: Verificar que `GET /api/{modulo}` responde 200.

### Verificación Manual
Después de cada fase, ejecutar en el servidor:
```bash
# Fase 1-2: Verificar que inventory sigue funcionando
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/inventory

# Fase 3: Verificar planificador
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/maintenance-tasks

# Fase 4: Verificar contratos
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/contracts
```

### Criterio de Éxito
- [ ] Puedo modificar `modules/planning/` sin tocar `modules/tickets/`.
- [ ] Si `modules/finance/` tiene un bug SQL, el resto del server sigue funcionando.
- [ ] Todos los tokens usan el mismo JWT_SECRET.

---

## 5. Próximo Paso Inmediato

**Ejecutar Fase 0** (Limpieza) para eliminar la confusión de archivos duplicados y establecer la base para el refactor.
