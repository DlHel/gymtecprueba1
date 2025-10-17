# 🚀 Análisis Completo de Tecnologías - Gymtec ERP
## Preparación para Despliegue en Servidor

**Fecha**: 17 de octubre de 2025  
**Versión Sistema**: Gymtec ERP v3.1  
**Estado**: Listo para producción con requerimientos específicos  

---

## 📊 Resumen Ejecutivo

Gymtec ERP es una aplicación **full-stack** con arquitectura tradicional (NO microservicios) que requiere:
- ✅ Servidor Node.js (runtime backend)
- ✅ MySQL 8.0+ (base de datos)
- ✅ Servidor web estático (frontend)
- ⚠️ NO requiere Docker (aunque se puede dockerizar)
- ⚠️ NO es una SPA React (es Multi-Page Application con Vanilla JS)

---

## 🎯 Stack Tecnológico Completo

### 1. BACKEND (Node.js API)

#### Runtime y Versión
```
Node.js: v22.16.0 (recomendado v18 LTS o superior)
npm: 10.x
```

#### Framework Principal
- **Express.js v4.21.2** - Framework web minimalista
- **Puerto**: 3000 (configurable vía `process.env.PORT`)
- **Archivo Principal**: `backend/src/server-clean.js` (7,027 líneas)

#### Dependencias de Producción (12 paquetes)

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `express` | 4.21.2 | Framework web REST API |
| `mysql2` | 3.14.3 | Driver MySQL con soporte promesas |
| `bcryptjs` | 2.4.3 | Hash de passwords (autenticación) |
| `jsonwebtoken` | 9.0.2 | Tokens JWT para sesiones |
| `cors` | 2.8.5 | Cross-Origin Resource Sharing |
| `helmet` | 7.2.0 | Seguridad HTTP headers |
| `morgan` | 1.10.0 | Logging HTTP requests |
| `winston` | 3.17.0 | Sistema de logs avanzado |
| `multer` | 2.0.2 | Upload de archivos (fotos/manuales) |
| `dotenv` | 16.6.1 | Variables de entorno |
| `express-validator` | 7.0.1 | Validación de inputs |
| `node-fetch` | 3.3.2 | HTTP client |

**⚠️ Nota sobre mongoose**: Está en package.json pero NO se usa (el sistema usa MySQL, no MongoDB)

#### Dependencias de Desarrollo (3 paquetes)
- `nodemon` 2.0.22 - Auto-restart en desarrollo
- `eslint` 8.38.0 - Linter
- `jest` 29.5.0 - Testing (configurado pero sin tests activos)

#### Tamaño Estimado
```
node_modules/: ~250 MB
backend/src/: ~1.5 MB (código fuente)
backend/database/: ~50 KB (schemas SQL)
Total Backend: ~252 MB
```

---

### 2. BASE DE DATOS (MySQL)

#### Versión y Configuración
```
MySQL: 8.0+ (recomendado 8.0.33 o superior)
Character Set: utf8mb4
Collation: utf8mb4_unicode_ci
```

#### Estructura de Datos

**43+ Tablas Principales**:

| Módulo | Tablas | Propósito |
|--------|--------|-----------|
| **Core** | `Users`, `SystemConfig` | Autenticación y configuración |
| **Clientes** | `Clients`, `Locations` | Gestión de clientes y sedes |
| **Equipos** | `Equipment`, `EquipmentModels`, `EquipmentPhotos`, `EquipmentNotes`, `ModelManuals` | Catálogo y mantenimiento |
| **Tickets** | `Tickets`, `TicketPhotos`, `TicketNotes`, `TicketChecklist`, `ChecklistTemplates` | Sistema de tickets |
| **Inventario** | `Inventory`, `InventoryCategories`, `InventoryMovements`, `Suppliers`, `PurchaseOrders` | Stock y repuestos |
| **Personal** | `Technicians`, `TimeEntries`, `WorkPeriods`, `Attendance` | RRHH y asistencia |
| **Finanzas** | `Quotes`, `Invoices`, `Expenses`, `ExpenseCategories` | Cotizaciones, facturas, gastos |
| **Contratos** | `Contracts`, `Contract_Equipment` | SLA y contratos |
| **Notificaciones** | `Notifications`, `NotificationQueue`, `NotificationChannels` | Alertas del sistema |

#### Requerimientos de Storage

**Estimación de Espacio**:
```
Schema vacío: ~5 MB
Con 100 clientes: ~50 MB
Con 1000 tickets: ~200 MB
Fotos (Base64): Variable - puede crecer significativamente

⚠️ CRÍTICO: Las fotos se guardan como Base64 en LONGTEXT
   - Cada foto ~2-5 MB en base de datos
   - 1000 fotos = ~2-5 GB adicionales
```

**Configuración Mínima MySQL**:
```ini
[mysqld]
max_connections = 50
innodb_buffer_pool_size = 256M
max_allowed_packet = 64M  # Importante para fotos Base64
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

#### Archivo Schema
- **Ubicación**: `backend/database/mysql-schema.sql`
- **Tamaño**: ~50 KB
- **Líneas**: ~751 líneas SQL
- **Formato**: SQL puro, compatible con MySQL 8.0+

---

### 3. FRONTEND (Archivos Estáticos)

#### Tecnología
```
NO FRAMEWORK - Vanilla JavaScript puro
Tailwind CSS 4.1.10 (vía CDN o compilado)
```

#### Arquitectura Frontend
- **Tipo**: Multi-Page Application (MPA)
- **Páginas**: ~25 archivos HTML
- **Módulos JS**: ~40 archivos JavaScript
- **Servidor**: Cualquier servidor HTTP estático (Python, nginx, Apache)

#### Estructura de Archivos Frontend

```
frontend/
├── *.html                      # 25 páginas HTML
│   ├── index.html             # Dashboard
│   ├── login.html             # Autenticación
│   ├── clientes.html          # Gestión clientes
│   ├── tickets.html           # Sistema tickets
│   ├── equipos.html           # Catálogo equipos
│   ├── inventario.html        # Stock
│   ├── finanzas.html          # Finanzas
│   ├── contratos.html         # Contratos SLA
│   ├── personal.html          # RRHH
│   └── ...                    # Otras páginas
├── js/                        # 40+ módulos JavaScript
│   ├── config.js              # ⚠️ CRÍTICO: Auto-detección API_URL
│   ├── auth.js                # AuthManager (JWT)
│   ├── base-modal.js          # Sistema modales
│   ├── menu.js                # Navegación
│   ├── tickets.js             # Módulo tickets (2,736 líneas)
│   ├── clientes.js            # Módulo clientes
│   ├── finanzas.js            # Módulo finanzas (1,035 líneas)
│   └── ...                    # Otros módulos
├── css/
│   ├── style.css              # Tailwind compilado
│   └── input.css              # Tailwind source
└── favicon.svg

Total: ~150 archivos, ~5 MB
```

#### Servidor Frontend Options

**Opción 1 - Python SimpleHTTPServer** (Desarrollo)
```bash
cd frontend
python -m http.server 8080
```

**Opción 2 - Nginx** (Producción recomendada)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    root /var/www/gymtec/frontend;
    index index.html;
    
    # Servir archivos estáticos
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Proxy para API backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Opción 3 - Apache** (Alternativa)
```apache
<VirtualHost *:80>
    ServerName tu-dominio.com
    DocumentRoot /var/www/gymtec/frontend
    
    <Directory /var/www/gymtec/frontend>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Proxy para API
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api
</VirtualHost>
```

---

### 4. CONFIGURACIÓN CRÍTICA

#### Variables de Entorno (config.env)

```env
# ========================================
# CONFIGURACIÓN DE BASE DE DATOS (CRÍTICO)
# ========================================
DB_HOST=localhost              # Hostname del servidor MySQL
DB_PORT=3306                   # Puerto MySQL (default 3306)
DB_USER=root                   # Usuario MySQL
DB_PASSWORD=                   # Password MySQL (vacío en desarrollo)
DB_NAME=gymtec_erp            # Nombre de la base de datos

# ========================================
# CONFIGURACIÓN DEL SERVIDOR
# ========================================
PORT=3000                      # Puerto del backend (puede ser dinámico)
NODE_ENV=production            # development | production

# ========================================
# SEGURIDAD JWT (CAMBIAR EN PRODUCCIÓN)
# ========================================
JWT_SECRET=CAMBIAR_ESTO_EN_PRODUCCION_123456789
SESSION_SECRET=CAMBIAR_ESTO_EN_PRODUCCION_987654321
JWT_EXPIRES_IN=10h             # Tiempo de expiración del token

# ========================================
# CONFIGURACIÓN DE ARCHIVOS
# ========================================
UPLOAD_DIR=../uploads          # Directorio para uploads
MAX_FILE_SIZE=5242880          # 5 MB en bytes

# ========================================
# CONFIGURACIÓN ADICIONAL (OPCIONAL)
# ========================================
# Logging
LOG_LEVEL=info                 # error | warn | info | debug
LOG_FILE=./logs/app.log

# CORS
CORS_ORIGIN=*                  # En producción: tu-dominio.com
```

#### ⚠️ CRÍTICO: frontend/js/config.js

Este archivo es **ESENCIAL** para que el frontend encuentre el backend:

```javascript
// Auto-detección de entorno
const getApiUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // GitHub Codespaces
    if (hostname.includes('github.dev')) {
        return `${window.location.protocol}//${hostname.replace('-8080', '-3000')}/api`;
    }
    
    // Localhost desarrollo
    if (port === '8080') {
        return 'http://localhost:3000/api';
    }
    
    // Producción - mismo dominio
    return '/api';  // ⚠️ Requiere proxy en nginx/apache
};

const API_URL = getApiUrl();
```

**Para Producción**: Modificar para apuntar al backend correcto:
```javascript
// Opción 1: Backend en subdominio
const API_URL = 'https://api.tu-dominio.com/api';

// Opción 2: Backend en mismo dominio (con proxy)
const API_URL = '/api';  // nginx hace proxy a localhost:3000

// Opción 3: Backend en IP específica
const API_URL = 'http://167.99.123.45:3000/api';
```

---

## 🖥️ Requerimientos de Servidor

### Especificaciones Mínimas

#### Para VPS/Cloud (DigitalOcean, AWS, Linode)

```
CPU: 1 core (2 cores recomendado)
RAM: 1 GB (2 GB recomendado)
Disco: 10 GB SSD (20 GB recomendado)
Ancho de banda: 1 TB/mes

Estimación: $5-10 USD/mes en DigitalOcean
```

#### Para Hosting Compartido (Hostinger, cPanel)

```
Node.js: Soporte v18+
MySQL: Base de datos incluida
Storage: 5 GB mínimo
Acceso SSH: Recomendado (no obligatorio)

Estimación: $3-8 USD/mes
```

### Sistema Operativo Recomendado

**Opción 1: Ubuntu Server 22.04 LTS** (Más común)
```bash
# Instalación completa
sudo apt update
sudo apt install -y nginx mysql-server nodejs npm
sudo apt install -y python3 git
```

**Opción 2: CentOS Stream 9** (Alternativa empresarial)
```bash
sudo dnf install -y nginx mysql-server nodejs npm
sudo dnf install -y python3 git
```

**Opción 3: Windows Server** (No recomendado pero posible)
- Node.js vía installer oficial
- MySQL vía XAMPP o instalador oficial
- IIS o XAMPP para servir frontend

---

## 📦 Proceso de Instalación en Servidor

### PASO 1: Preparar el Servidor

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar MySQL 8.0
sudo apt install -y mysql-server

# 4. Instalar Nginx
sudo apt install -y nginx

# 5. Instalar PM2 (gestor de procesos Node.js)
sudo npm install -g pm2

# 6. Verificar instalaciones
node --version    # Debe ser v18.x o superior
npm --version     # Debe ser v9.x o superior
mysql --version   # Debe ser 8.0.x
nginx -v          # Versión de nginx
```

### PASO 2: Configurar MySQL

```bash
# 1. Asegurar instalación MySQL
sudo mysql_secure_installation

# 2. Crear base de datos y usuario
sudo mysql -u root -p
```

```sql
-- En consola MySQL:
CREATE DATABASE gymtec_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'gymtec_user'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURO_AQUI';

GRANT ALL PRIVILEGES ON gymtec_erp.* TO 'gymtec_user'@'localhost';

FLUSH PRIVILEGES;

EXIT;
```

```bash
# 3. Importar schema
mysql -u gymtec_user -p gymtec_erp < backend/database/mysql-schema.sql

# 4. Verificar tablas creadas
mysql -u gymtec_user -p -e "USE gymtec_erp; SHOW TABLES;"
# Debe mostrar 43+ tablas
```

### PASO 3: Subir Código al Servidor

**Opción A: Git (Recomendado)**
```bash
# 1. Clonar repositorio
cd /var/www
sudo git clone https://github.com/DlHel/gymtecprueba1.git gymtec
cd gymtec

# 2. Configurar permisos
sudo chown -R $USER:$USER /var/www/gymtec
```

**Opción B: FTP/SFTP**
```bash
# Usar FileZilla o WinSCP para subir carpetas:
# - backend/
# - frontend/
# - uploads/ (crear vacío)
```

### PASO 4: Configurar Backend

```bash
cd /var/www/gymtec/backend

# 1. Copiar ejemplo de configuración
cp config.env.example config.env

# 2. Editar config.env con credenciales reales
nano config.env
```

Configuración para producción:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=gymtec_user
DB_PASSWORD=TU_PASSWORD_MYSQL
DB_NAME=gymtec_erp

PORT=3000
NODE_ENV=production

JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=10h

UPLOAD_DIR=/var/www/gymtec/uploads
MAX_FILE_SIZE=10485760
```

```bash
# 3. Instalar dependencias
npm install --production

# 4. Crear directorio de uploads
mkdir -p /var/www/gymtec/uploads
chmod 755 /var/www/gymtec/uploads

# 5. Probar inicio manual
node src/server-clean.js
# Debe iniciar sin errores en puerto 3000
```

### PASO 5: Configurar Frontend

```bash
cd /var/www/gymtec/frontend

# 1. Editar config.js para producción
nano js/config.js
```

Cambiar la función `getApiUrl()`:
```javascript
const getApiUrl = () => {
    // En producción, siempre usar proxy nginx
    return '/api';
};
const API_URL = getApiUrl();
```

### PASO 6: Configurar Nginx

```bash
# 1. Crear configuración del sitio
sudo nano /etc/nginx/sites-available/gymtec
```

Contenido:
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Frontend - archivos estáticos
    root /var/www/gymtec/frontend;
    index index.html login.html;
    
    # Logs
    access_log /var/log/nginx/gymtec-access.log;
    error_log /var/log/nginx/gymtec-error.log;
    
    # Servir archivos estáticos frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy para API backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Servir uploads
    location /uploads {
        alias /var/www/gymtec/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```bash
# 2. Habilitar sitio
sudo ln -s /etc/nginx/sites-available/gymtec /etc/nginx/sites-enabled/

# 3. Probar configuración
sudo nginx -t

# 4. Reiniciar nginx
sudo systemctl restart nginx
```

### PASO 7: Configurar PM2 (Mantener Backend Activo)

```bash
cd /var/www/gymtec/backend

# 1. Crear archivo de configuración PM2
nano ecosystem.config.js
```

Contenido:
```javascript
module.exports = {
  apps: [{
    name: 'gymtec-api',
    script: './src/server-clean.js',
    cwd: '/var/www/gymtec/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/gymtec/logs/pm2-error.log',
    out_file: '/var/www/gymtec/logs/pm2-out.log',
    log_file: '/var/www/gymtec/logs/pm2-combined.log',
    time: true
  }]
};
```

```bash
# 2. Crear directorio de logs
mkdir -p /var/www/gymtec/logs

# 3. Iniciar con PM2
pm2 start ecosystem.config.js

# 4. Guardar configuración PM2
pm2 save

# 5. Configurar inicio automático al reiniciar servidor
pm2 startup systemd
# Copiar y ejecutar el comando que muestra PM2

# 6. Verificar estado
pm2 status
pm2 logs gymtec-api --lines 50
```

### PASO 8: Configurar Firewall

```bash
# 1. Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# 2. Permitir SSH (si no está permitido)
sudo ufw allow ssh

# 3. Activar firewall
sudo ufw enable

# 4. Verificar estado
sudo ufw status
```

### PASO 9: Configurar SSL (HTTPS)

```bash
# 1. Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# 2. Obtener certificado SSL gratuito
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# 3. Renovación automática (ya configurado por certbot)
sudo certbot renew --dry-run
```

### PASO 10: Crear Usuario Administrador

```bash
cd /var/www/gymtec/backend

# Ejecutar script de creación de admin
node create-admin-user.js
```

O manualmente en MySQL:
```sql
USE gymtec_erp;

INSERT INTO Users (username, email, password_hash, role, is_active)
VALUES (
    'admin',
    'admin@tu-empresa.com',
    '$2a$10$hashed_password_aqui',  -- Usar bcrypt para generar
    'Admin',
    1
);
```

---

## 🔒 Checklist de Seguridad

- [ ] JWT_SECRET y SESSION_SECRET cambiados a valores aleatorios
- [ ] Passwords de MySQL seguros
- [ ] Firewall configurado (solo puertos 80, 443, 22)
- [ ] SSL/HTTPS activo
- [ ] Usuario MySQL sin privilegios root
- [ ] Directorio uploads con permisos correctos (755)
- [ ] config.env NO commitado en Git (.gitignore)
- [ ] PM2 configurado para restart automático
- [ ] Logs rotando (no crecen infinitamente)
- [ ] Backups de base de datos automatizados

---

## 📊 Monitoreo Post-Despliegue

### Logs a Revisar

```bash
# Logs del backend (PM2)
pm2 logs gymtec-api

# Logs de Nginx
sudo tail -f /var/log/nginx/gymtec-access.log
sudo tail -f /var/log/nginx/gymtec-error.log

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### Comandos Útiles

```bash
# Ver estado de servicios
pm2 status                    # Backend Node.js
sudo systemctl status nginx   # Servidor web
sudo systemctl status mysql   # Base de datos

# Reiniciar servicios
pm2 restart gymtec-api
sudo systemctl restart nginx
sudo systemctl restart mysql

# Ver uso de recursos
htop                          # CPU/RAM en tiempo real
df -h                         # Espacio en disco
du -sh /var/www/gymtec/*      # Tamaño por carpeta
```

---

## 🆘 Troubleshooting Común

### Problema 1: Backend no inicia
```bash
# Ver logs de PM2
pm2 logs gymtec-api --lines 100

# Causas comunes:
# - config.env mal configurado
# - MySQL no conecta
# - Puerto 3000 ocupado

# Solución:
lsof -i :3000  # Ver qué usa el puerto
```

### Problema 2: Frontend no carga
```bash
# Verificar nginx
sudo nginx -t
sudo systemctl status nginx

# Verificar permisos
ls -la /var/www/gymtec/frontend
# Debe ser readable por www-data
```

### Problema 3: Error de CORS
```javascript
// En backend/src/server-clean.js, verificar:
app.use(cors({
    origin: 'https://tu-dominio.com',  // Cambiar según tu dominio
    credentials: true
}));
```

### Problema 4: MySQL Connection Error
```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Probar conexión manual
mysql -u gymtec_user -p -h localhost gymtec_erp

# Verificar logs MySQL
sudo tail -f /var/log/mysql/error.log
```

---

## 💾 Backup y Mantenimiento

### Backup Automático de Base de Datos

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-gymtec-db.sh
```

Contenido:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/gymtec"
DB_USER="gymtec_user"
DB_PASS="TU_PASSWORD"
DB_NAME="gymtec_erp"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/gymtec_$DATE.sql.gz

# Mantener solo últimos 30 días
find $BACKUP_DIR -name "gymtec_*.sql.gz" -mtime +30 -delete
```

```bash
# Hacer ejecutable
sudo chmod +x /usr/local/bin/backup-gymtec-db.sh

# Configurar cron (backup diario a las 2 AM)
sudo crontab -e
# Agregar:
0 2 * * * /usr/local/bin/backup-gymtec-db.sh
```

### Actualizar Aplicación

```bash
cd /var/www/gymtec

# 1. Hacer backup antes de actualizar
/usr/local/bin/backup-gymtec-db.sh

# 2. Pull últimos cambios
git pull origin master

# 3. Actualizar dependencias backend
cd backend
npm install --production

# 4. Reiniciar backend
pm2 restart gymtec-api

# 5. Limpiar cache nginx (si es necesario)
sudo systemctl reload nginx
```

---

## 📈 Escalabilidad Futura

### Opción 1: Load Balancer + Múltiples Instancias

```nginx
# nginx.conf
upstream gymtec_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

location /api {
    proxy_pass http://gymtec_backend;
}
```

```javascript
// PM2 ecosystem.config.js
instances: 4,  // 4 instancias del backend
exec_mode: 'cluster'
```

### Opción 2: Separar Backend y Frontend en Servidores Distintos

```
Servidor 1 (Frontend): Nginx estático
Servidor 2 (Backend): Node.js API
Servidor 3 (DB): MySQL dedicado
```

### Opción 3: Dockerizar

```dockerfile
# Dockerfile (backend)
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
CMD ["node", "src/server-clean.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: gymtec_erp
      MYSQL_USER: gymtec_user
      MYSQL_PASSWORD: secure_pass
    volumes:
      - mysql_data:/var/lib/mysql
  
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - mysql
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./frontend:/usr/share/nginx/html
```

---

## 🎯 Checklist Final Pre-Lanzamiento

### Infraestructura
- [ ] Servidor contratado y configurado
- [ ] Dominio registrado y apuntando al servidor
- [ ] SSL/HTTPS activo
- [ ] Firewall configurado
- [ ] MySQL corriendo y optimizado

### Aplicación
- [ ] Backend desplegado y corriendo con PM2
- [ ] Frontend servido por Nginx
- [ ] config.env con valores de producción
- [ ] Usuario administrador creado
- [ ] Logs funcionando correctamente

### Seguridad
- [ ] Passwords fuertes en todos los servicios
- [ ] JWT secrets aleatorios
- [ ] CORS configurado correctamente
- [ ] Backups automatizados
- [ ] Monitoring activo

### Testing
- [ ] Login funciona
- [ ] Módulos principales accesibles
- [ ] API responde correctamente
- [ ] Fotos se suben sin error
- [ ] Reportes se generan

---

## 📞 Soporte y Recursos

### Documentación Útil
- [Node.js Deployment](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)

### Costos Estimados Mensuales

| Opción | Costo | Incluye |
|--------|-------|---------|
| Hosting Compartido | $5-10 | Node.js, MySQL, 5 GB |
| VPS Básico (DigitalOcean) | $6-12 | 1 vCPU, 1 GB RAM, 25 GB SSD |
| VPS Medio | $18-24 | 2 vCPU, 2 GB RAM, 50 GB SSD |
| Cloud AWS/GCP | $20-50 | Variable según uso |

**Recomendación**: Empezar con VPS básico ($6/mes DigitalOcean) y escalar según necesidad.

---

**Documento generado**: 17/10/2025  
**Versión**: 1.0  
**Estado**: ✅ Listo para implementación
