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

-- Gestión avanzada de inventario
CREATE TABLE IF NOT EXISTS `TechnicianInventory` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `technician_id` INT(11) NOT NULL,
    `spare_part_id` INT(11) NOT NULL,
    `quantity` INT(11) NOT NULL DEFAULT 0,
    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `assigned_by` INT(11),
    `status` ENUM('Asignado', 'En Uso', 'Devuelto') DEFAULT 'Asignado',
    `notes` TEXT,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`assigned_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_technician_inventory_tech` (`technician_id`),
    INDEX `idx_technician_inventory_part` (`spare_part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PurchaseOrders` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `order_number` VARCHAR(50) UNIQUE NOT NULL,
    `supplier` VARCHAR(200) NOT NULL,
    `status` ENUM('Pendiente', 'Aprobada', 'Enviada', 'Recibida', 'Cancelada') DEFAULT 'Pendiente',
    `order_date` DATE NOT NULL,
    `expected_delivery` DATE,
    `received_date` DATE,
    `total_amount` DECIMAL(10,2) DEFAULT 0.00,
    `notes` TEXT,
    `created_by` INT(11),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_purchase_orders_number` (`order_number`),
    INDEX `idx_purchase_orders_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PurchaseOrderItems` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `purchase_order_id` INT(11) NOT NULL,
    `spare_part_id` INT(11) NOT NULL,
    `quantity_ordered` INT(11) NOT NULL,
    `quantity_received` INT(11) DEFAULT 0,
    `unit_cost` DECIMAL(8,2) NOT NULL,
    `total_cost` DECIMAL(10,2) GENERATED ALWAYS AS (`quantity_ordered` * `unit_cost`) STORED,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`purchase_order_id`) REFERENCES `PurchaseOrders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_purchase_order_items_order` (`purchase_order_id`),
    INDEX `idx_purchase_order_items_part` (`spare_part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `InventoryTransactions` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `spare_part_id` INT(11) NOT NULL,
    `transaction_type` ENUM('Entrada', 'Salida', 'Ajuste', 'Asignación', 'Devolución') NOT NULL,
    `quantity` INT(11) NOT NULL,
    `quantity_before` INT(11) NOT NULL,
    `quantity_after` INT(11) NOT NULL,
    `reference_type` ENUM('Ticket', 'Purchase Order', 'Manual Adjustment', 'Technician Assignment') DEFAULT 'Manual Adjustment',
    `reference_id` INT(11),
    `technician_id` INT(11),
    `performed_by` INT(11),
    `notes` TEXT,
    `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`performed_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_inventory_transactions_part` (`spare_part_id`),
    INDEX `idx_inventory_transactions_type` (`transaction_type`),
    INDEX `idx_inventory_transactions_date` (`transaction_date`)
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

-- === TABLAS PARA FUNCIONALIDADES AVANZADAS ===

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS `SystemConfig` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(100) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_config` (`category`, `key`),
    INDEX `idx_system_config_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cotizaciones
CREATE TABLE IF NOT EXISTS `Quotes` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `client_id` INT(11) NOT NULL,
    `location_id` INT(11),
    `quote_number` VARCHAR(50) UNIQUE,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Expirada') DEFAULT 'Borrador',
    `valid_until` DATE,
    `items` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_quotes_client` (`client_id`),
    INDEX `idx_quotes_status` (`status`),
    INDEX `idx_quotes_number` (`quote_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Facturas
CREATE TABLE IF NOT EXISTS `Invoices` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `client_id` INT(11) NOT NULL,
    `location_id` INT(11),
    `quote_id` INT(11),
    `invoice_number` VARCHAR(50) UNIQUE NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Pendiente', 'Enviada', 'Pagada', 'Vencida', 'Cancelada') DEFAULT 'Pendiente',
    `due_date` DATE,
    `paid_at` TIMESTAMP NULL,
    `items` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`quote_id`) REFERENCES `Quotes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_invoices_client` (`client_id`),
    INDEX `idx_invoices_status` (`status`),
    INDEX `idx_invoices_number` (`invoice_number`),
    INDEX `idx_invoices_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Control de horario y asistencia
CREATE TABLE IF NOT EXISTS `TimeEntries` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `entry_type` ENUM('Entrada', 'Salida', 'Pausa', 'Regreso') NOT NULL,
    `ticket_id` INT(11),
    `location_id` INT(11),
    `latitude` DECIMAL(10,8),
    `longitude` DECIMAL(11,8),
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_time_entries_user` (`user_id`),
    INDEX `idx_time_entries_date` (`created_at`),
    INDEX `idx_time_entries_type` (`entry_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Periodos de trabajo calculados
CREATE TABLE IF NOT EXISTS `WorkPeriods` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `start_time` TIMESTAMP NOT NULL,
    `end_time` TIMESTAMP NULL,
    `total_hours` DECIMAL(5,2) DEFAULT 0.00,
    `regular_hours` DECIMAL(5,2) DEFAULT 0.00,
    `overtime_hours` DECIMAL(5,2) DEFAULT 0.00,
    `overtime_approved` BOOLEAN DEFAULT FALSE,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_work_periods_user` (`user_id`),
    INDEX `idx_work_periods_start` (`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plantillas de checklist por tipo de equipo
CREATE TABLE IF NOT EXISTS `ChecklistTemplates` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `equipment_type` VARCHAR(100),
    `model_id` INT(11),
    `items` JSON NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_checklist_templates_type` (`equipment_type`),
    INDEX `idx_checklist_templates_model` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reportes guardados
CREATE TABLE IF NOT EXISTS `SavedReports` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `report_type` VARCHAR(100) NOT NULL,
    `parameters` JSON,
    `created_by` INT(11),
    `is_public` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_saved_reports_type` (`report_type`),
    INDEX `idx_saved_reports_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- === ACTUALIZACIÓN DE TABLA USERS ===

-- Agregar campos faltantes a Users si no existen
ALTER TABLE `Users` 
ADD COLUMN IF NOT EXISTS `email` VARCHAR(100) UNIQUE AFTER `username`,
ADD COLUMN IF NOT EXISTS `role` ENUM('Admin', 'Tecnico', 'Cliente', 'Supervisor') DEFAULT 'Tecnico' AFTER `password`,
ADD COLUMN IF NOT EXISTS `status` ENUM('Activo', 'Inactivo', 'Suspendido') DEFAULT 'Activo' AFTER `role`;

-- Agregar índices para campos nuevos
CREATE INDEX IF NOT EXISTS `idx_users_email` ON `Users` (`email`);
CREATE INDEX IF NOT EXISTS `idx_users_role` ON `Users` (`role`);
CREATE INDEX IF NOT EXISTS `idx_users_status` ON `Users` (`status`);

-- === DATOS INICIALES DE CONFIGURACIÓN ===

-- Configuraciones por defecto del sistema
INSERT IGNORE INTO `SystemConfig` (`category`, `key`, `value`, `description`) VALUES
('general', 'company_name', 'Gymtec', 'Nombre de la empresa'),
('general', 'company_email', 'info@gymtec.cl', 'Email principal de la empresa'),
('general', 'company_phone', '+56 2 1234 5678', 'Teléfono principal de la empresa'),
('tickets', 'default_priority', 'Media', 'Prioridad por defecto para nuevos tickets'),
('tickets', 'auto_assign', 'false', 'Asignar tickets automáticamente'),
('tickets', 'sla_response_hours', '24', 'Tiempo de respuesta SLA en horas'),
('tickets', 'sla_resolution_hours', '72', 'Tiempo de resolución SLA en horas'),
('inventory', 'low_stock_threshold', '10', 'Umbral para alerta de stock bajo'),
('notifications', 'email_enabled', 'true', 'Habilitar notificaciones por email'),
('notifications', 'whatsapp_enabled', 'false', 'Habilitar notificaciones por WhatsApp'),
('financial', 'quote_validity_days', '30', 'Días de validez de cotizaciones'),
('financial', 'invoice_due_days', '30', 'Días de vencimiento de facturas'),
('work_hours', 'regular_hours_per_day', '8', 'Horas regulares por día'),
('work_hours', 'overtime_multiplier', '1.5', 'Multiplicador para horas extra');

-- Plantillas de checklist básicas
INSERT IGNORE INTO `ChecklistTemplates` (`name`, `equipment_type`, `items`) VALUES
('Checklist General Cardio', 'Cardio', '[
    {"title": "Inspección visual externa", "description": "Verificar estado general del equipo"},
    {"title": "Limpieza y desinfección", "description": "Limpiar superficies y desinfectar puntos de contacto"},
    {"title": "Verificar funcionamiento de pantalla", "description": "Comprobar que la pantalla enciende y responde"},
    {"title": "Probar botones y controles", "description": "Verificar que todos los botones funcionan correctamente"},
    {"title": "Verificar sistema de lubricación", "description": "Revisar niveles y funcionamiento del sistema de lubricación"},
    {"title": "Inspeccionar cableado", "description": "Verificar que no hay cables sueltos o dañados"},
    {"title": "Prueba de funcionamiento completo", "description": "Ejecutar ciclo completo de prueba del equipo"}
]'),
('Checklist General Fuerza', 'Fuerza', '[
    {"title": "Inspección visual externa", "description": "Verificar estado general del equipo"},
    {"title": "Limpieza y desinfección", "description": "Limpiar superficies y desinfectar puntos de contacto"},
    {"title": "Verificar ajustes y seguros", "description": "Comprobar que los ajustes y sistemas de seguridad funcionan"},
    {"title": "Inspeccionar cables y poleas", "description": "Verificar estado de cables, poleas y sistemas de transmisión"},
    {"title": "Lubricar puntos de fricción", "description": "Aplicar lubricación en puntos necesarios"},
    {"title": "Verificar pesos y contrapesos", "description": "Comprobar que los pesos están correctamente asegurados"},
    {"title": "Prueba de funcionamiento completo", "description": "Ejecutar movimientos completos del equipo"}
]');

COMMIT; 