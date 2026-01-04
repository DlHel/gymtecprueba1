# 🔍 Plan de Inspección de Módulos - VPS Hetzner

**Servidor:** http://91.107.237.159  
**Estado:** Backend activo en puerto 3000, Frontend en puerto 80 (Nginx)  
**Fecha:** 2025-12-28

---

## ✅ Módulos Inspeccionados

### 1. Dashboard (index.html)
**Estado:** ⚠️ PARCIAL  
**Errores encontrados:**
- ❌ `GET /api/dashboard/activity?limit=10` → 500 Error
- ✅ Autenticación funcionando
- ✅ Menú cargando correctamente

**Acciones pendientes:**
- [ ] Verificar endpoint `/api/dashboard/activity` en backend
- [ ] Verificar query SQL para actividad reciente

---

### 2. Clientes y Sedes (clientes.html)
**Estado:** ✅ FUNCIONAL  
**Errores encontrados:**
- ✅ Lista de clientes carga correctamente (4 clientes)
- ✅ Ubicaciones cargan correctamente
- ✅ Equipos cargan correctamente
- ✅ Modal de crear equipo funciona
- ⚠️ `GET /api/models/1/main-photo` → 404 (Normal, no hay foto)

**Errores CORREGIDOS:**
- ✅ `/api/locations/:id/equipment` → Corregido
- ✅ `/api/equipment/:id/tickets` → Corregido  
- ✅ `/api/equipment/:id/photos` → Corregido
- ✅ `/api/equipment/:id/notes` → Corregido

**Próximo paso:** Continuar con siguiente módulo

---

## 📋 Módulos Pendientes de Inspección

### 3. Equipos (equipo.html)
**Acciones:**
- [ ] Verificar lista de equipos
- [ ] Verificar filtros (por cliente, ubicación, modelo, estado)
- [ ] Verificar modal de edición
- [ ] Verificar modal de creación
- [ ] Verificar drawer de detalles
- [ ] Verificar QR code
- [ ] Verificar fotos
- [ ] Verificar notas
- [ ] Verificar historial de tickets

### 4. Tickets (tickets.html)
**Acciones:**
- [ ] Verificar lista de tickets
- [ ] Verificar filtros (estado, prioridad, cliente)
- [ ] Verificar creación de ticket
- [ ] Verificar edición de ticket
- [ ] Verificar asignación de técnico
- [ ] Verificar checklist
- [ ] Verificar fotos de ticket
- [ ] Verificar cambios de estado
- [ ] Verificar workflow stages

### 5. Planificador (planificador.html)
**Acciones:**
- [ ] Verificar calendario
- [ ] Verificar mantenimientos programados
- [ ] Verificar asignación de técnicos
- [ ] Verificar creación de mantenimiento
- [ ] Verificar edición de mantenimiento
- [ ] Verificar vista diaria/semanal/mensual

### 6. Contratos (contratos.html)
**Acciones:**
- [ ] Verificar lista de contratos
- [ ] Verificar creación de contrato
- [ ] Verificar edición de contrato
- [ ] Verificar SLA asociados
- [ ] Verificar documentos adjuntos
- [ ] Verificar alertas de vencimiento

### 7. Inventario (inventario.html)
**Acciones:**
- [ ] Verificar lista de inventario
- [ ] Verificar stock actual
- [ ] Verificar alertas de stock mínimo
- [ ] Verificar movimientos de inventario
- [ ] Verificar entrada de stock
- [ ] Verificar salida de stock
- [ ] Verificar ajustes de inventario

### 8. Modelos de Equipo (modelos.html)
**Acciones:**
- [ ] Verificar lista de modelos
- [ ] Verificar creación de modelo
- [ ] Verificar edición de modelo
- [ ] Verificar fotos de modelo
- [ ] Verificar foto principal
- [ ] Verificar manuales asociados
- [ ] Verificar repuestos asociados

### 9. Notificaciones (notifications-dashboard.html)
**Acciones:**
- [ ] Verificar dashboard de notificaciones
- [ ] Verificar notificaciones no leídas
- [ ] Verificar marcar como leída
- [ ] Verificar filtros por tipo
- [ ] Verificar configuración de notificaciones

### 10. Finanzas (finanzas.html)
**Acciones:**
- [ ] Verificar dashboard financiero
- [ ] Verificar ingresos
- [ ] Verificar gastos
- [ ] Verificar órdenes de compra
- [ ] Verificar facturas
- [ ] Verificar reportes financieros

### 11. Personal (personal.html)
**Acciones:**
- [ ] Verificar lista de técnicos
- [ ] Verificar creación de técnico
- [ ] Verificar edición de técnico
- [ ] Verificar asignación de especialidades
- [ ] Verificar disponibilidad

### 12. Asistencia (asistencia.html)
**Acciones:**
- [ ] Verificar registros de asistencia
- [ ] Verificar check-in/check-out
- [ ] Verificar reportes de horas
- [ ] Verificar técnico por día

### 13. Reportes (reportes.html)
**Acciones:**
- [ ] Verificar reportes disponibles
- [ ] Verificar generación de PDFs
- [ ] Verificar filtros de fecha
- [ ] Verificar exportación a Excel

### 14. Configuración (configuracion.html)
**Acciones:**
- [ ] Verificar configuración general
- [ ] Verificar usuarios y permisos
- [ ] Verificar cambio de contraseña
- [ ] Verificar backup de base de datos

---

## 🔧 Errores Comunes Detectados

### Patrón de Error: `TypeError: X.map is not a function`
**Causa:** Backend devuelve objeto con error en lugar de array
**Solución:** Verificar que endpoint devuelva `{ message: 'success', data: [...] }`

### Patrón de Error: `500 Internal Server Error`
**Causa:** Query SQL fallando o tabla inexistente
**Solución:** Verificar logs del backend, verificar schema de DB

---

## 📝 Notas de Progreso

**2025-12-28 17:52:**
- ✅ Módulo de Clientes completamente funcional
- ✅ Drawer de equipos funcional
- ✅ Creación de equipos funcional
- ⏭️ Siguiente: Módulo de Equipos (equipo.html)

