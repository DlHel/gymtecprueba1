-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: localhost    Database: gymtec_erp
-- ------------------------------------------------------
-- Server version	8.0.44-0ubuntu0.22.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Attendance`
--

DROP TABLE IF EXISTS `Attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `check_in_time` time DEFAULT NULL,
  `check_out_time` time DEFAULT NULL,
  `work_date` date DEFAULT NULL,
  `check_in_location` varchar(200) DEFAULT NULL,
  `check_out_location` varchar(200) DEFAULT NULL,
  `check_in_notes` text,
  `check_out_notes` text,
  `check_in_ip` varchar(50) DEFAULT NULL,
  `check_out_ip` varchar(50) DEFAULT NULL,
  `status` enum('present','absent','late','half_day') DEFAULT 'present',
  `is_late` tinyint(1) DEFAULT '0',
  `late_minutes` int DEFAULT '0',
  `scheduled_hours` decimal(5,2) DEFAULT NULL,
  `worked_hours` decimal(5,2) DEFAULT '0.00',
  `overtime_hours` decimal(5,2) DEFAULT '0.00',
  `schedule_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`date`),
  KEY `schedule_id` (`schedule_id`),
  CONSTRAINT `Attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`),
  CONSTRAINT `Attendance_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `WorkSchedules` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ChecklistTemplates`
--

DROP TABLE IF EXISTS `ChecklistTemplates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ChecklistTemplates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `equipment_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `items` json NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_checklist_templates_type` (`equipment_type`),
  KEY `idx_checklist_templates_model` (`model_id`),
  CONSTRAINT `ChecklistTemplates_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Clients`
--

DROP TABLE IF EXISTS `Clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rut` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_activity` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rut` (`rut`),
  KEY `idx_clients_rut` (`rut`),
  KEY `idx_clients_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Contract_Equipment`
--

DROP TABLE IF EXISTS `Contract_Equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Contract_Equipment` (
  `contract_id` int NOT NULL,
  `equipment_id` int NOT NULL,
  PRIMARY KEY (`contract_id`,`equipment_id`),
  KEY `equipment_id` (`equipment_id`),
  CONSTRAINT `Contract_Equipment_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `Contracts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Contract_Equipment_ibfk_2` FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Contracts`
--

DROP TABLE IF EXISTS `Contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('Active','Expired','Terminated') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  PRIMARY KEY (`id`),
  KEY `idx_contracts_client` (`client_id`),
  CONSTRAINT `Contracts_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CurrencyRates`
--

DROP TABLE IF EXISTS `CurrencyRates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CurrencyRates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `utm_value` decimal(12,2) NOT NULL,
  `uf_value` decimal(12,2) NOT NULL,
  `source` varchar(50) DEFAULT 'Manual',
  `is_official` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmployeeSchedules`
--

DROP TABLE IF EXISTS `EmployeeSchedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeSchedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `schedule_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `schedule_id` (`schedule_id`),
  CONSTRAINT `EmployeeSchedules_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`),
  CONSTRAINT `EmployeeSchedules_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `WorkSchedules` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Equipment`
--

DROP TABLE IF EXISTS `Equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Equipment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `custom_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` int NOT NULL,
  `model_id` int DEFAULT NULL,
  `acquisition_date` date DEFAULT NULL,
  `last_maintenance_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  UNIQUE KEY `custom_id` (`custom_id`),
  KEY `model_id` (`model_id`),
  KEY `idx_equipment_location` (`location_id`),
  KEY `idx_equipment_serial` (`serial_number`),
  KEY `idx_equipment_custom` (`custom_id`),
  CONSTRAINT `Equipment_ibfk_1` FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Equipment_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EquipmentModels`
--

DROP TABLE IF EXISTS `EquipmentModels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EquipmentModels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('Cardio','Fuerza','Funcional','Accesorios') COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `weight` decimal(8,2) DEFAULT NULL,
  `dimensions` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voltage` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `power` int DEFAULT NULL,
  `specifications` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `model_code` (`model_code`),
  KEY `idx_models_brand` (`brand`),
  KEY `idx_models_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EquipmentNotes`
--

DROP TABLE IF EXISTS `EquipmentNotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EquipmentNotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'Sistema',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_equipment_notes_equipment` (`equipment_id`),
  KEY `idx_equipment_notes_created` (`created_at`),
  CONSTRAINT `EquipmentNotes_ibfk_1` FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EquipmentPhotos`
--

DROP TABLE IF EXISTS `EquipmentPhotos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EquipmentPhotos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `photo_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_equipment_photos_equipment` (`equipment_id`),
  CONSTRAINT `EquipmentPhotos_ibfk_1` FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ExpenseCategories`
--

DROP TABLE IF EXISTS `ExpenseCategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExpenseCategories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Expenses`
--

DROP TABLE IF EXISTS `Expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(500) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `date` date NOT NULL,
  `category_id` int DEFAULT NULL,
  `status` enum('Pendiente','Aprobado','Rechazado','Pagado') DEFAULT 'Pendiente',
  `payment_method` varchar(50) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `Expenses_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `ExpenseCategories` (`id`),
  CONSTRAINT `Expenses_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`),
  CONSTRAINT `Expenses_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `InformesTecnicos`
--

DROP TABLE IF EXISTS `InformesTecnicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InformesTecnicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `technician_id` int NOT NULL,
  `report_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `diagnosis` text,
  `solution` text,
  `recommendations` text,
  `equipment_status` enum('operational','partial','non_operational') DEFAULT 'operational',
  `parts_used` json DEFAULT NULL,
  `time_spent` int DEFAULT NULL COMMENT 'Tiempo en minutos',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `filename` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `technician_id` (`technician_id`),
  CONSTRAINT `InformesTecnicos_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `InformesTecnicos_ibfk_2` FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Inventory`
--

DROP TABLE IF EXISTS `Inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(200) NOT NULL,
  `item_code` varchar(50) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `current_stock` int DEFAULT '0',
  `minimum_stock` int DEFAULT '0',
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `supplier` varchar(200) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_code` (`item_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `InventoryCategories`
--

DROP TABLE IF EXISTS `InventoryCategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InventoryCategories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `InventoryMovements`
--

DROP TABLE IF EXISTS `InventoryMovements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InventoryMovements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inventory_id` int DEFAULT NULL,
  `movement_type` varchar(20) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `stock_before` decimal(10,2) DEFAULT NULL,
  `stock_after` decimal(10,2) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `location_from_id` int DEFAULT NULL,
  `location_to_id` int DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `notes` text,
  `performed_by` int DEFAULT NULL,
  `performed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `inventory_id` (`inventory_id`),
  KEY `performed_by` (`performed_by`),
  CONSTRAINT `InventoryMovements_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `Inventory` (`id`),
  CONSTRAINT `InventoryMovements_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `InventoryTransactions`
--

DROP TABLE IF EXISTS `InventoryTransactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InventoryTransactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `spare_part_id` int NOT NULL,
  `transaction_type` enum('Entrada','Salida','Ajuste','Asignación','Devolución') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `quantity_before` int NOT NULL,
  `quantity_after` int NOT NULL,
  `reference_type` enum('Ticket','Purchase Order','Manual Adjustment','Technician Assignment') COLLATE utf8mb4_unicode_ci DEFAULT 'Manual Adjustment',
  `reference_id` int DEFAULT NULL,
  `technician_id` int DEFAULT NULL,
  `performed_by` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `technician_id` (`technician_id`),
  KEY `performed_by` (`performed_by`),
  KEY `idx_inventory_transactions_part` (`spare_part_id`),
  KEY `idx_inventory_transactions_type` (`transaction_type`),
  KEY `idx_inventory_transactions_date` (`transaction_date`),
  CONSTRAINT `InventoryTransactions_ibfk_1` FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `InventoryTransactions_ibfk_2` FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `InventoryTransactions_ibfk_3` FOREIGN KEY (`performed_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Invoices`
--

DROP TABLE IF EXISTS `Invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `location_id` int DEFAULT NULL,
  `quote_id` int DEFAULT NULL,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('Pendiente','Enviada','Pagada','Vencida','Cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `due_date` date DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `items` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `location_id` (`location_id`),
  KEY `quote_id` (`quote_id`),
  KEY `idx_invoices_client` (`client_id`),
  KEY `idx_invoices_status` (`status`),
  KEY `idx_invoices_number` (`invoice_number`),
  KEY `idx_invoices_due_date` (`due_date`),
  CONSTRAINT `Invoices_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Invoices_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Invoices_ibfk_3` FOREIGN KEY (`quote_id`) REFERENCES `Quotes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LeaveRequests`
--

DROP TABLE IF EXISTS `LeaveRequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LeaveRequests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `leave_type` enum('vacation','sick','personal','unpaid') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `LeaveRequests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `LeaveRequests_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Locations`
--

DROP TABLE IF EXISTS `Locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `client_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_locations_client` (`client_id`),
  CONSTRAINT `Locations_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MaintenanceRecurrence`
--

DROP TABLE IF EXISTS `MaintenanceRecurrence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MaintenanceRecurrence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL COMMENT 'ID de la tarea padre',
  `recurrence_type` enum('daily','weekly','monthly','quarterly','yearly','custom') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo de recurrencia',
  `interval_value` int DEFAULT '1' COMMENT 'Intervalo (ej: cada 2 semanas)',
  `days_of_week` set('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Días de la semana',
  `day_of_month` int DEFAULT NULL COMMENT 'Día del mes (1-31)',
  `month_of_year` int DEFAULT NULL COMMENT 'Mes del año (1-12)',
  `cron_expression` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Expresión CRON personalizada',
  `start_date` date NOT NULL COMMENT 'Fecha de inicio de recurrencia',
  `end_date` date DEFAULT NULL COMMENT 'Fecha de fin (opcional)',
  `max_occurrences` int DEFAULT NULL COMMENT 'Máximo número de ocurrencias',
  `current_occurrences` int DEFAULT '0' COMMENT 'Ocurrencias actuales',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Recurrencia activa',
  `last_generated` timestamp NULL DEFAULT NULL COMMENT 'Última vez que se generó una tarea',
  `next_due` date DEFAULT NULL COMMENT 'Próxima fecha programada',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `idx_next_due` (`next_due`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `MaintenanceRecurrence_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `MaintenanceTasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración de recurrencia para tareas de mantenimiento';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MaintenanceTasks`
--

DROP TABLE IF EXISTS `MaintenanceTasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MaintenanceTasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `description` text,
  `type` enum('maintenance','inspection','repair','cleaning') NOT NULL DEFAULT 'maintenance',
  `equipment_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `technician_id` int DEFAULT NULL,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` enum('pending','scheduled','in_progress','completed','cancelled') DEFAULT 'pending',
  `scheduled_date` date DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `estimated_duration` int DEFAULT NULL,
  `actual_duration` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `estimated_hours` decimal(5,2) DEFAULT NULL,
  `actual_hours` decimal(5,2) DEFAULT NULL,
  `notes` text,
  `is_preventive` tinyint(1) DEFAULT '0',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `ticket_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sla_deadline` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `equipment_id` (`equipment_id`),
  KEY `location_id` (`location_id`),
  KEY `technician_id` (`technician_id`),
  CONSTRAINT `MaintenanceTasks_ibfk_1` FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE SET NULL,
  CONSTRAINT `MaintenanceTasks_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `MaintenanceTasks_ibfk_3` FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ModelManuals`
--

DROP TABLE IF EXISTS `ModelManuals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ModelManuals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_model_manuals_model` (`model_id`),
  CONSTRAINT `ModelManuals_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ModelPhotos`
--

DROP TABLE IF EXISTS `ModelPhotos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ModelPhotos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_id` int NOT NULL,
  `photo_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_model_photos_model` (`model_id`),
  CONSTRAINT `ModelPhotos_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `EquipmentModels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Overtime`
--

DROP TABLE IF EXISTS `Overtime`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Overtime` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `date` date NOT NULL,
  `hours` decimal(4,2) NOT NULL,
  `rate_multiplier` decimal(3,2) DEFAULT '1.50',
  `reason` text,
  `status` enum('pending','approved','paid') DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `Overtime_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `Overtime_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PayrollDetails`
--

DROP TABLE IF EXISTS `PayrollDetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PayrollDetails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payroll_period_id` int NOT NULL,
  `user_id` int NOT NULL,
  `regular_hours` decimal(8,2) DEFAULT '0.00',
  `overtime_hours` decimal(8,2) DEFAULT '0.00',
  `total_hours` decimal(8,2) DEFAULT '0.00',
  `base_salary` decimal(12,2) DEFAULT '0.00',
  `overtime_amount` decimal(12,2) DEFAULT '0.00',
  `colacion_amount` decimal(12,2) DEFAULT '0.00',
  `movilizacion_amount` decimal(12,2) DEFAULT '0.00',
  `afp_percentage` decimal(5,2) DEFAULT '0.00',
  `afp_amount` decimal(12,2) DEFAULT '0.00',
  `salud_percentage` decimal(5,2) DEFAULT '0.00',
  `salud_amount` decimal(12,2) DEFAULT '0.00',
  `seguro_cesantia_percentage` decimal(5,2) DEFAULT '0.00',
  `seguro_cesantia_amount` decimal(12,2) DEFAULT '0.00',
  `impuesto_unico_amount` decimal(12,2) DEFAULT '0.00',
  `total_haberes` decimal(12,2) DEFAULT '0.00',
  `total_descuentos` decimal(12,2) DEFAULT '0.00',
  `liquido_a_pagar` decimal(12,2) DEFAULT '0.00',
  `exchange_rate_utm` decimal(12,2) DEFAULT '0.00',
  `exchange_rate_uf` decimal(12,2) DEFAULT '0.00',
  `currency` varchar(10) DEFAULT 'CLP',
  `payment_status` enum('pending','processed','paid') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payroll_period_id` (`payroll_period_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `PayrollDetails_ibfk_1` FOREIGN KEY (`payroll_period_id`) REFERENCES `PayrollPeriods` (`id`),
  CONSTRAINT `PayrollDetails_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PayrollPeriods`
--

DROP TABLE IF EXISTS `PayrollPeriods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PayrollPeriods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_name` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `payment_date` date DEFAULT NULL,
  `status` enum('open','processing','closed','approved','rejected') DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PurchaseOrderItems`
--

DROP TABLE IF EXISTS `PurchaseOrderItems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PurchaseOrderItems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int NOT NULL,
  `spare_part_id` int NOT NULL,
  `quantity_ordered` int NOT NULL,
  `quantity_received` int DEFAULT '0',
  `unit_cost` decimal(8,2) NOT NULL,
  `total_cost` decimal(10,2) GENERATED ALWAYS AS ((`quantity_ordered` * `unit_cost`)) STORED,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_order_items_order` (`purchase_order_id`),
  KEY `idx_purchase_order_items_part` (`spare_part_id`),
  CONSTRAINT `PurchaseOrderItems_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `PurchaseOrders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PurchaseOrderItems_ibfk_2` FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PurchaseOrders`
--

DROP TABLE IF EXISTS `PurchaseOrders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PurchaseOrders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Pendiente','Aprobada','Enviada','Recibida','Cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `order_date` date NOT NULL,
  `expected_delivery` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `created_by` (`created_by`),
  KEY `idx_purchase_orders_number` (`order_number`),
  KEY `idx_purchase_orders_status` (`status`),
  CONSTRAINT `PurchaseOrders_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Quotes`
--

DROP TABLE IF EXISTS `Quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Quotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `location_id` int DEFAULT NULL,
  `quote_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('Borrador','Enviada','Aprobada','Rechazada','Expirada') COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `valid_until` date DEFAULT NULL,
  `items` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quote_number` (`quote_number`),
  KEY `location_id` (`location_id`),
  KEY `idx_quotes_client` (`client_id`),
  KEY `idx_quotes_status` (`status`),
  KEY `idx_quotes_number` (`quote_number`),
  CONSTRAINT `Quotes_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Quotes_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Roles`
--

DROP TABLE IF EXISTS `Roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SLAs`
--

DROP TABLE IF EXISTS `SLAs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SLAs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `response_time_hours` int DEFAULT NULL,
  `resolution_time_hours` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_slas_contract` (`contract_id`),
  CONSTRAINT `SLAs_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `Contracts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SavedReports`
--

DROP TABLE IF EXISTS `SavedReports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SavedReports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `report_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parameters` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_saved_reports_type` (`report_type`),
  KEY `idx_saved_reports_created_by` (`created_by`),
  CONSTRAINT `SavedReports_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Schedules`
--

DROP TABLE IF EXISTS `Schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `days_of_week` json DEFAULT NULL COMMENT 'Array de días: [1,2,3,4,5]',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ShiftTypes`
--

DROP TABLE IF EXISTS `ShiftTypes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ShiftTypes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SparePartRequests`
--

DROP TABLE IF EXISTS `SparePartRequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SparePartRequests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int DEFAULT NULL,
  `spare_part_id` int NOT NULL,
  `quantity_requested` int NOT NULL,
  `quantity_approved` int DEFAULT NULL,
  `requested_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `status` enum('pending','approved','rejected','delivered') DEFAULT 'pending',
  `reason` text,
  `approved_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `spare_part_id` (`spare_part_id`),
  KEY `requested_by` (`requested_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `SparePartRequests_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `SparePartRequests_ibfk_2` FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`),
  CONSTRAINT `SparePartRequests_ibfk_3` FOREIGN KEY (`requested_by`) REFERENCES `Users` (`id`),
  CONSTRAINT `SparePartRequests_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpareParts`
--

DROP TABLE IF EXISTS `SpareParts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpareParts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_stock` int NOT NULL DEFAULT '0',
  `minimum_stock` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT '0.00',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_spare_parts_sku` (`sku`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SparePartsMovements`
--

DROP TABLE IF EXISTS `SparePartsMovements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SparePartsMovements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `spare_part_id` int NOT NULL,
  `movement_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `previous_stock` int NOT NULL,
  `new_stock` int NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `spare_part_id` (`spare_part_id`),
  CONSTRAINT `SparePartsMovements_ibfk_1` FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Suppliers`
--

DROP TABLE IF EXISTS `Suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SystemConfig`
--

DROP TABLE IF EXISTS `SystemConfig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SystemConfig` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_config` (`category`,`key`),
  KEY `idx_system_config_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TechnicianInventory`
--

DROP TABLE IF EXISTS `TechnicianInventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TechnicianInventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technician_id` int NOT NULL,
  `spare_part_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` int DEFAULT NULL,
  `status` enum('Asignado','En Uso','Devuelto') COLLATE utf8mb4_unicode_ci DEFAULT 'Asignado',
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `idx_technician_inventory_tech` (`technician_id`),
  KEY `idx_technician_inventory_part` (`spare_part_id`),
  CONSTRAINT `TechnicianInventory_ibfk_1` FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TechnicianInventory_ibfk_2` FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TechnicianInventory_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketChecklist`
--

DROP TABLE IF EXISTS `TicketChecklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketChecklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `is_completed` tinyint(1) DEFAULT '0',
  `order_index` int DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `completed_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_id` (`ticket_id`),
  CONSTRAINT `fk_ticketchecklist_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketChecklists`
--

DROP TABLE IF EXISTS `TicketChecklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketChecklists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_completed` tinyint(1) DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `completed_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_checklists_ticket` (`ticket_id`),
  KEY `idx_ticket_checklists_order` (`order_index`),
  CONSTRAINT `TicketChecklists_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketEquipmentScope`
--

DROP TABLE IF EXISTS `TicketEquipmentScope`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketEquipmentScope` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `equipment_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ticket_equipment` (`ticket_id`,`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketHistory`
--

DROP TABLE IF EXISTS `TicketHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketHistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `field_changed` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` text COLLATE utf8mb4_unicode_ci,
  `new_value` text COLLATE utf8mb4_unicode_ci,
  `changed_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'Sistema',
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_history_ticket` (`ticket_id`),
  KEY `idx_ticket_history_changed` (`changed_at`),
  CONSTRAINT `TicketHistory_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketNotes`
--

DROP TABLE IF EXISTS `TicketNotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketNotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `note_type` enum('General','Comentario','Diagnóstico','Solución','Seguimiento','Comunicación Cliente') COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `author` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'Sistema',
  `is_internal` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_notes_ticket` (`ticket_id`),
  KEY `idx_ticket_notes_created` (`created_at`),
  CONSTRAINT `TicketNotes_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketPhotos`
--

DROP TABLE IF EXISTS `TicketPhotos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketPhotos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `photo_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `photo_type` enum('Problema','Proceso','Solución','Otros','Evidencia','General') COLLATE utf8mb4_unicode_ci DEFAULT 'Otros',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_photos_ticket` (`ticket_id`),
  KEY `idx_ticket_photos_type` (`photo_type`),
  CONSTRAINT `TicketPhotos_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketSpareParts`
--

DROP TABLE IF EXISTS `TicketSpareParts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketSpareParts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `spare_part_id` int NOT NULL,
  `quantity_used` int NOT NULL DEFAULT '1',
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_spare_parts_ticket` (`ticket_id`),
  KEY `idx_ticket_spare_parts_part` (`spare_part_id`),
  CONSTRAINT `TicketSpareParts_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TicketSpareParts_ibfk_2` FOREIGN KEY (`spare_part_id`) REFERENCES `SpareParts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TicketTimeEntries`
--

DROP TABLE IF EXISTS `TicketTimeEntries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TicketTimeEntries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `technician_id` int DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_seconds` int DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_time_entries_ticket` (`ticket_id`),
  KEY `idx_time_entries_technician` (`technician_id`),
  CONSTRAINT `TicketTimeEntries_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TicketTimeEntries_ibfk_2` FOREIGN KEY (`technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Tickets`
--

DROP TABLE IF EXISTS `Tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('Abierto','En Progreso','En Espera','Resuelto','Cerrado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Abierto',
  `priority` enum('Baja','Media','Alta','Urgente') COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  `client_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `equipment_id` int DEFAULT NULL,
  `assigned_technician_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `due_date` datetime DEFAULT NULL,
  `sla_deadline` datetime DEFAULT NULL,
  `sla_status` enum('Normal','Warning','Violated') COLLATE utf8mb4_unicode_ci DEFAULT 'Normal',
  `ticket_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'individual',
  PRIMARY KEY (`id`),
  KEY `location_id` (`location_id`),
  KEY `equipment_id` (`equipment_id`),
  KEY `assigned_technician_id` (`assigned_technician_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_priority` (`priority`),
  KEY `idx_tickets_client` (`client_id`),
  KEY `idx_tickets_created` (`created_at`),
  CONSTRAINT `Tickets_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `Clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Tickets_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Tickets_ibfk_3` FOREIGN KEY (`equipment_id`) REFERENCES `Equipment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Tickets_ibfk_4` FOREIGN KEY (`assigned_technician_id`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TimeEntries`
--

DROP TABLE IF EXISTS `TimeEntries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TimeEntries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `entry_type` enum('Entrada','Salida','Pausa','Regreso') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `location_id` (`location_id`),
  KEY `idx_time_entries_user` (`user_id`),
  KEY `idx_time_entries_date` (`created_at`),
  KEY `idx_time_entries_type` (`entry_type`),
  CONSTRAINT `TimeEntries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimeEntries_ibfk_2` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TimeEntries_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `Locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Activo','Inactivo') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `role_id` int DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `Users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `Roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WorkPeriods`
--

DROP TABLE IF EXISTS `WorkPeriods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WorkPeriods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `start_time` timestamp NOT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `total_hours` decimal(5,2) DEFAULT '0.00',
  `regular_hours` decimal(5,2) DEFAULT '0.00',
  `overtime_hours` decimal(5,2) DEFAULT '0.00',
  `overtime_approved` tinyint(1) DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work_periods_user` (`user_id`),
  KEY `idx_work_periods_start` (`start_time`),
  CONSTRAINT `WorkPeriods_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WorkSchedules`
--

DROP TABLE IF EXISTS `WorkSchedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WorkSchedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `shift_type_id` int DEFAULT NULL,
  `start_time` time NOT NULL DEFAULT '09:00:00',
  `end_time` time NOT NULL DEFAULT '18:00:00',
  `break_minutes` int DEFAULT '60',
  `tolerance_minutes` int DEFAULT '15',
  `monday_start` time DEFAULT '09:00:00',
  `monday_end` time DEFAULT '18:00:00',
  `tuesday_start` time DEFAULT '09:00:00',
  `tuesday_end` time DEFAULT '18:00:00',
  `wednesday_start` time DEFAULT '09:00:00',
  `wednesday_end` time DEFAULT '18:00:00',
  `thursday_start` time DEFAULT '09:00:00',
  `thursday_end` time DEFAULT '18:00:00',
  `friday_start` time DEFAULT '09:00:00',
  `friday_end` time DEFAULT '18:00:00',
  `saturday_start` time DEFAULT NULL,
  `saturday_end` time DEFAULT NULL,
  `sunday_start` time DEFAULT NULL,
  `sunday_end` time DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `shift_type_id` (`shift_type_id`),
  CONSTRAINT `WorkSchedules_ibfk_1` FOREIGN KEY (`shift_type_id`) REFERENCES `ShiftTypes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!50001 DROP VIEW IF EXISTS `clients`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `clients` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `legal_name`,
 1 AS `rut`,
 1 AS `address`,
 1 AS `phone`,
 1 AS `email`,
 1 AS `business_activity`,
 1 AS `contact_name`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `contract_equipment`
--

DROP TABLE IF EXISTS `contract_equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_equipment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int DEFAULT NULL,
  `equipment_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_contract_equipment` (`contract_id`,`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `equipment`
--

DROP TABLE IF EXISTS `equipment`;
/*!50001 DROP VIEW IF EXISTS `equipment`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `equipment` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `type`,
 1 AS `brand`,
 1 AS `model`,
 1 AS `serial_number`,
 1 AS `custom_id`,
 1 AS `location_id`,
 1 AS `model_id`,
 1 AS `acquisition_date`,
 1 AS `last_maintenance_date`,
 1 AS `notes`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `equipmentnotes`
--

DROP TABLE IF EXISTS `equipmentnotes`;
/*!50001 DROP VIEW IF EXISTS `equipmentnotes`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `equipmentnotes` AS SELECT 
 1 AS `id`,
 1 AS `equipment_id`,
 1 AS `note`,
 1 AS `author`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!50001 DROP VIEW IF EXISTS `locations`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `locations` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `address`,
 1 AS `client_id`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `menu_roles`
--

DROP TABLE IF EXISTS `menu_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_roles` (
  `menu_item` varchar(100) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  PRIMARY KEY (`menu_item`,`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `spare_part_requests`
--

DROP TABLE IF EXISTS `spare_part_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `spare_part_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `spare_part_id` int DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `status` varchar(50) DEFAULT 'pending',
  `notes` text,
  `requested_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_sparepart_requests_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `Tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `spareparts`
--

DROP TABLE IF EXISTS `spareparts`;
/*!50001 DROP VIEW IF EXISTS `spareparts`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `spareparts` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `sku`,
 1 AS `current_stock`,
 1 AS `minimum_stock`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `description`,
 1 AS `category`,
 1 AS `brand`,
 1 AS `unit_price`,
 1 AS `location`,
 1 AS `image_url`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `ticketchecklists`
--

DROP TABLE IF EXISTS `ticketchecklists`;
/*!50001 DROP VIEW IF EXISTS `ticketchecklists`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `ticketchecklists` AS SELECT 
 1 AS `id`,
 1 AS `ticket_id`,
 1 AS `title`,
 1 AS `description`,
 1 AS `is_completed`,
 1 AS `completed_at`,
 1 AS `completed_by`,
 1 AS `order_index`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `ticketnotes`
--

DROP TABLE IF EXISTS `ticketnotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticketnotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `note_type` enum('General','Comentario','Diagnóstico','Solución','Seguimiento','Comunicación Cliente') COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `author` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'Sistema',
  `is_internal` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_notes_ticket` (`ticket_id`),
  KEY `idx_ticket_notes_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!50001 DROP VIEW IF EXISTS `tickets`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `tickets` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `description`,
 1 AS `status`,
 1 AS `priority`,
 1 AS `client_id`,
 1 AS `location_id`,
 1 AS `equipment_id`,
 1 AS `assigned_technician_id`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `due_date`,
 1 AS `sla_deadline`,
 1 AS `sla_status`,
 1 AS `ticket_type`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `ticketspareparts`
--

DROP TABLE IF EXISTS `ticketspareparts`;
/*!50001 DROP VIEW IF EXISTS `ticketspareparts`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `ticketspareparts` AS SELECT 
 1 AS `id`,
 1 AS `ticket_id`,
 1 AS `spare_part_id`,
 1 AS `quantity_used`,
 1 AS `unit_cost`,
 1 AS `notes`,
 1 AS `used_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `clients`
--

/*!50001 DROP VIEW IF EXISTS `clients`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `clients` AS select `Clients`.`id` AS `id`,`Clients`.`name` AS `name`,`Clients`.`legal_name` AS `legal_name`,`Clients`.`rut` AS `rut`,`Clients`.`address` AS `address`,`Clients`.`phone` AS `phone`,`Clients`.`email` AS `email`,`Clients`.`business_activity` AS `business_activity`,`Clients`.`contact_name` AS `contact_name`,`Clients`.`created_at` AS `created_at`,`Clients`.`updated_at` AS `updated_at` from `Clients` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `equipment`
--

/*!50001 DROP VIEW IF EXISTS `equipment`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `equipment` AS select `Equipment`.`id` AS `id`,`Equipment`.`name` AS `name`,`Equipment`.`type` AS `type`,`Equipment`.`brand` AS `brand`,`Equipment`.`model` AS `model`,`Equipment`.`serial_number` AS `serial_number`,`Equipment`.`custom_id` AS `custom_id`,`Equipment`.`location_id` AS `location_id`,`Equipment`.`model_id` AS `model_id`,`Equipment`.`acquisition_date` AS `acquisition_date`,`Equipment`.`last_maintenance_date` AS `last_maintenance_date`,`Equipment`.`notes` AS `notes`,`Equipment`.`created_at` AS `created_at`,`Equipment`.`updated_at` AS `updated_at` from `Equipment` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `equipmentnotes`
--

/*!50001 DROP VIEW IF EXISTS `equipmentnotes`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `equipmentnotes` AS select `EquipmentNotes`.`id` AS `id`,`EquipmentNotes`.`equipment_id` AS `equipment_id`,`EquipmentNotes`.`note` AS `note`,`EquipmentNotes`.`author` AS `author`,`EquipmentNotes`.`created_at` AS `created_at` from `EquipmentNotes` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `locations`
--

/*!50001 DROP VIEW IF EXISTS `locations`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `locations` AS select `Locations`.`id` AS `id`,`Locations`.`name` AS `name`,`Locations`.`address` AS `address`,`Locations`.`client_id` AS `client_id`,`Locations`.`created_at` AS `created_at`,`Locations`.`updated_at` AS `updated_at` from `Locations` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `spareparts`
--

/*!50001 DROP VIEW IF EXISTS `spareparts`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `spareparts` AS select `SpareParts`.`id` AS `id`,`SpareParts`.`name` AS `name`,`SpareParts`.`sku` AS `sku`,`SpareParts`.`current_stock` AS `current_stock`,`SpareParts`.`minimum_stock` AS `minimum_stock`,`SpareParts`.`created_at` AS `created_at`,`SpareParts`.`updated_at` AS `updated_at`,`SpareParts`.`description` AS `description`,`SpareParts`.`category` AS `category`,`SpareParts`.`brand` AS `brand`,`SpareParts`.`unit_price` AS `unit_price`,`SpareParts`.`location` AS `location`,`SpareParts`.`image_url` AS `image_url` from `SpareParts` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `ticketchecklists`
--

/*!50001 DROP VIEW IF EXISTS `ticketchecklists`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `ticketchecklists` AS select `TicketChecklists`.`id` AS `id`,`TicketChecklists`.`ticket_id` AS `ticket_id`,`TicketChecklists`.`title` AS `title`,`TicketChecklists`.`description` AS `description`,`TicketChecklists`.`is_completed` AS `is_completed`,`TicketChecklists`.`completed_at` AS `completed_at`,`TicketChecklists`.`completed_by` AS `completed_by`,`TicketChecklists`.`order_index` AS `order_index`,`TicketChecklists`.`created_at` AS `created_at` from `TicketChecklists` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `tickets`
--

/*!50001 DROP VIEW IF EXISTS `tickets`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `tickets` AS select `Tickets`.`id` AS `id`,`Tickets`.`title` AS `title`,`Tickets`.`description` AS `description`,`Tickets`.`status` AS `status`,`Tickets`.`priority` AS `priority`,`Tickets`.`client_id` AS `client_id`,`Tickets`.`location_id` AS `location_id`,`Tickets`.`equipment_id` AS `equipment_id`,`Tickets`.`assigned_technician_id` AS `assigned_technician_id`,`Tickets`.`created_at` AS `created_at`,`Tickets`.`updated_at` AS `updated_at`,`Tickets`.`due_date` AS `due_date`,`Tickets`.`sla_deadline` AS `sla_deadline`,`Tickets`.`sla_status` AS `sla_status`,`Tickets`.`ticket_type` AS `ticket_type` from `Tickets` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `ticketspareparts`
--

/*!50001 DROP VIEW IF EXISTS `ticketspareparts`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`gymtec_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `ticketspareparts` AS select `TicketSpareParts`.`id` AS `id`,`TicketSpareParts`.`ticket_id` AS `ticket_id`,`TicketSpareParts`.`spare_part_id` AS `spare_part_id`,`TicketSpareParts`.`quantity_used` AS `quantity_used`,`TicketSpareParts`.`unit_cost` AS `unit_cost`,`TicketSpareParts`.`notes` AS `notes`,`TicketSpareParts`.`used_at` AS `used_at` from `TicketSpareParts` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22  0:55:19
