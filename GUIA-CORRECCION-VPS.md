# Guía de Corrección Completa - VPS Gymtec ERP

## 🔴 Problemas Detectados

### Errores en Consola del Navegador
1. ❌ `GET /api/equipment/:id/tickets` → 500 Internal Server Error
2. ❌ `GET /api/equipment/:id/photos` → 500 Internal Server Error
3. ❌ `GET /api/equipment/:id/notes` → 500 Internal Server Error
4. ❌ `GET /api/equipment/:id` → 500 Internal Server Error
5. ❌ `GET /api/dashboard/activity` → 500 Internal Server Error
6. ❌ `GET /api/models/:id/main-photo` → 404 Not Found
7. ❌ `GET /api/locations/:id/equipment` → 500 Internal Server Error

### Causa Raíz
**MySQL en Linux es case-sensitive** para nombres de tablas. El backend espera tablas en lowercase (`equipmentphotos`) pero las tablas pueden estar en mixedcase (`EquipmentPhotos`).

## 🛠️ Solución Automatizada

### Opción 1: Ejecutar desde Windows (RECOMENDADO)

```bash
# En tu máquina Windows, ejecuta:
cd C:\Users\felip\Desktop\desa\g\gymtecprueba1
deploy-fix-to-vps.bat
```

Este script:
- Copia los scripts de corrección al VPS
- Ejecuta el script maestro
- Corrige nombres de tablas
- Crea tablas faltantes
- Reinicia el backend
- Prueba los endpoints

### Opción 2: Ejecutar directamente en el VPS

```bash
# 1. Conectar al VPS
ssh root@91.107.237.159
# Password: gscnxhmEAEWU

# 2. Ir al directorio del proyecto
cd /root/gymtecprueba1

# 3. Descargar el script maestro (o copiarlo manualmente)
nano master-fix-vps.sh
# Pegar el contenido del archivo y guardar (Ctrl+X, Y, Enter)

# 4. Dar permisos de ejecución
chmod +x master-fix-vps.sh

# 5. Ejecutar
bash master-fix-vps.sh
```

## 📋 Qué Hace el Script Maestro

### Paso 1: Verificación Inicial
- Estado del backend (PM2)
- Tablas existentes en la base de datos

### Paso 2: Renombrar Tablas
Convierte todas las tablas a lowercase:
- `EquipmentPhotos` → `equipmentphotos`
- `EquipmentNotes` → `equipmentnotes`
- `Tickets` → `tickets`
- Y todas las demás...

### Paso 3: Crear Tablas Faltantes
Si no existen, crea:
- `equipmentphotos` - Fotos de equipos
- `equipmentnotes` - Notas de equipos
- `ticket_equipment_scope` - Relación tickets-equipos

### Paso 4: Verificación Post-Corrección
- Cuenta registros en cada tabla
- Verifica estructura de tablas críticas

### Paso 5: Reinicio del Backend
```bash
cd /root/gymtecprueba1/backend
pm2 restart gymtec-backend
pm2 logs gymtec-backend --lines 20
```

### Paso 6: Test de Endpoints
Prueba endpoints críticos:
- `/api/equipment`
- `/api/clients`
- `/api/locations`
- `/api/equipment/1`

## ✅ Verificación Post-Corrección

### 1. Verificar Backend
```bash
# En el VPS
pm2 status
pm2 logs gymtec-backend
```

Deberías ver:
```
✅ Servidor escuchando en puerto 3000
✅ Base de datos MySQL conectada
```

### 2. Verificar Tablas en MySQL
```bash
# En el VPS
mysql -u root -p'gscnxhmEAEWU' gymtec_erp -e "SHOW TABLES;"
```

Todas las tablas deben estar en **lowercase**.

### 3. Verificar en el Navegador
Abre: http://91.107.237.159

Login con:
- Usuario: `admin`
- Password: `admin123`

**Verificar consola del navegador:**
- ✅ No debe haber errores 500
- ✅ Solo puede haber el error 404 de `/api/models/1/main-photo` (si no hay foto)

### 4. Prueba de Funcionalidad

#### Módulo Clientes
1. Ve a "Clientes"
2. Selecciona un cliente
3. Selecciona una sede
4. Haz clic en un equipo
5. **Drawer debe abrirse sin errores**

#### Equipos en Drawer
- ✅ Ver detalles del equipo
- ✅ Ver QR code
- ✅ Tabs deben funcionar (Detalles, Tickets, Fotos, Notas)
- ✅ Sin errores en consola

## 🐛 Si Persisten Errores

### Error 500 en Equipment Endpoints

```bash
# En el VPS, verificar logs del backend
pm2 logs gymtec-backend --lines 100

# Buscar mensajes como:
# ❌ Error fetching equipment notes: Table 'gymtec_erp.EquipmentNotes' doesn't exist
```

**Solución:** Las tablas no se renombraron correctamente.

```bash
# Ejecutar manualmente
mysql -u root -p'gscnxhmEAEWU' gymtec_erp

-- Dentro de MySQL:
SHOW TABLES LIKE '%equipment%';

-- Si ves tablas en mayúsculas, renombrar:
RENAME TABLE EquipmentPhotos TO equipmentphotos;
RENAME TABLE EquipmentNotes TO equipmentnotes;
```

### Error: Tabla No Existe

```bash
# Verificar si la tabla existe
mysql -u root -p'gscnxhmEAEWU' gymtec_erp -e "DESC equipmentphotos;"

# Si no existe, crearla:
mysql -u root -p'gscnxhmEAEWU' gymtec_erp < /root/create-missing-tables-vps.sql
```

### Backend No Inicia

```bash
# Ver errores de PM2
pm2 logs gymtec-backend --err --lines 50

# Reiniciar backend
cd /root/gymtecprueba1/backend
pm2 restart gymtec-backend

# O iniciar manualmente para ver errores
node src/server-clean.js
```

### Error de Conexión a MySQL

Verificar credenciales en `backend/config.env`:
```bash
cat /root/gymtecprueba1/backend/config.env
```

Debe contener:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=gscnxhmEAEWU
DB_NAME=gymtec_erp
DB_PORT=3306
```

## 📊 Comandos Útiles

### PM2 (Backend)
```bash
pm2 list                        # Listar procesos
pm2 logs gymtec-backend         # Ver logs en tiempo real
pm2 restart gymtec-backend      # Reiniciar backend
pm2 stop gymtec-backend         # Detener backend
pm2 start gymtec-backend        # Iniciar backend
```

### MySQL
```bash
# Conectar a MySQL
mysql -u root -p'gscnxhmEAEWU' gymtec_erp

# Comandos útiles dentro de MySQL:
SHOW TABLES;                                    # Listar tablas
DESC equipmentphotos;                           # Ver estructura de tabla
SELECT COUNT(*) FROM equipment;                 # Contar registros
SHOW CREATE TABLE equipmentphotos;              # Ver SQL de creación
```

### Nginx (Frontend)
```bash
nginx -t                        # Test configuración
systemctl restart nginx         # Reiniciar nginx
systemctl status nginx          # Ver estado
tail -f /var/log/nginx/error.log # Ver errores
```

## 🎯 Resultado Esperado

Después de ejecutar las correcciones:

✅ Sistema funcional al 100%
✅ Sin errores 500 en consola
✅ Drawer de equipos funcional
✅ Todos los tabs cargando
✅ Backend logs sin errores
✅ MySQL con todas las tablas en lowercase

## 📞 Soporte

Si después de seguir esta guía persisten problemas:

1. Captura pantalla de consola del navegador (F12)
2. Captura logs del backend: `pm2 logs gymtec-backend --lines 100`
3. Verifica tablas en MySQL: `mysql -u root -p'gscnxhmEAEWU' gymtec_erp -e "SHOW TABLES;"`
4. Envía la información para diagnóstico

---

**Creado:** 2025-12-28
**VPS:** 91.107.237.159
**Proyecto:** Gymtec ERP v3.1
