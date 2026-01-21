## Fase 1.5: Análisis Funcional Profundo (Frontend <-> Backend)
- [x] **Mapeo Funcional Tickets**:
    - [x] Botón "Crear Ticket": Flujo JS -> API -> SQL -> Triggers.
    - [x] Botón "Actualizar Estado": Lógica de cambio de estado y notificaciones.
    - [x] Tab "Historial": De dónde saca los datos (¿LogTicketChange?).
- [x] **Mapeo Funcional Planificador**:
    - [x] Vista Calendario: Cómo mezcla Tareas y Tickets (Logic Gap).
    - [x] Botón "Nueva Tarea Mantenimiento": Flujo completo.
- [x] **Mapeo Funcional Finanzas**:
    - [x] Botón "Nuevo Gasto": Validaciones frontend vs backend (INCOMPLETO/ROTO).
    - [x] Filtros de Búsqueda: Cómo se construyen las queries dinámicas.

## Fase 2: Ejecución de Modularización (Vertical Slices)
- [ ] **Setup Core**: Crear estructura `src/core` (DB, EventBus).
- [ ] **Slice 1: Planificador**: Migrar a `src/modules/planning` con corrección de UNION.
- [ ] Migración Piloto: Módulo Planificador con acceso a datos independiente.
- [ ] Refactorización progresiva del resto del sistema.

## Problemas Corregidos (Histórico)
- [x] Restaurar Planificador (Backup VPS 21 Ene).
- [x] Análisis inicial de monolito `server-clean.js`.
