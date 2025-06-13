# Bitácora y Plan de Desarrollo - Gymtec ERP

**Última actualización:** 13 de Junio de 2025 - 03:45 hrs

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

**5. Sistema de Notas para Equipos**
-   [x] **Diseño de Base de Datos:** Se creó la tabla `EquipmentNotes` con campos para ID, equipo_id, nota, autor y timestamp.
-   [x] **API Backend Completa:** Se implementaron endpoints REST para gestión de notas:
    - `GET /api/equipment/:id/notes` - Obtener todas las notas de un equipo
    - `POST /api/equipment/:id/notes` - Agregar nueva nota
    - `DELETE /api/equipment/notes/:noteId` - Eliminar nota específica
-   [x] **Interfaz de Usuario Avanzada:** Se desarrolló una interfaz completa en `equipo.html` que incluye:
    - Formulario emergente para agregar notas con validación
    - Lista cronológica de notas con información de autor y fecha
    - Botones de eliminar con confirmación (aparecen al hacer hover)
    - Diseño profesional con bordes distintivos y animaciones
-   [x] **Funcionalidad Completa:** Sistema totalmente operativo que permite agregar, visualizar y eliminar notas directamente desde la página del equipo.
-   [x] **Datos de Ejemplo:** Se poblaron 5 notas de ejemplo para demostración del sistema.

**6. Corrección de Bugs y Mantenimiento**
-   [x] **Error de Puerto en Uso (`EADDRINUSE`):** Se diagnosticó y solucionó en repetidas ocasiones el error de puerto bloqueado, estableciendo un protocolo para detener el servidor antes de realizar cambios.
-   [x] **Botón "Añadir Equipo":** Se corrigió un bug que hacía desaparecer el botón "Añadir Equipo" en sedes que no tenían máquinas registradas.
-   [x] **Librería de QR:** Se reemplazó la librería de QR inicial por una más robusta y confiable (`qrcode.js`) para solucionar problemas de generación.
-   [x] **Error 500 en Equipos:** Se solucionó el error al cargar equipos causado por `custom_id` faltantes en la base de datos.
-   [x] **Generación de Custom ID:** Se corrigió el script `seed.js` para generar automáticamente `custom_id` únicos (formato EQ-001, EQ-002, etc.) para todos los equipos.
-   [x] **Estructura de Código JavaScript:** Se corrigieron errores de estructura en `equipo.js` donde las funciones estaban en el objeto incorrecto, causando errores de "función no definida".
-   [x] **Configuración de Tailwind CSS para Producción:** Se solucionó la advertencia de consola "cdn.tailwindcss.com should not be used in production" reemplazando todas las referencias al CDN de Tailwind por un archivo CSS local compilado. Se configuró el entorno de desarrollo con `tailwind.config.js`, archivo de entrada `input.css` y se generó `style.css` con todas las utilidades necesarias. Esto elimina la dependencia del CDN y mejora el rendimiento en producción.
-   [x] **Implementación de Sistema de Diseño Coherente:** Se realizó una revisión completa de la coherencia visual del proyecto y se implementó un sistema de diseño unificado. Se crearon variables CSS personalizadas para colores, tipografía y espaciado. Se estandarizaron todos los componentes (headers, botones, modales, tablas, formularios) para usar clases consistentes. Se corrigieron inconsistencias en colores de fondo (`bg-slate-50` vs `bg-gray-100`), texto (`text-slate-800` vs `text-gray-800`), y se unificó la presentación del usuario en todos los headers. El resultado es una interfaz visualmente coherente y profesional en todas las páginas del sistema.
-   [x] **Mantenedor de Modelos de Equipos (Frontend):** Se implementó completamente el frontend del mantenedor de modelos siguiendo las especificaciones del DiseñoApp. Incluye gestión completa de modelos con información técnica, subida de fotos con preview, gestión de manuales PDF/DOC, catálogo de repuestos compatibles, y sistema de checklist de mantenimiento con categorías y frecuencias. La interfaz cuenta con pestañas organizadas, drag & drop para archivos, búsqueda y filtros, vista de tarjetas responsiva, y modal de vista detallada. Se agregó al menú de navegación y está listo para integración con el backend.
-   [x] **Corrección de Errores de Acceso y JavaScript:** Se solucionaron problemas críticos de acceso y funcionalidad:
    - Error 404 al acceder a http://localhost:8080/modelos.html - servidor Python ahora ejecutándose desde directorio frontend
    - Error JavaScript "this.editFromView is not a function" - función removida correctamente del código
    - Errores de accesibilidad HTML - agregados atributos title a elementos select y botones para cumplir estándares web
-   [x] **Scripts de Arranque Automático:** Se implementó un sistema completo de scripts para automatizar el inicio y detención de servidores:
    - `start-servers.bat` - Script principal que inicia backend (Node.js) y frontend (Python) en ventanas separadas
    - `start-servers.ps1` - Versión alternativa en PowerShell con colores y mejor presentación
    - `stop-servers.bat` - Script para detener todos los servidores automáticamente
    - `README-SERVIDORES.md` - Documentación completa con instrucciones de uso y solución de problemas
    - Eliminación de la necesidad de iniciar manualmente cada servidor desde sus respectivos directorios
-   [x] **Población de Base de Datos con Modelos Realistas:** Se implementó un sistema completo de datos de equipos de gimnasio basados en marcas reales del mercado:
    - `backend/seed-models.js` - Script para poblar la tabla EquipmentModels con 28 modelos realistas
    - **Marcas incluidas:** Life Fitness, Technogym, Matrix, Precor, Cybex, Hammer Strength, Keiser, Concept2, Bowflex, WaterRower, Gym80
    - **Categorías:** 17 equipos de Cardio, 9 de Fuerza, 1 Funcional, 1 Accesorios
    - **Datos técnicos completos:** Especificaciones reales, dimensiones, peso, voltaje, potencia, descripciones detalladas
    - **Códigos de modelo únicos:** Formato estándar por marca (ej: LF-INT-TM-2024, TG-ER-1000, MX-T7X-2024)
    - Investigación web de equipos reales para garantizar datos precisos y actualizados
    - Reestructuración de tabla EquipmentModels con campos completos para integración con frontend
-   [x] **Conexión Frontend-Backend para Modelos:** Se implementó la API REST completa para modelos de equipos (`/api/models`) con operaciones CRUD (GET, POST, PUT, DELETE) y se conectó el frontend para cargar, crear y actualizar modelos desde la base de datos real. La página de modelos ahora carga los 28 modelos reales de la base de datos y permite crear/editar modelos con persistencia completa. Se configuró detección automática de puerto para permitir acceso tanto desde `http://localhost:3000/modelos.html` (servidor backend) como desde `http://localhost:8080/modelos.html` (servidor frontend) con conexión cruzada automática a la API. Se corrigió el formato del modal agregando las clases CSS faltantes (`max-w-4xl`, `space-y-*`, `gap-*`, etc.) para mantener el diseño responsivo y profesional. *(Completado el 2024-12-19)*
-   [x] **Sistema de Validaciones para Modelos:** Se implementó un sistema completo de validaciones en tiempo real para el formulario de modelos. Incluye validación de campos obligatorios (name, brand, category), validaciones numéricas (weight, power), validaciones de formato (dimensiones: "200 x 80 x 150", voltaje: "220V / 110V"), límites de longitud, y sistema de notificaciones toast con iconos, auto-cierre y diseño responsivo. Las validaciones se ejecutan al salir del campo (blur) y se limpian al escribir (input). *(Completado el 2024-12-19)*
-   [x] **Sistema de Subida de Fotos para Modelos:** Se implementó un sistema completo de gestión de fotos que incluye backend con multer para subida de archivos (límite 5MB, máximo 10 fotos, tipos: JPEG, JPG, PNG, GIF, WebP), endpoints REST para subir y eliminar fotos, frontend con drag & drop mejorado, preview de fotos con indicadores de estado (✓ subida, ⏳ temporal), indicador de progreso durante subida, eliminación individual con confirmación, y manejo robusto de errores. Las fotos se suben automáticamente para modelos existentes y se almacenan temporalmente para modelos nuevos hasta guardar. *(Completado el 2024-12-19)*
-   [x] **Corrección de Filtros de Modelos:** Se solucionó un bug crítico donde al filtrar modelos por categoría (ej: "Cardio") aparecían `[object Promise]` en lugar de las tarjetas de modelos. El problema se debía a que la función `filterModels()` no manejaba correctamente las promesas asíncronas de `createModelCard()`. Se implementó el manejo asíncrono correcto usando `async/await` y `Promise.all()`, similar al patrón usado en `renderModels()`. Ahora los filtros funcionan perfectamente mostrando las tarjetas con fotos cargadas desde la base de datos. *(Completado el 2025-06-13)*
-   [x] **Rediseño del Modal de Tickets:** Se implementó una mejora completa del diseño del modal de creación/edición de tickets para hacerlo más moderno y coherente con el resto de la aplicación. Incluye:
    - **Diseño moderno:** Bordes redondeados, sombras suaves, gradientes sutiles y backdrop blur
    - **Layout mejorado:** Grid responsivo de 2 columnas en desktop, 1 columna en móvil
    - **Componentes estilizados:** Inputs, selects y botones con estados de focus y hover mejorados
    - **Animaciones suaves:** Transiciones de entrada/salida con escalado y desplazamiento
    - **Indicadores visuales:** Campos requeridos marcados con asterisco rojo
    - **Botones de acción:** Gradientes distintivos para cancelar (gris) y guardar (verde)
    - **Responsive design:** Adaptación completa para dispositivos móviles
    - **Accesibilidad mejorada:** Mejor contraste, tamaños de botón adecuados y navegación por teclado
    El modal ahora presenta una apariencia profesional y moderna que mejora significativamente la experiencia del usuario. *(Completado el 2025-06-13)*
-   [x] **Estandarización Completa de Modales - Fase 1 (clientes.html):** Se completó la primera fase del plan de estandarización de modales aplicando el nuevo sistema de diseño a los 3 modales de clientes.html. Incluye:
    - **CSS Moderno:** Archivo `clientes.css` con estilos específicos para cada modal (cliente, sede, equipo)
    - **Estructura HTML Actualizada:** Todos los modales ahora usan la nueva estructura con header, body y footer separados
    - **Animaciones Suaves:** Implementación de transiciones de entrada/salida con backdrop blur y efectos de escalado
    - **Grid Responsivo:** Layout de 2 columnas en desktop que se adapta a 1 columna en móvil
    - **Componentes Estilizados:** Inputs, labels, botones y textareas con estados de focus y hover mejorados
    - **JavaScript Actualizado:** Funciones de apertura/cierre de modales con manejo de animaciones y event listeners para botones X
    - **Consistencia Visual:** Todos los modales (cliente, sede, equipo) ahora siguen el mismo estándar de diseño establecido
    - **Funcionalidad Preservada:** Mantiene todas las características existentes como scanner de códigos de barras y autocompletado de direcciones
    La página de clientes ahora presenta una experiencia visual completamente coherente y profesional. *(Completado el 2025-06-13)*
-   [x] **Corrección de Bug en Modales de Edición:** Se solucionó un problema crítico donde los botones de lápiz (editar cliente/sede) no abrían los modales correspondientes. El issue estaba en la configuración de event listeners para los botones de cerrar (X) que se ejecutaban solo una vez al cargar la página, pero los botones se crean dinámicamente. Se corrigió moviendo la configuración de estos listeners a la función `open` de cada modal para que se configuren cada vez que se abre un modal. Se agregaron logs de debug para verificar el funcionamiento correcto y se actualizó la función para evitar duplicación de listeners. *(Completado el 2025-06-13)*
-   [x] **Estandarización Completa de Modales - Fase 2 (inventario.html):** Se completó la segunda fase del plan de estandarización aplicando el nuevo sistema de diseño al modal de inventario. Incluye:
    - **CSS Moderno:** Archivo `inventario.css` con estilos específicos siguiendo el estándar establecido
    - **Estructura HTML Actualizada:** Modal rediseñado con header, body y footer separados usando clases semánticas
    - **Animaciones Suaves:** Implementación de transiciones de entrada/salida con backdrop blur y efectos de escalado
    - **Grid Responsivo:** Layout de 2 columnas en desktop que se adapta a 1 columna en móvil para los campos de stock
    - **Componentes Estilizados:** Inputs numéricos y de texto con estados de focus y hover mejorados
    - **JavaScript Modernizado:** Refactorización completa usando el patrón de modales estándar con funciones `open`, `close` y `setup`
    - **Funcionalidad Preservada:** Mantiene todas las características existentes de CRUD de repuestos (crear, editar, eliminar)
    - **Mejoras UX:** Confirmaciones mejoradas para eliminación y títulos descriptivos en botones
    El modal de inventario ahora presenta la misma experiencia visual profesional y coherente establecida en el sistema. *(Completado el 2025-06-13)*
-   [x] **Estandarización Completa de Modales - Fase 3 (modelos.html):** Se completó la tercera fase del plan de estandarización aplicando el nuevo sistema de diseño a los 2 modales complejos de modelos. Incluye:
    - **CSS Especializado:** Archivo `modelos.css` con 400+ líneas de estilos específicos para modales con pestañas
    - **Sistema de Pestañas Modernizado:** 5 pestañas (General, Fotos, Manuales, Repuestos, Checklist) con navegación fluida
    - **Estructura HTML Actualizada:** Ambos modales rediseñados con header, body y footer separados usando clases semánticas
    - **Animaciones Suaves:** Implementación de transiciones de entrada/salida con backdrop blur y efectos de escalado
    - **Grid Responsivo:** Layout adaptativo para formularios complejos con elementos dinámicos
    - **Componentes Especializados:** Áreas de subida de archivos, preview de fotos, elementos dinámicos (repuestos/checklist)
    - **JavaScript Actualizado:** Funciones de modal actualizadas al patrón estándar con manejo de pestañas
    - **Funcionalidad Preservada:** Mantiene todas las características avanzadas como drag & drop, validaciones y CRUD completo
    - **Elementos Dinámicos Rediseñados:** Repuestos y checklist ahora usan el nuevo sistema de diseño con botones de eliminación estilizados
    Los modales de equipos ahora presentan la experiencia visual más avanzada y profesional del sistema. *(Completado el 2025-06-13)*
-   [x] **Optimización de Layout Compacto para Equipos:** Se implementó una mejora significativa en el aprovechamiento del espacio horizontal en la página de detalle de equipos (`equipo.html`). Se creó un layout compacto donde el código QR (160px) aparece al lado de la información general en lugar de debajo, optimizando especialmente la experiencia en dispositivos móviles y tablets. Se desarrolló un archivo CSS especializado (`equipo.css`) con 400+ líneas de estilos responsivos, se refactorizó el JavaScript para usar clases semánticas en lugar de Tailwind, y se solucionaron problemas de cache del navegador agregando parámetros de versión. El resultado es un diseño más eficiente que aprovecha mejor el espacio disponible. *(Completado el 2025-06-13)*
-   [x] **Implementación Completa del Sistema Drawer/Sidebar para Equipos:** Se realizó el traspaso completo de la funcionalidad de `equipo.html` a un sistema de drawer/sidebar moderno que se desliza desde la derecha. Incluye:
    - **Drawer Responsivo:** 650px en desktop (30% más ancho), fullscreen en móvil con animaciones suaves (0.3s)
    - **Funcionalidad Completa:** Sistema completo de notas (agregar, eliminar, mostrar), historial de tickets, generación de QR, e impresión avanzada
    - **Integración Perfecta:** Se conectó con `clientes.html` reemplazando todos los enlaces a `equipo.html` por llamadas al drawer
    - **UX Mejorada:** Overlay oscuro, cierre con ESC/click fuera/botón X, scroll interno corregido, estados de carga
    - **Layout Optimizado:** Reutiliza el layout compacto desarrollado anteriormente con QR al lado de información
    - **APIs Existentes:** Funciona con todas las APIs existentes sin modificaciones del backend
    - **Scroll Automático:** Contenido con scroll interno cuando excede la altura del drawer
    - **Sistema de Fotos Completo:** Se agregó funcionalidad completa de gestión de fotos para equipos individuales que incluye tabla EquipmentPhotos en BD, APIs REST (GET/POST/DELETE), galería responsiva con grid, modal de vista ampliada, validación de archivos, almacenamiento en base64, y conexión con sistema de modelos existente
    - **Integración Fotos de Modelos:** Se implementó la conexión entre equipos individuales y modelos de equipos. Los equipos ahora muestran automáticamente la foto principal del modelo asociado en el drawer. Se agregó columna model_id a tabla Equipment, se asignaron modelos a equipos existentes, y se creó API para obtener foto principal del modelo. El drawer ahora muestra tanto la foto del modelo (si existe) como las fotos específicas del equipo individual
    El drawer proporciona una experiencia superior al eliminar la necesidad de navegar a páginas separadas, manteniendo el contexto del cliente y ofreciendo más espacio que un modal tradicional. *(Completado el 2025-06-13)*

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
- [ ] **Gestor de Clientes (Refinamiento de UI/UX):**

    - [ ] **Vista Rápida del Equipo:** Reemplazar la apertura en nueva pestaña por un modal para ver detalles de equipo sin salir del gestor de clientes.
- [ ] **Lógica de Creación Contextual:**
    - [x] **Crear Ticket para esta Sede:** Pasar ID de la sede al formulario de tickets.
    - [x] **Crear Ticket para este Equipo:** Pasar ID de sede y equipo al formulario.
- [x] **Sistema de Notas de Equipos:** Sistema completo implementado que permite agregar, visualizar y eliminar notas directamente desde la página de detalle del equipo, con interfaz profesional y persistencia en base de datos.
- [x] **Módulo de Gestión de Tickets (CRUD Básico):** Se ha implementado la funcionalidad completa para Crear, Leer, Actualizar y Eliminar tickets desde la página principal. Incluye la creación de la tabla `Tickets` en la base de datos, los endpoints de la API correspondientes y la lógica del frontend. Se corrigieron bugs de creación (estado por defecto) y edición (duplicación de tickets). Se rediseñó el modal de creación/edición para que sea visualmente coherente con el resto de la aplicación.

#### Módulo 3: Gestión de Servicios y Tickets
- [ ] **Dashboard de Tickets (Kanban/Tabla):**
    - [x] Vista global para gestionar todos los tickets.
    - [x] Indicador de color para SLA (Service Level Agreement) calculado en el frontend.
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
- [x] **Sistema de Autocompletado de Direcciones:** Se implementó un sistema completo de autocompletado usando **Nominatim de OpenStreetMap** como alternativa gratuita a Google Maps. Incluye:
    - Búsqueda en tiempo real con debounce para optimizar consultas
    - Filtrado específico para Chile con resultados en español
    - Interfaz profesional con indicador de carga y navegación por teclado
    - Formateo inteligente de direcciones con información principal y detalles
    - Integración automática en campos de dirección de clientes y sedes 