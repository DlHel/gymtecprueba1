# Arquitectura "Vertical Slice" Empresarial (GymTec ERP)

## Visión General
Para alcanzar un nivel **profesional y robusto**, abandonaremos la simple división de carpetas por una **Arquitectura de Cortes Verticales (Vertical Slices)** con capas internas estrictas. Esto garantiza que cada funcionalidad sea mantenible, testeable e independiente.

## 1. Patrones de Diseño Seleccionados

### A. Vertical Slices (Módulos Autónomos)
En lugar de capas horizontales monolíticas (`/controllers`, `/models` que mezclan todo), el sistema se divide por **Dominios de Negocio**.
- Cada carpeta en `src/modules/` contiene **TODO** lo necesario para esa funcionalidad.
- Si borras la carpeta `src/modules/maintenance/`, el resto del sistema **sigue funcionando** (solo desaparece esa funcionalidad).

### B. Capas Internas (Separation of Concerns)
Dentro de cada módulo, el código se divide en tres responsabilidades estrictas:

1.  **Controller (Interface Layer)**:
    - Maneja HTTP (req, res).
    - Valida entradas (DTOs).
    - **NO** contiene lógica de negocio.
    - Llama al Servicio y retorna respuesta JSON estándar.

2.  **Service (Application Layer)**:
    - Contiene la Lógica de Negocio Pura ("La inteligencia").
    - **NO** sabe de HTTP ni de SQL.
    - Orquesta llamadas a repositorios y otros servicios internos.

3.  **Repository (Infrastructure Layer)**:
    - Maneja la base de datos (SQL).
    - Único lugar donde se permite escribir `SELECT` o `INSERT`.
    - Retorna objetos de dominio, no filas crudas de DB.

### C. Comunicación por Eventos (Desacoplamiento)
Para cumplir la regla "un cambio en A no rompe B":
- **Síncrono (Lectura)**: Si `Reportes` necesita datos de `Tickets`, usa su propio Repositorio para leer (Principio "Propias Consultas").
- **Asíncrono (Efectos)**: Si `Tickets` necesita notificar a `Usuarios` (ej: enviar email):
    - `Tickets` emite evento: `eventBus.emit('TICKET_CREATED', data)`.
    - `Usuarios` escucha: `eventBus.on('TICKET_CREATED', sendEmail)`.
    - **Resultado**: `Tickets` no conoce ni depende del módulo de notificaciones.

---

## Estructura de Proyecto Profesional

```text
backend/src/
├── app.js               # Configuración de Express y Middlewares globales
├── server.js            # Entry Point (Inicia DB y Server)
├── core/                # "Shared Kernel" (Lo mínimo e indispensable)
│   ├── database/        # Conexión MySQL (Pool)
│   ├── event-bus.js     # Sistema de eventos global
│   ├── logger.js        # Winston/Pino logger
│   └── errors.js        # Clases de error estándar (AppError)
│   └── auth/           
│       └── middleware.js
├── modules/             # DOMINIOS DE NEGOCIO (Vertical Slices)
│   ├── planning/        # Planificador y Mantenimiento
│   ├── tickets/         # Gestión de Tickets
│   ├── reports/         # Generación de PDF
│   ├── finance/         # Gastos (Expenses)
│   ├── attendance/      # Control de Asistencia y Turnos
│   ├── clients/         # Clientes y Sedes
│   ├── users/           # Autenticación y Usuarios
│   │
│   ├── contracts/       # (Fase 1) Contratos y SLAs
│   ├── workflows/       # (Fase 1) Motor de Workflow y Checklists
│   ├── automation/      # (Fase 1) Task Generator, Intelligent Assignment
│   ├── analytics/       # (Fase 1) SLA Processor, Dashboard Correlations
│   ├── notifications/   # (Fase 2) Sistema de Notificaciones
│   ├── payroll/         # (Fase 2) Nómina Chile
│   └── inventory/       # (Fase 3) Inventario y Órdenes de Compra
│
└── server.js            # "Pegamento" simple que solo monta rutas
```

## Beneficios de esta Arquitectura
1.  **Robustez**: Un error SQL en Finanzas queda aislado en `finance.repository.js`. No tumba el servidor.
2.  **Mantenibilidad**: La IA (o un humano) sabe exactamente dónde buscar. "¿Error de lógica?" -> `.service.js`. "¿Error de datos?" -> `.repository.js`.
3.  **Testeabilidad**: Se puede probar el `Service` sin base de datos (mocking repositories).
4.  **Escalabilidad**: Es fácil mover un módulo a un microservicio real en el futuro si fuera necesario.

## Plan de Implementación (Refinado)

1.  **Core Seeding**: Establecer `core/event-bus.js` y `core/database/mysql.js`.
2.  **Migración Piloto (Planificador)**:
    *   Crear estructura completa `modules/planning/`.
    *   **Repository**: Implementar la query compleja `MaintenanceTasks UNION Tickets` aquí.
    *   **Service**: Lógica de filtrado y fechas.
    *   **Controller**: Endpoint limpio.
3.  **Refactorización Finanzas**: Extraer para encapsular el error de `LIMIT`.


### Paso 2: Migración Piloto (Módulos Independientes)
Comenzaremos extrayendo los módulos más "periféricos" que no dependen de otros, para probar la arquitectura.

1.  **Módulo Reportes (PDF)**:
    *   Extraer endpoints de PDF a `modules/reports/`.
    *   Copiar la query SQL necesaria dentro de `modules/reports/reports.queries.js`.
    *   Verificar que NO importa nada de `modules/tickets/`.

2.  **Módulo Planificador**:
    *   Extraer endpoints de mantenimiento y calendario a `modules/planning/`.
    *   Escribir sus propias queries SQL para leer Tickets y Tareas.

### Paso 3: Validación
*   El usuario revisará si la estructura cumple con su visión de independencia absoluta.
*   "Cada módulo debe ser capaz de sobrevivir (o fallar solo) si borramos los demás carpetas de módulos".
