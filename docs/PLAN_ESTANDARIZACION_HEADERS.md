# 📋 PLAN: Estandarización de Headers en Todos los Módulos

**Objetivo**: Aplicar el diseño profesional del header de notificaciones a todos los módulos del sistema.

---

## 🎨 Diseño Base (notifications-dashboard.html)

```html
<header class="header-gradient shadow-lg border-b border-gray-200/20">
    <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
            <!-- Izquierda: Menú móvil + Icono + Título -->
            <div class="flex items-center space-x-4">
                <button id="mobile-sidebar-toggle">...</button>
                <div class="w-12 h-12 bg-white/10">
                    <i data-lucide="icon"></i>
                </div>
                <div>
                    <h1 class="text-2xl text-white">Título</h1>
                    <p class="text-slate-200 text-sm">Subtítulo</p>
                </div>
            </div>
            
            <!-- Derecha: Info usuario -->
            <div id="user-info"></div>
        </div>
    </div>
</header>
```

---

## 📦 Configuración por Módulo

| Módulo | Icono Lucide | Título | Subtítulo |
|--------|--------------|---------|-----------|
| **index.html** | `layout-dashboard` | Dashboard Principal | Centro de control y monitoreo |
| **clientes.html** | `users` | Gestión de Clientes | Administración de clientes y ubicaciones |
| **equipos.html** | `monitor` | Gestión de Equipos | Control de maquinaria y equipamiento |
| **equipo.html** | `monitor` | Detalle de Equipo | Información y mantenimiento |
| **tickets.html** | `ticket` | Gestión de Tickets | Órdenes de servicio y soporte |
| **ticket-detail.html** | `file-text` | Detalle de Ticket | Seguimiento de orden de servicio |
| **planificador.html** | `calendar` | Planificador | Calendario de mantenimientos |
| **contratos.html** | `file-signature` | Gestión de Contratos | Contratos y acuerdos de nivel de servicio |
| **inventario.html** | `package` | Inventario | Control de stock y repuestos |
| **modelos.html** | `wrench` | Modelos de Equipos | Catálogo de especificaciones técnicas |
| **finanzas.html** | `dollar-sign` | Finanzas | Gestión financiera y contabilidad |
| **personal.html** | `user-check` | Personal | Gestión de recursos humanos |
| **asistencia.html** | `clock` | Control de Asistencia | Registro de horarios y asistencias |
| **reportes.html** | `bar-chart-2` | Reportes | Análisis y estadísticas del sistema |
| **configuracion.html** | `settings` | Configuración | Ajustes y parámetros del sistema |
| **notifications-dashboard.html** | `bell` | Centro de Notificaciones | Sistema de gestión empresarial |

---

## ✅ Checklist de Implementación

### Paso 1: Agregar Estilos CSS Globales
- [ ] Agregar `.header-gradient` a css/style.css
- [ ] Verificar que Tailwind CSS esté cargado en todas las páginas
- [ ] Agregar Lucide icons si falta

### Paso 2: Actualizar Cada Página
Para cada página:
- [ ] Localizar el `<header>` actual
- [ ] Reemplazar con el nuevo diseño
- [ ] Configurar icono, título y subtítulo apropiados
- [ ] Asegurar que `<div id="user-info"></div>` exista
- [ ] Mantener el id `mobile-sidebar-toggle`

### Paso 3: Verificar Funcionalidad
- [ ] nav-loader.js debe cargar el user-info
- [ ] Menú móvil debe funcionar
- [ ] Dropdown de usuario debe aparecer
- [ ] Logout debe funcionar
- [ ] Responsive en mobile/tablet/desktop

---

## 🔧 Implementación Técnica

### Script de Actualización Automática

Crear un script Node.js que:
1. Lee cada archivo HTML
2. Encuentra el header actual
3. Lo reemplaza con el nuevo template
4. Aplica la configuración específica del módulo
5. Guarda el archivo actualizado

### Archivos a Modificar (14 páginas):

1. ✅ index.html
2. ✅ clientes.html
3. ✅ equipos.html
4. ✅ equipo.html
5. ✅ tickets.html
6. ✅ ticket-detail.html
7. ✅ planificador.html
8. ✅ contratos.html
9. ✅ inventario.html
10. ✅ modelos.html
11. ✅ finanzas.html
12. ✅ personal.html
13. ✅ asistencia.html
14. ✅ reportes.html
15. ✅ configuracion.html

---

## 🎯 Beneficios

1. **Consistencia Visual**
   - Todas las páginas tienen el mismo look & feel
   - Experiencia de usuario unificada

2. **Profesionalismo**
   - Diseño moderno y corporativo
   - Headers elegantes con gradientes

3. **Identidad Clara**
   - Cada módulo tiene su ícono distintivo
   - Fácil identificación visual

4. **Información Contextual**
   - Título grande y claro
   - Subtítulo descriptivo
   - Usuario siempre visible

5. **Responsive**
   - Funciona en móvil, tablet y desktop
   - Menú hamburguesa en mobile

---

## ⚠️ Consideraciones

1. **Backup**
   - Crear backup antes de modificar
   - `BACKUP_PRE_HEADERS_[DATE]`

2. **Testing**
   - Probar cada página después de actualizar
   - Verificar mobile/desktop
   - Comprobar logout y menú

3. **Gradual**
   - Actualizar página por página
   - Commit después de cada cambio
   - Fácil rollback si hay problemas

---

## 📝 Ejemplo de Código Final

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Dashboard - Gymtec ERP</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div class="flex h-screen">
        <div id="menu-placeholder"></div>
        
        <div class="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <!-- NUEVO HEADER PROFESIONAL -->
            <header class="header-gradient shadow-lg border-b border-gray-200/20">
                <div class="max-w-7xl mx-auto px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <button id="mobile-sidebar-toggle" class="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                                </svg>
                            </button>
                            
                            <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-white/10">
                                <i data-lucide="layout-dashboard" class="w-6 h-6 text-white"></i>
                            </div>
                            
                            <div>
                                <h1 class="text-2xl font-bold text-white tracking-tight">Dashboard Principal</h1>
                                <p class="text-slate-200 text-sm font-medium">Centro de control y monitoreo</p>
                            </div>
                        </div>
                        
                        <div id="user-info" class="user-info"></div>
                    </div>
                </div>
            </header>
            
            <main class="flex-1 overflow-y-auto p-6">
                <!-- Contenido aquí -->
            </main>
        </div>
    </div>
    
    <script src="js/config.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/permissions.js"></script>
    <script src="js/nav-loader.js"></script>
    <script>lucide.createIcons();</script>
</body>
</html>
```

---

## ✅ Siguiente Paso

¿Quieres que proceda a actualizar todas las páginas automáticamente?

Opciones:
1. **Automático**: Script que actualiza todas las páginas (rápido, 5 min)
2. **Manual**: Te muestro cómo hacerlo página por página (lento, pero más control)
3. **Una por una**: Actualizamos juntos cada módulo (medio, ~30 min)

Recomiendo la opción 1 (automático) con backup previo.
