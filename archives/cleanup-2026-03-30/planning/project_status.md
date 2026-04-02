# Estatus de Avance del Proyecto (GymTec ERP)

## 1. Resumen Ejecutivo
El sistema se encuentra en un estado híbrido. Mientras el núcleo (`Tickets`) opera como monolito, **existen módulos avanzados completos** (Inventario, Órdenes de Compra) que ya operan con arquitectura "semi-modular". Otros módulos (Contratos, Nómina) tienen código backend listo pero están "dormidos" o desactivados.

## 2. Mapa de Estado por Módulo

| Módulo | Estado Backend | Estado Frontend | Diagnóstico |
| :--- | :--- | :--- | :--- |
| **Tickets (Core)** | ⚠️ **Monolito** | ✅ Activo | Funcional pero mezclado en `server-clean.js`. Prioridad de modularización. |
| **Planificador** | ❌ **Roto** | ⚠️ Parcial | Backend no une Tickets+Tareas. Frontend asume API única. **Requiere Fix Inmediato.** |
| **Finanzas** | ⚠️ **Incompleto** | ❌ **Roto** | Backend tiene bug SQL (`LIMIT`). Frontend llama a función `createExpense()` que **NO EXISTE**. |
| **Inventario** | ✅ **Modular** | ✅ Activo | Ruta independiente (`routes/inventory.js`) y activa en server. **Ejemplo a seguir.** |
| **Órdenes Compra**| ✅ **Modular** | ✅ Activo | Ruta independiente (`routes/purchase-orders.js`) y activa. |
| **Contratos** | 💤 **Dormido** | ❌ **Incompleto** | Código backend completo (`contracts-sla.js`) pero **NO importado** en server. Frontend es solo HTML sin JS. |
| **Nómina** | 💤 **Dormido** | ❓ Incierto | Código backend completo (`payroll-chile.js`) y muy robusto. No parece estar activo en las rutas principales. |
| **Reportes** | ⚠️ **Monolito** | ✅ Activo | Generación PDF mezcla código global. Debe extraerse. |

## 3. Hallazgos Críticos ("Lo que no sabíamos")

### A. El "Tesoro Oculto"
En `backend/src/routes/`, existen archivos de alta calidad (`contracts-sla.js`, `payroll-chile.js`) que implementan lógica compleja (cálculo de impuestos chilenos, SLAs automáticos).
*   **Acción**: No reescribir. **Activar e Integrar**.

### B. El "Botón Fantasma" de Finanzas
El botón "Nuevo Gasto" en Finanzas llama a una función inexistente.
*   **Acción**: Se debe programar la lógica de UI en `finanzas-modals.js` desde cero.

### C. La "Muerte Silenciosa" del Planificador
El calendario funciona a medias porque el backend dejó de enviar tickets como tareas.
*   **Acción**: El nuevo `PlanningRepository` debe implementar la query `UNION` para fusionar ambas fuentes de datos.

## 4. Estrategia de Trabajo Recomendada

1.  **Fase 1: Rescate del Core (Planificador y Reportes)**
    *   Extraer Planificador a módulo propio y arreglar la query `UNION`.
    *   Extraer Reportes para asegurar que los PDFs no rompan el server.

2.  **Fase 2: Activación de Módulos (Contratos y Nómina)**
    *   En lugar de programar desde cero, "despertar" `contracts-sla.js` y `payroll-chile.js`.
    *   Conectar rutas en `server.js`.
    *   Implementar/Corregir sus frontends (`contratos.js`).

3.  **Fase 3: Reconstrucción (Finanzas)**
    *   Este módulo requiere cirugía mayor en Frontend (crear ventanas modales faltantes) y Backend (arreglar SQL dynamics).

---
**Próximo Paso Inmediato**: Ejecutar **Fase 1 (Slice Planificador)** para recuperar la funcionalidad del calendario y detener la degradación del sistema.
