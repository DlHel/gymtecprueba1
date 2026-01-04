# Plan de Inspección y Corrección del ERP - VPS Hetzner

## 🎯 Objetivo
Verificar y corregir cada módulo del sistema ERP Gymtec en el VPS de producción, asegurando funcionalidad completa.

## 📋 Estado Actual
- ✅ Backend desplegado en VPS (91.107.237.159:3000)
- ✅ Frontend desplegado (91.107.237.159:80)
- ✅ Login funcional con usuario admin
- ⚠️  Varios endpoints retornando errores 500
- ⚠️  Frontend esperando formato {message, data} en respuestas

---

## 🔧 FASE 1: CORRECCIONES CRÍTICAS DEL BACKEND (COMPLETADO)

### Endpoints Corregidos:
1. ✅ `/api/equipment/:id/tickets` - Formato de respuesta estandarizado
2. ✅ `/api/equipment/:id/photos` - Formato de respuesta estandarizado
3. ✅ `/api/equipment/:id/notes` - Formato de respuesta estandarizado  
4. ✅ `/api/locations/:id/equipment` - Query simplificada, sin dependencias problemáticas
5. ✅ `/api/dashboard/activity` - Query simplificada sin funciones incompatibles

### Aplicar Cambios:
```powershell
# Desde la raíz del proyecto en Windows
.\scripts\deploy-vps-fixes.ps1
```

O manualmente:
```bash
# 1. Subir archivo
scp backend/src/server-clean.js root@91.107.237.159:/var/www/gymtec/backend/src/

# 2. Conectar al VPS
ssh root@91.107.237.159

# 3. Hacer backup
cd /var/www/gymtec/backend/src
cp server-clean.js server-clean.js.backup.$(date +%Y%m%d_%H%M%S)

# 4. Reiniciar backend
cd /var/www/gymtec/backend
pkill -f 'node.*server-clean.js'
nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &

# 5. Verificar
pgrep -f 'node.*server-clean.js'  # Debe mostrar un PID
tail -f /var/www/gymtec/logs/backend.log  # Ver logs
```

---

## 🧪 FASE 2: PLAN DE INSPECCIÓN POR MÓDULO

### Metodología:
1. Abrir módulo en navegador (http://91.107.237.159/[modulo].html)
2. Abrir DevTools Console (F12)
3. Realizar acciones CRUD básicas
4. Documentar errores encontrados
5. Corregir endpoint o frontend según corresponda
6. Verificar corrección
7. Pasar al siguiente módulo

---

### 1️⃣ MÓDULO: DASHBOARD (index.html)
**URL:** http://91.107.237.159/index.html

#### Checklist:
- [ ] Carga correcta de la página
- [ ] KPIs se muestran con datos
- [ ] Gráficos se renderizan
- [ ] Actividad reciente se carga
- [ ] Sin errores 500 en consola

#### Endpoints Involucrados:
- `/api/dashboard/activity` ✅ CORREGIDO
- `/api/dashboard/kpis`
- `/api/dashboard/resources-summary`
- `/api/dashboard/financial-summary`
- `/api/dashboard/inventory-summary`
- `/api/dashboard/contracts-summary`

#### Errores Conocidos:
- ❌ `GET /api/dashboard/activity?limit=10 500` → **CORREGIDO**

#### Acciones Pendientes:
```bash
# En consola del navegador, verificar:
fetch('http://91.107.237.159/api/dashboard/activity?limit=10', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log)
```

---

### 2️⃣ MÓDULO: CLIENTES Y SEDES (clientes.html)
**URL:** http://91.107.237.159/clientes.html

#### Checklist:
- [x] Lista de clientes se carga correctamente
- [x] Expandir ubicaciones funciona
- [ ] Ver equipos de una ubicación funciona sin errores
- [ ] Agregar nuevo equipo funciona
- [ ] Drawer de equipo se abre correctamente
- [ ] Tickets del equipo se cargan
- [ ] Notas del equipo se cargan
- [ ] Fotos del equipo se cargan
- [ ] QR del equipo se genera

#### Endpoints Involucrados:
- `/api/clients` ✅ OK
- `/api/clients/:id/locations` ✅ OK
- `/api/locations/:id/equipment` ✅ CORREGIDO
- `/api/equipment` (POST) ✅ OK
- `/api/equipment/:id/tickets` ✅ CORREGIDO
- `/api/equipment/:id/notes` ✅ CORREGIDO
- `/api/equipment/:id/photos` ✅ CORREGIDO
- `/api/models/:id/main-photo` ⚠️ 404 (opcional)

#### Errores Conocidos:
- ❌ `GET /api/locations/5/equipment 500` → **CORREGIDO**
- ❌ `tickets.map is not a function` → **CORREGIDO**
- ❌ `photos.map is not a function` → **CORREGIDO**
- ❌ `notas.map is not a function` → **CORREGIDO**
- ⚠️ `GET /api/models/1/main-photo 404` → Esperado si no hay foto

#### Acciones de Prueba:
1. Hacer clic en un cliente
2. Expandir una ubicación
3. Hacer clic en "Ver Equipos"
4. Hacer clic en un equipo
5. Verificar que el drawer se abre sin errores
6. Probar cada tab del drawer (Información, Tickets, Notas, Fotos, QR)

---

### 3️⃣ MÓDULO: EQUIPOS (equipo.html)
**URL:** http://91.107.237.159/equipo.html

#### Checklist:
- [ ] Lista de equipos se carga
- [ ] Filtros funcionan
- [ ] Búsqueda funciona
- [ ] Ver detalle de equipo abre drawer
- [ ] Editar equipo funciona
- [ ] Eliminar equipo funciona (soft delete)

#### Endpoints Involucrados:
- `/api/equipment` (GET)
- `/api/equipment/:id` (GET, PUT, DELETE)
- `/api/equipment/:id/tickets`
- `/api/equipment/:id/notes`
- `/api/equipment/:id/photos`

#### Acciones de Prueba:
1. Verificar que se carga la lista
2. Usar filtro por tipo
3. Buscar un equipo por serial
4. Abrir drawer de un equipo
5. Editar información básica
6. Agregar una nota
7. Subir una foto

---

### 4️⃣ MÓDULO: TICKETS (tickets.html)
**URL:** http://91.107.237.159/tickets.html

#### Checklist:
- [ ] Lista de tickets se carga
- [ ] Crear nuevo ticket funciona
- [ ] Filtros por estado funcionan
- [ ] Ver detalle de ticket funciona
- [ ] Editar ticket funciona
- [ ] Cambiar estado de ticket funciona
- [ ] Agregar checklist funciona
- [ ] Asignar técnico funciona

#### Endpoints Involucrados:
- `/api/tickets` (GET, POST)
- `/api/tickets/:id` (GET, PUT, DELETE)
- `/api/tickets/:id/checklist` (GET, POST)
- `/api/tickets/:id/photos` (GET, POST)
- `/api/tickets/:id/notes` (GET, POST)
- `/api/tickets/:id/assign`
- `/api/tickets/:id/status`

#### Acciones de Prueba:
1. Crear ticket de prueba
2. Asignar a técnico
3. Agregar checklist
4. Cambiar estado
5. Agregar fotos
6. Completar ticket

---

### 5️⃣ MÓDULO: MODELOS DE EQUIPO (modelos.html)
**URL:** http://91.107.237.159/modelos.html

#### Checklist:
- [ ] Lista de modelos se carga
- [ ] Crear nuevo modelo funciona
- [ ] Editar modelo funciona
- [ ] Subir foto principal funciona
- [ ] Galería de fotos funciona
- [ ] Ver equipos asociados funciona

#### Endpoints Involucrados:
- `/api/models` (GET, POST)
- `/api/models/:id` (GET, PUT, DELETE)
- `/api/models/:id/photos` (GET, POST)
- `/api/models/:id/main-photo` (GET)
- `/api/models/:id/equipment` (GET)

#### Acciones de Prueba:
1. Crear modelo de prueba
2. Subir foto principal
3. Agregar fotos a galería
4. Ver equipos que usan el modelo
5. Editar información del modelo

---

### 6️⃣ MÓDULO: INVENTARIO (inventario.html)
**URL:** http://91.107.237.159/inventario.html

#### Checklist:
- [ ] Lista de items se carga
- [ ] Crear nuevo item funciona
- [ ] Registrar entrada funciona
- [ ] Registrar salida funciona
- [ ] Ver movimientos funciona
- [ ] Alertas de stock bajo funcionan

#### Endpoints Involucrados:
- `/api/inventory` (GET, POST)
- `/api/inventory/:id` (GET, PUT)
- `/api/inventory/:id/movements` (GET, POST)
- `/api/inventory/low-stock` (GET)

---

### 7️⃣ MÓDULO: CONTRATOS (contratos.html)
**URL:** http://91.107.237.159/contratos.html

#### Checklist:
- [ ] Lista de contratos se carga
- [ ] Crear contrato funciona
- [ ] Asignar equipos a contrato funciona
- [ ] Ver detalles del contrato funciona
- [ ] Renovar contrato funciona
- [ ] Ver historial de pagos funciona

#### Endpoints Involucrados:
- `/api/contracts` (GET, POST)
- `/api/contracts/:id` (GET, PUT)
- `/api/contracts/:id/equipment` (GET, POST)
- `/api/contracts/:id/payments` (GET)

---

### 8️⃣ MÓDULO: PERSONAL (personal.html)
**URL:** http://91.107.237.159/personal.html

#### Checklist:
- [ ] Lista de usuarios se carga
- [ ] Crear usuario funciona
- [ ] Editar usuario funciona
- [ ] Cambiar rol funciona
- [ ] Desactivar usuario funciona
- [ ] Ver asignaciones funciona

#### Endpoints Involucrados:
- `/api/users` (GET, POST)
- `/api/users/:id` (GET, PUT, DELETE)
- `/api/users/:id/assignments` (GET)
- `/api/users/:id/attendance` (GET)

---

### 9️⃣ MÓDULO: ASISTENCIA (asistencia.html)
**URL:** http://91.107.237.159/asistencia.html

#### Checklist:
- [ ] Calendario de asistencia se carga
- [ ] Registrar entrada funciona
- [ ] Registrar salida funciona
- [ ] Ver reporte mensual funciona
- [ ] Filtrar por empleado funciona

#### Endpoints Involucrados:
- `/api/attendance` (GET, POST)
- `/api/attendance/today` (GET)
- `/api/attendance/month` (GET)
- `/api/attendance/:id` (PUT)

---

### 🔟 MÓDULO: FINANZAS (finanzas.html)
**URL:** http://91.107.237.159/finanzas.html

#### Checklist:
- [ ] Dashboard financiero se carga
- [ ] Lista de facturas se carga
- [ ] Crear factura funciona
- [ ] Registrar pago funciona
- [ ] Ver órdenes de compra funciona
- [ ] Gráficos de ingresos/gastos funcionan

#### Endpoints Involucrados:
- `/api/invoices` (GET, POST)
- `/api/invoices/:id` (GET, PUT)
- `/api/invoices/:id/payments` (GET, POST)
- `/api/purchase-orders` (GET, POST)
- `/api/financial/summary` (GET)

---

### 1️⃣1️⃣ MÓDULO: PLANIFICADOR (planificador.html)
**URL:** http://91.107.237.159/planificador.html

#### Checklist:
- [ ] Calendario se carga
- [ ] Ver mantenimientos programados funciona
- [ ] Crear nuevo mantenimiento funciona
- [ ] Asignar técnico a mantenimiento funciona
- [ ] Marcar como completado funciona
- [ ] Vista semanal/mensual funciona

#### Endpoints Involucrados:
- `/api/maintenance-plans` (GET, POST)
- `/api/maintenance-plans/:id` (GET, PUT)
- `/api/work-orders` (GET, POST)
- `/api/work-orders/:id/complete` (PUT)

---

### 1️⃣2️⃣ MÓDULO: REPORTES (reportes.html)
**URL:** http://91.107.237.159/reportes.html

#### Checklist:
- [ ] Lista de reportes disponibles se carga
- [ ] Generar reporte de tickets funciona
- [ ] Generar reporte de equipos funciona
- [ ] Generar reporte financiero funciona
- [ ] Exportar a PDF funciona
- [ ] Exportar a Excel funciona

#### Endpoints Involucrados:
- `/api/reports/tickets` (GET)
- `/api/reports/equipment` (GET)
- `/api/reports/financial` (GET)
- `/api/reports/custom` (POST)

---

### 1️⃣3️⃣ MÓDULO: NOTIFICACIONES (notifications-dashboard.html)
**URL:** http://91.107.237.159/notifications-dashboard.html

#### Checklist:
- [ ] Lista de notificaciones se carga
- [ ] Marcar como leída funciona
- [ ] Filtrar por tipo funciona
- [ ] Ver detalle de notificación funciona
- [ ] Configurar preferencias funciona

#### Endpoints Involucrados:
- `/api/notifications` (GET)
- `/api/notifications/:id/read` (PUT)
- `/api/notifications/unread-count` (GET)
- `/api/notifications/preferences` (GET, PUT)

---

### 1️⃣4️⃣ MÓDULO: CONFIGURACIÓN (configuracion.html)
**URL:** http://91.107.237.159/configuracion.html

#### Checklist:
- [ ] Configuraciones generales se cargan
- [ ] Cambiar contraseña funciona
- [ ] Configurar empresa funciona
- [ ] Gestionar roles funciona
- [ ] Backup de base de datos funciona

#### Endpoints Involucrados:
- `/api/config` (GET, PUT)
- `/api/users/change-password` (POST)
- `/api/roles` (GET, POST, PUT)
- `/api/backup` (POST)

---

## 📊 TEMPLATE DE REPORTE DE ERRORES

Para cada error encontrado, documentar:

```markdown
### Error: [Descripción breve]
- **Módulo:** [Nombre del módulo]
- **URL:** [URL donde ocurre]
- **Acción que lo causa:** [Qué hizo el usuario]
- **Error en consola:**
  ```
  [Copiar error exacto]
  ```
- **Endpoint afectado:** [/api/...]
- **Código de respuesta:** [500, 404, etc.]
- **Solución propuesta:** [Descripción de la solución]
- **Prioridad:** [Alta/Media/Baja]
```

---

## 🎯 PRIORIDADES

### Prioridad Alta (Bloqueantes):
1. ✅ Endpoints que retornan 500 en módulos principales
2. Login/autenticación
3. CRUD de clientes, ubicaciones y equipos
4. Sistema de tickets

### Prioridad Media (Importantes):
5. Modelos de equipo
6. Inventario
7. Personal
8. Contratos

### Prioridad Baja (Mejoras):
9. Reportes
10. Notificaciones
11. Configuración avanzada

---

## 📝 NOTAS IMPORTANTES

1. **Siempre hacer backup antes de aplicar cambios:**
   ```bash
   cp server-clean.js server-clean.js.backup.$(date +%Y%m%d_%H%M%S)
   ```

2. **Reiniciar backend después de cada cambio:**
   ```bash
   pkill -f 'node.*server-clean.js'
   cd /var/www/gymtec/backend && nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &
   ```

3. **Verificar logs en tiempo real:**
   ```bash
   tail -f /var/www/gymtec/logs/backend.log
   ```

4. **Limpiar caché del navegador entre pruebas:**
   - Ctrl + Shift + Delete
   - O usar modo incógnito

5. **Mantener sesión SSH abierta para intervención rápida**

---

## ✅ CHECKLIST GENERAL DE VALIDACIÓN

Antes de dar por completado un módulo:

- [ ] Sin errores 500 en consola
- [ ] Sin errores 404 en endpoints críticos
- [ ] Todos los botones funcionan
- [ ] Todos los formularios se envían correctamente
- [ ] Modales se abren y cierran correctamente
- [ ] Datos se muestran en tablas/listas
- [ ] Filtros y búsquedas funcionan
- [ ] Paginación funciona (si aplica)
- [ ] Mensajes de éxito/error se muestran
- [ ] Sin errores JavaScript en consola

---

## 🚀 COMANDOS RÁPIDOS

```bash
# Conectar al VPS
ssh root@91.107.237.159

# Ver logs del backend
tail -f /var/www/gymtec/logs/backend.log

# Ver procesos Node
ps aux | grep node

# Reiniciar backend
pkill -f 'node.*server-clean.js' && cd /var/www/gymtec/backend && nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &

# Ver estado de Nginx
systemctl status nginx

# Reiniciar Nginx
systemctl restart nginx

# Ver logs de Nginx
tail -f /var/log/nginx/error.log
```

---

## 📈 PROGRESO

- **Fase 1 (Correcciones Críticas):** ✅ 100%
- **Fase 2 (Inspección Módulos):** 🔄 En proceso
  - Dashboard: ⏳ Pendiente
  - Clientes/Sedes: ⏳ Pendiente
  - Equipos: ⏳ Pendiente
  - Tickets: ⏳ Pendiente
  - Modelos: ⏳ Pendiente
  - Inventario: ⏳ Pendiente
  - Contratos: ⏳ Pendiente
  - Personal: ⏳ Pendiente
  - Asistencia: ⏳ Pendiente
  - Finanzas: ⏳ Pendiente
  - Planificador: ⏳ Pendiente
  - Reportes: ⏳ Pendiente
  - Notificaciones: ⏳ Pendiente
  - Configuración: ⏳ Pendiente

---

**Última actualización:** 2025-12-28
**Responsable:** Equipo de Desarrollo Gymtec ERP
