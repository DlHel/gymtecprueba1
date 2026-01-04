# ✅ GUÍA: CÓMO VERIFICAR QUE TU APLICACIÓN FUNCIONA

**Fecha:** 28 de diciembre de 2025  
**Servidor:** http://91.107.237.159

---

## 🌐 PASO 1: Abrir el Navegador

**Abre tu navegador favorito** (Chrome, Firefox, Edge, etc.) y ve a:

```
http://91.107.237.159
```

o también puedes ir directamente a:

```
http://91.107.237.159/login.html
```

---

## 🔐 PASO 2: Probar el Login

Deberías ver una **pantalla de login** similar a esta:

```
┌─────────────────────────────────────┐
│                                     │
│         GYMTEC ERP                  │
│                                     │
│   Usuario: [____________]           │
│                                     │
│   Password: [____________]          │
│                                     │
│        [ INICIAR SESIÓN ]           │
│                                     │
└─────────────────────────────────────┘
```

### Credenciales para probar:
```
👤 Usuario: admin
🔑 Password: Admin123
```

**Click en "Iniciar Sesión"**

---

## ✅ PASO 3: ¿Qué Debería Pasar?

### Si TODO está funcionando correctamente:

1. **El botón cambiará a "Cargando..."**
2. **Te redirigirá automáticamente al Dashboard** (index.html)
3. **Verás el menú lateral con todas las opciones:**
   - 📊 Dashboard
   - 👥 Clientes
   - 📍 Ubicaciones
   - 🏋️ Equipos
   - 🎫 Tickets
   - 📦 Inventario
   - 💰 Finanzas
   - ⚙️ Configuración
   - Y más...

---

## ❌ PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "No se puede conectar al servidor"
**Causa:** El servidor no responde  
**Solución:**
```bash
# Conéctate al servidor SSH
ssh root@91.107.237.159

# Verifica los servicios
pm2 status
systemctl status nginx
systemctl status mysql

# Si están caídos, reinícialos
pm2 restart gymtec-backend
systemctl restart nginx
```

---

### Problema 2: Página en blanco o error 500
**Causa:** Nginx no puede encontrar los archivos  
**Solución:**
```bash
# Verifica que los archivos existan
ls -la /var/www/gymtec/frontend/

# Verifica los permisos
sudo chmod -R 755 /var/www/gymtec/frontend/

# Reinicia Nginx
systemctl restart nginx
```

---

### Problema 3: "Error de autenticación" o "Usuario no existe"
**Causa:** El usuario admin no se creó correctamente  
**Solución:**
```bash
# Conéctate al servidor
ssh root@91.107.237.159

# Verifica que el usuario existe
mysql -u gymtec_user -p"k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=" gymtec_erp -e "SELECT * FROM Users;"

# Si no existe, créalo manualmente (ver documento DEPLOYMENT-SUCCESS.md)
```

---

### Problema 4: El login no responde (botón no hace nada)
**Causa:** El backend no está corriendo o hay problema con CORS  
**Solución:**
```bash
# Ver logs del backend
pm2 logs gymtec-backend --lines 50

# Reiniciar backend
pm2 restart gymtec-backend
```

---

## 🧪 PRUEBAS ADICIONALES

### Prueba desde la Línea de Comandos (Windows):

Abre PowerShell y ejecuta:

```powershell
# Probar que el servidor responde
curl http://91.107.237.159

# Debería devolver HTML del login
```

### Prueba con Navegador (Consola F12):

1. **Abre tu navegador** en `http://91.107.237.159`
2. **Presiona F12** para abrir las DevTools
3. **Ve a la pestaña "Network"**
4. **Intenta hacer login**
5. **Observa las peticiones HTTP:**
   - Debería haber una petición a `/api/auth/login` o similar
   - Código de respuesta 200 = ✅ Éxito
   - Código de respuesta 401 = ❌ Credenciales incorrectas
   - Código de respuesta 500 = ❌ Error del servidor

### Prueba con Consola del Navegador:

En la pestaña "Console" de las DevTools (F12), verifica:
- ❌ **Errores rojos** = Problema de JavaScript
- ⚠️ **Advertencias amarillas** = No crítico
- ℹ️ **Info azul** = Todo bien

---

## 📱 PRUEBA DESDE TU TELÉFONO

Si quieres probar desde tu móvil:

1. **Asegúrate de estar en la misma red** (o usa datos móviles)
2. **Abre el navegador del móvil**
3. **Ve a:** `http://91.107.237.159`
4. **Intenta hacer login**

---

## 🔍 VERIFICACIÓN COMPLETA - CHECKLIST

Marca cada ítem que funcione:

### Backend:
- [ ] El servidor responde en http://91.107.237.159
- [ ] PM2 muestra "online" para gymtec-backend
- [ ] No hay errores en `pm2 logs gymtec-backend`
- [ ] MySQL está activo

### Frontend:
- [ ] La página de login carga correctamente
- [ ] Los estilos CSS se ven bien (no hay página sin formato)
- [ ] El formulario de login es interactivo
- [ ] No hay errores en la Consola del navegador (F12)

### Autenticación:
- [ ] Puedes escribir en los campos Usuario y Password
- [ ] El botón "Iniciar Sesión" responde al click
- [ ] Con credenciales correctas, te redirige al dashboard
- [ ] Ves el menú lateral con todas las opciones

### Dashboard:
- [ ] Carga la página principal con estadísticas
- [ ] Puedes navegar entre las diferentes secciones del menú
- [ ] Los datos se cargan (aunque estén vacíos inicialmente)
- [ ] El botón de Logout funciona

---

## 🎯 RESULTADO ESPERADO

**Si todo funciona correctamente, deberías poder:**

1. ✅ **Acceder al login** sin errores
2. ✅ **Autenticarte** con admin/Admin123
3. ✅ **Ver el dashboard** con el menú completo
4. ✅ **Navegar** por todas las secciones
5. ✅ **Crear registros** (clientes, equipos, tickets, etc.)
6. ✅ **Ver listas** de datos
7. ✅ **Cerrar sesión** correctamente

---

## 📞 SI NADA DE ESTO FUNCIONA

### Opción 1: Reinicio Completo
```bash
ssh root@91.107.237.159

# Reiniciar todo
pm2 restart gymtec-backend
systemctl restart nginx
systemctl restart mysql

# Esperar 10 segundos
sleep 10

# Verificar estado
pm2 status
systemctl status nginx
systemctl status mysql
```

### Opción 2: Ver Logs Detallados
```bash
# Ver logs del backend
pm2 logs gymtec-backend --lines 100

# Ver logs de Nginx
tail -f /var/www/gymtec/logs/nginx-error.log

# Ver logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### Opción 3: Pedir Ayuda
Si después de todo esto no funciona, comparte:
1. Captura de pantalla de la página que ves
2. Errores en la Consola del navegador (F12 > Console)
3. Output de `pm2 logs gymtec-backend --lines 50`
4. Output de `curl http://91.107.237.159`

---

## 🎉 CONFIRMACIÓN DE ÉXITO

**Si puedes hacer login y ver el dashboard, entonces:**

```
✅ APLICACIÓN 100% FUNCIONAL
✅ Backend: OPERATIVO
✅ Frontend: OPERATIVO  
✅ Base de Datos: OPERATIVA
✅ Autenticación: FUNCIONAL

🎊 ¡FELICITACIONES! Tu ERP está desplegado y funcionando.
```

---

## 📸 CAPTURAS DE PANTALLA ESPERADAS

### Login:
- Formulario limpio con campos de usuario y password
- Logo o título "GYMTEC ERP"
- Botón azul "Iniciar Sesión"

### Dashboard (después del login):
- Menú lateral a la izquierda
- Header superior con nombre de usuario
- Área central con estadísticas/widgets
- Botón de logout en el header

---

## 🚀 PRÓXIMOS PASOS

Una vez confirmado que funciona:

1. ✅ **Cambiar la contraseña del admin** (Configuración > Usuarios)
2. ✅ **Crear usuarios adicionales** (técnicos, managers, clientes)
3. ✅ **Agregar tu primer cliente** (Clientes > Nuevo)
4. ✅ **Registrar ubicaciones** (Ubicaciones > Nueva)
5. ✅ **Agregar equipos** (Equipos > Nuevo)
6. ✅ **Crear tu primer ticket** (Tickets > Nuevo)

---

**Documento creado:** 28 de diciembre de 2025  
**Actualizado:** 16:05 CET  
**Versión:** 1.0
