# 🧪 PRUEBAS MANUALES DE BOTONES - Gymtec ERP v3.2

**Fecha**: 6 de noviembre de 2025  
**Objetivo**: Verificar funcionalidad de todos los botones del sistema

---

## 📋 CHECKLIST DE PRUEBAS

### ✅ 1. PÁGINA DE LOGIN (login.html)
- [ ] Botón "Iniciar Sesión" - Envía credenciales
- [ ] Validación de campos vacíos
- [ ] Redirección a dashboard después de login exitoso
- [ ] Mensaje de error con credenciales incorrectas

**URL**: http://localhost:8080/login.html

---

### ✅ 2. DASHBOARD PRINCIPAL (index.html)
- [ ] Botón "Actualizar" - Recarga KPIs
- [ ] Links a módulos en tarjetas
- [ ] Menú lateral funcional
- [ ] Botón de logout

**URL**: http://localhost:8080/index.html

---

### ✅ 3. MÓDULO DE CLIENTES (clientes.html)
- [ ] Botón "Crear Cliente" - Abre modal
- [ ] Botón "Guardar" en modal - Crea cliente
- [ ] Botón "Cancelar" en modal - Cierra modal
- [ ] Botón "Editar" en tabla - Abre modal con datos
- [ ] Botón "Eliminar" en tabla - Pide confirmación
- [ ] Botón "Ver Sedes" - Muestra sedes del cliente
- [ ] Campo de búsqueda funcional

**URL**: http://localhost:8080/clientes.html

---

### ✅ 4. MÓDULO DE TICKETS (tickets.html)
- [ ] Botón "Crear Ticket" - Abre modal
- [ ] Botón "Guardar Ticket" - Crea ticket
- [ ] Botón "Filtrar" - Aplica filtros
- [ ] Botón "Limpiar Filtros" - Reset filtros
- [ ] Botón "Ver Detalle" - Navega a ticket-detail.html
- [ ] Botón "Asignar Técnico" - Abre selector
- [ ] Botón "Cambiar Estado" - Actualiza estado
- [ ] Búsqueda en tiempo real funcional

**URL**: http://localhost:8080/tickets.html

---

### ✅ 5. DETALLE DE TICKET (ticket-detail.html)
- [ ] Botón "Volver" - Regresa a tickets.html
- [ ] Botón "Guardar Cambios" - Actualiza ticket
- [ ] Botón "Agregar Nota" - Agrega nota al ticket
- [ ] Botón "Subir Foto" - Abre selector de archivos
- [ ] Botón "Completar Item Checklist" - Marca completado
- [ ] Botón "Agregar al Checklist" - Nuevo item
- [ ] Botón "Cerrar Ticket" - Cambia estado a cerrado

**URL**: http://localhost:8080/ticket-detail.html?id=1

---

### ✅ 6. MÓDULO DE EQUIPOS (equipos.html)
- [ ] Botón "Crear Equipo" - Abre modal
- [ ] Botón "Guardar" - Crea equipo
- [ ] Botón "Editar" - Abre modal con datos
- [ ] Botón "Eliminar" - Pide confirmación
- [ ] Botón "Ver Historial" - Muestra historial
- [ ] Filtros por cliente/sede funcionan
- [ ] Búsqueda funcional

**URL**: http://localhost:8080/equipos.html

---

### ✅ 7. MÓDULO DE FINANZAS (finanzas.html)
- [ ] Tab "Balance" - Muestra dashboard de balance
- [ ] Tab "Cotizaciones" - Lista cotizaciones
- [ ] Tab "Facturas" - Lista facturas
- [ ] Tab "Gastos" - Lista gastos
- [ ] Botón "Crear Cotización" - Abre modal (window.createQuote)
- [ ] Botón "Crear Factura" - Abre modal (window.createInvoice)
- [ ] Botón "Crear Gasto" - Abre modal (window.createExpense)
- [ ] Botón "Ver" en tabla - Abre modal de detalle
- [ ] Botón "Editar" - Abre modal de edición
- [ ] Botón "Eliminar" - Pide confirmación
- [ ] Gráfico de flujo de caja se renderiza

**URL**: http://localhost:8080/finanzas.html

**NOTA IMPORTANTE**: Verificar que los botones principales estén definidos como funciones globales:
- `window.createQuote()`
- `window.createInvoice()`
- `window.createExpense()`

---

### ✅ 8. MÓDULO DE INVENTARIO (inventario.html)
- [ ] Botón "Crear Item" - Abre modal
- [ ] Botón "Guardar" - Crea item
- [ ] Botón "Editar" - Abre modal
- [ ] Botón "Eliminar" - Pide confirmación
- [ ] Botón "Movimiento" - Abre modal de movimiento
- [ ] Botón "Ver Movimientos" - Lista historial
- [ ] Alertas de stock bajo visibles

**URL**: http://localhost:8080/inventario.html

---

### ✅ 9. MÓDULO DE CONTRATOS (contratos.html)
- [ ] Botón "Crear Contrato" - Abre modal
- [ ] Botón "Guardar" - Crea contrato
- [ ] Botón "Editar" - Abre modal
- [ ] Botón "Ver Detalles" - Muestra detalles
- [ ] Filtros funcionan correctamente

**URL**: http://localhost:8080/contratos.html

---

### ✅ 10. MÓDULO DE PERSONAL (personal.html)
- [ ] Botón "Crear Técnico" - Abre modal
- [ ] Botón "Guardar" - Crea técnico
- [ ] Botón "Editar" - Abre modal
- [ ] Botón "Eliminar" - Pide confirmación
- [ ] Filtro por especialidad funciona

**URL**: http://localhost:8080/personal.html

---

### ✅ 11. MÓDULO DE ASISTENCIA (asistencia.html)
- [ ] Botón "Check-In" - Registra entrada
- [ ] Botón "Check-Out" - Registra salida
- [ ] Selector de fecha funciona
- [ ] Tabla de registros se actualiza
- [ ] Cálculo de horas correcto

**URL**: http://localhost:8080/asistencia.html

---

### ✅ 12. MÓDULO DE REPORTES (reportes.html)
- [ ] Selector de tipo de reporte funciona
- [ ] Botón "Generar Reporte" - Genera reporte
- [ ] Botón "Exportar PDF" - Descarga PDF (si implementado)
- [ ] Botón "Exportar Excel" - Descarga Excel (si implementado)
- [ ] Filtros de fecha funcionan

**URL**: http://localhost:8080/reportes.html

---

### ✅ 13. MÓDULO DE CONFIGURACIÓN (configuracion.html)
- [ ] Botón "Guardar Configuración" - Actualiza config
- [ ] Tabs de configuración funcionan
- [ ] Cambios se reflejan en el sistema

**URL**: http://localhost:8080/configuracion.html

---

### ✅ 14. MÓDULO PLANIFICADOR (planificador.html)
- [ ] Calendario se renderiza correctamente
- [ ] Click en día abre modal de creación
- [ ] Botón "Crear Tarea" - Abre modal
- [ ] Eventos del calendario son clickeables
- [ ] Navegación entre meses funciona

**URL**: http://localhost:8080/planificador.html

---

### 🎉 15. SLA DASHBOARD (sla-dashboard.html) - NUEVO
- [ ] Botón "Actualizar" - Recarga dashboard
- [ ] Estadísticas se actualizan (Cumplido, En Riesgo, Vencido)
- [ ] Gráfico de tendencias se renderiza (Chart.js)
- [ ] Gráfico de distribución se renderiza (Chart.js)
- [ ] Panel de predicción IA muestra datos
- [ ] Links "Ver →" navegan a ticket-detail
- [ ] Auto-refresh cada 30 segundos funciona
- [ ] Barras de rendimiento por cliente visibles
- [ ] Responsive en mobile/tablet/desktop

**URL**: http://localhost:8080/sla-dashboard.html

**VERIFICACIONES ESPECIALES**:
1. Gráficos de Chart.js se cargan (2 canvas)
2. Predicción IA muestra nivel de riesgo (low/medium/high)
3. Timestamp "Última actualización" se actualiza
4. Colores correctos: verde (cumplido), amarillo (riesgo), rojo (vencido)
5. Fallback a barras CSS si Chart.js no carga

---

## 🔍 PROBLEMAS CONOCIDOS A VERIFICAR

### Finanzas - Botones de Creación
**Problema reportado**: Botones "Crear Cotización", "Crear Factura", "Crear Gasto" no funcionaban.

**Solución aplicada**: Funciones movidas a scope global (`window.createQuote`, etc.)

**Prueba**:
1. Ir a http://localhost:8080/finanzas.html
2. Click en cada botón de creación
3. Verificar que el modal se abre correctamente

---

## 📊 RESUMEN DE PRUEBAS

| Módulo | Botones Probados | Funcionales | Con Errores | Estado |
|--------|------------------|-------------|-------------|--------|
| Login | 1 | - | - | ⏳ |
| Dashboard | 4 | - | - | ⏳ |
| Clientes | 7 | - | - | ⏳ |
| Tickets | 8 | - | - | ⏳ |
| Ticket Detail | 7 | - | - | ⏳ |
| Equipos | 6 | - | - | ⏳ |
| Finanzas | 11 | - | - | ⏳ |
| Inventario | 7 | - | - | ⏳ |
| Contratos | 5 | - | - | ⏳ |
| Personal | 5 | - | - | ⏳ |
| Asistencia | 5 | - | - | ⏳ |
| Reportes | 5 | - | - | ⏳ |
| Configuración | 3 | - | - | ⏳ |
| Planificador | 5 | - | - | ⏳ |
| **SLA Dashboard** | **9** | **-** | **-** | **⏳** |
| **TOTAL** | **88+** | **-** | **-** | **-** |

---

## 🐛 REPORTE DE ERRORES

### Error Encontrado 1
**Módulo**: ___________  
**Botón**: ___________  
**Descripción**: ___________  
**Reproducción**: ___________  

### Error Encontrado 2
**Módulo**: ___________  
**Botón**: ___________  
**Descripción**: ___________  
**Reproducción**: ___________  

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Todos los botones de creación funcionan
- [ ] Todos los botones de edición funcionan
- [ ] Todos los botones de eliminación piden confirmación
- [ ] Todos los modales se abren y cierran correctamente
- [ ] No hay errores en consola del navegador
- [ ] El sistema es responsive en diferentes tamaños de pantalla
- [ ] El auto-refresh del SLA Dashboard funciona
- [ ] Los gráficos de Chart.js se renderizan correctamente

---

**Fecha de última actualización**: 6 de noviembre de 2025  
**Versión del sistema**: Gymtec ERP v3.2  
**Estado**: 🎉 15/15 Módulos Completados
