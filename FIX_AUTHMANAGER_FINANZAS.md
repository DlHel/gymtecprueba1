# 🔧 FIX CRÍTICO - AuthManager en Finanzas

## ❌ PROBLEMA
```
TypeError: AuthManager.isAuthenticated is not a function
```

## 🔍 CAUSA
`finanzas.js` intentaba usar `AuthManager.isAuthenticated()` pero:

1. `auth.js` crea una **instancia** de la clase `AuthManager`
2. La instancia se guarda en `window.authManager` (minúscula)
3. Por compatibilidad, también se asigna a `window.AuthManager` (mayúscula)
4. **PERO** `window.AuthManager` es la instancia, NO la clase

## ✅ SOLUCIÓN
Cambiar en `finanzas.js`:

### ANTES (❌):
```javascript
if (!AuthManager.isAuthenticated()) {
    window.location.href = '/login.html';
    return;
}
```

### DESPUÉS (✅):
```javascript
// Verificación de disponibilidad con debug
console.log('🔍 Debug - authManager disponible:', typeof window.authManager);

// Usar authManager (minúscula) - la instancia correcta
if (!window.authManager || !window.authManager.isAuthenticated()) {
    console.warn('❌ No autenticado, redirigiendo a login...');
    window.location.href = '/login.html';
    return;
}
```

## 📝 PATRÓN CORRECTO

### Para verificar autenticación:
```javascript
// ✅ CORRECTO - Usar authManager (minúscula)
if (!window.authManager || !window.authManager.isAuthenticated()) {
    // No autenticado
}

// ✅ TAMBIÉN CORRECTO - Ambas variables apuntan a la misma instancia
if (!window.AuthManager || !window.AuthManager.isAuthenticated()) {
    // No autenticado
}
```

### Para fetch con autenticación:
```javascript
// ✅ CORRECTO - Usar la función global
const response = await authenticatedFetch(`${API_URL}/endpoint`);

// ✅ TAMBIÉN CORRECTO - Usar el método de la instancia
const response = await window.authManager.authenticatedFetch(`${API_URL}/endpoint`);
```

## 🎯 OTROS MÓDULOS

**Estos módulos YA usan el patrón correcto:**
- ✅ `tickets.js` - usa `window.authManager`
- ✅ `inventario.js` - usa `window.authManager`
- ✅ `equipos.js` - usa `window.authManager`
- ✅ `dashboard.js` - usa `window.authManager`

**Estos módulos usan el patrón incorrecto pero funciona (compatibilidad):**
- ⚠️ `contratos.js` - usa `AuthManager` (mayúscula)
- ⚠️ `reportes.js` - usa `AuthManager` (mayúscula)

**Razón por la que funciona:** `window.AuthManager = window.authManager` (línea 400 de auth.js)

## 🔄 ESTRUCTURA DE auth.js

```javascript
class AuthManager {
    isAuthenticated() {
        return !!this.getToken();
    }
    // ... más métodos
}

// Crear instancia global
window.authManager = new AuthManager();

// Compatibilidad (ambas apuntan a la misma instancia)
window.AuthManager = window.authManager;

// Funciones globales de utilidad
window.authenticatedFetch = async function(url, options = {}) {
    return await window.authManager.authenticatedFetch(url, options);
};
```

## ✅ VERIFICACIÓN

Para probar que funciona:
1. Abrir http://localhost:8080/finanzas.html
2. Abrir consola del navegador (F12)
3. Ver logs de debug:
   ```
   🔍 Debug - authManager disponible: object
   🔍 Debug - authManager.isAuthenticated: function
   💰 Inicializando módulo de finanzas...
   ```

## 📚 RESUMEN

- **Usar**: `window.authManager` (minúscula) - Es la instancia real
- **Funciona pero no ideal**: `window.AuthManager` (mayúscula) - Apunta a la misma instancia
- **Función global**: `authenticatedFetch()` - Wrapper que usa la instancia
- **Siempre verificar**: `if (!window.authManager)` antes de usar

---

**Archivo modificado**: `frontend/js/finanzas.js` (líneas 6-19)  
**Estado**: ✅ Solucionado y con logs de debug
