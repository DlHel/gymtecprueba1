# Copilot Instructions - Gymtec ERP 2025
## Mejores Prácticas y Estándares de Desarrollo

### 🔧 Arquitectura del Proyecto

**Stack Tecnológico 2025:**
- **Backend:** Node.js 18+ con Express.js 4.21.2
- **Base de Datos:** MySQL 8.0+ con MySQL2 3.14.3
- **Seguridad:** Helmet 7.2.0, express-rate-limit 7.4.1
- **Logging:** Winston 3.17.0 con logs estructurados
- **Testing:** Jest 29.7.0 con Supertest 6.3.4
- **Frontend:** HTML5, CSS3, Tailwind CSS, JavaScript ES6+

**Principios Arquitectónicos:**
- Arquitectura modular con separación de responsabilidades
- Patrón MVC con controladores específicos por módulo
- Middleware de seguridad en capas
- Logging estructurado y monitoreo de performance
- Rate limiting por tipo de operación

### 🛡️ Seguridad Enterprise 2025

**Headers de Seguridad (Helmet):**
```javascript
helmet({
    frameguard: { action: 'deny' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})
```

**Rate Limiting Estratificado:**
- **General:** 100 requests/15min
- **Autenticación:** 5 intentos/15min
- **Uploads:** 10 archivos/15min
- **Detección de actividad sospechosa automática**

**Autenticación y Autorización:**
- JWT con expiración de 24 horas
- Roles: admin, manager, technician
- Middleware de verificación por ruta
- Logout con invalidación de tokens

### 📊 Logging y Monitoreo

**Winston Configuration:**
```javascript
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { 
        service: 'gymtec-erp',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});
```

**Performance Monitoring:**
- Tracking de respuestas lentas (>1000ms)
- Métricas de uso de memoria
- Conteo de requests por endpoint
- Alertas automáticas para errores críticos

### 🗄️ Base de Datos

**Mejores Prácticas MySQL:**
- Pool de conexiones con `mysql2/promise`
- Transacciones para operaciones críticas
- Índices optimizados en campos de búsqueda frecuente
- Soft deletes con campo `activo`
- Timestamps automáticos (`created_at`, `updated_at`)

**Queries Seguras:**
```javascript
// ✅ CORRECTO - Parámetros preparados
const results = await db.query(
    'SELECT * FROM Equipment WHERE location_id = ? AND activo = 1',
    [locationId]
);

// ❌ INCORRECTO - Concatenación directa
const results = await db.query(
    `SELECT * FROM Equipment WHERE location_id = ${locationId}`
);
```

### 🧪 Testing Strategy

**Unit Tests con Jest:**
- **Cobertura mínima:** 80%
- **Tipos de pruebas:** Unitarias, Integración, E2E
- **Mocking:** Base de datos, servicios externos, middleware
- **CI/CD:** Pruebas automáticas en cada commit

**Testing Patterns:**
```javascript
describe('Authentication Controller', () => {
    beforeEach(() => {
        // Setup test environment
    });
    
    test('should authenticate valid user', async () => {
        // Arrange, Act, Assert pattern
    });
    
    afterEach(() => {
        // Cleanup
    });
});
```

### 🚀 DevOps y Deployment

**Environment Configuration:**
```bash
# .env.production
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=gymtec_user
DB_PASSWORD=secure_password
DB_NAME=gymtec_erp
JWT_SECRET=ultra_secure_secret_key_2025
LOG_LEVEL=warn
```

**Scripts de Deployment:**
- `npm run build` - Build optimizado
- `npm run test:ci` - Suite completa de tests
- `npm run start:prod` - Inicio en producción
- `npm run health:check` - Verificación de salud

### 📁 Estructura de Archivos

```
backend/
├── src/
│   ├── controllers/      # Lógica de negocio
│   ├── middleware/       # Middleware personalizado
│   ├── routes/          # Definición de rutas
│   ├── models/          # Modelos de datos
│   ├── utils/           # Utilidades compartidas
│   └── config/          # Configuraciones
├── tests/               # Pruebas unitarias
├── logs/               # Archivos de log
├── uploads/            # Archivos subidos
└── database/           # Scripts SQL
```

### 🔍 Code Quality Standards

**ESLint Rules:**
- Indentación: 4 espacios
- Línea máxima: 100 caracteres
- Semicolons obligatorios
- Camel case para variables
- Pascal case para clases

**Naming Conventions:**
- **Variables:** `userName`, `isActive`
- **Funciones:** `getUserById()`, `validateInput()`
- **Constantes:** `MAX_FILE_SIZE`, `API_BASE_URL`
- **Archivos:** `user-controller.js`, `auth-middleware.js`

### 🐛 Error Handling

**Error Response Format:**
```javascript
{
    error: "Descriptive error message",
    code: "ERROR_CODE",
    timestamp: "2025-09-11T01:30:00.000Z",
    details: { /* Additional context */ }
}
```

**HTTP Status Codes:**
- **200:** Success
- **201:** Created
- **400:** Bad Request (validation errors)
- **401:** Unauthorized (no token)
- **403:** Forbidden (invalid token/permissions)
- **404:** Not Found
- **429:** Too Many Requests (rate limited)
- **500:** Internal Server Error

### 📚 API Documentation

**Endpoint Naming:**
- **GET /api/clients** - Listar clientes
- **GET /api/clients/:id** - Obtener cliente específico
- **POST /api/clients** - Crear cliente
- **PUT /api/clients/:id** - Actualizar cliente
- **DELETE /api/clients/:id** - Eliminar cliente

**Request/Response Examples:**
```javascript
// POST /api/clients
{
    "name": "Gimnasio Elite",
    "email": "contacto@elite.com",
    "phone": "555-0123",
    "address": "Av. Principal 123"
}

// Response 201
{
    "message": "Cliente creado exitosamente",
    "data": {
        "id": 123,
        "name": "Gimnasio Elite",
        "created_at": "2025-09-11T01:30:00.000Z"
    }
}
```

### 🔧 Development Workflow

**Git Workflow:**
1. Feature branches: `feature/ticket-management`
2. Commits descriptivos: `feat: add ticket status validation`
3. Pull requests con review obligatorio
4. Testing automático antes de merge
5. Deploy automático a staging

**Code Review Checklist:**
- [ ] Seguridad validada
- [ ] Tests incluidos
- [ ] Documentación actualizada
- [ ] Performance considerado
- [ ] Error handling implementado

### 📈 Performance Optimization

**Database Optimization:**
- Índices en campos de búsqueda
- Paginación en listados largos
- Cache de queries frecuentes
- Connection pooling optimizado

**Response Optimization:**
- Compresión gzip habilitada
- Headers de caché apropiados
- Minificación de assets
- CDN para recursos estáticos

### 🚨 Alerts y Monitoring

**Critical Alerts:**
- CPU > 80% por 5 minutos
- Memoria > 90% por 2 minutos
- Respuestas 5xx > 10 en 1 minuto
- Database connection failures

**Business Metrics:**
- Tickets creados por día
- Tiempo promedio de resolución
- Equipos en mantenimiento
- Utilización del sistema

---

## ⚡ Quick Commands Reference

```bash
# Development
npm run dev                    # Iniciar desarrollo
npm run test                   # Ejecutar tests
npm run test:coverage          # Coverage report
npm run lint                   # Verificar code quality

# Production
npm run build                  # Build para producción
npm run start                  # Iniciar servidor
npm run health                 # Health check

# Database
npm run db:migrate            # Ejecutar migraciones
npm run db:seed               # Insertar datos de prueba
npm run db:backup             # Backup de base de datos
```

---

**Última actualización:** 2025-09-11  
**Versión:** 2.0.0  
**Maintainer:** Gymtec Development Team
