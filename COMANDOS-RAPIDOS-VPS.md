# ⚡ Comandos Rápidos - VPS Gymtec ERP

## 🚀 EJECUCIÓN RÁPIDA

### Desde Windows
```cmd
cd C:\Users\felip\Desktop\desa\g\gymtecprueba1
.\deploy-fix-to-vps.bat
```

### Desde VPS
```bash
ssh root@91.107.237.159
bash /root/master-fix-vps.sh
```

---

## 🔧 GESTIÓN DEL BACKEND (PM2)

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs gymtec-backend

# Ver últimas 100 líneas
pm2 logs gymtec-backend --lines 100

# Solo errores
pm2 logs gymtec-backend --err

# Reiniciar
pm2 restart gymtec-backend

# Detener
pm2 stop gymtec-backend

# Iniciar
pm2 start gymtec-backend

# Reiniciar con log limpio
pm2 restart gymtec-backend --update-env

# Ver información detallada
pm2 show gymtec-backend

# Monitoreo en tiempo real
pm2 monit
```

---

## 🗄️ GESTIÓN DE MYSQL

### Conexión Rápida
```bash
mysql -u root -p'gscnxhmEAEWU' gymtec_erp
```

### Comandos Útiles dentro de MySQL
```sql
-- Ver todas las tablas
SHOW TABLES;

-- Buscar tablas específicas
SHOW TABLES LIKE '%equipment%';

-- Ver estructura de tabla
DESC equipmentphotos;
DESC equipmentnotes;
DESC equipment;

-- Contar registros
SELECT COUNT(*) FROM equipment;
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM clients;

-- Ver últimos registros
SELECT * FROM equipment ORDER BY id DESC LIMIT 5;

-- Verificar FK
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'gymtec_erp'
AND TABLE_NAME = 'equipment';

-- Ver tamaño de tablas
SELECT 
    TABLE_NAME,
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size (MB)',
    TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'gymtec_erp'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- Salir
EXIT;
```

### Backup y Restore
```bash
# Backup completo
mysqldump -u root -p'gscnxhmEAEWU' gymtec_erp > backup_$(date +%Y%m%d).sql

# Backup sin datos (solo estructura)
mysqldump -u root -p'gscnxhmEAEWU' --no-data gymtec_erp > schema.sql

# Restore
mysql -u root -p'gscnxhmEAEWU' gymtec_erp < backup.sql

# Backup con compresión
mysqldump -u root -p'gscnxhmEAEWU' gymtec_erp | gzip > backup_$(date +%Y%m%d).sql.gz
```

---

## 🌐 GESTIÓN DE NGINX

```bash
# Ver estado
systemctl status nginx

# Reiniciar
systemctl restart nginx

# Recargar configuración (sin downtime)
systemctl reload nginx

# Test de configuración
nginx -t

# Ver logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Ver últimas 100 líneas de errores
tail -n 100 /var/log/nginx/error.log

# Ver configuración activa
nginx -T

# Ver puertos escuchando
netstat -tlnp | grep nginx
```

---

## 🧪 TEST DE ENDPOINTS

### Obtener Token
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq .
```

### Test con Token
```bash
# Guardar token en variable
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment | jq .

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/clients | jq .

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/1 | jq .

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/1/tickets | jq .

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/1/photos | jq .

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/1/notes | jq .
```

---

## 📊 DIAGNÓSTICO RÁPIDO

### Ver todos los servicios
```bash
pm2 status && systemctl status nginx && systemctl status mysql
```

### Ver todos los logs
```bash
pm2 logs gymtec-backend --lines 50 --nostream && \
tail -n 20 /var/log/nginx/error.log
```

### Verificar conexiones
```bash
# Puertos escuchando
netstat -tlnp

# Procesos Node
ps aux | grep node

# Procesos MySQL
ps aux | grep mysql

# Uso de memoria
free -h

# Uso de disco
df -h
```

---

## 🔄 REINICIO COMPLETO

```bash
# Reiniciar todo el stack
pm2 restart gymtec-backend && \
systemctl restart nginx && \
systemctl restart mysql

# Esperar y verificar
sleep 5
pm2 status
systemctl status nginx
systemctl status mysql
```

---

## 🐛 TROUBLESHOOTING

### Backend no inicia
```bash
# Ver errores
pm2 logs gymtec-backend --err --lines 100

# Iniciar manualmente para ver errores
cd /root/gymtecprueba1/backend
node src/server-clean.js

# Verificar config
cat /root/gymtecprueba1/backend/config.env

# Verificar puerto 3000
lsof -i :3000
```

### MySQL no conecta
```bash
# Ver estado
systemctl status mysql

# Ver errores
tail -n 50 /var/log/mysql/error.log

# Test de conexión
mysql -u root -p'gscnxhmEAEWU' -e "SELECT 1"

# Reiniciar MySQL
systemctl restart mysql
```

### Nginx error
```bash
# Ver configuración
cat /etc/nginx/sites-available/gymtec-erp

# Test
nginx -t

# Ver errores
tail -n 50 /var/log/nginx/error.log

# Verificar puerto 80
lsof -i :80
```

---

## 📁 RUTAS IMPORTANTES

```bash
# Backend
/root/gymtecprueba1/backend/
/root/gymtecprueba1/backend/config.env
/root/gymtecprueba1/backend/src/server-clean.js

# Frontend
/var/www/gymtec-erp/
/var/www/gymtec-erp/frontend/

# Nginx
/etc/nginx/sites-available/gymtec-erp
/etc/nginx/sites-enabled/gymtec-erp
/var/log/nginx/

# MySQL
/etc/mysql/
/var/log/mysql/
```

---

## 🔐 INFORMACIÓN DE ACCESO

```
VPS: 91.107.237.159
SSH User: root
SSH Pass: gscnxhmEAEWU

MySQL User: root
MySQL Pass: gscnxhmEAEWU
MySQL DB: gymtec_erp

Admin User: admin
Admin Pass: admin123

Frontend URL: http://91.107.237.159
API URL: http://91.107.237.159/api
```

---

## ⚡ ONE-LINERS ÚTILES

```bash
# Ver todo el estado en una línea
pm2 list | grep gymtec && systemctl is-active nginx mysql

# Contar tablas
mysql -u root -p'gscnxhmEAEWU' gymtec_erp -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'gymtec_erp'"

# Ver procesos escuchando
ss -tlnp | grep -E '3000|80'

# Logs en tiempo real (todos)
pm2 logs gymtec-backend & tail -f /var/log/nginx/error.log

# Test rápido de API
curl -I http://localhost:3000/api/health

# Espacio en disco
du -sh /root/gymtecprueba1 /var/www/gymtec-erp
```

---

**Guarda este archivo para referencia rápida** 📌
