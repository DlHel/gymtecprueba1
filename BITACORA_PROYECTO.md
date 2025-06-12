# Bitácora y Plan de Desarrollo - Gymtec ERP

**Última actualización:** 12 de Junio de 2025

---

## ✅ Bitácora de Tareas Realizadas

**1. Configuración Inicial y Funcionalidad Básica**
-   [x] **Respaldo Inicial:** Se realizó el primer commit para establecer una línea base del proyecto en Git.
-   [x] **Activación de Botones:** Se implementó la funcionalidad para los botones de la interfaz de clientes (`clientes.html`), incluyendo la lógica para "Editar".
-   [x] **Creación de Módulo de Tickets:** Se creó la página `tickets.html` (con su JS y CSS) para dar funcionalidad al botón "Crear Ticket".

**2. Enriquecimiento del Modelo de Datos**
-   [x] **Ampliación del Cliente:** Se expandió el modelo de datos del cliente en la base de datos (`schema.sql`) para incluir campos cruciales como RUT, Razón Social, Dirección y Giro.
-   [x] **Actualización de API y Formularios:** Se modificaron los endpoints del backend (`server.js`) y el formulario modal en `clientes.html` para soportar la nueva información del cliente.
-   [x] **Poblado de Base de Datos (Seeding):** Se creó y posteriormente se mejoró significativamente el script `seed.js` para poblar la base de datos con datos de prueba realistas y variados, corrigiendo problemas de asincronía para asegurar la inserción completa de todos los datos.

**3. Rediseño de Interfaz y Experiencia de Usuario (UX)**
-   [x] **Refactorización a Vista de Columna Única:** Se rediseñó la interfaz de `clientes.html` a una vista de "acordeón" vertical como paso intermedio. *(Nota: El diseño final será un layout de 3 paneles).*
-   [x] **Detalle de Cliente Mejorado:** Al seleccionar un cliente, ahora se oculta la lista y se expanden sus detalles y sedes, proporcionando una vista más enfocada.
-   [x] **Navegación Mejorada:** Se añadió un botón para volver de la vista de detalle a la lista de clientes y se hizo que el botón "Volver" en la página de un equipo regrese al cliente correcto.

**4. Gestión Avanzada de Equipos y Códigos QR**
-   [x] **Visualización de Equipos:** Se reemplazó la lista simple de equipos por una tabla compacta y agrupada por tipo de máquina. Se implementó un sistema de pestañas para separar "Equipos" e "Historial de Tickets".
-   [x] **Generación de ID y QR:** Se implementó la lógica en el backend para generar un ID único y legible para cada equipo. El formato actual (`ClienteID-TIPO-Correlativo`) es una mejora sobre el plan original. La página de detalles (`equipo.html`) ahora genera y muestra un código QR que enlaza a la URL del propio equipo.
-   [x] **Impresión de QR:** Se añadió un botón en `equipo.html` que abre una vista de impresión optimizada para el código QR y su ID.
-   [x] **Lector de Código de Barras:** Se integró la librería `html5-qrcode` en el formulario de "Añadir Equipo" para permitir rellenar el número de serie usando la cámara del dispositivo.
-   [x] **CRUD de Equipos:** Se añadieron y se dio funcionalidad a los botones para Añadir, Editar y Eliminar equipos directamente desde la tabla de la sede.

**5. Corrección de Bugs y Mantenimiento**
-   [x] **Error de Puerto en Uso (`EADDRINUSE`):** Se diagnosticó y solucionó en repetidas ocasiones el error de puerto bloqueado, estableciendo un protocolo para detener el servidor antes de realizar cambios.
-   [x] **Botón "Añadir Equipo":** Se corrigió un bug que hacía desaparecer el botón "Añadir Equipo" en sedes que no tenían máquinas registradas.
-   [x] **Librería de QR:** Se reemplazó la librería de QR inicial por una más robusta y confiable (`qrcode.js`) para solucionar problemas de generación.

---

## 📝 Plan de Desarrollo y Tareas Pendientes

### Primera Etapa: Operaciones Centrales

#### Módulo 1: Dashboard y Planificación
- [ ] **Dashboard Principal (Admin):**
    - [ ] Vista consolidada de operaciones.
    - [ ] Consultas a la API para datos en tiempo real.
    - [ ] KPIs con actualización periódica.
    - [ ] Calendario con datos de Tickets, Contratos y Ausencias.
- [ ] **Dashboard del Técnico:**
    - [ ] Vista simplificada de la jornada.
    - [ ] Filtro automático de tickets asignados para el día.
    - [ ] Resumen de inventario de repuestos del técnico/vehículo.

#### Módulo 2: Gestión de Clientes, Sedes y Equipos (CRM e Inventario Unificado)
- [ ] **Lógica de Identificadores (IDs):**
    - [ ] **ID de Usuario (Personal):** Implementar formato `[4 Primeras Letras Nombre][Correlativo 4 Dígitos]` (Ej: `Feli1001`).
    - [ ] **ID de Sede:** Implementar formato `[ID Cliente]-[Correlativo 3 Dígitos]` (Ej: `Feli1001-001`).
    - [x] **ID de Equipo:** Formato `[ID Cliente]-[Abreviatura Tipo]-[Correlativo]`. *(Decisión de diseño: Se usa el ID del Cliente en lugar del ID de la Sede para asegurar un correlativo único a nivel de cliente).*
- [ ] **Gestor de Clientes (Refinamiento de UI/UX):**
    - [ ] **Rediseño a 3 Paneles:** Refactorizar la interfaz de `clientes.html` del actual diseño de acordeón a un layout de 3 paneles (Lista Clientes | Lista Sedes | Detalle Sede) para mejorar el flujo de trabajo.
    - [ ] **Navegación Cliente -> Sede:** Si un cliente tiene una sola sede, seleccionarla automáticamente.
    - [ ] **Vista Rápida del Equipo:** Reemplazar la apertura en nueva pestaña por un modal para ver detalles de equipo sin salir del gestor de clientes.
- [ ] **Lógica de Creación Contextual:**
    - [x] **Crear Ticket para esta Sede:** Pasar ID de la sede al formulario de tickets.
    - [ ] **Crear Ticket para este Equipo:** Pasar ID de sede y equipo al formulario.

#### Módulo 3: Gestión de Servicios y Tickets
- [ ] **Dashboard de Tickets (Kanban/Tabla):**
    - [ ] Vista global para gestionar todos los tickets.
    - [ ] Indicador de color para SLA (Service Level Agreement) calculado en el frontend.
- [ ] **Detalle del Ticket:**
    - [ ] **Checklist Digital:** Cargar plantillas de checklist según el modelo de equipo. Guardar progreso automáticamente.
    - [ ] **Registro de Repuestos:** Implementar búsqueda en inventario del técnico y central. Descontar stock al usar. Generar alertas de bajo stock.
    - [ ] **Registro de Tiempos:** Implementar temporizador en el frontend para registrar el tiempo de trabajo en un ticket.
- [ ] **Planificador de Servicios (Scheduler):**
    - [ ] Vista de Calendario/Gantt para asignar tickets.
    - [ ] Permitir arrastrar y soltar tickets para asignarlos a técnicos.

#### Módulo 4: Portal del Cliente
- [ ] **Autenticación de Clientes:** Implementar un sistema de login separado para clientes.
- [ ] **Filtrado de Datos:** Asegurar que el backend filtre toda la información para que el cliente solo vea sus propios datos.

#### Módulo 5: Configuración del Sistema
- [ ] **Panel de Administración:**
    - [ ] Crear interfaz para gestionar plantillas de SLA.
    - [ ] Crear interfaz para gestionar abreviaturas de tipos de equipo.
    - [ ] Crear interfaz para gestionar plantillas de checklists.

---

### Segunda Etapa: Gestión Financiera

#### Módulo 6: Billetera y Finanzas (Parte 1)
- [ ] **Cotizaciones:**
    - [ ] Sugerir ítems y precios basados en el historial.
    - [ ] Guardar historial de versiones de cotizaciones.
- [ ] **Facturación Recurrente:**
    - [ ] Crear tarea programada (cron job) para generar facturas automáticas de contratos fijos.
- [ ] **Órdenes de Compra:**
    - [ ] Cambiar estado de repuestos a "En pedido".
    - [ ] Incrementar stock automáticamente al marcar la orden como "Recibida".

---

### Tercera Etapa: Gestión de Personal y Analítica Avanzada

#### Módulo 7: Control Horario y Asistencia
- [ ] **Cálculo de Horas:** Procesar marcajes para calcular tiempo trabajado y compararlo con la jornada.
- [ ] **Flujo de Autorización de Horas Extras:** Implementar sistema de aprobación para horas extra.

#### Módulo 8: Billetera y Finanzas (Parte 2)
- [ ] **Cálculo de Pago a Técnicos:**
    - [ ] Crear proceso que consulte horas aprobadas, aplique tarifas, sume bonos y reste descuentos.

#### Módulo 9: Reportes y Analítica Avanzada
- [ ] **Generador de Reportes:**
    - [ ] Crear consultas complejas para unir datos de múltiples tablas.
    - [ ] Generar reporte de "Rentabilidad por Cliente".
- [ ] **Notificaciones de Usuario:** Reemplazar los `alert()` de JavaScript por un sistema de notificaciones más amigable (ej. "toasts") para confirmar acciones (Guardado, Eliminado) o mostrar errores.
- [ ] **Indicadores de Carga (Spinners):** Añadir indicadores visuales de carga mientras se obtienen datos del backend (ej. al cargar la lista de clientes o los detalles de una sede) para mejorar la percepción de rendimiento.
- [ ] **Integración de Google Maps:** Activar completamente el autocompletado de direcciones en los formularios, sustituyendo la `API_KEY` de placeholder por una real en `clientes.html`. 