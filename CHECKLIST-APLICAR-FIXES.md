# ✅ Checklist de Aplicación - Fixes VPS

## 📝 ANTES DE EMPEZAR

- [ ] Tengo acceso SSH al VPS (91.107.237.159)
- [ ] Tengo la contraseña del VPS (gscnxhmEAEWU)
- [ ] Estoy en la raíz del proyecto en mi máquina local
- [ ] He leído `APLICAR-FIXES-VPS.md`

---

## 🚀 PASO 1: SUBIR ARCHIVO

```bash
scp backend\src\server-clean.js root@91.107.237.159:/var/www/gymtec/backend/src/
```

- [ ] Comando ejecutado sin errores
- [ ] Transferencia completada al 100%

---

## 🔌 PASO 2: CONECTAR AL VPS

```bash
ssh root@91.107.237.159
```

Password: `gscnxhmEAEWU`

- [ ] Conectado exitosamente
- [ ] Veo el prompt del VPS

---

## 💾 PASO 3: BACKUP

```bash
cd /var/www/gymtec/backend/src
cp server-clean.js server-clean.js.backup.$(date +%Y%m%d_%H%M%S)
ls -lh server-clean.js*
```

- [ ] Backup creado
- [ ] Veo dos archivos listados

---

## 🔄 PASO 4: REINICIAR BACKEND

```bash
cd /var/www/gymtec/backend
pkill -f 'node.*server-clean.js'
sleep 2
nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &
```

- [ ] Comandos ejecutados
- [ ] Presioné Enter después del nohup

---

## ✅ PASO 5: VERIFICAR

```bash
pgrep -f 'node.*server-clean.js'
```

- [ ] Veo un número (PID del proceso)

```bash
tail -20 /var/www/gymtec/logs/backend.log
```

- [ ] Veo mensaje "Servidor iniciado en puerto 3000"
- [ ] Veo mensaje "Conectado a MySQL"
- [ ] No veo errores rojos

---

## 🌐 PASO 6: PROBAR EN NAVEGADOR

Abrir: **http://91.107.237.159**

- [ ] Página carga correctamente
- [ ] Puedo hacer login con admin
- [ ] Dashboard se muestra

---

## 🔍 PASO 7: VERIFICAR CLIENTES/SEDES

1. Ir a **Clientes** en el menú
2. Hacer clic en un cliente
3. Hacer clic en una ubicación → "Ver Equipos"
4. Abrir DevTools (F12)

**ANTES veías:**
```
❌ GET .../api/locations/5/equipment 500 (Internal Server Error)
```

**AHORA debes ver:**
```
✅ GET .../api/locations/5/equipment 200 OK
✅ {message: "success", data: [...], metadata: {...}}
```

- [ ] Equipos se cargan sin error 500
- [ ] No hay mensajes de error en consola

---

## 🎯 PASO 8: VERIFICAR DRAWER DE EQUIPO

1. Hacer clic en un equipo de la lista
2. Se abre el drawer (panel lateral)
3. Probar cada pestaña:

### Pestaña: Información
- [ ] Se muestra información del equipo
- [ ] QR code se genera

### Pestaña: Tickets
**ANTES:** `❌ tickets.map is not a function`  
**AHORA:**
- [ ] Se cargan tickets sin errores
- [ ] Muestra "No hay tickets" o lista de tickets

### Pestaña: Notas
**ANTES:** `❌ notas.map is not a function`  
**AHORA:**
- [ ] Se cargan notas sin errores
- [ ] Puedo agregar una nota nueva

### Pestaña: Fotos
**ANTES:** `❌ photos.map is not a function`  
**AHORA:**
- [ ] Se cargan fotos sin errores
- [ ] Puedo subir una foto nueva

### Pestaña: QR
- [ ] QR se muestra correctamente

---

## 📊 PASO 9: VERIFICAR DASHBOARD

Ir a **Dashboard** (página principal)

**ANTES:** `❌ GET .../api/dashboard/activity?limit=10 500`  
**AHORA:**

- [ ] Actividad reciente se carga
- [ ] KPIs se muestran
- [ ] No hay errores 500 en consola

---

## ✅ RESUMEN FINAL

Marca si todos estos puntos están OK:

- [ ] ✅ Backend corriendo sin errores
- [ ] ✅ Dashboard carga correctamente
- [ ] ✅ Módulo Clientes/Sedes funciona
- [ ] ✅ Lista de equipos se carga sin error 500
- [ ] ✅ Drawer de equipo se abre sin problemas
- [ ] ✅ Pestaña Tickets funciona
- [ ] ✅ Pestaña Notas funciona
- [ ] ✅ Pestaña Fotos funciona
- [ ] ✅ Sin errores "map is not a function"
- [ ] ✅ Sin errores 500 en DevTools Console

---

## 🎉 SI TODO ESTÁ ✅

**¡Felicitaciones!** Los 5 endpoints críticos están corregidos.

### Siguiente Paso:

Ver: `PLAN-INSPECCION-VPS.md`

Este plan tiene la lista completa de **14 módulos** a revisar con checklists detallados.

**Orden sugerido:**
1. ✅ Dashboard (ya verificado)
2. ✅ Clientes/Sedes (ya verificado)
3. ⏳ Equipos (equipo.html)
4. ⏳ Tickets (tickets.html)
5. ⏳ Modelos (modelos.html)
6. ⏳ Inventario (inventario.html)
... etc

---

## ⚠️ SI ALGO FALLÓ

### Error: No veo el PID del proceso

```bash
# Ver el error
cat /var/www/gymtec/logs/backend.log

# Intentar iniciar manualmente
cd /var/www/gymtec/backend
npm start
```

Si ves un error específico, cópialo y busca la solución.

---

### Error: Todavía veo errores 500

**Verificar que se subió el archivo correcto:**

```bash
cd /var/www/gymtec/backend/src
ls -lh server-clean.js
# Debe tener fecha/hora reciente

head -50 server-clean.js | grep "equipment.*tickets"
# Debe mostrar el endpoint corregido
```

Si el archivo es viejo, repetir PASO 1.

---

### Error: No puedo conectarme al VPS

```bash
ping 91.107.237.159
```

Si no responde, el VPS puede estar apagado o hay problema de red.

---

## 📞 COMANDOS ÚTILES

```bash
# Ver si Node está corriendo
pgrep -f node

# Ver todos los procesos Node
ps aux | grep node

# Matar todos los procesos Node
pkill -f node

# Ver logs en tiempo real
tail -f /var/www/gymtec/logs/backend.log

# Ver últimas 50 líneas del log
tail -50 /var/www/gymtec/logs/backend.log

# Ver errores en los logs
grep -i error /var/www/gymtec/logs/backend.log | tail -20

# Reiniciar Nginx (si es necesario)
systemctl restart nginx

# Ver uso de memoria/CPU
htop
# (Presiona 'q' para salir)
```

---

## 🔙 RESTAURAR BACKUP (Si es necesario)

```bash
cd /var/www/gymtec/backend/src

# Ver backups disponibles
ls -lh server-clean.js.backup*

# Restaurar el más reciente
cp server-clean.js.backup.XXXXX server-clean.js

# Reiniciar
cd /var/www/gymtec/backend
pkill -f node
nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &
```

---

**Fecha:** 2025-12-28  
**Versión:** 1.0  
**Responsable:** Equipo Gymtec ERP
