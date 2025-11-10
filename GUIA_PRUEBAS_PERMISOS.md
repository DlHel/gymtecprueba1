# 🧪 GUÍA DE PRUEBAS - Sistema de Permisos por Roles

**Versión**: 1.0  
**Fecha**: 10 de noviembre de 2025  
**Estado**: ✅ Sistema implementado y probado

---

## 🚀 INICIO RÁPIDO

### **Paso 1: Iniciar Servidores**

```bash
# Opción A: Iniciar todo automáticamente
start-servers.bat

# Opción B: Iniciar manualmente
# Terminal 1:
cd backend
npm start

# Terminal 2:
cd frontend
python -m http.server 8080
```

### **Paso 2: Acceder al Sistema**

Abrir navegador en: **http://localhost:8080/login.html**

---

## 👥 USUARIOS DE PRUEBA

### **1. Usuario Admin (Acceso Completo)**

```
Username: admin
Password: admin123
```

**Lo que debes ver:**
- ✅ Menú completo con 15 enlaces
- ✅ Puede acceder a TODAS las páginas
- ✅ Todos los botones de acción disponibles

**Páginas que debe ver en el menú:**
1. Dashboard
2. Clientes
3. Equipos
4. Tickets de Servicio
5. Planificador
6. Contratos y SLAs
7. Inventario
8. Modelos de Equipos
9. Notificaciones
10. **Finanzas** ← Solo Admin/Manager
11. **Personal** ← Solo Admin/Manager
12. **Control de Asistencia** ← Solo Admin/Manager
13. Reportes
14. **Configuración** ← Solo Admin

---

### **2. Usuario Manager (Sin Configuración)**

**Crear usuario Manager:**
```bash
cd backend
node create-simple-user.js
# Username: manager
# Password: manager123
# Role: Manager
```

**Lo que debes ver:**
- ✅ Menú con 14 enlaces (falta Configuración)
- ❌ NO aparece "Configuración" en el menú
- ✅ Puede acceder a Finanzas, Personal, Asistencia
- ❌ Si intenta ir a `/configuracion.html` directamente → Redirige a Dashboard con mensaje

**Páginas que debe ver:**
- Todas EXCEPTO Configuración

---

### **3. Usuario Technician (Solo Operaciones)**

**Crear usuario Technician:**
```bash
cd backend
node create-simple-user.js
# Username: tecnico
# Password: tecnico123
# Role: Technician
```

**Lo que debes ver:**
- ✅ Menú con 6 enlaces solamente
- ❌ NO aparece Finanzas, Personal, Asistencia, Planificador, Contratos, Inventario, Modelos, Configuración
- ✅ Puede ver y trabajar con Tickets asignados a él
- ❌ Si intenta ir a `/finanzas.html` → Redirige con mensaje de error

**Páginas que debe ver:**
1. Dashboard (limitado)
2. Clientes (solo lectura)
3. Equipos
4. Tickets de Servicio (solo asignados)
5. Notificaciones
6. Reportes (limitados)

---

### **4. Usuario Client (Acceso Mínimo)**

**Crear usuario Client:**
```bash
cd backend
node create-simple-user.js
# Username: cliente1
# Password: cliente123
# Role: Client
```

**Lo que debes ver:**
- ✅ Menú con 3 enlaces solamente
- ❌ Acceso muy limitado
- ✅ Solo ve sus propios tickets
- ❌ Si intenta acceder a cualquier otra página → Bloqueado

**Páginas que debe ver:**
1. Dashboard (vista mínima)
2. Tickets (solo propios)
3. Notificaciones (solo propias)

---

## 🧪 CASOS DE PRUEBA

### **Prueba 1: Filtrado del Menú**

1. **Login como Admin** → Contar enlaces del menú → Debe ser 15
2. **Logout**
3. **Login como Manager** → Contar enlaces → Debe ser 14 (falta Configuración)
4. **Logout**
5. **Login como Technician** → Contar enlaces → Debe ser 6

**Resultado Esperado:** ✅ Cada usuario ve solo sus enlaces permitidos

---

### **Prueba 2: Bloqueo de Páginas Directas**

1. **Login como Technician**
2. En la barra de direcciones, escribir manualmente: `http://localhost:8080/finanzas.html`
3. Presionar Enter

**Resultado Esperado:**
- ❌ Aparece un alert: "No tienes permisos para acceder a esta página. Tu rol: Technician"
- ↩️ Redirige automáticamente a `index.html`

---

### **Prueba 3: Validación Backend**

1. Abrir DevTools del navegador (F12)
2. **Login como Technician**
3. En la consola, ejecutar:

```javascript
fetch('http://localhost:3000/api/system-settings', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('gymtec_token')
    }
})
.then(r => r.json())
.then(console.log)
```

**Resultado Esperado:**
```json
{
  "error": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["Admin"],
  "current": "Technician"
}
```

✅ Backend bloquea correctamente

---

### **Prueba 4: Persistencia de Sesión**

1. **Login como Admin**
2. Navegar a varias páginas (Finanzas, Configuración, etc.)
3. **Cerrar el navegador completamente**
4. **Abrir nuevamente el navegador**
5. Ir a `http://localhost:8080/index.html`

**Resultado Esperado:**
- ✅ Sigue autenticado (token en localStorage)
- ✅ Menú sigue filtrado correctamente
- ✅ Puede acceder a todas las páginas

---

## 🐛 DEBUGGING

### **Problema: Menú no se filtra**

**Verificar en DevTools (F12) → Console:**

```javascript
// 1. Verificar que permissions.js está cargado
console.log('PERMISSIONS:', window.PERMISSIONS);

// 2. Verificar usuario actual
console.log('Usuario:', window.authManager.getUser());

// 3. Verificar rol
console.log('Rol:', window.authManager.getUserRole());

// 4. Verificar permisos de una página
console.log('Puede acceder a finanzas.html:', 
    window.PERMISSIONS.canAccessPage('finanzas.html', window.authManager.getUserRole())
);
```

**Salida esperada para Admin:**
```javascript
PERMISSIONS: {pages: {...}, canAccessPage: ƒ, ...}
Usuario: {id: 1, username: "admin", email: "admin@gymtec.com", role: "Admin"}
Rol: "Admin"
Puede acceder a finanzas.html: true
```

---

### **Problema: Backend devuelve 403**

**Verificar en DevTools → Network:**

1. Ir a la pestaña Network
2. Intentar acceder a un endpoint protegido
3. Click en la petición → Headers
4. Verificar:
   - ✅ Header `Authorization: Bearer <token>` está presente
   - ✅ Token no está expirado
   - ✅ Rol del usuario es correcto

---

## 📊 CHECKLIST DE VALIDACIÓN

Marcar cada item después de probarlo:

### **Frontend**
- [ ] Login funciona correctamente
- [ ] Menú se filtra según rol (Admin: 15, Manager: 14, Technician: 6, Client: 3)
- [ ] Páginas protegidas redirigen si no hay permiso
- [ ] Alert aparece al intentar acceso no autorizado
- [ ] Secciones vacías del menú se ocultan correctamente
- [ ] Token persiste en localStorage

### **Backend**
- [ ] Endpoints protegidos devuelven 403 si rol insuficiente
- [ ] Endpoints sin token devuelven 401
- [ ] Admin puede acceder a `/api/system-settings`
- [ ] Technician NO puede acceder a `/api/system-settings` (403)
- [ ] Manager puede crear cotizaciones
- [ ] Admin puede eliminar gastos

### **UX**
- [ ] Mensajes de error son claros
- [ ] Redirecciones funcionan correctamente
- [ ] No hay errores en consola
- [ ] Navegación entre páginas es fluida
- [ ] Logout limpia sesión correctamente

---

## 📸 CAPTURAS ESPERADAS

### **1. Menú Admin (Completo)**
```
📊 Dashboard
───────────────
OPERACIONES
├─ Clientes
├─ Equipos
├─ Tickets de Servicio
├─ Planificador
├─ Contratos y SLAs
├─ Inventario
└─ Modelos de Equipos

MONITOREO
└─ Notificaciones

ADMINISTRACIÓN
├─ Finanzas
├─ Personal
├─ Control de Asistencia
├─ Reportes
└─ Configuración
```

### **2. Menú Technician (Limitado)**
```
📊 Dashboard
───────────────
OPERACIONES
├─ Clientes
├─ Equipos
└─ Tickets de Servicio

MONITOREO
└─ Notificaciones

ADMINISTRACIÓN
└─ Reportes
```

---

## ✅ RESULTADO ESPERADO FINAL

Al completar todas las pruebas:

✅ **Frontend:**
- Menú dinámico según rol
- Validación de acceso a páginas
- Mensajes claros de permisos insuficientes

✅ **Backend:**
- Endpoints protegidos correctamente
- Respuestas HTTP apropiadas (401/403)
- Validación de roles funcional

✅ **Seguridad:**
- No se puede bypassear frontend manipulando DOM
- Backend siempre valida permisos
- Tokens se manejan correctamente

---

## 🎯 SCRIPT DE PRUEBA AUTOMATIZADO

Para ejecutar pruebas automáticas del backend:

```bash
node test-permisos-sistema.js
```

**Resultado esperado:**
```
═══════════════════════════════════════════════════════════
  🧪 PRUEBAS DEL SISTEMA DE PERMISOS - Gymtec ERP
═══════════════════════════════════════════════════════════

✅ Login Admin exitoso
✅ Admin accede a /system-settings
✅ Admin accede a /expenses
✅ Admin accede a /quotes
✅ Sin token intenta /system-settings → 401
✅ Sin token intenta /expenses → 401
✅ Existe: frontend/js/permissions.js
✅ Existe: frontend/js/auth.js
✅ Existe: frontend/js/nav-loader.js

═══════════════════════════════════════════════════════════
  📊 RESUMEN DE PRUEBAS
═══════════════════════════════════════════════════════════

Total Pruebas:    9
Pruebas Exitosas: 9
Pruebas Fallidas: 0
Porcentaje Éxito: 100.0%

✅ SISTEMA DE PERMISOS FUNCIONANDO CORRECTAMENTE
```

---

## 📞 SOPORTE

Si encuentras algún problema:

1. Revisar consola del navegador (F12)
2. Verificar logs del backend
3. Consultar `SISTEMA_PERMISOS_ROLES.md` para detalles técnicos
4. Revisar `BACKUP_PRE_PERMISOS_20251110_165121/` para versión anterior

---

**¡Sistema listo para producción!** 🎉
