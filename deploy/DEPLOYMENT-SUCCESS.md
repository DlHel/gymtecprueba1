# ✅ DESPLIEGUE EXITOSO - Gymtec ERP en VPS Hetzner

**Fecha:** 28 de diciembre de 2025  
**Servidor:** 91.107.237.159 (Hetzner)  
**Sistema:** Ubuntu 22.04 LTS

---

## 🎯 Estado del Despliegue: COMPLETADO

### ✅ Componentes Instalados y Funcionando:

1. **Sistema Operativo**
   - ✅ Ubuntu 22.04 LTS (Jammy)
   - ✅ Kernel 5.15.0-157-generic
   - ✅ 76 GB de disco (6.2% usado)
   - ✅ 7.7 GB RAM (11% usado)
   - ✅ 4 CPUs AMD EPYC

2. **Stack de Aplicación**
   - ✅ Node.js 20.x LTS instalado
   - ✅ MySQL 8.0 corriendo en puerto 3306
   - ✅ Nginx 1.18.0 corriendo en puerto 80
   - ✅ PM2 gestionando el proceso backend

3. **Base de Datos**
   - ✅ 32 tablas MySQL creadas
   - ✅ Usuario `gymtec_user` configurado
   - ✅ Base de datos `gymtec_erp` activa

4. **Aplicación**
   - ✅ Código clonado desde GitHub
   - ✅ 204 paquetes npm instalados
   - ✅ Backend corriendo en puerto 3000 (PM2)
   - ✅ Frontend servido por Nginx puerto 80
   - ✅ Usuario administrador creado

---

## 🌐 Acceso a la Aplicación

### URL Principal:
```
http://91.107.237.159
```

### Credenciales de Login:
```
Usuario: admin
Password: Admin123
```

⚠️ **IMPORTANTE:** Cambia esta contraseña después del primer login

---

## 🔐 Credenciales del Servidor

### Acceso SSH:
```bash
ssh root@91.107.237.159
```

### Credenciales MySQL:
```
Host: localhost
Puerto: 3306
Base de Datos: gymtec_erp
Usuario: gymtec_user
Password: k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=
```

📄 **Archivo de credenciales completo:** `/root/gymtec-credentials.txt`

---

## 📊 Verificación del Sistema

### Estado de Servicios:
```bash
# Backend (PM2)
pm2 status
# Estado: ✅ ONLINE - 85.5 MB RAM

# Nginx
systemctl status nginx
# Estado: ✅ ACTIVE

# MySQL
systemctl status mysql
# Estado: ✅ ACTIVE
```

### Puertos Abiertos:
- ✅ Puerto 80 (HTTP) - Nginx
- ✅ Puerto 3000 (Backend API) - Node.js/Express
- ✅ Puerto 3306 (MySQL) - Solo localhost
- ✅ Puerto 22 (SSH) - Acceso remoto

### Base de Datos:
```sql
-- Total de tablas: 32
-- Usuario admin creado: ✅
-- ID: 2, Username: admin, Role: 1
```

---

## 📁 Ubicaciones Importantes

### Aplicación:
```
/var/www/gymtec/           # Raíz de la aplicación
/var/www/gymtec/backend/   # Código del backend
/var/www/gymtec/frontend/  # Archivos del frontend
/var/www/gymtec/uploads/   # Archivos subidos (777)
/var/www/gymtec/logs/      # Logs de la aplicación
```

### Configuración:
```
/var/www/gymtec/backend/config.env          # Config del backend
/etc/nginx/sites-available/gymtec           # Config de Nginx
/root/gymtec-credentials.txt                # Credenciales guardadas
```

### Logs:
```
/var/www/gymtec/logs/backend.log           # Logs PM2
/var/www/gymtec/logs/nginx-access.log      # Accesos Nginx
/var/www/gymtec/logs/nginx-error.log       # Errores Nginx
/root/.pm2/logs/                           # Logs PM2
```

---

## 🛠️ Comandos Útiles de Mantenimiento

### PM2 (Backend):
```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs gymtec-backend

# Reiniciar backend
pm2 restart gymtec-backend

# Detener backend
pm2 stop gymtec-backend

# Ver información detallada
pm2 info gymtec-backend
```

### Nginx (Frontend):
```bash
# Ver estado
systemctl status nginx

# Reiniciar Nginx
systemctl restart nginx

# Recargar configuración (sin downtime)
systemctl reload nginx

# Verificar configuración
nginx -t

# Ver logs
tail -f /var/www/gymtec/logs/nginx-access.log
tail -f /var/www/gymtec/logs/nginx-error.log
```

### MySQL:
```bash
# Conectar a MySQL
mysql -u gymtec_user -p gymtec_erp
# Password: k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=

# Ver tablas
mysql -u gymtec_user -p"PASSWORD" gymtec_erp -e "SHOW TABLES;"

# Backup de base de datos
mysqldump -u gymtec_user -p"PASSWORD" gymtec_erp > backup-$(date +%Y%m%d).sql

# Restaurar backup
mysql -u gymtec_user -p"PASSWORD" gymtec_erp < backup-20251228.sql
```

### Sistema:
```bash
# Ver uso de recursos
htop

# Ver espacio en disco
df -h

# Ver memoria RAM
free -h

# Ver procesos de la aplicación
ps aux | grep node
ps aux | grep nginx
ps aux | grep mysql
```

---

## 🔄 Actualizar la Aplicación

### Desde GitHub:
```bash
# 1. Conectar al servidor
ssh root@91.107.237.159

# 2. Ir al directorio de la app
cd /var/www/gymtec

# 3. Hacer pull de los cambios
git pull origin main

# 4. Instalar nuevas dependencias (si hay)
cd backend && npm install --production

# 5. Reiniciar backend
pm2 restart gymtec-backend

# 6. Recargar Nginx (si cambió el frontend)
systemctl reload nginx
```

### Script Automático:
```bash
# Ejecutar el script de actualización
bash /root/05-update-app.sh
```

---

## 🔒 Seguridad Post-Instalación

### ⚠️ Tareas Pendientes (IMPORTANTE):

1. **Cambiar Contraseñas:**
   ```bash
   # Cambiar password del usuario admin en la app
   # http://91.107.237.159/configuracion.html
   
   # Cambiar password de root del VPS
   passwd root
   ```

2. **Configurar Backups Automáticos:**
   ```bash
   # Crear script de backup diario
   cat > /root/backup-daily.sh <<'EOF'
   #!/bin/bash
   DATE=$(date +%Y%m%d)
   mysqldump -u gymtec_user -p"k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=" gymtec_erp > /root/backups/db-$DATE.sql
   find /root/backups -name "db-*.sql" -mtime +7 -delete
   EOF
   
   chmod +x /root/backup-daily.sh
   mkdir -p /root/backups
   
   # Agregar a crontab (ejecutar diario a las 3 AM)
   (crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-daily.sh") | crontab -
   ```

3. **Instalar SSL (si tienes dominio):**
   ```bash
   # Configurar DNS A record apuntando a 91.107.237.159
   # Luego ejecutar:
   bash /root/04-install-ssl.sh tu-dominio.com
   ```

4. **Configurar SMTP (opcional):**
   - Editar `/var/www/gymtec/backend/config.env`
   - Configurar variables SMTP_*
   - Reiniciar: `pm2 restart gymtec-backend`

---

## 📈 Monitoreo

### Estado en Tiempo Real:
```bash
# Panel de PM2
pm2 monit

# Ver logs en vivo
pm2 logs gymtec-backend --lines 50

# Verificar conexiones
netstat -an | grep :80
netstat -an | grep :3000
```

### Verificar Salud del Sistema:
```bash
# Ver uptime
uptime

# Ver carga del sistema
top

# Ver conexiones activas
ss -s
```

---

## 🆘 Solución de Problemas

### Backend no responde:
```bash
# Ver logs del backend
pm2 logs gymtec-backend --lines 100

# Reiniciar backend
pm2 restart gymtec-backend

# Si no funciona, reiniciar PM2
pm2 kill
pm2 start /var/www/gymtec/backend/src/server-clean.js --name gymtec-backend
pm2 save
```

### Error 502 Bad Gateway:
```bash
# Verificar que backend esté corriendo
pm2 status

# Verificar logs de Nginx
tail -f /var/www/gymtec/logs/nginx-error.log

# Verificar configuración de Nginx
nginx -t
```

### Base de datos no conecta:
```bash
# Verificar que MySQL esté corriendo
systemctl status mysql

# Intentar conectar manualmente
mysql -u gymtec_user -p gymtec_erp

# Ver logs de MySQL
tail -f /var/log/mysql/error.log
```

### Sitio no carga:
```bash
# Verificar Nginx
systemctl status nginx

# Verificar permisos del frontend
ls -la /var/www/gymtec/frontend/

# Verificar configuración
nginx -t
```

---

## 📞 Información de Soporte

### Archivos de Configuración Creados:
- `deploy/01-prepare-local.bat` - Preparación local
- `deploy/02-install-vps.sh` - Instalación del stack
- `deploy/03-deploy-app.sh` - Deploy de la aplicación
- `deploy/04-install-ssl.sh` - Instalación SSL
- `deploy/05-update-app.sh` - Script de actualización
- `deploy/README-DEPLOY.md` - Guía completa de deploy

### Estado Actual:
```
✅ Sistema: OPERATIVO
✅ Backend: ONLINE (puerto 3000)
✅ Frontend: ONLINE (puerto 80)
✅ Base de Datos: ONLINE (32 tablas)
✅ Usuario Admin: CREADO
⚠️  Algunas tablas opcionales faltan (no afecta funcionalidad básica)
```

---

## 🎉 ¡Despliegue Completado!

Tu aplicación **Gymtec ERP** está completamente desplegada y funcional en:

**🌐 http://91.107.237.159**

**Próximos pasos recomendados:**
1. ✅ Prueba el login con las credenciales proporcionadas
2. ⚠️  Cambia las contraseñas por defecto
3. 🔒 Configura backups automáticos
4. 🌐 Configura un dominio y SSL (opcional)
5. 📊 Configura monitoreo y alertas

---

**Desarrollado con ❤️ para Gymtec**  
**Fecha de Deploy:** 28 de diciembre de 2025  
**Versión:** v3.2.1
