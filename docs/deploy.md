# 🚀 Guía de Despliegue - Gymtec ERP

## 📋 Checklist Pre-Despliegue

### ✅ Verificaciones Técnicas
- [x] Puerto dinámico configurado (`process.env.PORT`)
- [x] Variables de entorno preparadas
- [x] Base de datos MySQL configurada
- [x] Sistema de archivos preparado
- [x] CORS configurado
- [x] Frontend con detección automática de entorno

## 🏗️ Opciones de Hosting

### 1. HOSTINGER (Recomendado para principiantes)

**Pasos:**
1. Comprar hosting con Node.js support
2. Crear base de datos MySQL en cPanel
3. Subir archivos via FileManager o Git
4. Configurar variables de entorno
5. Instalar dependencias: `npm install`
6. Iniciar aplicación: `npm start`

**Configuración:**
```bash
# En el hosting, crear config.env:
DB_HOST=localhost
DB_USER=tu_usuario_bd
DB_PASSWORD=tu_password_bd
DB_NAME=tu_base_datos
PORT=3000
NODE_ENV=production
```

### 2. VERCEL (Recomendado para proyectos modernos)

**Pasos:**
1. Conectar repositorio GitHub a Vercel
2. Configurar build settings:
   - Build Command: `cd backend && npm install`
   - Output Directory: `backend`
   - Start Command: `node src/server.js`

**Variables de entorno en Vercel:**
```
DB_HOST=tu-mysql-host
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_NAME=tu-database
NODE_ENV=production
```

### 3. RAILWAY

**Pasos:**
1. Crear cuenta en Railway
2. Conectar repositorio GitHub
3. Agregar servicio MySQL
4. Configurar variables de entorno automáticamente

## 📁 Estructura de Archivos para Deploy

```
gymtecprueba1/
├── backend/
│   ├── src/server.js (✅ Listo para producción)
│   ├── config.env (configurar con datos del hosting)
│   ├── package.json (✅ Dependencias correctas)
│   └── database/mysql-schema.sql (✅ Para crear BD)
├── frontend/ (✅ Archivos estáticos listos)
└── uploads/ (crear en hosting)
```

## 🗄️ Configuración de Base de Datos

### Crear base de datos en hosting:
```sql
-- 1. Crear base de datos
CREATE DATABASE gymtec_erp;

-- 2. Importar esquema
SOURCE mysql-schema.sql;

-- 3. Verificar tablas creadas
SHOW TABLES;
```

## 🌐 Configuración de Dominio

### Apuntar dominio al hosting:
1. **A Record**: `@` → IP del servidor
2. **CNAME**: `www` → dominio principal
3. **SSL**: Activar certificado automático

## ⚙️ Variables de Entorno Requeridas

```env
# Base de datos (OBLIGATORIO)
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=gymtec_erp

# Servidor (OBLIGATORIO)
PORT=3000
NODE_ENV=production

# Archivos (OPCIONAL)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# CORS (RECOMENDADO)
CORS_ORIGIN=https://tu-dominio.com
```

## 🚨 Problemas Comunes y Soluciones

### Error: "Port already in use"
```bash
# Solución: El hosting asigna puerto automáticamente
# Ya está corregido con process.env.PORT
```

### Error: "Database connection failed"
```bash
# Verificar:
1. Credenciales de BD correctas
2. BD creada en el hosting
3. Esquema SQL importado
4. Firewall del hosting permite conexiones
```

### Error: "CORS policy"
```bash
# Agregar dominio del frontend a CORS
# Ya está preparado en config.env.production.example
```

## 🎯 Testing Post-Deploy

### URLs a verificar:
- `https://tu-dominio.com` → Frontend
- `https://tu-dominio.com/api/health` → Backend status
- `https://tu-dominio.com/clientes.html` → Módulo clientes
- `https://tu-dominio.com/tickets.html` → Sistema de tickets

### APIs críticas:
```bash
GET /api/clients → Lista de clientes
GET /api/tickets → Lista de tickets
POST /api/tickets/notes → Crear nota
GET /api/equipment → Lista de equipos
```

## 📊 Monitoreo Post-Deploy

### Logs importantes:
- Conexión a BD exitosa
- Puerto asignado correctamente
- APIs respondiendo
- Archivos estáticos servidos

### Métricas a monitorear:
- Tiempo de respuesta API
- Uso de base de datos
- Espacio en disco (uploads/)
- Memoria del servidor

## 🔐 Seguridad en Producción

### Checklist de seguridad:
- [x] Variables de entorno seguras
- [x] CORS configurado
- [x] HTTPS activado
- [x] Base de datos con credenciales fuertes
- [ ] Rate limiting (recomendado agregar)
- [ ] Input validation (ya implementado)

## 📈 Optimizaciones Futuras

### Performance:
- CDN para archivos estáticos
- Compresión Gzip
- Cache de consultas BD
- Optimización de imágenes

### Escalabilidad:
- Load balancer
- Multiple instancias
- Base de datos replicada
- Queue system para uploads
