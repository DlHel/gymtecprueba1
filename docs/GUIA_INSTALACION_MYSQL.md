# 🚀 GUÍA COMPLETA: INSTALACIÓN MYSQL PARA GYMTEC ERP

## 📋 ÍNDICE
1. [Desarrollo Local - XAMPP](#desarrollo-local---xampp)
2. [Configuración Inicial](#configuración-inicial)
3. [Migración de Datos](#migración-de-datos)
4. [Hosting/Producción](#hostingproducción)
5. [Hostings Recomendados](#hostings-recomendados)
6. [Troubleshooting](#troubleshooting)

---

## 🏠 DESARROLLO LOCAL - XAMPP

### PASO 1: Instalar XAMPP
1. **Descargar**: https://www.apachefriends.org/download.html
2. **Instalar**: 
   - Ejecutar como administrador
   - Seleccionar: ✅ Apache ✅ MySQL ✅ phpMyAdmin
   - Instalar en: `C:\xampp`

### PASO 2: Iniciar MySQL
1. Abrir **XAMPP Control Panel**
2. Click **Start** junto a MySQL
3. Debe aparecer resaltado en verde
4. Verificar en: http://localhost/phpmyadmin

### PASO 3: Ejecutar Setup Automático
```bash
# Desde la carpeta raíz del proyecto:
.\start-dev-mysql.bat
```

**¿Qué hace este script?**
- ✅ Verifica XAMPP instalado
- ✅ Verifica MySQL ejecutándose  
- ✅ Instala dependencias npm
- ✅ Crea base de datos automáticamente
- ✅ Ejecuta todas las tablas
- ✅ Inicia backend y frontend

---

## ⚙️ CONFIGURACIÓN INICIAL

### Archivo de Configuración Local
El archivo `backend/config.env` ya está configurado para XAMPP:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gymtec_erp
```

### Comandos Disponibles
```bash
cd backend

# Configurar MySQL automáticamente
npm run setup-mysql

# Migrar datos desde SQLite
npm run migrate

# Poblar modelos de equipos
npm run seed-models

# Iniciar servidor
npm start
```

---

## 📦 MIGRACIÓN DE DATOS

Si tienes datos en SQLite y quieres migrarlos:

```bash
cd backend
npm run migrate
```

Este comando:
- ✅ Lee todos los datos de SQLite
- ✅ Los inserta en MySQL
- ✅ Preserva relaciones e IDs
- ✅ Maneja duplicados automáticamente

---

## 🌐 HOSTING/PRODUCCIÓN

### Hostings Compatibles Recomendados

#### 🥇 **HOSTINGER** (Recomendado)
- **Precio**: $2.99/mes
- **MySQL**: Ilimitado
- **Node.js**: ✅ Soporte nativo
- **Fácil**: Panel hPanel muy intuitivo
- **Configuración**: Variables de entorno simples

#### 🥈 **HEROKU**
- **Precio**: Desde gratis
- **MySQL**: Add-on ClearDB o JawsDB
- **Node.js**: ✅ Soporte nativo
- **Deploy**: Git push automático

#### 🥉 **DIGITALOCEAN APP PLATFORM**
- **Precio**: $5/mes
- **MySQL**: Database as a Service
- **Node.js**: ✅ Soporte completo
- **Escalable**: Recursos ajustables

### Configuración para Hosting

1. **Copia el archivo de ejemplo**:
   ```bash
   cp backend/config.env.production.example backend/config.env
   ```

2. **Edita con los datos de tu hosting**:
   ```env
   DB_HOST=tu-servidor-mysql.hosting.com
   DB_USER=tu_usuario_mysql
   DB_PASSWORD=tu_password_mysql
   DB_NAME=tu_base_datos
   ```

3. **Crear base de datos en hosting**:
   - Accede al panel de control de tu hosting
   - Crea una base de datos MySQL
   - Ejecuta el contenido de `backend/database/mysql-schema.sql`

### Script de Deploy Automático

```bash
# Crear base de datos en hosting
mysql -h tu-host -u tu-usuario -p tu_base_datos < backend/database/mysql-schema.sql

# Poblar modelos (opcional)
node backend/seed-models.js
```

---

## 🔧 TROUBLESHOOTING

### ❌ "ECONNREFUSED localhost:3306"
**Solución**:
```bash
# Verificar que MySQL esté ejecutándose
netstat -an | find "3306"

# Si no aparece, iniciar MySQL en XAMPP Control Panel
```

### ❌ "Access denied for user 'root'"
**Solución**:
```bash
# En phpMyAdmin, ir a "Cuentas de usuario"
# Cambiar password de root o crear usuario nuevo
```

### ❌ "Table doesn't exist" 
**Solución**:
```bash
cd backend
npm run setup-mysql
```

### ❌ Error en hosting "CONNECTION_LIMIT"
**Solución**:
```javascript
// En mysql-database.js, ajustar:
connectionLimit: 5  // Reducir límite
acquireTimeout: 60000  // Aumentar timeout
```

---

## 🎯 CHECKLIST FINAL

### Desarrollo Local ✅
- [ ] XAMPP instalado
- [ ] MySQL ejecutándose (puerto 3306)
- [ ] Base de datos creada automáticamente
- [ ] Frontend: http://localhost:8080
- [ ] Backend: http://localhost:3000
- [ ] phpMyAdmin: http://localhost/phpmyadmin

### Producción ✅
- [ ] Hosting con MySQL seleccionado
- [ ] Base de datos creada en hosting
- [ ] config.env configurado con datos del hosting
- [ ] Esquema ejecutado en servidor
- [ ] Variables de entorno configuradas
- [ ] SSL/HTTPS configurado (recomendado)

---

## 📞 SOPORTE

Si tienes problemas:
1. Verifica que los puertos estén libres: `netstat -an | find "3306"`
2. Revisa logs del servidor: `cd backend && npm start`
3. Verifica configuración: `cat backend/config.env`
4. Prueba conexión manual: http://localhost/phpmyadmin

**¡Listo para usar! 🎉** 