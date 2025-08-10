-- Sistema de gestión de módulos y permisos para usuarios
-- Este script agrega las tablas necesarias para controlar el acceso a módulos

-- Tabla de módulos del sistema
CREATE TABLE IF NOT EXISTS `SystemModules` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `module_key` VARCHAR(50) NOT NULL UNIQUE,
    `module_name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `icon` VARCHAR(50) DEFAULT 'circle',
    `route` VARCHAR(100) NOT NULL,
    `parent_module_id` INT(11) DEFAULT NULL,
    `display_order` INT(11) DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`parent_module_id`) REFERENCES `SystemModules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_modules_key` (`module_key`),
    INDEX `idx_modules_active` (`is_active`),
    INDEX `idx_modules_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de permisos por módulo
CREATE TABLE IF NOT EXISTS `ModulePermissions` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `module_id` INT(11) NOT NULL,
    `permission_key` VARCHAR(50) NOT NULL,
    `permission_name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`module_id`) REFERENCES `SystemModules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `unique_module_permission` (`module_id`, `permission_key`),
    INDEX `idx_permissions_module` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de asignación de permisos de usuario
CREATE TABLE IF NOT EXISTS `UserModulePermissions` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `module_id` INT(11) NOT NULL,
    `permission_id` INT(11) NOT NULL,
    `granted` BOOLEAN DEFAULT TRUE,
    `granted_by` INT(11) DEFAULT NULL,
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`module_id`) REFERENCES `SystemModules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `ModulePermissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`granted_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY `unique_user_module_permission` (`user_id`, `module_id`, `permission_id`),
    INDEX `idx_user_permissions_user` (`user_id`),
    INDEX `idx_user_permissions_module` (`module_id`),
    INDEX `idx_user_permissions_granted` (`granted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar módulos del sistema
INSERT IGNORE INTO `SystemModules` (`module_key`, `module_name`, `description`, `icon`, `route`, `display_order`) VALUES
('dashboard', 'Dashboard', 'Panel principal con métricas y estadísticas', 'home', '/', 1),
('clientes', 'Clientes', 'Gestión de clientes y ubicaciones', 'users', '/clientes.html', 2),
('equipos', 'Equipos', 'Administración de equipos y modelos', 'cpu', '/equipo.html', 3),
('modelos', 'Modelos', 'Catálogo de modelos de equipos', 'package', '/modelos.html', 4),
('tickets', 'Tickets', 'Sistema de tickets y servicios', 'clipboard-list', '/tickets.html', 5),
('inventario', 'Inventario', 'Control de stock y repuestos', 'package-2', '/inventario.html', 6),
('finanzas', 'Finanzas', 'Gestión financiera y facturación', 'credit-card', '/finanzas.html', 7),
('reportes', 'Reportes', 'Reportes y análisis de datos', 'bar-chart-3', '/reportes.html', 8),
('personal', 'Personal', 'Gestión de usuarios y permisos', 'user-cog', '/personal.html', 9),
('configuracion', 'Configuración', 'Configuraciones del sistema', 'settings', '/configuracion.html', 10);

-- Insertar permisos básicos para cada módulo
INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'view', 'Ver', 'Permite visualizar el módulo' FROM `SystemModules` m;

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'create', 'Crear', 'Permite crear nuevos registros' FROM `SystemModules` m WHERE m.module_key IN ('clientes', 'equipos', 'modelos', 'tickets', 'inventario', 'finanzas', 'personal');

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'edit', 'Editar', 'Permite modificar registros existentes' FROM `SystemModules` m WHERE m.module_key IN ('clientes', 'equipos', 'modelos', 'tickets', 'inventario', 'finanzas', 'personal');

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'delete', 'Eliminar', 'Permite eliminar registros' FROM `SystemModules` m WHERE m.module_key IN ('clientes', 'equipos', 'modelos', 'tickets', 'inventario', 'finanzas', 'personal');

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'export', 'Exportar', 'Permite exportar datos' FROM `SystemModules` m WHERE m.module_key IN ('reportes', 'finanzas', 'inventario');

-- Insertar permisos específicos
INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'assign_technician', 'Asignar Técnico', 'Permite asignar técnicos a tickets' FROM `SystemModules` m WHERE m.module_key = 'tickets';

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'close_ticket', 'Cerrar Ticket', 'Permite cerrar tickets de servicio' FROM `SystemModules` m WHERE m.module_key = 'tickets';

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'manage_permissions', 'Gestionar Permisos', 'Permite administrar permisos de usuarios' FROM `SystemModules` m WHERE m.module_key = 'personal';

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'view_financials', 'Ver Finanzas', 'Permite acceder a información financiera' FROM `SystemModules` m WHERE m.module_key = 'finanzas';

INSERT IGNORE INTO `ModulePermissions` (`module_id`, `permission_key`, `permission_name`, `description`)
SELECT m.id, 'manage_system', 'Administrar Sistema', 'Permite gestionar configuraciones del sistema' FROM `SystemModules` m WHERE m.module_key = 'configuracion';

-- Asignar permisos completos al usuario admin (asumiendo id=26 basado en el token anterior)
INSERT IGNORE INTO `UserModulePermissions` (`user_id`, `module_id`, `permission_id`, `granted_by`)
SELECT 26, m.id, p.id, 26
FROM `SystemModules` m
CROSS JOIN `ModulePermissions` p
WHERE p.module_id = m.id;

-- Asignar permisos básicos a técnicos (view en la mayoría, create/edit en tickets)
INSERT IGNORE INTO `UserModulePermissions` (`user_id`, `module_id`, `permission_id`, `granted_by`)
SELECT u.id, m.id, p.id, 26
FROM `Users` u
CROSS JOIN `SystemModules` m
CROSS JOIN `ModulePermissions` p
WHERE u.role = 'Técnico' 
  AND p.module_id = m.id
  AND (
    p.permission_key = 'view' 
    OR (m.module_key = 'tickets' AND p.permission_key IN ('create', 'edit'))
    OR (m.module_key = 'inventario' AND p.permission_key = 'view')
  );
