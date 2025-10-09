# ✅ CHECKLIST DE VERIFICACIÓN - CORRECCIONES APLICADAS

## 🔍 Verificación Rápida (5 minutos)

### ✅ 1. Archivos Modificados
- [x] `backend/src/server-clean.js` - 4 endpoints protegidos
- [x] `frontend/js/contratos-new.js` - Usa authenticatedFetch
- [x] `frontend/js/dashboard.js` - Usa API_URL
- [x] `frontend/js/reportes.js` - Usa API_URL

### ✅ 2. Sin Errores de Sintaxis
- [x] Backend sin errores
- [x] Frontend sin errores
- [x] Linting OK (warnings de Markdown no afectan)

---

## 🧪 PLAN DE TESTING

### Paso 1: Reiniciar Servidor Backend
```powershell
# En terminal
cd backend
npm start
```

**Verificar:**
- ✅ Puerto 3000 activo
- ✅ "Server running on port 3000"
- ✅ Sin errores de MySQL

---

### Paso 2: Abrir Frontend
```powershell
# En otra terminal
cd frontend
python -m http.server 8080
```

**O usar:**
```powershell
.\start-servers.bat
```

---

### Paso 3: Test de Endpoints Protegidos

#### 3.1 Test GET /api/locations/:id SIN TOKEN
```bash
# En PowerShell
curl http://localhost:3000/api/locations/1
```

**Resultado esperado:**
```json
{
  "error": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

#### 3.2 Test GET /api/locations/:id CON TOKEN
1. Login en http://localhost:8080/login.html
2. Abrir DevTools (F12)
3. Ejecutar:
```javascript
const token = localStorage.getItem('gymtec_token');
fetch('http://localhost:3000/api/locations/1', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

**Resultado esperado:**
```json
{
  "message": "success",
  "data": { "id": 1, "name": "...", ... }
}
```

---

### Paso 4: Test de Contratos

#### 4.1 Acceder al Módulo
1. Ir a: http://localhost:8080/contratos-new.html
2. Verificar que NO hay errores en consola
3. Verificar que la página carga

#### 4.2 Test de Carga de Datos
**En DevTools Console, verificar:**
```
✅ 📡 Obteniendo contratos...
✅ 📡 Obteniendo clientes...
✅ ✅ Contratos obtenidos: X
✅ ✅ Clientes obtenidos: X
```

**NO debe aparecer:**
```
❌ TypeError: Cannot read property 'getAuthHeaders'
❌ 401 Unauthorized
❌ CORS error
```

#### 4.3 Test de Crear Contrato
1. Click en "Nuevo Contrato"
2. Llenar formulario
3. Guardar

**Verificar en consola:**
```
📡 Creando contrato: {...}
✅ Contrato creado
```

---

### Paso 5: Test de Dashboard

#### 5.1 Acceder al Dashboard
1. Ir a: http://localhost:8080/index.html
2. Abrir DevTools (F12)

#### 5.2 Verificar API_URL
**En Console, escribir:**
```javascript
console.log('API_URL:', API_URL);
```

**Resultado esperado:**
```
API_URL: http://localhost:3000/api
```

**NO debe aparecer:**
```
❌ API_URL: undefined
❌ CONFIG.API_BASE_URL is not defined
```

#### 5.3 Verificar Carga de KPIs
**En Console, buscar:**
```
✅ 🚀 Inicializando Dashboard...
✅ 📊 Cargando KPIs...
✅ ✅ Dashboard inicializado correctamente
```

**Verificar en pantalla:**
- ✅ KPIs muestran números
- ✅ No hay "Error al cargar"
- ✅ Gráficas se renderizan

---

### Paso 6: Test de Reportes

#### 6.1 Acceder a Reportes
1. Ir a: http://localhost:8080/reportes.html
2. Abrir DevTools (F12)

#### 6.2 Verificar en Console
```javascript
// Verificar que API_URL existe
console.log('API_URL:', API_URL);
```

**NO debe haber:**
```
❌ CONFIG.API_BASE_URL is not defined
❌ ReferenceError: CONFIG is not defined
```

#### 6.3 Verificar Carga de Datos
**En Console, buscar:**
```
✅ Cargando tickets...
✅ Cargando técnicos...
```

---

### Paso 7: Test de Sesión Expirada

#### 7.1 Simular Token Expirado
1. Estar en contratos-new.html
2. En DevTools Console:
```javascript
// Eliminar token
localStorage.removeItem('gymtec_token');
```

#### 7.2 Intentar Acción
1. Intentar crear un contrato
2. O recargar la página

**Resultado esperado:**
```
🔒 Token expirado o inválido (401), haciendo logout automático...
→ Redirige a /login.html
```

---

## 📋 CHECKLIST FINAL

### Backend
- [ ] Servidor corriendo sin errores
- [ ] Endpoints responden 401 sin token
- [ ] Endpoints responden 200 con token válido

### Frontend - Contratos
- [ ] Página carga sin errores
- [ ] Lista de contratos se muestra
- [ ] Crear contrato funciona
- [ ] Editar contrato funciona
- [ ] Eliminar contrato funciona
- [ ] Sesión expirada redirige a login

### Frontend - Dashboard
- [ ] Página carga sin errores
- [ ] KPIs se muestran correctamente
- [ ] API_URL definido correctamente
- [ ] No hay errores de CONFIG

### Frontend - Reportes
- [ ] Página carga sin errores
- [ ] Tickets se cargan
- [ ] Técnicos se cargan
- [ ] API_URL definido correctamente

---

## 🐛 Troubleshooting

### Error: "API_URL is not defined"
**Solución:**
1. Verificar que el HTML carga `config.js` ANTES del módulo
2. Verificar orden:
```html
<script src="js/config.js"></script>
<script src="js/auth.js"></script>
<script src="js/[modulo].js"></script>
```

### Error: "authenticatedFetch is not a function"
**Solución:**
1. Verificar que `auth.js` se carga correctamente
2. En Console:
```javascript
console.log(typeof window.authenticatedFetch);
// Debe ser: "function"
```

### Error: "401 Unauthorized"
**Solución:**
1. Verificar que el token existe:
```javascript
console.log(localStorage.getItem('gymtec_token'));
```
2. Si no existe, hacer login de nuevo
3. Verificar que el backend está corriendo

### Error: "CORS policy"
**Solución:**
1. Verificar que backend tiene CORS habilitado
2. Verificar que frontend usa puerto 8080
3. Reiniciar ambos servidores

---

## ✅ TODO LISTO

Si todos los tests pasan:
- ✅ Las correcciones están funcionando
- ✅ El sistema es más seguro
- ✅ La experiencia de usuario mejoró
- ✅ El código es más mantenible

---

**Próximo paso:** Testing en vivo 🚀
