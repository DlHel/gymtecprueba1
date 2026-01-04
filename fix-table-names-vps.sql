-- Script para verificar y corregir nombres de tablas en VPS
-- MySQL en Linux es case-sensitive, necesitamos tablas en lowercase

USE gymtec_erp;

-- 1. Verificar tablas existentes
SHOW TABLES;

-- 2. Renombrar tablas a lowercase si existen en uppercase
-- (Solo ejecutar si las tablas están en mayúsculas/mixcase)

-- Tablas críticas para equipos
RENAME TABLE IF EXISTS EquipmentPhotos TO equipmentphotos;
RENAME TABLE IF EXISTS EquipmentNotes TO equipmentnotes;
RENAME TABLE IF EXISTS Equipment TO equipment;
RENAME TABLE IF EXISTS EquipmentModels TO equipmentmodels;

-- Tablas de tickets
RENAME TABLE IF EXISTS Tickets TO tickets;
RENAME TABLE IF EXISTS TicketPhotos TO ticketphotos;
RENAME TABLE IF EXISTS TicketChecklist TO ticketchecklist;
RENAME TABLE IF EXISTS Ticket_Equipment_Scope TO ticket_equipment_scope;

-- Tablas de clientes y ubicaciones
RENAME TABLE IF EXISTS Clients TO clients;
RENAME TABLE IF EXISTS Locations TO locations;

-- Tablas de usuarios
RENAME TABLE IF EXISTS Users TO users;

-- Tablas de inventario
RENAME TABLE IF EXISTS Inventory TO inventory;
RENAME TABLE IF EXISTS InventoryMovements TO inventorymovements;
RENAME TABLE IF EXISTS Suppliers TO suppliers;
RENAME TABLE IF EXISTS PurchaseOrders TO purchaseorders;
RENAME TABLE IF EXISTS PurchaseOrderItems TO purchaseorderitems;

-- Tablas de contratos
RENAME TABLE IF EXISTS Contracts TO contracts;
RENAME TABLE IF EXISTS ContractSLA TO contractsla;

-- Tablas de personal
RENAME TABLE IF EXISTS Technicians TO technicians;
RENAME TABLE IF EXISTS TechnicianAvailability TO technicianavailability;

-- Tablas de finanzas
RENAME TABLE IF EXISTS Invoices TO invoices;
RENAME TABLE IF EXISTS InvoiceItems TO invoiceitems;

-- Tablas de notificaciones
RENAME TABLE IF EXISTS Notifications TO notifications;

-- Tablas de asistencia
RENAME TABLE IF EXISTS AttendanceRecords TO attendancerecords;
RENAME TABLE IF EXISTS WorkSchedules TO workschedules;
RENAME TABLE IF EXISTS ShiftTypes TO shifttypes;
RENAME TABLE IF EXISTS EmployeeSchedules TO employeeschedules;

-- Tablas de repuestos
RENAME TABLE IF EXISTS SpareParts TO spareparts;
RENAME TABLE IF EXISTS SparePartMovements TO sparepartmovements;

-- Tablas de checklist
RENAME TABLE IF EXISTS ChecklistTemplates TO checklisttemplates;

-- 3. Verificar que las tablas estén en lowercase
SELECT '=== TABLAS DESPUÉS DEL RENOMBRADO ===' AS status;
SHOW TABLES;

-- 4. Verificar estructura de tablas críticas
SELECT '=== ESTRUCTURA equipmentphotos ===' AS status;
DESC equipmentphotos;

SELECT '=== ESTRUCTURA equipmentnotes ===' AS status;
DESC equipmentnotes;

SELECT '=== ESTRUCTURA ticket_equipment_scope ===' AS status;
DESC ticket_equipment_scope;

SELECT '=== ESTRUCTURA equipment ===' AS status;
DESC equipment;

-- 5. Verificar conteo de datos
SELECT '=== CONTEO DE DATOS ===' AS status;
SELECT 
    'equipment' as tabla, 
    COUNT(*) as registros 
FROM equipment
UNION ALL
SELECT 'equipmentphotos', COUNT(*) FROM equipmentphotos
UNION ALL
SELECT 'equipmentnotes', COUNT(*) FROM equipmentnotes
UNION ALL
SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'equipmentmodels', COUNT(*) FROM equipmentmodels
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'users', COUNT(*) FROM users;

SELECT '=== VERIFICACIÓN COMPLETA ===' AS status;
