# 🧪 PLAN DE TESTING COMPLETO - GYMTEC ERP VPS

**Fecha:** 2025-12-29  
**Servidor:** http://91.107.237.159  
**Objetivo:** Validar 100% de funcionalidad en producción

---

## 📋 MÓDULOS A PROBAR (14 Total)

### ✅ CRÍTICOS (Prioridad 1)
1. ✅ Login / Autenticación
2. ⏳ Dashboard (index.html)
3. ⏳ Clientes (clientes.html)
4. ⏳ Equipos (equipo.html)
5. ⏳ Tickets (tickets.html)
6. ⏳ Modelos (modelos.html)

### 📊 IMPORTANTES (Prioridad 2)
7. ⏳ Inventario (inventario.html)
8. ⏳ Contratos (contratos.html)
9. ⏳ Personal (personal.html)
10. ⏳ Finanzas (finanzas.html)

### 🔧 COMPLEMENTARIOS (Prioridad 3)
11. ⏳ Asistencia (asistencia.html)
12. ⏳ Planificador (planificador.html)
13. ⏳ Reportes (reportes.html)
14. ⏳ Configuración (configuracion.html)

---

## 🎯 METODOLOGÍA DE TESTING

Para cada módulo:

### 1. CARGA INICIAL
- [ ] Página carga sin errores
- [ ] Sin errores en consola
- [ ] Datos se muestran correctamente
- [ ] Loading states funcionan

### 2. NAVEGACIÓN
- [ ] Menú lateral funciona
- [ ] Breadcrumbs correctos
- [ ] Transiciones suaves

### 3. OPERACIONES CRUD
- [ ] **CREATE** - Crear nuevo registro
  - Abrir modal
  - Llenar formulario
  - Validaciones funcionan
  - Guardar exitoso
  - Feedback visual
- [ ] **READ** - Listar/Ver detalles
  - Tabla/lista se carga
  - Paginación funciona
  - Búsqueda funciona
  - Filtros funcionan
- [ ] **UPDATE** - Editar registro
  - Abrir modal de edición
  - Datos precargados
  - Modificar campos
  - Guardar cambios
  - Actualización en UI
- [ ] **DELETE** - Eliminar registro
  - Confirmación aparece
  - Eliminación exitosa
  - Actualización en lista

### 4. FUNCIONALIDADES ESPECÍFICAS
- [ ] Botones secundarios
- [ ] Modales/Drawers
- [ ] Subpestañas
- [ ] Exportar/Importar
- [ ] Filtros avanzados

### 5. ERRORES Y EDGE CASES
- [ ] Manejo de errores API
- [ ] Validación de campos vacíos
- [ ] Validación de formato
- [ ] Mensajes de error claros

---

## 📝 MÓDULO 1: LOGIN / AUTENTICACIÓN

### Estado: ✅ APROBADO

**URL:** http://91.107.237.159/login.html

#### Checklist:
- [x] Página carga correctamente
- [x] Formulario visible
- [x] Login con credenciales correctas funciona
- [x] Token JWT se guarda en localStorage
- [x] Redirección a dashboard funciona
- [x] Login con credenciales incorrectas muestra error
- [x] Validación de campos vacíos
- [x] Botón "Olvidé contraseña" presente
- [x] AuthManager se inicializa

#### Resultados:
✅ **FUNCIONAL AL 100%**

---

## 📝 MÓDULO 2: DASHBOARD

### Estado: ⏳ PENDIENTE

**URL:** http://91.107.237.159/index.html

#### Checklist Detallado:

##### 2.1 CARGA INICIAL
- [ ] Página carga sin errores
- [ ] Sin errores en consola
- [ ] KPIs se cargan correctamente
- [ ] Gráficos se renderizan

##### 2.2 KPIs (Tarjetas Superiores)
- [ ] Total Clientes - muestra número
- [ ] Total Equipos - muestra número
- [ ] Tickets Abiertos - muestra número
- [ ] Órdenes Pendientes - muestra número
- [ ] Los números coinciden con la BD

##### 2.3 GRÁFICO DE TICKETS
- [ ] Gráfico se renderiza
- [ ] Datos correctos
- [ ] Interactividad funciona
- [ ] Leyenda visible

##### 2.4 ACTIVIDAD RECIENTE
- [ ] Lista de actividades se carga
- [ ] Timestamps correctos
- [ ] Íconos apropiados
- [ ] Links funcionan

##### 2.5 EQUIPOS CRÍTICOS
- [ ] Lista se carga
- [ ] Estados correctos
- [ ] Botones de acción funcionan
- [ ] Drawer de equipo se abre

##### 2.6 FILTROS Y BÚSQUEDA
- [ ] Filtro por fecha funciona
- [ ] Búsqueda funciona
- [ ] Exportar datos funciona

#### Endpoints a Verificar:
```javascript
GET /api/dashboard/stats
GET /api/dashboard/activity
GET /api/dashboard/tickets-chart
GET /api/dashboard/critical-equipment
```

---

## 📝 MÓDULO 3: CLIENTES

### Estado: ⏳ PENDIENTE

**URL:** http://91.107.237.159/clientes.html

#### Checklist Detallado:

##### 3.1 LISTADO DE CLIENTES
- [ ] Tabla de clientes se carga
- [ ] Muestra: Nombre, RUT, Contacto, Email, Teléfono
- [ ] Paginación funciona
- [ ] Búsqueda funciona
- [ ] Filtros funcionan

##### 3.2 CREAR CLIENTE
- [ ] Botón "Nuevo Cliente" visible
- [ ] Modal se abre correctamente
- [ ] Campos del formulario:
  - [ ] Nombre (requerido)
  - [ ] RUT (requerido, validación)
  - [ ] Contacto
  - [ ] Email (validación formato)
  - [ ] Teléfono (validación formato)
  - [ ] Dirección
- [ ] Validaciones funcionan
- [ ] Guardar exitoso
- [ ] Cliente aparece en lista
- [ ] Modal se cierra

##### 3.3 VER DETALLES CLIENTE
- [ ] Click en cliente abre detalles
- [ ] Información completa visible
- [ ] Botón "Editar" funciona
- [ ] Botón "Eliminar" funciona

##### 3.4 UBICACIONES DEL CLIENTE
- [ ] Sección "Ubicaciones" visible
- [ ] Botón "Agregar Ubicación" funciona
- [ ] Modal de ubicación se abre
- [ ] Campos:
  - [ ] Nombre ubicación
  - [ ] Dirección
  - [ ] Ciudad
  - [ ] Región
- [ ] Guardar ubicación funciona
- [ ] Ubicación aparece en lista

##### 3.5 EQUIPOS POR UBICACIÓN
- [ ] Click en ubicación muestra equipos
- [ ] Lista de equipos se carga
- [ ] Botón "Agregar Equipo" funciona
- [ ] Modal de equipo se abre
- [ ] Guardar equipo funciona

##### 3.6 DRAWER DE EQUIPO
- [ ] Drawer se abre al click
- [ ] Pestañas visibles:
  - [ ] Información
  - [ ] Tickets
  - [ ] Notas
  - [ ] Fotos
  - [ ] QR
- [ ] Todas las pestañas funcionan
- [ ] Cerrar drawer funciona

##### 3.7 EDITAR CLIENTE
- [ ] Modal de edición se abre
- [ ] Datos precargados
- [ ] Modificar campos funciona
- [ ] Guardar cambios actualiza datos
- [ ] Lista se actualiza

##### 3.8 ELIMINAR CLIENTE
- [ ] Modal de confirmación aparece
- [ ] Mensaje claro de advertencia
- [ ] Cancelar funciona
- [ ] Confirmar elimina cliente
- [ ] Cliente desaparece de lista

#### Endpoints a Verificar:
```javascript
GET /api/clients
POST /api/clients
GET /api/clients/:id
PUT /api/clients/:id
DELETE /api/clients/:id
GET /api/clients/:id/locations
POST /api/locations
GET /api/locations/:id/equipment
POST /api/equipment
```

---

## 📝 MÓDULO 4: EQUIPOS

### Estado: ⏳ PENDIENTE

**URL:** http://91.107.237.159/equipo.html

#### Checklist Detallado:

##### 4.1 LISTADO DE EQUIPOS
- [ ] Tabla de equipos se carga
- [ ] Columnas visibles:
  - [ ] Modelo
  - [ ] Serial
  - [ ] Cliente
  - [ ] Ubicación
  - [ ] Estado
  - [ ] Acciones
- [ ] Paginación funciona
- [ ] 10/25/50/100 items por página

##### 4.2 BÚSQUEDA Y FILTROS
- [ ] Búsqueda por serial funciona
- [ ] Búsqueda por modelo funciona
- [ ] Filtro por cliente funciona
- [ ] Filtro por ubicación funciona
- [ ] Filtro por estado funciona
- [ ] Limpiar filtros funciona

##### 4.3 CREAR EQUIPO
- [ ] Botón "Nuevo Equipo" visible
- [ ] Modal se abre
- [ ] Campos del formulario:
  - [ ] Modelo (dropdown)
  - [ ] Número Serial (requerido)
  - [ ] Cliente (dropdown)
  - [ ] Ubicación (dropdown dependiente)
  - [ ] Fecha Instalación
  - [ ] Estado (activo/inactivo)
- [ ] Validaciones funcionan
- [ ] Guardar exitoso
- [ ] Equipo aparece en lista

##### 4.4 VER DETALLES EQUIPO
- [ ] Click abre drawer
- [ ] Pestaña INFORMACIÓN:
  - [ ] Modelo
  - [ ] Serial
  - [ ] Cliente/Ubicación
  - [ ] Fecha instalación
  - [ ] Estado
  - [ ] Botón "Editar"

##### 4.5 PESTAÑA TICKETS
- [ ] Lista de tickets del equipo
- [ ] Botón "Nuevo Ticket"
- [ ] Ver detalles de ticket
- [ ] Estados correctos

##### 4.6 PESTAÑA NOTAS
- [ ] Lista de notas se carga
- [ ] Botón "Agregar Nota"
- [ ] Textarea para nota
- [ ] Guardar nota funciona
- [ ] Nota aparece en lista
- [ ] Timestamp correcto

##### 4.7 PESTAÑA FOTOS
- [ ] Galería de fotos
- [ ] Botón "Subir Foto"
- [ ] Input file funciona
- [ ] Vista previa imagen
- [ ] Guardar foto funciona
- [ ] Foto aparece en galería
- [ ] Click amplía foto
- [ ] Eliminar foto funciona

##### 4.8 PESTAÑA QR
- [ ] QR code se genera
- [ ] QR contiene URL correcta
- [ ] Botón "Descargar QR"
- [ ] Botón "Imprimir QR"

##### 4.9 EDITAR EQUIPO
- [ ] Modal de edición se abre
- [ ] Datos precargados
- [ ] Modificar campos funciona
- [ ] Guardar actualiza datos

##### 4.10 ELIMINAR EQUIPO
- [ ] Confirmación aparece
- [ ] Eliminar funciona
- [ ] Equipo desaparece

#### Endpoints a Verificar:
```javascript
GET /api/equipment
POST /api/equipment
GET /api/equipment/:id
PUT /api/equipment/:id
DELETE /api/equipment/:id
GET /api/equipment/:id/tickets
GET /api/equipment/:id/notes
POST /api/equipment/:id/notes
GET /api/equipment/:id/photos
POST /api/equipment/:id/photos
DELETE /api/equipment/photos/:id
```

---

## 📝 MÓDULO 5: TICKETS

### Estado: ⏳ PENDIENTE

**URL:** http://91.107.237.159/tickets.html

#### Checklist Detallado:

##### 5.1 LISTADO DE TICKETS
- [ ] Tabla de tickets se carga
- [ ] Columnas visibles:
  - [ ] ID
  - [ ] Título
  - [ ] Cliente
  - [ ] Ubicación
  - [ ] Prioridad
  - [ ] Estado
  - [ ] Fecha
  - [ ] Acciones
- [ ] Paginación funciona

##### 5.2 FILTROS AVANZADOS
- [ ] Filtro por estado
- [ ] Filtro por prioridad
- [ ] Filtro por cliente
- [ ] Filtro por ubicación
- [ ] Filtro por fecha
- [ ] Búsqueda por texto
- [ ] Limpiar filtros

##### 5.3 CREAR TICKET
- [ ] Botón "Nuevo Ticket"
- [ ] Modal se abre
- [ ] Campos del formulario:
  - [ ] Título (requerido)
  - [ ] Descripción (requerido)
  - [ ] Cliente (dropdown)
  - [ ] Ubicación (dropdown)
  - [ ] Equipo (dropdown opcional)
  - [ ] Prioridad (Low/Medium/High/Critical)
  - [ ] Tipo (Correctivo/Preventivo)
- [ ] Validaciones funcionan
- [ ] Guardar exitoso
- [ ] Ticket aparece en lista

##### 5.4 VER DETALLES TICKET
- [ ] Click abre página de detalles
- [ ] Información completa visible
- [ ] Timeline de eventos
- [ ] Comentarios se muestran

##### 5.5 CHECKLIST DEL TICKET
- [ ] Checklist se carga
- [ ] Items marcables
- [ ] Marcar item actualiza progreso
- [ ] Porcentaje de progreso correcto
- [ ] Agregar item nuevo funciona

##### 5.6 COMENTARIOS
- [ ] Lista de comentarios
- [ ] Textarea para comentar
- [ ] Botón "Agregar Comentario"
- [ ] Comentario se guarda
- [ ] Aparece en lista
- [ ] Usuario y timestamp correcto

##### 5.7 FOTOS DEL TICKET
- [ ] Galería de fotos
- [ ] Subir foto funciona
- [ ] Vista previa
- [ ] Eliminar foto

##### 5.8 ASIGNAR TÉCNICO
- [ ] Dropdown de técnicos
- [ ] Asignar funciona
- [ ] Notificación al técnico (si implementado)

##### 5.9 CAMBIAR ESTADO
- [ ] Dropdown de estados
- [ ] Cambiar estado funciona
- [ ] Timeline se actualiza
- [ ] Color de badge cambia

##### 5.10 CAMBIAR PRIORIDAD
- [ ] Dropdown de prioridades
- [ ] Cambiar prioridad funciona
- [ ] Badge se actualiza

##### 5.11 CERRAR TICKET
- [ ] Botón "Cerrar Ticket"
- [ ] Confirmación aparece
- [ ] Cerrar funciona
- [ ] Estado cambia a "Cerrado"

##### 5.12 REABRIR TICKET
- [ ] Botón "Reabrir" (si cerrado)
- [ ] Reapertura funciona
- [ ] Estado cambia

#### Endpoints a Verificar:
```javascript
GET /api/tickets
POST /api/tickets
GET /api/tickets/:id
PUT /api/tickets/:id
DELETE /api/tickets/:id
GET /api/tickets/:id/checklist
POST /api/tickets/:id/checklist
PUT /api/tickets/:id/checklist/:itemId
GET /api/tickets/:id/comments
POST /api/tickets/:id/comments
GET /api/tickets/:id/photos
POST /api/tickets/:id/photos
PUT /api/tickets/:id/assign
PUT /api/tickets/:id/status
PUT /api/tickets/:id/priority
```

---

## 📝 MÓDULO 6: MODELOS

### Estado: ⏳ PENDIENTE

**URL:** http://91.107.237.159/modelos.html

#### Checklist Detallado:

##### 6.1 CATÁLOGO DE MODELOS
- [ ] Grid/Lista de modelos
- [ ] Foto principal de modelo
- [ ] Nombre del modelo
- [ ] Fabricante
- [ ] Tipo de equipo
- [ ] Acciones

##### 6.2 CREAR MODELO
- [ ] Botón "Nuevo Modelo"
- [ ] Modal se abre
- [ ] Campos:
  - [ ] Nombre (requerido)
  - [ ] Fabricante
  - [ ] Tipo (Cardio/Fuerza/Funcional)
  - [ ] Descripción
  - [ ] Foto principal
- [ ] Guardar funciona
- [ ] Modelo aparece

##### 6.3 VER DETALLES MODELO
- [ ] Click abre detalles
- [ ] Información completa
- [ ] Galería de fotos
- [ ] Lista de manuales
- [ ] Especificaciones técnicas

##### 6.4 FOTOS DEL MODELO
- [ ] Galería funciona
- [ ] Subir foto funciona
- [ ] Establecer foto principal
- [ ] Eliminar foto

##### 6.5 MANUALES DEL MODELO
- [ ] Lista de manuales
- [ ] Subir manual PDF
- [ ] Descargar manual
- [ ] Eliminar manual

##### 6.6 EDITAR MODELO
- [ ] Modal de edición
- [ ] Datos precargados
- [ ] Guardar cambios

##### 6.7 ELIMINAR MODELO
- [ ] Confirmación
- [ ] Verificar equipos asociados
- [ ] Eliminar funciona

#### Endpoints a Verificar:
```javascript
GET /api/models
POST /api/models
GET /api/models/:id
PUT /api/models/:id
DELETE /api/models/:id
GET /api/models/:id/photos
POST /api/models/:id/photos
PUT /api/models/:id/main-photo
GET /api/models/:id/manuals
POST /api/models/:id/manuals
DELETE /api/models/manuals/:id
```

---

## 📝 FORMATO DE REPORTE

Para cada módulo, documentar:

```markdown
### MÓDULO: [Nombre]
**Fecha Test:** YYYY-MM-DD HH:MM
**Tester:** Copilot
**Resultado:** ✅ APROBADO / ⚠️ CON ERRORES / ❌ FALLO

#### Errores Encontrados:
1. [Descripción del error]
   - **Tipo:** Console Error / API Error / UI Bug
   - **Severidad:** Critical / High / Medium / Low
   - **Reproducción:** [Pasos]
   - **Error:** [Mensaje]
   - **Solución:** [Propuesta]

#### Funcionalidades OK:
- ✅ [Característica 1]
- ✅ [Característica 2]

#### Screenshots:
- [Si es necesario]
```

---

## 🎯 SIGUIENTE PASO

Comenzar con **MÓDULO 2: DASHBOARD** realizando testing exhaustivo paso por paso.
