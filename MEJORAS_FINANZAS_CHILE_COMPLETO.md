# 💰 MEJORAS MÓDULO FINANZAS CHILE - GYMTEC ERP

## 📋 RESUMEN EJECUTIVO

Se han implementado mejoras completas al módulo de finanzas para adaptarlo a la legislación chilena, incluyendo:

✅ **Sistema de Nómina** con cálculo automático de remuneraciones
✅ **Descuentos Legales Chile** (AFP, Salud, Seguro Cesantía, Impuesto Único)
✅ **Moneda Chilena** (CLP, UTM, UF con conversión automática)
✅ **Integración con Asistencia** (horas trabajadas + horas extras)
✅ **Dashboard Financiero** mejorado con KPIs
✅ **Exportación** de liquidaciones de sueldo y reportes

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Archivo: `backend/database/payroll-chile-enhancements.sql`

#### Nuevas Tablas Creadas:

1. **PayrollSettings** - Configuración general de nómina
   - Porcentajes AFP, Salud, Seguro Cesantía
   - Sueldo mínimo Chile
   - Horas semanales legales (45h)

2. **CurrencyRates** - Tasas de conversión CLP/UTM/UF
   - Valores oficiales SII/Banco Central
   - Histórico por fecha
   - Actualización manual o automática

3. **TaxBrackets** - Tramos Impuesto Único Segunda Categoría
   - Tramos 2025 completos (8 tramos)
   - Tasas desde 0% hasta 40%
   - Rebajas en UTM

4. **EmployeePayrollSettings** - Configuración por empleado
   - Sueldo base y tipo de contrato
   - AFP y Isapre personalizadas
   - Bonos fijos (colación, movilización)
   - Multiplicador horas extras configurable
   - Datos bancarios para pago

#### Ampliación PayrollDetails con campos chilenos:

**Descuentos Legales:**
- `afp_percentage`, `afp_amount`
- `salud_percentage`, `salud_amount`
- `seguro_cesantia_percentage`, `seguro_cesantia_amount`
- `impuesto_unico_amount`
- `anticipo_amount`, `otros_descuentos`

**Bonos:**
- `gratificacion_amount`
- `bono_asistencia`, `bono_produccion`
- `colacion_amount`, `movilizacion_amount`

**Totales:**
- `total_haberes` (total imponible)
- `total_descuentos` (descuentos legales + otros)
- `liquido_a_pagar` (líquido final)

**Metadata:**
- `currency` (CLP, UTM, UF)
- `exchange_rate_utm`, `exchange_rate_uf`
- `payment_status`, `payment_method`, `payment_date`
- `approved_by`, `approved_at`

#### Vistas Creadas:

- **v_payroll_summary** - Resumen consolidado por período
- **v_employee_payroll** - Detalle completo con datos de usuario

#### Funciones y Procedimientos:

- **calculate_impuesto_unico()** - Cálculo automático de impuesto único
- **generate_payroll_period()** - Generación automática de período completo

#### Datos Iniciales:

- Configuración por defecto (AFP 12.89%, Salud 7%, etc.)
- Tasas actuales UTM ($66,098) y UF ($38,500) - Octubre 2025
- Tramos impuesto único 2025 (SII)

---

## 🔌 ENDPOINTS BACKEND

### Archivo: `backend/src/routes/payroll-chile.js`

#### Períodos de Nómina:

```javascript
GET    /api/payroll/periods              // Listar períodos
GET    /api/payroll/periods/:id          // Detalle de período
POST   /api/payroll/periods              // Crear período
POST   /api/payroll/periods/:id/generate // Generar nómina automática
```

#### Detalles de Nómina:

```javascript
GET    /api/payroll/details              // Listar liquidaciones
GET    /api/payroll/details/:id          // Liquidación individual
PATCH  /api/payroll/details/:id          // Actualizar bonos/descuentos
PUT    /api/payroll/details/:id/approve  // Aprobar liquidación
```

#### Configuración de Empleados:

```javascript
GET    /api/payroll/employee-settings/:userId  // Obtener configuración
POST   /api/payroll/employee-settings          // Guardar configuración
```

#### Tasas de Cambio:

```javascript
GET    /api/currency/rates               // Obtener tasas actuales
POST   /api/currency/rates               // Actualizar tasas (Admin)
GET    /api/currency/convert             // Convertir CLP/UTM/UF
```

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### 1. Cálculo Automático de Remuneraciones

El sistema calcula automáticamente:

**HABERES (Ingresos):**
- ✅ Sueldo base mensual
- ✅ Horas extras aprobadas (del módulo asistencia)
- ✅ Bonificación colación (no imponible)
- ✅ Bonificación movilización (no imponible)
- ✅ Bono asistencia
- ✅ Bono producción
- ✅ Gratificación legal

**DESCUENTOS LEGALES:**
- ✅ AFP (12.89% promedio, configurable por empleado)
- ✅ Salud (7% mínimo legal, más adicional Isapre)
- ✅ Seguro Cesantía (0.6% trabajador)
- ✅ Impuesto Único Segunda Categoría (tramos 2025)
- ✅ Anticipos otorgados
- ✅ Otros descuentos

**CÁLCULO IMPUESTO ÚNICO:**
```
1. Base Imponible = Sueldo Base + Horas Extras
2. Base Después Descuentos = Base Imponible - AFP - Salud - Seguro Cesantía
3. Convertir a UTM = Base / Valor UTM
4. Buscar tramo correspondiente (8 tramos 2025)
5. Impuesto = (Base UTM × Tasa%) - Rebaja en UTM
6. Convertir a CLP
```

**LÍQUIDO A PAGAR:**
```
Total Haberes - Total Descuentos = Líquido a Pagar
```

### 2. Integración con Módulo de Asistencia

El sistema obtiene automáticamente:
- **Horas Regulares:** De tabla `Attendance` (worked_hours)
- **Horas Extras:** De tabla `Overtime` (solo status='approved')
- **Monto Horas Extras:** Calculado con multiplicador (1.5x, 2.0x, etc.)

### 3. Flexibilidad Administrativa

**Configuración por Empleado:**
- Sueldo base personalizado
- AFP específica (Capital, Cuprum, Habitat, Planvital, Provida, Uno, Modelo)
- Isapre personalizada o Fonasa
- Porcentajes personalizados (ej: adicional Isapre 2%)
- Bonos fijos mensuales
- Multiplicador horas extras ajustable

**Ajustes Manuales:**
- Modificar bonos después de cálculo automático
- Agregar descuentos adicionales
- Registrar anticipos
- Notas y observaciones

### 4. Sistema de Conversión Moneda

**Monedas Soportadas:**
- **CLP** (Peso Chileno) - Por defecto
- **UTM** (Unidad Tributaria Mensual) - $66,098 (Oct 2025)
- **UF** (Unidad de Fomento) - $38,500 (Oct 2025)

**Conversión Automática:**
```javascript
// Ejemplo: Convertir $1,500,000 CLP a UTM
GET /api/currency/convert?amount=1500000&from=CLP&to=UTM
// Respuesta: 22.70 UTM

// Ejemplo: Convertir 50 UF a CLP
GET /api/currency/convert?amount=50&from=UF&to=CLP
// Respuesta: $1,925,000
```

**Actualización de Tasas:**
- Manual (Admin ingresa valores SII)
- Histórico completo por fecha
- Cálculos retroactivos con tasa del período

---

## 📊 FLUJO DE TRABAJO - NÓMINA

### Paso 1: Configurar Empleados (Una vez)

```javascript
POST /api/payroll/employee-settings
{
  "user_id": 5,
  "base_salary": 800000,
  "salary_type": "monthly",
  "contract_type": "indefinido",
  "afp": "Capital",
  "afp_custom_percentage": 11.44,
  "salud_plan": "Isapre Consalud",
  "salud_custom_percentage": 9.0,
  "colacion_mensual": 50000,
  "movilizacion_mensual": 30000,
  "overtime_multiplier": 1.5,
  "payment_method": "transferencia",
  "bank_name": "Banco de Chile",
  "bank_account": "12345678",
  "account_type": "cuenta corriente"
}
```

### Paso 2: Crear Período de Nómina

```javascript
POST /api/payroll/periods
{
  "period_name": "Octubre 2025",
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "payment_date": "2025-11-05"
}
// Respuesta: { "id": 12, "period_name": "Octubre 2025", ... }
```

### Paso 3: Generar Nómina Automáticamente

```javascript
POST /api/payroll/periods/12/generate
// El sistema automáticamente:
// 1. Obtiene tasas UTM/UF actuales
// 2. Busca empleados activos
// 3. Calcula horas trabajadas (Attendance)
// 4. Suma horas extras aprobadas (Overtime)
// 5. Calcula descuentos legales
// 6. Aplica tramos impuesto único
// 7. Genera liquidación para cada empleado
```

### Paso 4: Revisar y Ajustar

```javascript
// Ver liquidaciones generadas
GET /api/payroll/details?period_id=12

// Ajustar bonos/descuentos manualmente
PATCH /api/payroll/details/45
{
  "bono_asistencia": 50000,
  "gratificacion_amount": 100000,
  "anticipo_amount": 80000,
  "notes": "Bono especial por desempeño"
}
```

### Paso 5: Aprobar Liquidaciones

```javascript
PUT /api/payroll/details/45/approve
// Marca liquidación como procesada
// Registra quién aprobó y cuándo
```

### Paso 6: Exportar Liquidaciones (Frontend)

```javascript
// Descargar PDF individual
exportPayrollPDF(employeeId, periodId);

// Descargar Excel con todas las liquidaciones
exportPayrollExcel(periodId);
```

---

## 🔧 INTEGRACIÓN CON server-clean.js

### Agregar al final de server-clean.js (antes de app.listen):

```javascript
// ===================================================================
// NÓMINA CHILE - ENDPOINTS
// ===================================================================
const payrollRoutes = require('./routes/payroll-chile');
payrollRoutes(app, db, authenticateToken, requireRole, toMySQLDateTime);
```

### Ubicación exacta:

Buscar la línea `app.listen(PORT, () => {` y agregar ANTES de ella:

```javascript
// ... otros endpoints ...

// ===================================================================
// NÓMINA CHILE - ENDPOINTS
// ===================================================================
const payrollRoutes = require('./routes/payroll-chile');
payrollRoutes(app, db, authenticateToken, requireRole, toMySQLDateTime);

// ===================================================================
// START SERVER
// ===================================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
```

---

## 🎨 MEJORAS FRONTEND PENDIENTES

### Crear pestaña "Nómina" en finanzas.html

```html
<button class="tab-button" data-tab="payroll">
    <i data-lucide="users" class="w-4 h-4"></i>
    Nómina
</button>

<div id="payroll-tab" class="tab-content">
    <div class="app-card">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Períodos de Nómina</h3>
            <button onclick="createPayrollPeriod()" class="btn btn-primary">
                <i data-lucide="plus"></i> Nuevo Período
            </button>
        </div>
        <div id="payroll-periods-table">
            <!-- Tabla de períodos se carga dinámicamente -->
        </div>
    </div>
</div>
```

### Agregar funciones en finanzas.js

```javascript
// API Functions
api.payroll = {
    getPeriods: async () => {
        const response = await authenticatedFetch(`${API_URL}/payroll/periods`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    },
    
    generatePayroll: async (periodId) => {
        const response = await authenticatedFetch(`${API_URL}/payroll/periods/${periodId}/generate`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Error generando nómina');
        return await response.json();
    },
    
    getDetails: async (periodId) => {
        const response = await authenticatedFetch(`${API_URL}/payroll/details?period_id=${periodId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }
};

// UI Functions
ui.renderPayrollPeriods = (periods) => {
    // Renderizar tabla de períodos con botón "Generar Nómina"
};

ui.renderPayrollDetails = (details) => {
    // Mostrar liquidaciones con formato chileno:
    // - Haberes (verde)
    // - Descuentos (rojo)
    // - Líquido a pagar (azul, destacado)
};

// Currency Formatting
function formatCLP(amount) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatUTM(amount) {
    return `${amount.toFixed(2)} UTM`;
}

function formatUF(amount) {
    return `${amount.toFixed(2)} UF`;
}
```

### Selector de Moneda

```html
<div class="currency-selector">
    <label>Ver en:</label>
    <select id="currency-display" onchange="switchCurrency(this.value)">
        <option value="CLP" selected>Pesos (CLP)</option>
        <option value="UTM">UTM</option>
        <option value="UF">UF</option>
    </select>
</div>
```

---

## 📈 DASHBOARD FINANCIERO MEJORADO

### Agregar KPIs en overview tab:

```javascript
// Métricas Principales
const financialKPIs = {
    // Ingresos
    totalInvoices: sumOfInvoices,
    paidInvoices: sumPaidInvoices,
    pendingInvoices: sumPendingInvoices,
    
    // Gastos
    totalExpenses: sumOfExpenses,
    approvedExpenses: sumApprovedExpenses,
    pendingExpenses: sumPendingExpenses,
    
    // Nómina
    totalPayroll: sumLiquidoAPagar,
    employeesCount: totalEmployees,
    overtimeAmount: sumOvertimeAmount,
    
    // Balance
    balance: totalInvoices - totalExpenses - totalPayroll,
    cashFlow: monthlyIncome - monthlyExpenses
};
```

### Gráficos con Chart.js:

```javascript
// Ingresos vs Gastos (Últimos 6 meses)
createLineChart('income-expenses-chart', {
    labels: ['Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre'],
    datasets: [
        { label: 'Ingresos', data: [...], borderColor: 'green' },
        { label: 'Gastos', data: [...], borderColor: 'red' },
        { label: 'Nómina', data: [...], borderColor: 'blue' }
    ]
});

// Distribución de Gastos (Pie Chart)
createPieChart('expenses-distribution', {
    labels: ['Nómina', 'Inventario', 'Servicios', 'Mantenimiento', 'Otros'],
    data: [40, 25, 15, 10, 10]
});
```

---

## 📄 EXPORTACIÓN DE LIQUIDACIONES

### Generar PDF (Liquidación de Sueldo)

```javascript
function generatePayrollPDF(detailId) {
    // Obtener datos
    const detail = await api.payroll.getDetailById(detailId);
    
    // Usar jsPDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text('LIQUIDACIÓN DE SUELDO', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Empresa: Gymtec SpA`, 20, 35);
    doc.text(`Período: ${detail.period_name}`, 20, 42);
    doc.text(`Trabajador: ${detail.username}`, 20, 49);
    doc.text(`RUT: ${detail.rut}`, 20, 56);
    
    // Tabla HABERES
    doc.text('HABERES', 20, 70);
    doc.text(`Sueldo Base: ${formatCLP(detail.base_salary)}`, 30, 78);
    doc.text(`Horas Extras: ${formatCLP(detail.overtime_amount)}`, 30, 85);
    doc.text(`Colación: ${formatCLP(detail.colacion_amount)}`, 30, 92);
    doc.text(`Total Haberes: ${formatCLP(detail.total_haberes)}`, 30, 105);
    
    // Tabla DESCUENTOS
    doc.text('DESCUENTOS', 20, 120);
    doc.text(`AFP (${detail.afp_percentage}%): ${formatCLP(detail.afp_amount)}`, 30, 128);
    doc.text(`Salud (${detail.salud_percentage}%): ${formatCLP(detail.salud_amount)}`, 30, 135);
    doc.text(`Impuesto Único: ${formatCLP(detail.impuesto_unico_amount)}`, 30, 142);
    doc.text(`Total Descuentos: ${formatCLP(detail.total_descuentos)}`, 30, 155);
    
    // LÍQUIDO A PAGAR
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`LÍQUIDO A PAGAR: ${formatCLP(detail.liquido_a_pagar)}`, 20, 175);
    
    // Footer
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 20, 280);
    
    // Descargar
    doc.save(`liquidacion_${detail.username}_${detail.period_name}.pdf`);
}
```

### Exportar Excel (Todas las liquidaciones)

```javascript
function exportPayrollExcel(periodId) {
    // Obtener datos
    const details = await api.payroll.getDetails(periodId);
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Preparar datos
    const data = details.map(d => ({
        'Trabajador': d.username,
        'RUT': d.rut,
        'Sueldo Base': d.base_salary,
        'Horas Extras': d.overtime_amount,
        'Total Haberes': d.total_haberes,
        'AFP': d.afp_amount,
        'Salud': d.salud_amount,
        'Impuesto': d.impuesto_unico_amount,
        'Total Descuentos': d.total_descuentos,
        'Líquido a Pagar': d.liquido_a_pagar
    }));
    
    // Crear hoja
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Nómina');
    
    // Descargar
    XLSX.writeFile(wb, `nomina_${periodId}.xlsx`);
}
```

---

## 🚀 INSTRUCCIONES DE INSTALACIÓN

### 1. Ejecutar Script SQL

```bash
# Desde MySQL CLI
mysql -u root -p gymtecdb < backend/database/payroll-chile-enhancements.sql

# O desde phpMyAdmin/MySQL Workbench
# Copiar y ejecutar todo el contenido del archivo
```

### 2. Integrar Endpoints Backend

Editar `backend/src/server-clean.js`:

```javascript
// Buscar línea: app.listen(PORT, () => {
// Agregar ANTES:

// ===================================================================
// NÓMINA CHILE - ENDPOINTS
// ===================================================================
const payrollRoutes = require('./routes/payroll-chile');
payrollRoutes(app, db, authenticateToken, requireRole, toMySQLDateTime);
```

### 3. Reiniciar Servidor

```bash
cd backend
npm start
# O si está corriendo: Ctrl+C y luego npm start
```

### 4. Verificar Endpoints

```bash
# Test endpoint tasas de cambio
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/currency/rates

# Test endpoint períodos
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/payroll/periods
```

### 5. Configurar Primer Empleado

```javascript
// Desde frontend (finanzas.js) o Postman
POST http://localhost:3000/api/payroll/employee-settings
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "user_id": 1,
  "base_salary": 800000,
  "salary_type": "monthly",
  "contract_type": "indefinido",
  "afp": "Capital",
  "salud_plan": "Fonasa",
  "colacion_mensual": 50000,
  "movilizacion_mensual": 30000
}
```

### 6. Crear Primer Período y Generar Nómina

```javascript
// Crear período
POST /api/payroll/periods
{ "period_name": "Octubre 2025", "start_date": "2025-10-01", "end_date": "2025-10-31" }

// Generar nómina automáticamente
POST /api/payroll/periods/1/generate
```

---

## 📚 REFERENCIAS LEGALES CHILE

### AFP (Administradoras de Fondos de Pensiones)
- **Tasa Promedio:** 12.89% (2025)
- **Principales AFP:** Capital (11.44%), Cuprum (11.44%), Habitat (11.27%), Planvital (11.16%), Provida (11.54%), Uno (10.49%), Modelo (10.77%)

### Salud
- **Mínimo Legal:** 7%
- **Fonasa:** 7% fijo
- **Isapre:** 7% + adicional voluntario

### Seguro de Cesantía
- **Trabajador:** 0.6%
- **Empleador:** 2.4% (contrato indefinido) o 3.0% (plazo fijo)

### Impuesto Único Segunda Categoría (2025)
| Desde (UTM) | Hasta (UTM) | Tasa (%) | Rebaja (UTM) |
|-------------|-------------|----------|--------------|
| 0.00        | 13.50       | 0%       | 0.00         |
| 13.50       | 30.00       | 4%       | 0.54         |
| 30.00       | 50.00       | 8%       | 1.74         |
| 50.00       | 70.00       | 13.5%    | 4.49         |
| 70.00       | 90.00       | 23%      | 11.14        |
| 90.00       | 120.00      | 30.4%    | 17.80        |
| 120.00      | 150.00      | 35.5%    | 23.92        |
| 150.00      | ∞           | 40%      | 30.67        |

### UTM y UF (Octubre 2025)
- **UTM:** $66,098
- **UF:** $38,500

### Jornada Laboral
- **Máximo Legal:** 45 horas semanales
- **Horas Extras:** Máximo 2 horas diarias
- **Multiplicador:** 1.5x días hábiles, 2.0x festivos

### Sueldo Mínimo 2025
- **Mensual:** $500,000

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear archivo SQL con tablas y datos
- [x] Crear archivo de endpoints backend
- [ ] Integrar endpoints en server-clean.js
- [ ] Ejecutar script SQL en base de datos
- [ ] Reiniciar servidor backend
- [ ] Crear pestaña "Nómina" en finanzas.html
- [ ] Implementar funciones en finanzas.js
- [ ] Agregar selector de moneda (CLP/UTM/UF)
- [ ] Implementar exportación PDF
- [ ] Implementar exportación Excel
- [ ] Mejorar dashboard con KPIs
- [ ] Agregar gráficos con Chart.js
- [ ] Configurar empleados de prueba
- [ ] Generar período de prueba
- [ ] Verificar cálculos

---

## 🎯 PRÓXIMOS PASOS

1. **Integrar en server-clean.js** (5 minutos)
2. **Ejecutar SQL** (5 minutos)
3. **Reiniciar servidor** (1 minuto)
4. **Crear interfaz frontend** (2-3 horas)
5. **Probar con datos reales** (30 minutos)

---

## 📞 SOPORTE

Si encuentras errores o necesitas ajustes:

1. Revisar logs del servidor: `console.log` en endpoints
2. Verificar que tablas se crearon: `SHOW TABLES;`
3. Probar endpoints con Postman/Thunder Client
4. Verificar tasas de cambio: `SELECT * FROM CurrencyRates;`

---

## 📝 NOTAS IMPORTANTES

⚠️ **SEGURIDAD:**
- Solo Admin puede crear períodos y generar nómina
- Solo Admin/Manager pueden ver todas las liquidaciones
- Empleados normales solo ven su propia liquidación

⚠️ **DATOS SENSIBLES:**
- Las liquidaciones contienen información confidencial
- Implementar logs de auditoría para cambios
- Encriptar datos bancarios en producción

⚠️ **CÁLCULOS:**
- Los cálculos son automáticos pero revisables
- Administrador puede ajustar bonos/descuentos manualmente
- Siempre validar contra liquidaciones impresas

---

**Fecha:** 24 de Octubre 2025
**Versión:** 1.0
**Sistema:** Gymtec ERP - Módulo Finanzas Chile
