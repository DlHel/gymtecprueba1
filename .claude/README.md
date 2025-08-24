# Claude CLI Configuration for Gymtec ERP

Este directorio contiene la configuración completa para Claude CLI con integración del sistema @bitacora y Model Context Protocol (MCP).

## 🎯 Configuración Dual AI System

**GitHub Copilot + Claude CLI** trabajando juntos en el mismo proyecto con contexto compartido.

### Archivos de Configuración

- **`project-config.json`**: Configuración principal del proyecto para Claude CLI
- **`gymtec-mcp-server.js`**: Servidor MCP para contexto del proyecto
- **`bitacora-mcp-server.js`**: Servidor MCP para sistema @bitacora
- **`mcp-settings.json`**: Configuración de servidores MCP

## 🚀 Instalación y Configuración

### 1. Instalar Claude CLI
```bash
# Instalar Claude CLI globalmente
npm install -g @anthropic-ai/claude-cli

# Verificar instalación
claude --version
```

### 2. Configurar API Key
```bash
# Configurar tu API key de Anthropic
claude auth

# O configurar manualmente
export ANTHROPIC_API_KEY="tu-api-key-aqui"
```

### 3. Instalar Dependencias MCP
```bash
# Desde la raíz del proyecto
npm install @modelcontextprotocol/sdk

# Verificar que los servidores MCP funcionan
node .mcp/gymtec-mcp-server.js
node .mcp/bitacora-mcp-server.js
```

## 🎯 Uso del Sistema @bitacora con Claude

### Comandos @bitacora Disponibles

```bash
# Contexto completo del proyecto
claude chat --project . "@bitacora - Dame el contexto completo del proyecto"

# Patrones específicos
claude chat --project . "@bitacora api - Muéstrame los patrones de API"
claude chat --project . "@bitacora database - Información del esquema de base de datos"
claude chat --project . "@bitacora security - Estándares de seguridad"
```

### Integración con MCP

Los servidores MCP proporcionan:

1. **Contexto Automático**: Claude accede automáticamente a la documentación del proyecto
2. **Sistema @bitacora**: Referencia automática de patrones y soluciones
3. **Arquitectura del Proyecto**: Acceso completo a la estructura y tecnologías
4. **Patrones de Código**: Ejemplos y estándares establecidos

## 🛠️ Flujo de Trabajo Recomendado

### Desarrollo con Dual AI

1. **GitHub Copilot**: Para autocompletado en tiempo real en VS Code
2. **Claude CLI**: Para análisis profundo, arquitectura y resolución de problemas

### Ejemplo de Sesión

```bash
# Iniciar sesión con contexto del proyecto
claude chat --project . --config .claude/project-config.json

# Claude tendrá acceso automático a:
# - Arquitectura Node.js + Express + MySQL
# - Sistema @bitacora con todos los patrones
# - Estándares de seguridad y validación
# - Estructura de la base de datos
# - Patrones de frontend Vanilla JS
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# .env para desarrollo
PROJECT_ROOT=.
CONTEXT_LEVEL=full
BITACORA_PATH=./docs/BITACORA_PROYECTO.md
AUTO_REFERENCE=true
DEBUG_MCP=true
```

### Personalización de MCP

Puedes extender los servidores MCP en:
- `.mcp/gymtec-mcp-server.js`: Añadir nuevas herramientas de contexto
- `.mcp/bitacora-mcp-server.js`: Mejorar el sistema de referencia @bitacora

## 🎯 Beneficios del Sistema Dual

### GitHub Copilot
- ✅ Autocompletado en tiempo real
- ✅ Sugerencias contextual en el editor
- ✅ Integración nativa con VS Code
- ✅ Patrones específicos del proyecto

### Claude CLI  
- ✅ Análisis profundo de arquitectura
- ✅ Resolución de problemas complejos
- ✅ Refactoring a gran escala
- ✅ Documentación y explicaciones detalladas

### Sistema @bitacora Compartido
- ✅ Contexto consistente entre ambos AI
- ✅ Patrones y soluciones reutilizables
- ✅ Documentación automática de decisiones
- ✅ Referencia rápida de estándares del proyecto

## 🚨 Comandos Importantes

```bash
# Verificar configuración
claude config list

# Iniciar con proyecto específico
claude chat --project . --config .claude/project-config.json

# Debug de servidores MCP
DEBUG=mcp:* claude chat --project .

# Actualizar @bitacora via Claude
claude chat --project . "Actualiza @bitacora con la nueva solución de autenticación"
```

## 🔒 Archivos Protegidos

Esta configuración protege automáticamente:
- `docs/**` - Documentación del proyecto
- `.github/copilot-instructions.md` - Configuración de GitHub Copilot  
- `.mcp/**` - Configuración de Claude CLI
- `.vscode/launch.json` - Configuración de debug
- `backend/src/server.js` - Servidor principal
- `frontend/js/config.js` - Configuración del frontend

## 📚 Referencias

- [Claude CLI Documentation](https://docs.anthropic.com/claude/docs)
- [Model Context Protocol](https://github.com/modelcontextprotocol/protocol)
- [Gymtec ERP @bitacora System](../docs/BITACORA_PROYECTO.md)
- [GitHub Copilot Configuration](../.github/copilot-instructions.md)
