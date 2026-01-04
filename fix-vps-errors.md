# Plan de Corrección de Errores VPS - Gymtec ERP

## 🔴 Errores Críticos Detectados

### 1. Equipment Endpoints (500 Internal Server Error)
- ❌ `/api/equipment/:id/tickets` - 500 error
- ❌ `/api/equipment/:id/photos` - 500 error  
- ❌ `/api/equipment/:id/notes` - 500 error
- ❌ `/api/equipment/:id` - 500 error (GET individual)
- ❌ `/api/models/:id/main-photo` - 404 error

### 2. Dashboard Endpoint
- ❌ `/api/dashboard/activity?limit=10` - 500 error

### 3. Location Equipment  
- ❌ `/api/locations/:id/equipment` - 500 error (RESUELTO)

## 📋 Plan de Inspección por Módulo

### Módulo 1: Clientes y Sedes ✅
- [x] Listar clientes - FUNCIONAL
- [x] Crear/editar clientes - FUNCIONAL
- [x] Listar sedes por cliente - FUNCIONAL
- [x] Agregar equipos a sede - FUNCIONAL
- [ ] Ver detalles de equipo - FALLA (equipment drawer)

### Módulo 2: Equipos
- [ ] Listar todos los equipos
- [ ] Filtros por modelo/ubicación
- [ ] Ver historial de tickets
- [ ] Ver fotos de equipo
- [ ] Ver notas de equipo
- [ ] Generar QR

### Módulo 3: Tickets
- [ ] Listar tickets
- [ ] Crear ticket
- [ ] Asignar técnico
- [ ] Checklist de ticket
- [ ] Adjuntar fotos
- [ ] Cambiar estados/workflow

### Módulo 4: Modelos de Equipos
- [ ] Listar modelos
- [ ] Crear/editar modelo
- [ ] Asignar foto principal
- [ ] Ver repuestos por modelo

### Módulo 5: Inventario
- [ ] Listar items
- [ ] Movimientos de stock
- [ ] Alertas de stock mínimo

### Módulo 6: Contratos
- [ ] Listar contratos
- [ ] SLA tracking
- [ ] Alertas de vencimiento

### Módulo 7: Personal
- [ ] Listar técnicos
- [ ] Asignaciones
- [ ] Disponibilidad

### Módulo 8: Finanzas
- [ ] Órdenes de compra
- [ ] Facturas
- [ ] Reportes

## 🔧 Acciones Inmediatas

### Paso 1: Verificar Tablas en MySQL VPS
```sql
SHOW TABLES;
DESC equipmentphotos;
DESC equipmentnotes;
DESC ticket_equipment_scope;
DESC equipmentmodels;
DESC tickets;
```

### Paso 2: Revisar Nombres de Tablas
- Verificar case sensitivity: `equipmentphotos` vs `EquipmentPhotos`
- MySQL en Linux es case-sensitive por defecto

### Paso 3: Corregir Endpoints
1. Agregar logging detallado en server-clean.js
2. Verificar queries SQL con nombres correctos de tablas
3. Validar que las tablas existan en el VPS

### Paso 4: Foto Principal de Modelos
- Endpoint `/api/models/:id/main-photo` devuelve 404
- Verificar tabla `equipmentmodels` y campo `main_photo`

## 📝 Checklist de Verificación

### Base de Datos
- [ ] Todas las 43+ tablas creadas
- [ ] Nombres de tablas en lowercase
- [ ] Relaciones FK correctas
- [ ] Datos de prueba cargados

### Backend
- [ ] server-clean.js funcionando
- [ ] Logs de errores SQL activados
- [ ] Todos los endpoints responden
- [ ] Autenticación JWT funcional

### Frontend
- [ ] config.js apunta a VPS
- [ ] auth.js con token válido
- [ ] Todos los módulos cargan
- [ ] Sin errores 404/500 en consola

## 🎯 Objetivo
Sistema 100% funcional en VPS con todos los módulos operativos y sin errores en consola.
