# 🚀 Aplicar Correcciones al VPS - Guía Rápida

## ✅ Lo que se corrigió

Se corrigieron **5 endpoints críticos** en `backend/src/server-clean.js` que estaban causando errores 500:

1. `/api/equipment/:id/tickets` - Tickets de un equipo
2. `/api/equipment/:id/photos` - Fotos de un equipo  
3. `/api/equipment/:id/notes` - Notas de un equipo
4. `/api/locations/:id/equipment` - Equipos de una ubicación
5. `/api/dashboard/activity` - Actividad reciente del dashboard

**Problema:** Retornaban arrays directos en vez del formato `{message: 'success', data: [...]}`  
**Solución:** Estandarizado el formato de respuesta en todos los endpoints

---

## 📋 Paso a Paso para Aplicar

### Opción A: Automático (desde Windows PowerShell)

```powershell
# 1. Abrir PowerShell en la raíz del proyecto
cd C:\Users\felip\Desktop\desa\g\gymtecprueba1

# 2. Ejecutar script de deploy
.\scripts\deploy-vps-fixes.ps1
```

El script subirá el archivo automáticamente. Luego debes conectarte al VPS para reiniciar.

---

### Opción B: Manual (recomendado)

#### **1. Subir archivo al VPS**

Desde PowerShell/CMD en Windows:

```powershell
scp backend\src\server-clean.js root@91.107.237.159:/var/www/gymtec/backend/src/
```

Cuando pida contraseña, ingresa: `gscnxhmEAEWU`

---

#### **2. Conectar al VPS**

```bash
ssh root@91.107.237.159
```

Contraseña: `gscnxhmEAEWU`

---

#### **3. Hacer backup del archivo actual**

```bash
cd /var/www/gymtec/backend/src
cp server-clean.js server-clean.js.backup.ANTES_DE_FIX
ls -lh server-clean.js*
```

Deberías ver dos archivos: `server-clean.js` y `server-clean.js.backup.ANTES_DE_FIX`

---

#### **4. Reiniciar el servidor backend**

```bash
# Ir al directorio backend
cd /var/www/gymtec/backend

# Matar proceso actual
pkill -f 'node.*server-clean.js'

# Esperar 2 segundos
sleep 2

# Iniciar servidor en background
nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &

# Presionar Enter para volver al prompt
```

---

#### **5. Verificar que el servidor está corriendo**

```bash
# Ver el PID del proceso
pgrep -f 'node.*server-clean.js'
```

Si muestra un número (ejemplo: `1234`), ¡está corriendo! ✅

Si no muestra nada, hay un problema. Ver logs:

```bash
tail -f /var/www/gymtec/logs/backend.log
```

Presiona `Ctrl+C` para salir del tail.

---

#### **6. Ver logs en tiempo real (opcional)**

```bash
tail -f /var/www/gymtec/logs/backend.log
```

Deberías ver mensajes como:
```
🚀 Servidor iniciado en puerto 3000
📊 Conectado a MySQL
✅ Servidor listo para recibir peticiones
```

Presiona `Ctrl+C` para salir.

---

## 🧪 Verificar que funciona

### 1. Abrir el navegador

Ve a: **http://91.107.237.159**

### 2. Hacer login

- Usuario: `admin`
- Contraseña: [la que configuraste]

### 3. Probar módulo de Clientes/Sedes

1. Ir a **Clientes** en el menú
2. Hacer clic en un cliente para expandir
3. Hacer clic en una ubicación para ver equipos
4. **ANTES:** Veías error 500 en consola
5. **AHORA:** Debe cargar sin errores ✅

### 4. Probar Drawer de Equipo

1. En la lista de equipos, hacer clic en uno
2. Se abre el drawer (panel lateral)
3. Ir a cada pestaña:
   - **Información** ✅
   - **Tickets** ✅ (antes daba error)
   - **Notas** ✅ (antes daba error)
   - **Fotos** ✅ (antes daba error)
   - **QR** ✅

### 5. Verificar en Consola del Navegador

Presiona `F12` para abrir DevTools

**ANTES veías:**
```
❌ GET http://91.107.237.159/api/equipment/6/tickets 500 (Internal Server Error)
❌ tickets.map is not a function
```

**AHORA debes ver:**
```
✅ 200 OK para todos los endpoints
✅ Sin errores "map is not a function"
```

---

## ⚠️ Si algo sale mal

### Problema: El servidor no arranca

**Ver el error en logs:**
```bash
cat /var/www/gymtec/logs/backend.log
```

Busca líneas con `ERROR` o `Exception`

---

### Problema: Todavía hay errores 500

**Verificar que se subió el archivo correcto:**
```bash
cd /var/www/gymtec/backend/src
ls -lh server-clean.js
head -100 server-clean.js | grep "// GYMTEC"
```

---

### Problema: No puedo conectarme al VPS

**Verificar conectividad:**
```bash
ping 91.107.237.159
```

Si no responde, el VPS puede estar apagado.

---

### Restaurar backup si es necesario

```bash
cd /var/www/gymtec/backend/src
cp server-clean.js.backup.ANTES_DE_FIX server-clean.js
cd /var/www/gymtec/backend
pkill -f 'node.*server-clean.js'
sleep 2
nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &
```

---

## 📞 Comandos útiles para mantener a mano

```bash
# Ver si el servidor está corriendo
pgrep -f 'node.*server-clean.js'

# Ver logs en tiempo real
tail -f /var/www/gymtec/logs/backend.log

# Reiniciar servidor
pkill -f 'node.*server-clean.js' && cd /var/www/gymtec/backend && nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &

# Ver últimas 50 líneas del log
tail -50 /var/www/gymtec/logs/backend.log

# Ver procesos Node
ps aux | grep node

# Ver uso de recursos
htop
```

---

## ✅ Checklist de Verificación

Marca cada item después de verificar:

- [ ] Archivo `server-clean.js` subido al VPS
- [ ] Backup creado (`server-clean.js.backup.ANTES_DE_FIX`)
- [ ] Servidor backend reiniciado
- [ ] Proceso Node corriendo (verificado con `pgrep`)
- [ ] Sin errores en logs
- [ ] Login funciona en el navegador
- [ ] Dashboard carga sin errores 500
- [ ] Módulo de Clientes/Sedes funciona
- [ ] Drawer de equipo se abre correctamente
- [ ] Pestañas de Tickets, Notas y Fotos cargan
- [ ] Sin errores "map is not a function" en consola

---

## 🎯 Siguiente Paso

Una vez que estos 5 endpoints estén funcionando, seguir con el plan de inspección completo:

**Ver:** `PLAN-INSPECCION-VPS.md`

Esto tiene la lista de todos los módulos a revisar uno por uno con sus checklists.

---

## 📝 Resumen Visual

```
┌─────────────────────────────────────────────────────┐
│  1. Subir server-clean.js al VPS (scp)              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  2. Conectar al VPS (ssh)                            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  3. Hacer backup del archivo                         │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  4. Reiniciar backend (pkill + npm start)            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  5. Verificar que corre (pgrep + logs)               │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  6. Probar en navegador (F12 para ver consola)       │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
              ✅ ¡FUNCIONANDO!
```

---

**Última actualización:** 2025-12-28  
**Versión:** 1.0
