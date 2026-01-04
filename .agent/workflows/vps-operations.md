---
description: Workflow para operaciones del VPS con auto-ejecución
---

# VPS Operations Workflow

Este workflow permite ejecutar comandos en el VPS sin requerir aprobación manual.

// turbo-all

## Información del Servidor
- **IP**: 91.107.237.159
- **Usuario**: root
- **Ruta App**: /var/www/gymtec
- **Backend**: /var/www/gymtec/backend
- **Frontend**: /var/www/gymtec/frontend
- **PM2 Process**: gymtec-backend
- **Base de datos**: gymtec_erp (MySQL)
- **Usuario DB**: gymtec_user

## 1. Comandos de Estado

```bash
# Ver estado PM2
ssh root@91.107.237.159 "pm2 status"

# Ver logs del backend (últimas 50 líneas)
ssh root@91.107.237.159 "pm2 logs gymtec-backend --lines 50 --nostream"

# Ver errores recientes
ssh root@91.107.237.159 "pm2 logs gymtec-backend --err --lines 30 --nostream"
```

## 2. Deploy de Archivos

```bash
# Subir archivo individual
scp -o BatchMode=yes [archivo_local] root@91.107.237.159:/var/www/gymtec/[ruta_destino]

# Subir backend completo
scp -o BatchMode=yes -r backend/src/* root@91.107.237.159:/var/www/gymtec/backend/src/

# Subir frontend completo
scp -o BatchMode=yes -r frontend/* root@91.107.237.159:/var/www/gymtec/frontend/

# Subir solo JS del frontend
scp -o BatchMode=yes frontend/js/*.js root@91.107.237.159:/var/www/gymtec/frontend/js/
```

## 3. Reinicio de Servicios

```bash
# Reiniciar backend
ssh root@91.107.237.159 "pm2 restart gymtec-backend"

# Reiniciar con logs en vivo
ssh root@91.107.237.159 "pm2 restart gymtec-backend && pm2 logs gymtec-backend --lines 20 --nostream"

# Recargar Nginx (si se cambia configuración)
ssh root@91.107.237.159 "nginx -t && systemctl reload nginx"
```

## 4. Base de Datos MySQL

```bash
# Ejecutar archivo SQL
scp [archivo.sql] root@91.107.237.159:/root/query.sql && ssh root@91.107.237.159 "mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp < /root/query.sql"

# Query directa
ssh root@91.107.237.159 "mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp -e 'SHOW TABLES;'"

# Ver estructura de tabla
ssh root@91.107.237.159 "mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp -e 'DESCRIBE [tabla];'"

# Ver datos de tabla
ssh root@91.107.237.159 "mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp -e 'SELECT * FROM [tabla] LIMIT 10;'"
```

## 5. Debug y Testing

```bash
# Test endpoint específico
ssh root@91.107.237.159 "curl -s http://localhost:3000/api/health | head -100"

# Test tickets
ssh root@91.107.237.159 "curl -s http://localhost:3000/api/tickets | head -200"

# Test clientes
ssh root@91.107.237.159 "curl -s http://localhost:3000/api/clients | head -200"

# Test equipos
ssh root@91.107.237.159 "curl -s http://localhost:3000/api/equipment | head -200"
```

## 6. Módulos Principales

### Tickets (frontend/tickets.html, frontend/ticket-detail.html)
- Backend: server-clean.js líneas ~1630-2000
- Endpoints: GET/POST/PUT/DELETE /api/tickets
- Tablas: Tickets, TicketNotes, TicketPhotos

### Clientes (frontend/clientes.html)
- Backend: server-clean.js
- Endpoints: GET/POST/PUT/DELETE /api/clients
- Tablas: Clients, Locations

### Equipos/Máquinas (frontend/equipos.html)
- Backend: server-clean.js
- Endpoints: GET/POST/PUT/DELETE /api/equipment
- Tablas: Equipment, EquipmentModels, EquipmentNotes

## 7. Flujo de Trabajo Recomendado

1. **Antes de cambios**: Verificar estado con `pm2 status`
2. **Hacer cambios locales**: Editar archivos en proyecto local
3. **Subir cambios**: Usar SCP para transferir
4. **Reiniciar**: `pm2 restart gymtec-backend`
5. **Verificar**: Revisar logs y probar endpoints
6. **Usuario prueba**: El usuario realiza pruebas manuales
