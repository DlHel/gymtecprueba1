# Scripts de Utilidad - Gymtec ERP

Esta carpeta contiene scripts de utilidad importantes para el mantenimiento del sistema Gymtec ERP.

## 🛠️ Scripts Disponibles

### Gestión de Usuarios y Autenticación

#### `reset-admin-password.js`
**Propósito**: Resetear la contraseña del administrador del sistema

**Uso**:
```bash
cd scripts
node reset-admin-password.js
```

**Funcionalidad**:
- Resetea la contraseña del usuario administrador a un valor por defecto
- Útil cuando se olvida la contraseña de admin
- Genera hash seguro con bcrypt
- Actualiza directamente en la base de datos MySQL

#### `generate-admin-token.js` 
**Propósito**: Generar token JWT para el administrador

**Uso**:
```bash
cd scripts
node generate-admin-token.js
```

**Funcionalidad**:
- Genera un token JWT válido para el usuario administrador
- Útil para testing de APIs que requieren autenticación
- Incluye permisos completos de administrador
- Token configurable con expiración personalizada

## 🚨 Importante

### Requisitos
- Node.js instalado
- MySQL/XAMPP ejecutándose
- Archivo `backend/config.env` configurado correctamente
- Dependencias del proyecto instaladas (`npm install`)

### Seguridad
- Estos scripts tienen acceso directo a la base de datos
- Solo ejecutar en entorno de desarrollo o con backups
- No usar en producción sin supervisión
- Los tokens generados tienen permisos completos de admin

### Ejecución
```bash
# Desde la raíz del proyecto
cd scripts

# Instalar dependencias si es necesario
npm install

# Ejecutar script específico
node reset-admin-password.js
node generate-admin-token.js
```

## 📚 Referencias

- **Documentación del Proyecto**: `../docs/BITACORA_PROYECTO.md`
- **Sistema @bitacora**: `../docs/COMO_USAR_BITACORA.md`
- **Configuración**: `../backend/config.env.example`
- **API Backend**: `../backend/src/server.js`

## 🔄 Mantenimiento

Esta carpeta forma parte del sistema refactorizado y normalizado del proyecto. Los scripts aquí contenidos son utilidades esenciales que se mantienen separadas del código principal para mejor organización.

**Última actualización**: Agosto 2025 - Refactor completo del proyecto
