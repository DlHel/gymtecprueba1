# 📋 Guía de Comandos @bitacora - Sistema de Referencia Inteligente

## 🎯 ¿Qué es @bitacora?

El sistema @bitacora elimina la necesidad de revisar código constantemente. Con un simple comando, GitHub Copilot accede automáticamente a todo el contexto del proyecto.

## 🚀 Comandos Principales

### Comandos Básicos
```bash
@bitacora                    # → Contexto completo del proyecto
@bitacora help              # → Esta guía de comandos
@bitacora status            # → Estado actual del proyecto
```

### Comandos de Arquitectura
```bash
@bitacora api               # → Endpoints y patrones de API
@bitacora database          # → Esquema y relaciones de base de datos
@bitacora frontend          # → Arquitectura de Vanilla JS
@bitacora backend           # → Patrones de Express + MySQL
@bitacora authentication    # → Sistema de autenticación JWT
```

### Comandos de Desarrollo
```bash
@bitacora debug             # → Sistema de debug y logging
@bitacora security          # → Medidas de seguridad
@bitacora performance       # → Optimizaciones de rendimiento
@bitacora testing           # → Estrategias de testing
@bitacora deployment        # → Configuración de despliegue
```

### Comandos de Dominio
```bash
@bitacora tickets           # → Sistema de tickets de mantenimiento
@bitacora equipment         # → Gestión de equipos de gimnasio
@bitacora clients           # → Gestión de clientes
@bitacora users             # → Sistema de usuarios y permisos
@bitacora reports           # → Sistema de reportes
```

### Comandos de Solución de Problemas
```bash
@bitacora errors            # → Errores comunes y soluciones
@bitacora fixes             # → Reparaciones completadas
@bitacora migrations        # → Migraciones de base de datos
@bitacora troubleshooting   # → Guía de resolución de problemas
```

## 📚 Archivos de Referencia

Cuando uses @bitacora, se accede automáticamente a:

```
docs/
├── BITACORA_PROYECTO.md          # ← Archivo principal de contexto
├── architecture/
│   ├── SYSTEM_OVERVIEW.md         # ← Visión general del sistema
│   ├── DATABASE_SCHEMA.md         # ← Esquema de base de datos
│   └── API_PATTERNS.md            # ← Patrones de API
├── reference/
│   ├── QUICK_REFERENCE.md         # ← Referencia rápida
│   ├── CODING_PATTERNS.md         # ← Patrones de código
│   └── BITACORA_COMMANDS.md       # ← Esta guía
└── debug/
    ├── DEBUG_SYSTEM.md            # ← Sistema de debug
    └── ERROR_SOLUTIONS.md         # ← Soluciones a errores
```

## 💡 Ejemplos de Uso

### Ejemplo 1: Implementar nueva funcionalidad
```markdown
Usuario: "Necesito agregar autenticación por roles al endpoint de equipos @bitacora authentication"

GitHub Copilot accede automáticamente a:
- Sistema de JWT implementado
- Middleware de autenticación existente
- Patrones de autorización por roles
- Estructura de base de datos de usuarios
```

### Ejemplo 2: Resolver error de base de datos
```markdown
Usuario: "El endpoint /api/tickets no carga datos @bitacora database @bitacora troubleshooting"

GitHub Copilot accede automáticamente a:
- Esquema de tabla tickets
- Relaciones de foreign keys
- Errores comunes de MySQL
- Soluciones previamente implementadas
```

### Ejemplo 3: Implementar frontend
```markdown
Usuario: "Crear formulario de tickets con validación @bitacora frontend @bitacora tickets"

GitHub Copilot accede automáticamente a:
- Arquitectura modular de Vanilla JS
- Patrones de validación existentes
- API endpoints de tickets
- Componentes UI reutilizables
```

## 🔧 Configuración Avanzada

### Variables de Entorno para @bitacora
```env
BITACORA_ENABLED=true
BITACORA_CONTEXT_DEPTH=full
BITACORA_AUTO_REFERENCE=true
DEBUG_BITACORA=true
```

### Integración con VS Code
- **Ctrl+Shift+P** → "Copilot: Chat with @bitacora"
- **F1** → "Bitacora: Show Context"
- **Ctrl+K, Ctrl+B** → "Quick @bitacora Reference"

## 📊 Métricas de Eficiencia

### Antes de @bitacora:
- ⏱️ 5-10 minutos revisando código
- 🔄 Múltiples archivos abiertos
- ❓ Contexto perdido frecuentemente

### Con @bitacora:
- ⚡ Contexto instantáneo
- 🎯 Respuestas precisas
- 📈 Mayor productividad

## 🚨 Reglas Importantes

### ✅ SÍ usar @bitacora cuando:
- Implementas nueva funcionalidad
- Resuelves errores
- Necesitas contexto de arquitectura
- Actualizas documentación
- Haces refactoring

### ❌ NO necesitas @bitacora para:
- Cambios menores de CSS
- Correcciones de typos
- Tareas sin contexto técnico

## 🔄 Mantenimiento del Sistema

### Actualización Automática
El sistema @bitacora se actualiza automáticamente con cada cambio importante del proyecto.

### Validación de Contexto
```bash
npm run validate-bitacora    # Valida integridad del contexto
npm run update-bitacora      # Actualiza contexto manualmente
```

## 💯 Mejores Prácticas

1. **Usa @bitacora al inicio** de cada sesión de desarrollo
2. **Combina comandos** para contexto más específico
3. **Actualiza la bitácora** después de cambios importantes
4. **Usa comandos descriptivos** para mejor contexto

---

**🎉 ¡Con @bitacora, nunca más revises código manualmente!**
*GitHub Copilot + @bitacora = Desarrollo profesional sin interrupciones*
