# 🚀 Scripts de Arranque - Gymtec ERP

Este directorio contiene scripts automatizados para iniciar y detener los servidores del sistema Gymtec ERP.

## 📋 Archivos Disponibles

### Scripts de Inicio
- **`start-servers.bat`** - Script de Windows Batch (recomendado)
- **`start-servers.ps1`** - Script de PowerShell (alternativo)

### Scripts de Detención
- **`stop-servers.bat`** - Detiene todos los servidores

## 🎯 Uso Rápido

### Opción 1: Batch Script (Recomendado)
```bash
# Doble clic en el archivo o ejecutar desde terminal:
start-servers.bat
```

### Opción 2: PowerShell Script
```powershell
# Desde PowerShell:
.\start-servers.ps1
```

### Detener Servidores
```bash
# Doble clic en el archivo o ejecutar desde terminal:
stop-servers.bat
```

## 🔧 Lo que hacen los scripts

### `start-servers.bat` / `start-servers.ps1`
1. **Inicia el Backend** (Node.js) en `http://localhost:3000`
   - Se ejecuta desde la carpeta `backend/`
   - Comando: `npm start`

2. **Inicia el Frontend** (Python) en `http://localhost:8080`
   - Se ejecuta desde la carpeta `frontend/`
   - Comando: `python -m http.server 8080`

3. **Abre ventanas separadas** para cada servidor
4. **Muestra las URLs** de acceso

### `stop-servers.bat`
- Detiene todos los procesos de Node.js y Python
- Limpia los puertos 3000 y 8080

## 🌐 URLs de Acceso

Una vez iniciados los servidores:

- **Backend API:** http://localhost:3000
- **Frontend Web:** http://localhost:8080
- **Página Principal:** http://localhost:8080/index.html
- **Gestión de Clientes:** http://localhost:8080/clientes.html
- **Modelos de Equipos:** http://localhost:8080/modelos.html
- **Tickets:** http://localhost:8080/tickets.html

## ⚠️ Requisitos

- **Node.js** instalado (para el backend)
- **Python** instalado (para el frontend)
- **npm** configurado (package.json en carpeta backend)

## 🐛 Solución de Problemas

### Error: "Puerto en uso"
```bash
# Ejecutar el script de detención primero:
stop-servers.bat
# Luego reiniciar:
start-servers.bat
```

### Error: "npm no encontrado"
- Verificar que Node.js esté instalado
- Verificar que estés en el directorio correcto del proyecto

### Error: "python no encontrado"
- Verificar que Python esté instalado
- En algunos sistemas usar `python3` en lugar de `python`

## 📝 Notas

- Los scripts abren ventanas separadas para cada servidor
- Puedes cerrar las ventanas individualmente para detener cada servidor
- El script de detención cierra todos los procesos de Node.js y Python del sistema 