# 🔍 Guía de Inspección Módulo por Módulo - Gymtec ERP

Esta guía te ayudará a revisar cada módulo sistemáticamente y reportar problemas.

---

## 📖 CÓMO USAR ESTA GUÍA

1. Abre el navegador en: http://91.107.237.159
2. Loguéate con: `admin` / `admin123` (o tu contraseña)
3. Abre DevTools (F12) → Pestaña Console
4. Sigue los pasos de cada módulo en orden
5. Copia y pega cualquier error que veas en consola

---

## ✅ MÓDULOS COMPLETADOS

### 1. Dashboard (index.html) ✅
**URL:** http://91.107.237.159/index.html

**Pruebas realizadas:**
- ✅ Página carga sin errores
- ✅ KPIs se muestran
- ✅ Actividad reciente funciona
- ✅ Sin errores 500

**Conclusión:** FUNCIONAL

---

### 2. Clientes y Sedes (clientes.html) ✅
**URL:** http://91.107.237.159/clientes.html

**Pruebas realizadas:**
- ✅ Lista de clientes carga
- ✅ Expandir ubicaciones funciona
- ✅ Ver equipos funciona
- ✅ Crear equipo funciona
- ✅ Drawer de equipo abre correctamente
- ✅ Todas las pestañas del drawer funcionan

**Errores no críticos:**
- ⚠️ `/api/models/1/main-photo` 404 (esperado - modelo sin fotos)

**Conclusión:** FUNCIONAL

---

## 🔄 MÓDULO ACTUAL: EQUIPOS

### 3. Equipos (equipo.html) 🔄
**URL:** http://91.107.237.159/equipo.html

#### Paso 1: Cargar página
1. Ir a: http://91.107.237.159/equipo.html
2. Esperar a que cargue completamente
3. ¿Qué ves en consola? → **Copiar aquí**

#### Paso 2: Verificar tabla de equipos
1. ¿Se muestra una tabla con equipos?
2. ¿Hay datos en la tabla?
3. ¿Aparece algún mensaje de error?

#### Paso 3: Probar filtros
1. Buscar equipo por serial number
2. Filtrar por tipo de equipo
3. ¿Funcionan los filtros?

#### Paso 4: Ver detalle de equipo
1. Hacer clic en un equipo de la lista
2. ¿Se abre el drawer/modal?
3. ¿Qué errores aparecen en consola? → **Copiar aquí**

#### Paso 5: Editar equipo
1. En el drawer, hacer clic en "Editar"
2. Cambiar algún dato
3. Guardar
4. ¿Se guardó correctamente?

#### Paso 6: Crear nuevo equipo
1. Hacer clic en "Nuevo Equipo"
2. Llenar formulario
3. Guardar
4. ¿Se creó correctamente?

**RESULTADOS DE EQUIPOS:**
```
[Pega aquí todos los errores/warnings de consola]
```

---

## ⏳ PRÓXIMOS MÓDULOS

### 4. Tickets (tickets.html) ⏳
**URL:** http://91.107.237.159/tickets.html

**Pruebas a realizar:**
- [ ] Cargar lista de tickets
- [ ] Crear nuevo ticket
- [ ] Asignar técnico a ticket
- [ ] Cambiar estado de ticket
- [ ] Agregar checklist
- [ ] Agregar notas
- [ ] Subir fotos
- [ ] Completar ticket

**Endpoints críticos a verificar:**
- `/api/tickets` (GET, POST)
- `/api/tickets/:id` (GET, PUT)
- `/api/tickets/:id/checklist`
- `/api/tickets/:id/photos`
- `/api/tickets/:id/notes`

---

### 5. Modelos de Equipo (modelos.html) ⏳
**URL:** http://91.107.237.159/modelos.html

**Pruebas a realizar:**
- [ ] Cargar lista de modelos
- [ ] Crear nuevo modelo
- [ ] Editar modelo existente
- [ ] Subir foto de modelo
- [ ] Subir manual de modelo
- [ ] Ver repuestos del modelo
- [ ] Eliminar modelo

**Endpoints críticos a verificar:**
- `/api/models` (GET, POST)
- `/api/models/:id` (GET, PUT, DELETE)
- `/api/models/:id/photos` (GET, POST)
- `/api/models/:id/manuals` (GET, POST)

---

### 6. Inventario (inventario.html) ⏳
**URL:** http://91.107.237.159/inventario.html

**Pruebas a realizar:**
- [ ] Cargar lista de items
- [ ] Crear nuevo item
- [ ] Registrar entrada de stock
- [ ] Registrar salida de stock
- [ ] Ver historial de movimientos
- [ ] Alertas de stock mínimo

**Endpoints críticos a verificar:**
- `/api/inventory` (GET, POST)
- `/api/inventory/:id` (GET, PUT)
- `/api/inventory/:id/movements` (GET, POST)

---

### 7. Contratos (contratos.html) ⏳
**URL:** http://91.107.237.159/contratos.html

**Pruebas a realizar:**
- [ ] Cargar lista de contratos
- [ ] Crear nuevo contrato
- [ ] Asignar equipos a contrato
- [ ] Ver términos SLA
- [ ] Renovar contrato
- [ ] Dar de baja contrato

**Endpoints críticos a verificar:**
- `/api/contracts` (GET, POST)
- `/api/contracts/:id` (GET, PUT)
- `/api/contracts/:id/equipment` (GET, POST)
- `/api/contracts/:id/sla` (GET, PUT)

---

### 8. Personal (personal.html) ⏳
**URL:** http://91.107.237.159/personal.html

**Pruebas a realizar:**
- [ ] Cargar lista de técnicos
- [ ] Crear nuevo técnico
- [ ] Asignar inventario a técnico
- [ ] Ver tickets asignados
- [ ] Editar información de técnico

**Endpoints críticos a verificar:**
- `/api/users` (GET, POST)
- `/api/users/:id` (GET, PUT)
- `/api/users/:id/tickets` (GET)
- `/api/users/:id/inventory` (GET)

---

### 9. Asistencia (asistencia.html) ⏳
**URL:** http://91.107.237.159/asistencia.html

**Pruebas a realizar:**
- [ ] Ver calendario de asistencia
- [ ] Registrar entrada
- [ ] Registrar salida
- [ ] Ver historial de asistencia
- [ ] Generar reporte

**Endpoints críticos a verificar:**
- `/api/attendance` (GET, POST)
- `/api/attendance/today` (GET)
- `/api/attendance/report` (GET)

---

### 10. Finanzas (finanzas.html) ⏳
**URL:** http://91.107.237.159/finanzas.html

**Pruebas a realizar:**
- [ ] Ver dashboard financiero
- [ ] Ver ingresos
- [ ] Ver egresos
- [ ] Crear factura
- [ ] Ver órdenes de compra
- [ ] Generar reporte financiero

**Endpoints críticos a verificar:**
- `/api/invoices` (GET, POST)
- `/api/purchase-orders` (GET, POST)
- `/api/financial/summary` (GET)

---

### 11. Planificador (planificador.html) ⏳
**URL:** http://91.107.237.159/planificador.html

**Pruebas a realizar:**
- [ ] Ver calendario de mantenimientos
- [ ] Crear mantenimiento programado
- [ ] Asignar técnico
- [ ] Marcar como completado
- [ ] Ver historial de mantenimientos

**Endpoints críticos a verificar:**
- `/api/maintenance-plans` (GET, POST)
- `/api/maintenance-plans/:id` (GET, PUT)
- `/api/work-orders` (GET, POST)

---

### 12. Reportes (reportes.html) ⏳
**URL:** http://91.107.237.159/reportes.html

**Pruebas a realizar:**
- [ ] Ver lista de reportes disponibles
- [ ] Generar reporte de tickets
- [ ] Generar reporte de equipos
- [ ] Generar reporte financiero
- [ ] Exportar a PDF
- [ ] Exportar a Excel

**Endpoints críticos a verificar:**
- `/api/reports/tickets` (GET)
- `/api/reports/equipment` (GET)
- `/api/reports/financial` (GET)

---

### 13. Notificaciones (notifications-dashboard.html) ⏳
**URL:** http://91.107.237.159/notifications-dashboard.html

**Pruebas a realizar:**
- [ ] Ver lista de notificaciones
- [ ] Marcar como leída
- [ ] Filtrar por tipo
- [ ] Ver contador de no leídas
- [ ] Configurar preferencias

**Endpoints críticos a verificar:**
- `/api/notifications` (GET)
- `/api/notifications/:id/read` (PUT)
- `/api/notifications/unread-count` (GET)

---

### 14. Configuración (configuracion.html) ⏳
**URL:** http://91.107.237.159/configuracion.html

**Pruebas a realizar:**
- [ ] Ver configuraciones generales
- [ ] Cambiar contraseña
- [ ] Configurar empresa
- [ ] Gestionar roles
- [ ] Realizar backup

**Endpoints críticos a verificar:**
- `/api/config` (GET, PUT)
- `/api/users/change-password` (POST)
- `/api/roles` (GET, POST)
- `/api/backup` (POST)

---

## 📝 TEMPLATE PARA REPORTAR ERRORES

Cuando encuentres un error, usa este formato:

```markdown
### 🐛 Error en [Módulo]

**URL:** http://91.107.237.159/[modulo].html  
**Fecha/Hora:** [Copiar de sistema]  
**Usuario:** admin

**Acción que causó el error:**
[Describir qué hiciste antes del error]

**Error en consola:**
```
[Copiar error exacto de DevTools Console]
```

**Endpoint afectado:**
[/api/...]

**Código de respuesta:**
[500, 404, 403, etc.]

**Prioridad:**
- [ ] Alta (Bloquea funcionalidad crítica)
- [ ] Media (Funcionalidad parcial)
- [ ] Baja (Mejora cosmética)
```

---

## 🎯 OBJETIVO FINAL

**META:** Tener los 14 módulos marcados como ✅ FUNCIONAL

**Progreso actual:** 2/14 (14%)

**Tiempo estimado:** 2-3 horas de pruebas exhaustivas

---

## 💡 TIPS

1. **Limpia caché entre pruebas:** Ctrl + Shift + Delete
2. **Usa modo incógnito** si algo no funciona bien
3. **Mantén los logs del backend abiertos:** `ssh root@91.107.237.159` y luego `tail -f /var/www/gymtec/logs/backend.log`
4. **Toma screenshots** de errores críticos
5. **Documenta TODO** - mejor sobrar que faltar información

---

**Inicio de inspección:** 2025-12-28  
**Inspector:** [Tu nombre]  
**Versión del sistema:** Gymtec ERP v1.0
