# Plan Funcional Detallado y Lógica del Sistema ERP para Gymtec

Este documento describe los requerimientos funcionales y la lógica de negocio para la construcción del ERP de Gymtec, organizado por etapas de desarrollo.

---

## Principios de Diseño y Arquitectura Funcional
*   **Diseño Modular y Responsivo:** La interfaz se construirá con componentes reutilizables y un diseño "Mobile-First".
*   **Navegación Eficiente y Contextual:** Se usará un menú lateral, paneles deslizables y expansión en línea para evitar recargas de página y mantener el contexto del usuario.
*   **Visibilidad Basada en Roles:** La interfaz se adaptará dinámicamente al rol del usuario.

---

## Primera Etapa: Operaciones Centrales

### Módulo 1: Dashboard y Planificación

#### Página/Vista 1: Dashboard Principal (Vista de Administrador)
*   **Función:** Centro de mando con una vista consolidada de todas las operaciones.
*   **Lógica Detallada:** Al cargar, la vista realiza múltiples consultas a la API para obtener datos en tiempo real y poblar los componentes. Los KPIs se actualizan periódicamente (ej. cada 5 minutos). El calendario obtiene los datos de los módulos de Tickets, Clientes (contratos) y Control Horario (ausencias).

#### Página/Vista 2: Dashboard del Técnico
*   **Función:** Vista simplificada para que el técnico gestione su jornada.
*   **Lógica Detallada:** La vista se filtra automáticamente para mostrar solo los tickets asignados al usuario que ha iniciado sesión para la fecha actual. El resumen de inventario de repuestos se basa en un sub-inventario asignado al vehículo o al técnico.

### Módulo 2: Gestión de Clientes, Sedes y Equipos (CRM e Inventario Unificado)

#### Lógica de Identificadores (IDs)
*   **ID de Usuario (Personal):** Formato `[4 Primeras Letras Nombre][Correlativo 4 Dígitos]`. Ej: `Feli1001`. Generado automáticamente por el sistema al crear un usuario.
*   **ID de Sede:** Formato `[ID Cliente]-[Correlativo 3 Dígitos]`. Ej: `Feli1001-001`. Generado automáticamente al crear una nueva sede para un cliente.
*   **ID de Equipo:** Formato `[ID Sede]-[Abreviatura Tipo]-[Correlativo 4 Dígitos]`. Ej: `Feli1001-001-ELIP-1001`. Generado automáticamente al añadir un equipo a una sede.

#### Página/Vista 1: Gestor de Clientes (Interfaz de 3 Paneles)
*   **Función:** Pantalla única para navegar y gestionar clientes, sedes y equipos.
*   **Lógica Detallada:**
    *   **Navegación Cliente -> Sede:** Al hacer clic en un cliente, la API devuelve los detalles del cliente y un listado de sus sedes. Si la API devuelve una sola sede, el sistema navega automáticamente y selecciona esa sede para mostrar sus detalles en el panel derecho.
    *   **Navegación Sede -> Equipos:** Al seleccionar una sede, la API devuelve los detalles de la sede y un listado de todos sus equipos. El frontend agrupa estos equipos por Tipo de Equipo y muestra un resumen (ej. 20 Trotadoras). Al hacer clic, se expande la lista para mostrar los equipos individuales.
    *   **Vista Rápida del Equipo:** Al hacer clic en un ID de equipo individual, se realiza una llamada a la API para obtener los datos específicos de esa máquina y se muestran en un modal, evitando una recarga de página completa.
*   **Lógica de Creación Contextual:**
    *   El botón "Crear Ticket para esta Sede" pasa el ID de la Sede al formulario de creación de tickets.
    *   El botón "Crear Ticket para este Equipo" (en la vista de detalle) pasa tanto el ID de la Sede como el ID del Equipo al formulario.

### Módulo 3: Gestión de Servicios y Tickets

#### Página/Vista 1: Dashboard de Tickets (Kanban/Tabla)
*   **Función:** Vista global para gestionar todos los tickets.
*   **Lógica Detallada:** La vista obtiene los tickets y la información de los SLAs asociados. El color del indicador de SLA se calcula en el frontend basado en la fecha de vencimiento y la fecha actual.

#### Página/Vista 2: Detalle del Ticket
*   **Función:** Espacio de trabajo para un ticket específico.
*   **Lógica Detallada:**
    *   **Checklist Digital:** Al abrir el ticket, el sistema carga la plantilla del checklist correspondiente al modelo del equipo. El progreso se guarda automáticamente a medida que el técnico marca cada ítem.
    *   **Registro de Repuestos:** La búsqueda de repuestos se realiza contra el inventario del técnico y el inventario central. Al usar un repuesto, se registra en el ticket y una transacción en la base de datos descuenta el stock. Si no hay stock, se puede generar una alerta.
    *   **Registro de Tiempos:** El temporizador se ejecuta en el frontend. Al detenerlo, el tiempo acumulado se guarda en el historial del ticket mediante una llamada a la API.

#### Página/Vista 3: Planificador de Servicios (Scheduler)
*   **Función:** Calendario/Gantt visual para asignar tickets.
*   **Lógica Detallada:** El componente obtiene todos los tickets no asignados y la agenda de todos los técnicos para el período de tiempo seleccionado. Al arrastrar un ticket sobre un técnico, se realiza una llamada a la API para actualizar el ticket con el nuevo técnico asignado y la fecha/hora programada.

### Módulo 4: Portal del Cliente
*   **Función:** Interfaz de autoservicio para los clientes.
*   **Lógica Detallada:** El sistema de autenticación para clientes es separado del de los empleados de Gymtec. Una vez logueado, todas las llamadas a la API se filtran automáticamente en el backend para devolver solo la información perteneciente a ese cliente.

### Módulo 5: Configuración del Sistema
*   **Función:** Panel central para que el administrador gestione los parámetros.
*   **Lógica Detallada:** Las configuraciones guardadas en este módulo (ej. plantillas de SLA, abreviaturas de tipos de equipo, plantillas de checklists) se almacenan en tablas dedicadas en la base de datos y son consultadas por los otros módulos para aplicar las reglas de negocio correspondientes.

---

## Segunda Etapa: Gestión Financiera

### Módulo 6: Billetera y Finanzas (Parte 1)
*   **Lógica Detallada:**
    *   **Cotizaciones:** Al crear una cotización, el sistema puede sugerir ítems y precios basados en reparaciones similares del historial de tickets. Cada versión de la cotización se guarda para trazabilidad.
    *   **Facturación Recurrente:** Una tarea programada en el backend (ej. un cron job) se ejecuta mensualmente, busca los contratos con tarifa fija y genera automáticamente las facturas para esos clientes.
    *   **Órdenes de Compra:** Cuando se crea una orden de compra, el estado de los repuestos puede cambiar a "En pedido". Al marcar la orden como "Recibida", se realiza una transacción en la base de datos que incrementa el stock de los repuestos correspondientes.

---

## Tercera Etapa: Gestión de Personal y Analítica Avanzada

### Módulo 7: Control Horario y Asistencia
*   **Lógica Detallada:**
    *   **Cálculo de Horas:** El backend procesa los marcajes de entrada y salida para calcular el tiempo total trabajado. Compara este tiempo con la jornada definida en el horario del empleado y la normativa de 40 horas.
    *   **Flujo de Autorización de Horas Extras:** Las horas que exceden la jornada se registran con un estado "Pendiente de Aprobación". El administrador debe cambiar explícitamente este estado a "Aprobado" para que sean consideradas en el cálculo de pago.

### Módulo 8: Billetera y Finanzas (Parte 2)
*   **Lógica Detallada:**
    *   **Cálculo de Pago a Técnicos:** Al ejecutar el proceso de pago para un período, el sistema consulta las horas ordinarias y las horas extras con estado "Aprobado" del módulo de asistencia. Aplica las tarifas configuradas para el técnico, suma bonos (si existen) y resta descuentos para calcular el monto final.

### Módulo 9: Reportes y Analítica Avanzada
*   **Lógica Detallada:** El generador de reportes realizará consultas complejas a la base de datos, uniendo información de diferentes tablas (Tickets, Tiempos, Repuestos, Clientes, Facturas) para compilar los datos necesarios. Por ejemplo, para el reporte de "Rentabilidad por Cliente", sumará todos los ingresos de las facturas de ese cliente y restará todos los costos asociados (repuestos utilizados en sus tickets, horas de trabajo de los técnicos, etc.).