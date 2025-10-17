# 🧪 PLAN DE TESTING - Flujo de Autenticación Inventario

**Fecha**: 2 de octubre de 2025  
**Objetivo**: Verificar que el flujo de autenticación funciona correctamente

---

## 📋 Escenarios de Prueba

### Escenario 1: Usuario NO autenticado accede a inventario
**Pasos**:
1. Abrir navegador en modo incógnito
2. Navegar a `http://localhost:8080/inventario.html`

**Resultado esperado**:
- ✅ Redirige a `http://localhost:8080/login.html?return=%2Finventario.html`
- ✅ Muestra página de login
- ✅ NO muestra contenido de inventario

**Verificar en consola**:
```
🔍 INVENTARIO: Iniciando verificación de autenticación...
❌ INVENTARIO: Usuario no autenticado, redirigiendo a login...
🚨 REDIRECT TO LOGIN LLAMADO desde: /inventario.html
🔄 Redirigiendo a login con return URL: %2Finventario.html
```

---

### Escenario 2: Login exitoso desde inventario
**Prerrequisito**: Ejecutar Escenario 1 primero

**Pasos**:
1. En la página de login, ingresar:
   - Usuario: `admin` (o el usuario que tengas)
   - Password: `admin123` (o tu contraseña)
2. Hacer clic en "Iniciar Sesión"

**Resultado esperado**:
- ✅ Muestra mensaje "Login exitoso. Redirigiendo..."
- ✅ Redirige automáticamente a `http://localhost:8080/inventario.html`
- ✅ Carga el módulo de inventario correctamente
- ✅ NO redirige a index.html

**Verificar en consola**:
```
🔄 Redirigiendo después del login a: /inventario.html
✅ INVENTARIO: Usuario autenticado, cargando módulo de inventario...
👤 Usuario actual: admin
📡 Inventario usando API URL: http://localhost:3000/api
🚀 Inicializando InventoryManager...
```

---

### Escenario 3: Usuario YA autenticado accede a inventario
**Prerrequisito**: Tener sesión activa (ejecutar Escenario 2 primero)

**Pasos**:
1. Con la sesión activa, navegar a `http://localhost:8080/inventario.html`

**Resultado esperado**:
- ✅ Carga inmediatamente sin redirecciones
- ✅ Muestra contenido de inventario
- ✅ NO redirige a login

**Verificar en consola**:
```
🔍 INVENTARIO: Iniciando verificación de autenticación...
✅ INVENTARIO: Usuario autenticado, cargando módulo de inventario...
👤 Usuario actual: admin
```

---

### Escenario 4: Token expirado en inventario
**Prerrequisito**: Tener token expirado en localStorage

**Pasos**:
1. Abrir DevTools → Application → Local Storage
2. Modificar `gymtec_token` para que sea inválido
3. Recargar `http://localhost:8080/inventario.html`

**Resultado esperado**:
- ✅ Detecta token inválido
- ✅ Redirige a login con returnUrl
- ✅ Después del login vuelve a inventario

---

### Escenario 5: Bucle infinito (VERIFICAR QUE NO OCURRA)
**Pasos**:
1. Cerrar sesión completamente
2. Ir a `http://localhost:8080/inventario.html`
3. Hacer login
4. Observar si vuelve a inventario o va a index

**Resultado esperado**:
- ✅ Después del login va DIRECTO a inventario.html
- ❌ NO debe ir a index.html
- ❌ NO debe crear un loop

---

## 🔧 Checklist de Verificación

### Antes de las pruebas
- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 8080
- [ ] Usuario de prueba creado (admin/admin123)
- [ ] Navegador con DevTools abierto
- [ ] Consola visible para ver logs

### Durante las pruebas
- [ ] Verificar logs en consola del navegador
- [ ] Verificar Network tab para ver requests
- [ ] Verificar localStorage (Application → Local Storage)
- [ ] Anotar URLs completas en cada redirección

### Después de las pruebas
- [ ] Documentar resultados
- [ ] Capturar screenshots si hay errores
- [ ] Anotar comportamientos inesperados

---

## 📊 Plantilla de Reporte

```
ESCENARIO: [número y nombre]
FECHA/HORA: [timestamp]
NAVEGADOR: [Chrome/Firefox/etc]

PASOS EJECUTADOS:
1. [paso 1]
2. [paso 2]
3. [paso 3]

RESULTADO OBTENIDO:
- [describe lo que pasó]

LOGS DE CONSOLA:
```
[pega los logs aquí]
```

URLS VISITADAS:
1. [url inicial]
2. [url después de redirección]
3. [url final]

localStorage DESPUÉS:
- gymtec_token: [presente/ausente]
- gymtec_user: [presente/ausente]

ESTADO: ✅ PASS / ❌ FAIL / ⚠️ PARCIAL

NOTAS ADICIONALES:
[cualquier observación relevante]
```

---

## 🚀 Ejecución Rápida

### Opción 1: Manual
1. Abrir navegador incógnito
2. Ir a http://localhost:8080/inventario.html
3. Seguir flujo de login
4. Verificar que vuelve a inventario

### Opción 2: Con Script de Test
1. Abrir http://localhost:8080/inventario.html
2. Abrir DevTools → Console
3. Pegar contenido de `test-inventario-auth-flow.js`
4. Ejecutar y revisar resultados

---

## ❓ Preguntas Clave

1. **¿Redirige a login correctamente?**
   - SÍ / NO
   - URL de redirección: _________________

2. **¿Incluye parámetro return?**
   - SÍ / NO
   - Valor del return: _________________

3. **¿Vuelve a inventario después del login?**
   - SÍ / NO
   - URL después del login: _________________

4. **¿Hay bucle de redirección?**
   - SÍ / NO
   - Describe el bucle: _________________

5. **¿Funciona con sesión activa?**
   - SÍ / NO
   - Comportamiento: _________________

---

## 🐛 Si Algo Falla

### Si redirige a index en lugar de inventario:
- [ ] Verificar que `login.html` lee el parámetro `return`
- [ ] Verificar logs de consola en login.html
- [ ] Verificar línea 256 en login.html

### Si no incluye returnUrl:
- [ ] Verificar que `authManager.redirectToLogin()` existe
- [ ] Verificar logs: "Redirigiendo a login con return URL"
- [ ] Verificar código en inventario.js línea 941

### Si hay bucle infinito:
- [ ] Verificar que NO hay protectPage() en inventario.js
- [ ] Verificar que usa authManager.isAuthenticated()
- [ ] Limpiar localStorage y probar de nuevo

---

**INSTRUCCIONES**: Ejecuta estos tests en orden y documenta los resultados.
