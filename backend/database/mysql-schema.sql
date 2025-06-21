-- Gymtec ERP - MySQL Schema
-- Migrado desde SQLite a MySQL

-- Configuración inicial de MySQL
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS `gymtec_erp` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `gymtec_erp`;

-- Gestión de Usuarios y Roles
CREATE TABLE IF NOT EXISTS `Roles` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Users` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role_id` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`role_id`) REFERENCES `Roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Módulo 2: Gestión de Clientes, Sedes y Equipos
CREATE TABLE IF NOT EXISTS `Clients` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL, -- Nombre comercial
    `legal_name` VARCHAR(300),     -- Razón Social
    `rut` VARCHAR(20) UNIQUE,
    `address` TEXT,
    `phone` VARCHAR(20),
    `email` VARCHAR(100),
    `business_activity` VARCHAR(200), -- Giro
    `contact_name` VARCHAR(150),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_clients_rut` (`rut`),
    INDEX `idx_clients_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Locations` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `address` TEXT,
    `client_id` INT(11) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_locations_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `EquipmentModels` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `brand` VARCHAR(100) NOT NULL,
    `category` ENUM('Cardio', 'Fuerza', 'Funcional', 'Accesorios') NOT NULL,
    `model_code` VARCHAR(50) UNIQUE,
    `description` TEXT,
    `weight` DECIMAL(8,2),
    `dimensions` VARCHAR(100),
    `voltage` VARCHAR(20),
    `power` INT(11),
    `specifications` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_models_brand` (`brand`),
    INDEX `idx_models_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ModelPhotos` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `model_id` INT(11) NOT NULL,
    `photo_data` LONGTEXT NOT NULL,
    `file_name` VARCHAR(255),
    `mime_type` VARCHAR(100),
    `file_size` INT(11),
    `is_primary` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_model_photos_model` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Equipment` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `type` VARCHAR(100),
    `brand` VARCHAR(100),
    `model` VARCHAR(100),
    `serial_number` VARCHAR(100) UNIQUE,
    `custom_id` VARCHAR(50) UNIQUE,
    `location_id` INT(11) NOT NULL,
    `model_id` INT(11),
    `acquisition_date` DATE,
    `last_maintenance_date` DATE,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_equipment_location` (`location_id`),
    INDEX `idx_equipment_serial` (`serial_number`),
    INDEX `idx_equipment_custom` (`custom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `EquipmentPhotos` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `equipment_id` INT(11) NOT NULL,
    `photo_data` LONGTEXT NOT NULL,
    `file_name` VARCHAR(255),
    `mime_type` VARCHAR(100),
    `file_size` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_equipment_photos_equipment` (`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventario de Repuestos
CREATE TABLE IF NOT EXISTS `SpareParts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `sku` VARCHAR(100) UNIQUE,
    `current_stock` INT(11) NOT NULL DEFAULT 0,
    `minimum_stock` INT(11) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_spare_parts_sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Módulo 2: Gestión de Contratos y SLAs
CREATE TABLE IF NOT EXISTS `Contracts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `client_id` INT(11) NOT NULL,
    `start_date` DATE,
    `end_date` DATE,
    `details` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_contracts_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Contract_Equipment` (
    `contract_id` INT(11) NOT NULL,
    `equipment_id` INT(11) NOT NULL,
    PRIMARY KEY (`contract_id`, `equipment_id`),
    FOREIGN KEY (`contract_id`) REFERENCES `Contracts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SLAs` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `contract_id` INT(11) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `response_time_hours` INT(11),
    `resolution_time_hours` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`contract_id`) REFERENCES `Contracts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_slas_contract` (`contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Módulo 3: Gestión de Servicios y Tickets
CREATE TABLE IF NOT EXISTS `Tickets` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT,
    `status` ENUM('Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado') NOT NULL DEFAULT 'Abierto',
    `priority` ENUM('Baja', 'Media', 'Alta', 'Urgente') DEFAULT 'Media',
    `client_id` INT(11),
    `location_id` INT(11),
    `equipment_id` INT(11),
    `assigned_technician_id` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `due_date` DATETIME,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`assigned_technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_tickets_status` (`status`),
    INDEX `idx_tickets_priority` (`priority`),
    INDEX `idx_tickets_client` (`client_id`),
    INDEX `idx_tickets_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para notas del equipo
CREATE TABLE IF NOT EXISTS `EquipmentNotes` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `equipment_id` INT(11) NOT NULL,
    `note` TEXT NOT NULL,
    `author` VARCHAR(150) DEFAULT 'Sistema',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_equipment_notes_equipment` (`equipment_id`),
    INDEX `idx_equipment_notes_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- === TABLAS PARA SISTEMA COMPLETO DE TICKETS ===

-- Registro de tiempo trabajado en tickets
CREATE TABLE IF NOT EXISTS `TicketTimeEntries` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `technician_id` INT(11),
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME,
    `duration_seconds` INT(11) DEFAULT 0,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_time_entries_ticket` (`ticket_id`),
    INDEX `idx_time_entries_technician` (`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notas y comentarios de tickets
CREATE TABLE IF NOT EXISTS `TicketNotes` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `note` TEXT NOT NULL,
    `note_type` ENUM('Comentario', 'Diagnóstico', 'Solución', 'Seguimiento') DEFAULT 'Comentario',
    `author` VARCHAR(150) DEFAULT 'Sistema',
    `is_internal` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_ticket_notes_ticket` (`ticket_id`),
    INDEX `idx_ticket_notes_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de cambios de tickets
CREATE TABLE IF NOT EXISTS `TicketHistory` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `field_changed` VARCHAR(100) NOT NULL,
    `old_value` TEXT,
    `new_value` TEXT,
    `changed_by` VARCHAR(150) DEFAULT 'Sistema',
    `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_ticket_history_ticket` (`ticket_id`),
    INDEX `idx_ticket_history_changed` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Checklist digital para tickets
CREATE TABLE IF NOT EXISTS `TicketChecklists` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `is_completed` BOOLEAN DEFAULT FALSE,
    `completed_at` TIMESTAMP NULL,
    `completed_by` VARCHAR(150),
    `order_index` INT(11) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_ticket_checklists_ticket` (`ticket_id`),
    INDEX `idx_ticket_checklists_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repuestos utilizados en tickets
CREATE TABLE IF NOT EXISTS `TicketSpareParts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `spare_part_id` INT(11) NOT NULL,
    `quantity_used` INT(11) NOT NULL DEFAULT 1,
    `unit_cost` DECIMAL(10,2),
    `notes` TEXT,
    `used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_ticket_spare_parts_ticket` (`ticket_id`),
    INDEX `idx_ticket_spare_parts_part` (`spare_part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fotos adjuntas a tickets
CREATE TABLE IF NOT EXISTS `TicketPhotos` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ticket_id` INT(11) NOT NULL,
    `photo_data` LONGTEXT NOT NULL,
    `file_name` VARCHAR(255),
    `mime_type` VARCHAR(100),
    `file_size` INT(11),
    `description` TEXT,
    `photo_type` ENUM('Problema', 'Proceso', 'Solución', 'Otros') DEFAULT 'Otros',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_ticket_photos_ticket` (`ticket_id`),
    INDEX `idx_ticket_photos_type` (`photo_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para manuales de modelos
CREATE TABLE IF NOT EXISTS `ModelManuals` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `model_id` INT(11) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_data` LONGTEXT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size` INT(11) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_model_manuals_model` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT; 