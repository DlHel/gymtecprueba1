/**
 * Script para actualizar headers en todos los módulos
 * Aplica el diseño profesional de notifications-dashboard.html
 */

const fs = require('fs');
const path = require('path');

// Configuración de cada módulo
const moduleConfig = {
    'index.html': {
        icon: 'layout-dashboard',
        title: 'Dashboard Principal',
        subtitle: 'Centro de control y monitoreo'
    },
    'clientes.html': {
        icon: 'users',
        title: 'Gestión de Clientes',
        subtitle: 'Administración de clientes y ubicaciones'
    },
    'equipos.html': {
        icon: 'monitor',
        title: 'Gestión de Equipos',
        subtitle: 'Control de maquinaria y equipamiento'
    },
    'equipo.html': {
        icon: 'monitor',
        title: 'Detalle de Equipo',
        subtitle: 'Información y mantenimiento'
    },
    'tickets.html': {
        icon: 'ticket',
        title: 'Gestión de Tickets',
        subtitle: 'Órdenes de servicio y soporte'
    },
    'ticket-detail.html': {
        icon: 'file-text',
        title: 'Detalle de Ticket',
        subtitle: 'Seguimiento de orden de servicio'
    },
    'planificador.html': {
        icon: 'calendar',
        title: 'Planificador',
        subtitle: 'Calendario de mantenimientos'
    },
    'contratos.html': {
        icon: 'file-signature',
        title: 'Gestión de Contratos',
        subtitle: 'Contratos y acuerdos de nivel de servicio'
    },
    'inventario.html': {
        icon: 'package',
        title: 'Inventario',
        subtitle: 'Control de stock y repuestos'
    },
    'modelos.html': {
        icon: 'wrench',
        title: 'Modelos de Equipos',
        subtitle: 'Catálogo de especificaciones técnicas'
    },
    'finanzas.html': {
        icon: 'dollar-sign',
        title: 'Finanzas',
        subtitle: 'Gestión financiera y contabilidad'
    },
    'personal.html': {
        icon: 'user-check',
        title: 'Personal',
        subtitle: 'Gestión de recursos humanos'
    },
    'asistencia.html': {
        icon: 'clock',
        title: 'Control de Asistencia',
        subtitle: 'Registro de horarios y asistencias'
    },
    'reportes.html': {
        icon: 'bar-chart-2',
        title: 'Reportes',
        subtitle: 'Análisis y estadísticas del sistema'
    },
    'configuracion.html': {
        icon: 'settings',
        title: 'Configuración',
        subtitle: 'Ajustes y parámetros del sistema'
    }
};

// Template del nuevo header
function getHeaderTemplate(config) {
    return `            <!-- Header Profesional -->
            <header class="header-gradient shadow-lg border-b border-gray-200/20">
                <div class="max-w-7xl mx-auto px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <!-- Botón toggle móvil -->
                            <button id="mobile-sidebar-toggle" title="Abrir menú de navegación" aria-label="Abrir menú de navegación" class="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                                </svg>
                            </button>
                            
                            <!-- Logo/Icono del módulo -->
                            <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm">
                                <i data-lucide="${config.icon}" class="w-6 h-6 text-white"></i>
                            </div>
                            
                            <!-- Título y subtítulo -->
                            <div>
                                <h1 class="text-2xl font-bold text-white tracking-tight">${config.title}</h1>
                                <p class="text-slate-200 text-sm font-medium">${config.subtitle}</p>
                            </div>
                        </div>
                        
                        <!-- User Info -->
                        <div id="user-info" class="user-info"></div>
                    </div>
                </div>
            </header>`;
}

// CSS adicional para header-gradient
const headerCSS = `
<style>
.header-gradient {
    background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
}
</style>`;

function updatePage(filename) {
    const filePath = path.join(__dirname, 'frontend', filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${filename} no encontrado, saltando...`);
        return false;
    }

    const config = moduleConfig[filename];
    if (!config) {
        console.log(`⚠️  ${filename} no tiene configuración, saltando...`);
        return false;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Buscar y reemplazar el header existente
        // Patrón 1: header con clase app-header o similar
        const headerPattern1 = /<header[^>]*>[\s\S]*?<\/header>/i;
        
        if (headerPattern1.test(content)) {
            const newHeader = getHeaderTemplate(config);
            content = content.replace(headerPattern1, newHeader);
            
            // Agregar CSS si no existe
            if (!content.includes('.header-gradient')) {
                // Buscar </head> y agregar CSS antes
                content = content.replace('</head>', `${headerCSS}\n</head>`);
            }
            
            // Asegurar que Lucide esté cargado
            if (!content.includes('lucide@latest') && !content.includes('lucide.min.js')) {
                content = content.replace('</head>', `    <script src="https://unpkg.com/lucide@latest"></script>\n</head>`);
            }
            
            // Asegurar que se inicialicen los iconos
            if (!content.includes('lucide.createIcons()') && !content.includes('lucideIcons()')) {
                // Buscar el último </script> antes de </body>
                const bodyEndPattern = /(.*<script[^>]*>[\s\S]*?<\/script>)([\s\S]*?<\/body>)/i;
                if (bodyEndPattern.test(content)) {
                    content = content.replace(bodyEndPattern, '$1\n    <script>lucide.createIcons();</script>$2');
                }
            }
            
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${filename} actualizado`);
            return true;
        } else {
            console.log(`⚠️  ${filename} no tiene header reconocible`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error procesando ${filename}:`, error.message);
        return false;
    }
}

// Ejecutar actualización
console.log('🚀 Iniciando actualización de headers...\n');

const pages = Object.keys(moduleConfig);
let updated = 0;
let skipped = 0;

pages.forEach(page => {
    const result = updatePage(page);
    if (result) {
        updated++;
    } else {
        skipped++;
    }
});

console.log('\n═══════════════════════════════════════');
console.log('📊 RESUMEN DE ACTUALIZACIÓN');
console.log('═══════════════════════════════════════');
console.log(`✅ Páginas actualizadas: ${updated}`);
console.log(`⚠️  Páginas saltadas: ${skipped}`);
console.log(`📄 Total procesadas: ${pages.length}`);
console.log('═══════════════════════════════════════\n');

if (updated > 0) {
    console.log('🎉 ¡Actualización completada!');
    console.log('');
    console.log('📝 Próximos pasos:');
    console.log('1. Revisar los cambios visualmente');
    console.log('2. Probar cada página en el navegador');
    console.log('3. Verificar responsive (móvil/tablet/desktop)');
    console.log('4. Hacer commit de los cambios');
    console.log('');
} else {
    console.log('⚠️  No se actualizó ninguna página.');
    console.log('Verifica que los archivos existan en frontend/');
}
