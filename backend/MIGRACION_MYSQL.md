# 🔄 Migración de SQLite a MySQL - Gymtec ERP

## 📋 Resumen de Cambios

Este proyecto ha sido migrado de **SQLite** a **MySQL** para mejorar el rendimiento, escalabilidad y características empresariales.

### ✅ Cambios Implementados

1. **Nueva arquitectura de base de datos**:
   - Driver: `mysql2` (reemplaza `sqlite3`)
   - Pool de conexiones para mejor rendimiento
   - Soporte para variables de entorno

2. **Archivos modificados**:
   - ✅ `src/mysql-database.js` - Nueva configuración MySQL
   - ✅ `src/db-adapter.js` - Adaptador de compatibilidad
   - ✅ `src/server.js` - Actualizado para usar MySQL
   - ✅ `database/mysql-schema.sql` - Esquema adaptado para MySQL
   - ✅ `migrate-to-mysql.js` - Script de migración de datos
   - ✅ `package.json` - Dependencias actualizadas

3. **Mejoras implementadas**:
   - **Índices optimizados** para mejor rendimiento
   - **Restricciones ENUM** para campos status/priority
   - **Timestamps automáticos** (created_at, updated_at)
   - **Charset UTF8MB4** para soporte completo Unicode
   - **Foreign Keys con CASCADE** para integridad referencial

## 🚀 Pasos para Completar la Migración

### 1. Instalar MySQL Server

**Windows:**
```bash
# Opción 1: MySQL Installer
# Descargar desde: https://dev.mysql.com/downloads/installer/

# Opción 2: Con Chocolatey
choco install mysql

# Opción 3: Con XAMPP/WAMP (incluye MySQL)
```

**Configuración recomendada:**
- Puerto: 3306 (por defecto)
- Usuario: root
- Contraseña: (establecer una segura)

### 2. Configurar Variables de Entorno

Crear archivo `.env` en la carpeta `backend/`:

```env
# Configuración MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=gymtec_erp

# Configuración del servidor
PORT=3000
NODE_ENV=development
```

### 3. Verificar Instalación

```bash
# Probar conexión MySQL
mysql -u root -p

# Crear base de datos manualmente (opcional)
CREATE DATABASE gymtec_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Ejecutar Migración

```bash
# Navegar al directorio backend
cd backend

# Ejecutar migración automática
npm run migrate
```

### 5. Verificar Migración

```bash
# Iniciar servidor
npm start

# El servidor debería mostrar:
# ✅ Base de datos 'gymtec_erp' verificada/creada
# ✅ Esquema MySQL ejecutado correctamente
# 🚀 Base de datos MySQL inicializada correctamente
```

## 🔧 Comandos Disponibles

```bash
# Ejecutar migración de datos
npm run migrate

# Poblar base de datos con modelos de equipos
npm run seed-models

# Iniciar servidor (modo desarrollo)
npm run dev

# Iniciar servidor (modo producción)
npm start
```

## 📊 Comparación de Características

| Característica | SQLite | MySQL |
|---------------|--------|-------|
| **Tipo** | Archivo local | Servidor de BD |
| **Concurrencia** | Limitada | Excelente |
| **Rendimiento** | Básico | Alto |
| **Escalabilidad** | Limitada | Alta |
| **Backup** | Copia archivo | Herramientas avanzadas |
| **Replicación** | No | Sí |
| **Transacciones** | Básicas | Avanzadas |
| **Índices** | Limitados | Completos |

## 🛠️ Solución de Problemas

### Error: "Access denied for user"
```bash
# Verificar credenciales en .env
# Resetear password MySQL si es necesario
mysqladmin -u root password nueva_password
```

### Error: "Connection refused"
```bash
# Verificar que MySQL esté ejecutándose
# Windows:
net start mysql80

# Verificar puerto
netstat -an | findstr 3306
```

### Error: "Database does not exist"
```bash
# El script crea la BD automáticamente
# Si falla, crear manualmente:
mysql -u root -p -e "CREATE DATABASE gymtec_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Migración no encuentra datos
- Es normal si es una instalación nueva
- El sistema funcionará con BD vacía
- Use `npm run seed-models` para poblar modelos

## 🔍 Verificación Post-Migración

1. **Verificar tablas creadas**:
```sql
USE gymtec_erp;
SHOW TABLES;
-- Debería mostrar: Clients, Locations, Equipment, etc.
```

2. **Verificar datos migrados**:
```sql
SELECT COUNT(*) FROM Clients;
SELECT COUNT(*) FROM Equipment;
SELECT COUNT(*) FROM EquipmentModels;
```

3. **Probar API desde navegador**:
- http://localhost:3000/api/clients
- http://localhost:3000/api/models

## 🎯 Próximos Pasos Recomendados

1. **Configurar backups automáticos** de MySQL
2. **Implementar pooling avanzado** para producción
3. **Optimizar queries** con índices específicos
4. **Configurar replicación** para alta disponibilidad
5. **Implementar monitoreo** de rendimiento

## 📚 Recursos Adicionales

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [MySQL2 Node.js Driver](https://github.com/sidorares/node-mysql2)
- [MySQL Workbench](https://www.mysql.com/products/workbench/) - GUI para administración

---

**Nota**: Este documento debe mantenerse actualizado conforme evolucione la configuración de la base de datos. 