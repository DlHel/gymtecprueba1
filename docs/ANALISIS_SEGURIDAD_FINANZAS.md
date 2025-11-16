# 🔐 ANÁLISIS DE SEGURIDAD - MÓDULO FINANZAS

**Fecha**: 6 de noviembre de 2025, 4:55 PM  
**Módulo**: Finanzas (Gastos, Cotizaciones, Facturas)  
**Analista**: GitHub Copilot CLI  
**Severidad**: 🔴 CRÍTICA

---

## 🚨 VULNERABILIDADES DETECTADAS

### CRÍTICAS (9 vulnerabilidades) 🔴

#### 1. Gastos (Expenses) - 3 vulnerabilidades

**Endpoint**: `POST /api/expenses`  
**Línea**: 4566 (server-clean.js)  
**Problema**: Cualquier usuario autenticado puede crear gastos  
**Riesgo**: Usuarios técnicos pueden crear gastos fraudulentos  
**Impacto**: Pérdida financiera, manipulación de registros  
**CVE-Score**: 8.5/10 (Alto)

```javascript
// ❌ VULNERABLE (actual)
app.post('/api/expenses', authenticateToken, (req, res) => {
    // Sin validación de rol - CUALQUIERA puede crear gastos
});

// ✅ CORRECTO (debe ser)
app.post('/api/expenses', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    // Solo Admin/Manager pueden crear gastos
});
```

---

**Endpoint**: `PUT /api/expenses/:id`  
**Línea**: 4664  
**Problema**: Cualquier usuario puede modificar cualquier gasto  
**Riesgo**: Modificación de montos, categorías, fechas  
**Impacto**: Manipulación de registros financieros  
**CVE-Score**: 9.0/10 (Crítico)

```javascript
// ❌ VULNERABLE
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
    // Sin validación - puede modificar gastos de otros usuarios
});

// ✅ CORRECTO
app.put('/api/expenses/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
    // Solo Admin/Manager, O validar que sea su propio gasto
});
```

---

**Endpoint**: `DELETE /api/expenses/:id`  
**Línea**: 4932  
**Problema**: Cualquier usuario puede eliminar gastos  
**Riesgo**: Eliminación de evidencia, pérdida de registros  
**Impacto**: Auditoría comprometida, pérdida de datos  
**CVE-Score**: 8.0/10 (Alto)

```javascript
// ❌ VULNERABLE
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
    // Sin protección - puede eliminar cualquier gasto
});

// ✅ CORRECTO
app.delete('/api/expenses/:id', authenticateToken, requireRole(['Admin']), (req, res) => {
    // Solo Admin puede eliminar (soft delete recomendado)
});
```

---

#### 2. Cotizaciones (Quotes) - 3 vulnerabilidades

**Endpoint**: `POST /api/quotes`  
**Línea**: 5249  
**Problema**: Cualquier usuario puede crear cotizaciones  
**Riesgo**: Cotizaciones no autorizadas a clientes  
**Impacto**: Compromisos financieros no autorizados  
**CVE-Score**: 7.5/10 (Alto)

---

**Endpoint**: `PUT /api/quotes/:id`  
**Línea**: 5322  
**Problema**: Modificación sin restricción de cotizaciones  
**Riesgo**: Cambio de montos después de aprobación  
**Impacto**: Fraude, contratos incorrectos  
**CVE-Score**: 8.0/10 (Alto)

---

**Endpoint**: `DELETE /api/quotes/:id`  
**Línea**: 5400  
**Problema**: Eliminación sin restricción  
**Riesgo**: Pérdida de historial comercial  
**Impacto**: Auditoría comprometida  
**CVE-Score**: 7.0/10 (Medio-Alto)

---

#### 3. Facturas (Invoices) - 3 vulnerabilidades

**Endpoint**: `POST /api/invoices`  
**Línea**: 5552  
**Problema**: Creación de facturas sin autorización  
**Riesgo**: Facturación fraudulenta  
**Impacto**: Problemas legales, tributarios  
**CVE-Score**: 9.5/10 (Crítico)

---

**Endpoint**: `PUT /api/invoices/:id`  
**Línea**: 5627  
**Problema**: Modificación de facturas emitidas  
**Riesgo**: Alteración de documentos tributarios  
**Impacto**: Fraude fiscal, multas SII  
**CVE-Score**: 10.0/10 (Crítico)

---

**Endpoint**: `DELETE /api/invoices/:id`  
**Línea**: 5714  
**Problema**: Eliminación de facturas  
**Riesgo**: Evasión de auditorías  
**Impacto**: Problemas legales graves  
**CVE-Score**: 9.0/10 (Crítico)

---

## 📊 RESUMEN DE RIESGOS

### Por Severidad
```
🔴 CRÍTICO (CVE 9.0-10.0):  3 vulnerabilidades
🟠 ALTO (CVE 7.5-8.9):      5 vulnerabilidades
🟡 MEDIO (CVE 5.0-7.4):     1 vulnerabilidad
---
TOTAL:                      9 vulnerabilidades
```

### Por Módulo
```
Gastos (Expenses):      3 vulnerabilidades 🔴
Cotizaciones (Quotes):  3 vulnerabilidades 🟠
Facturas (Invoices):    3 vulnerabilidades 🔴
```

### Impacto Potencial
```
💰 Financiero:    ALTO - Posible fraude y pérdidas
⚖️  Legal:         ALTO - Problemas tributarios
🔍 Auditoría:     ALTO - Registros comprometidos
👥 Reputacional:  MEDIO - Confianza del cliente
```

---

## 🎯 RECOMENDACIONES INMEDIATAS

### 1. Implementar Control de Roles (URGENTE)

**Prioridad 1 - Facturas** 🔴
```javascript
// POST /invoices - Solo Admin/Manager
app.post('/api/invoices', authenticateToken, requireRole(['Admin', 'Manager']), ...);

// PUT /invoices - Solo Admin/Manager
app.put('/api/invoices/:id', authenticateToken, requireRole(['Admin', 'Manager']), ...);

// DELETE /invoices - Solo Admin (nunca eliminar, solo anular)
app.delete('/api/invoices/:id', authenticateToken, requireRole(['Admin']), ...);
```

**Prioridad 2 - Gastos** 🔴
```javascript
// POST /expenses - Admin/Manager/Requester
app.post('/api/expenses', authenticateToken, requireRole(['Admin', 'Manager', 'Technician']), ...);

// PUT /expenses - Solo propio usuario O Admin/Manager
app.put('/api/expenses/:id', authenticateToken, validateOwnerOrRole(['Admin', 'Manager']), ...);

// DELETE /expenses - Solo Admin
app.delete('/api/expenses/:id', authenticateToken, requireRole(['Admin']), ...);
```

**Prioridad 3 - Cotizaciones** 🟠
```javascript
// POST /quotes - Admin/Manager
app.post('/api/quotes', authenticateToken, requireRole(['Admin', 'Manager']), ...);

// PUT /quotes - Admin/Manager
app.put('/api/quotes/:id', authenticateToken, requireRole(['Admin', 'Manager']), ...);

// DELETE /quotes - Solo Admin
app.delete('/api/quotes/:id', authenticateToken, requireRole(['Admin']), ...);
```

---

### 2. Implementar Auditoría (ALTA PRIORIDAD)

**Crear tabla de auditoría**:
```sql
CREATE TABLE FinancialAudit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, PAY
    entity_type VARCHAR(50), -- EXPENSE, INVOICE, QUOTE
    entity_id INT,
    user_id INT NOT NULL,
    user_role VARCHAR(50),
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_date (created_at)
);
```

**Middleware de auditoría**:
```javascript
function auditFinancialAction(action, entityType) {
    return async (req, res, next) => {
        // Capturar datos antes de la operación
        req.auditData = {
            action,
            entityType,
            userId: req.user.id,
            userRole: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date()
        };
        next();
    };
}
```

---

### 3. Validaciones Adicionales

**Validar propiedad de recursos**:
```javascript
async function validateOwnership(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admin/Manager pueden acceder a todo
    if (['Admin', 'Manager'].includes(userRole)) {
        return next();
    }
    
    // Verificar que el recurso pertenece al usuario
    const sql = 'SELECT created_by FROM Expenses WHERE id = ?';
    db.get(sql, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Recurso no encontrado' });
        }
        
        if (row.created_by !== userId) {
            return res.status(403).json({ error: 'No tiene permiso para modificar este recurso' });
        }
        
        next();
    });
}
```

---

## 📋 PLAN DE CORRECCIÓN

### Fase 1 - Urgente (Hoy - 2 horas)
- [ ] ✅ Agregar `requireRole` a todos los endpoints críticos
- [ ] ✅ Implementar validación de propiedad en endpoints PUT
- [ ] ✅ Testing de permisos
- [ ] ✅ Documentar cambios

### Fase 2 - Alta Prioridad (Esta semana - 4 horas)
- [ ] Crear tabla FinancialAudit
- [ ] Implementar middleware de auditoría
- [ ] Agregar logs en todas las operaciones financieras
- [ ] Testing de auditoría

### Fase 3 - Media Prioridad (Próxima semana - 2 horas)
- [ ] Implementar soft delete (no eliminar, marcar como deleted)
- [ ] Agregar versionado de documentos
- [ ] Dashboard de auditoría para Admin
- [ ] Alertas de actividades sospechosas

---

## 🔍 CASOS DE USO DE ATAQUE

### Escenario 1: Técnico Malicioso
```
1. Técnico crea gasto de $1,000,000 CLP
2. Lo asigna a categoría "Repuestos" con documento falso
3. Lo marca como "Pagado" (si tuviera acceso)
4. Borra el gasto después de recibir reembolso
IMPACTO: Pérdida directa de $1M
```

### Escenario 2: Modificación de Factura
```
1. Usuario modifica factura ya emitida
2. Cambia monto de $500K a $50K
3. Cliente paga $500K pero sistema registra $50K
4. Diferencia de $450K sin justificar
IMPACTO: Fraude fiscal, multas SII
```

### Escenario 3: Eliminación de Evidencia
```
1. Usuario elimina gastos rechazados
2. Elimina cotizaciones no aprobadas
3. Borra facturas con problemas
4. No queda registro de actividades
IMPACTO: Auditoría imposible
```

---

## ✅ DESPUÉS DE LA CORRECCIÓN

### Estado Esperado
```
✅ Solo Admin/Manager pueden crear facturas
✅ Solo Admin/Manager pueden aprobar gastos
✅ Usuarios solo pueden editar sus propios gastos
✅ Solo Admin puede eliminar registros
✅ Todas las operaciones son auditadas
✅ No se permite eliminación real (soft delete)
```

### Mejoras de Seguridad
```
🔒 Control de acceso basado en roles (RBAC)
📝 Auditoría completa de operaciones
🔍 Trazabilidad total de cambios
⚠️  Alertas de actividades sospechosas
🛡️  Protección contra manipulación
```

---

## 📞 COMANDOS DE VERIFICACIÓN

### Verificar roles actuales
```bash
cd backend
node -e "
const db = require('./src/db-adapter');
db.all('SELECT DISTINCT role FROM Users', [], (err, rows) => {
    console.log('Roles en sistema:', rows);
});
"
```

### Testing de endpoints
```bash
# Crear archivo test-finance-security.js
node test-finance-security.js
```

---

**Análisis completado**: 6 noviembre 2025, 4:55 PM  
**Próximo paso**: Aplicar correcciones de seguridad  
**Tiempo estimado**: 2 horas  
**Prioridad**: 🔴 CRÍTICA - APLICAR HOY
