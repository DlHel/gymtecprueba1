# 🚀 Guía de Despliegue Gymtec ERP en VPS Hetzner

## 📋 Información del Servidor

**VPS Hetzner:**
- IP: 91.107.237.159
- Usuario: root
- Sistema: Ubuntu 22.04 LTS (a instalar)
- RAM: 7.7 GB
- Disco: 76 GiB
- CPUs: 4 cores AMD EPYC

**Estado actual:** Rescue System (necesita instalación de OS)

---

## 🎯 Plan de Despliegue Completo

### **FASE 1: Preparación Local** (Windows)

**1.1 Preparar proyecto para subir**
```bash
cd C:\Users\felip\Desktop\desa\g\gymtecprueba1
deploy\01-prepare-local.bat
```

**1.2 Verificar cambios**
- Revisa que `backend\config.env.production` tenga datos correctos
- Confirma que `.gitignore` está actualizado

**1.3 Commit y push a GitHub**
```bash
git add .
git commit -m "Preparar para deploy en VPS Hetzner"
git push origin main
```

---

### **FASE 2: Instalar Sistema Operativo** (VPS - Rescue System)

**Estás conectado actualmente al Rescue System. Necesitas instalar Ubuntu:**

```bash
# Ejecutar installimage
installimage

# Seguir wizard:
# 1. Seleccionar: Ubuntu 22.04 LTS minimal
# 2. Hostname: gymtec-erp
# 3. Particionar: Automático
# 4. Confirmar instalación
# 5. Esperar 5-10 minutos
# 6. Reboot
reboot
```

**Después del reboot, reconectar:**
```bash
ssh root@91.107.237.159
# Password: el que configuraste en installimage
```

---

### **FASE 3: Instalación de Stack Completo** (VPS - Ubuntu instalado)

**3.1 Subir scripts al servidor**

Desde tu PC Windows, abre otra terminal:
```bash
# Copiar scripts al VPS
scp C:\Users\felip\Desktop\desa\g\gymtecprueba1\deploy\*.sh root@91.107.237.159:/root/

# Conectar al VPS
ssh root@91.107.237.159
```

**3.2 Ejecutar instalación del stack**
```bash
cd /root
chmod +x *.sh

# Instalar: Node.js, MySQL, Nginx, PM2, firewall
bash 02-install-vps.sh
# Duración: ~10 minutos
```

**⚠️ IMPORTANTE:** Al finalizar, guardará credenciales en `/root/gymtec-credentials.txt`

---

### **FASE 4: Desplegar Aplicación** (VPS)

**4.1 Desplegar desde GitHub**
```bash
bash 03-deploy-app.sh
# Duración: ~5 minutos

# Esto hará:
# - Clonar repositorio desde GitHub
# - Instalar dependencias npm
# - Crear config.env con credenciales MySQL
# - Importar schema de 43 tablas
# - Crear usuario admin
# - Configurar PM2 y Nginx
# - Iniciar aplicación
```

**4.2 Verificar que todo funciona**
```bash
# Ver estado de servicios
pm2 status
systemctl status nginx
systemctl status mysql

# Ver logs en tiempo real
pm2 logs gymtec-backend

# Verificar base de datos
mysql -u gymtec_user -p gymtec_erp
# Password: ver en /root/gymtec-credentials.txt
SHOW TABLES;
EXIT;
```

---

### **FASE 5: Probar la Aplicación**

**5.1 Acceder desde el navegador**
```
http://91.107.237.159
```

**5.2 Login inicial**
- Email: `admin@gymtec.com`
- Password: `Admin123!`

**5.3 Verificar módulos principales**
- Dashboard
- Clientes
- Equipos
- Tickets
- Inventario

---

### **FASE 6: Configurar Dominio y SSL** (Opcional)

**Si tienes un dominio (ejemplo: gymtec.cl):**

**6.1 Configurar DNS**
En tu proveedor de dominio (GoDaddy, Namecheap, etc.):
```
Tipo A:     @       →  91.107.237.159
Tipo A:     www     →  91.107.237.159
```

**6.2 Esperar propagación DNS** (5 minutos - 24 horas)
```bash
# Verificar desde cualquier PC
nslookup gymtec.cl
```

**6.3 Instalar certificado SSL**
```bash
# En el VPS
bash 04-install-ssl.sh gymtec.cl
# Duración: ~2 minutos

# Acceder con HTTPS
https://gymtec.cl
```

---

## 🔄 Mantenimiento y Actualizaciones

### **Actualizar aplicación**
```bash
ssh root@91.107.237.159
bash 05-update-app.sh
```

### **Ver logs**
```bash
# Backend logs
pm2 logs gymtec-backend

# Nginx logs
tail -f /var/www/gymtec/logs/nginx-access.log
tail -f /var/www/gymtec/logs/nginx-error.log
```

### **Reiniciar servicios**
```bash
# Backend
pm2 restart gymtec-backend

# Nginx
systemctl restart nginx

# MySQL
systemctl restart mysql
```

### **Backup de base de datos**
```bash
# Crear backup
mysqldump -u gymtec_user -p gymtec_erp > backup-$(date +%Y%m%d).sql

# Restaurar backup
mysql -u gymtec_user -p gymtec_erp < backup-20250127.sql
```

---

## 🔒 Seguridad Post-Instalación

### **Cambiar passwords por defecto**
```bash
# 1. Cambiar password de admin en la app
http://91.107.237.159/configuracion.html

# 2. Cambiar password de root del VPS
passwd root

# 3. Configurar SSH con llave pública (opcional)
# Desde tu PC Windows:
# ssh-keygen -t ed25519
# ssh-copy-id root@91.107.237.159
```

### **Configurar backups automáticos**
```bash
# Crear script de backup diario
cat > /root/backup-daily.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
mysqldump -u gymtec_user -p$(grep DB_PASSWORD /root/gymtec-credentials.txt | awk '{print $2}' | head -1) gymtec_erp > /root/backups/db-$DATE.sql
find /root/backups -name "db-*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-daily.sh
mkdir -p /root/backups

# Agregar a crontab (ejecutar diario a las 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-daily.sh") | crontab -
```

---

## 📊 Checklist de Verificación Final

- [ ] Sistema operativo Ubuntu 22.04 instalado
- [ ] Stack instalado (Node.js, MySQL, Nginx, PM2)
- [ ] Aplicación clonada y dependencias instaladas
- [ ] Base de datos MySQL con 43 tablas creadas
- [ ] Usuario admin creado
- [ ] Backend corriendo en PM2 (puerto 3000)
- [ ] Nginx configurado como proxy reverso
- [ ] Firewall configurado (UFW)
- [ ] Aplicación accesible en http://91.107.237.159
- [ ] Login funcional
- [ ] Todos los módulos funcionando
- [ ] (Opcional) Dominio configurado
- [ ] (Opcional) SSL instalado
- [ ] Backups automáticos configurados

---

## 🆘 Solución de Problemas

### **Backend no inicia**
```bash
pm2 logs gymtec-backend
# Revisar logs y verificar config.env
```

### **Error de conexión MySQL**
```bash
systemctl status mysql
mysql -u root -p
# Verificar credenciales en config.env
```

### **Nginx 502 Bad Gateway**
```bash
# Verificar que backend esté corriendo
pm2 status
# Verificar logs de Nginx
tail -f /var/www/gymtec/logs/nginx-error.log
```

### **No se puede acceder al sitio**
```bash
# Verificar firewall
ufw status
# Verificar Nginx
systemctl status nginx
nginx -t
```

---

## 📞 Soporte

**Archivos importantes:**
- Credenciales: `/root/gymtec-credentials.txt`
- Logs backend: `/var/www/gymtec/logs/backend.log`
- Logs Nginx: `/var/www/gymtec/logs/nginx-*.log`
- Config app: `/var/www/gymtec/backend/config.env`

**Comandos de diagnóstico:**
```bash
pm2 status
systemctl status nginx mysql
ufw status
df -h  # Espacio en disco
free -h  # Memoria RAM
top  # Procesos
```

---

**Versión:** 1.0  
**Fecha:** 27 de diciembre de 2025  
**Proyecto:** Gymtec ERP v3.2.1
