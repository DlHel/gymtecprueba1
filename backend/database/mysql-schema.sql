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

COMMIT; 