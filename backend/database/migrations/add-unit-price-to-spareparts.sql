-- =====================================================
-- MIGRACIÓN: Agregar columna unit_price a SpareParts
-- Fecha: 2025-12-09
-- Descripción: Permite registrar el precio unitario de cada repuesto
--              para cálculo automático de gastos en tickets
-- =====================================================

-- Agregar columna de precio unitario
ALTER TABLE `SpareParts` ADD COLUMN `unit_price` DECIMAL(10,2) DEFAULT 0 AFTER `minimum_stock`;

-- Agregar columna de costo de compra (opcional, para cálculo de margen)
ALTER TABLE `SpareParts` ADD COLUMN `purchase_cost` DECIMAL(10,2) DEFAULT 0 AFTER `unit_price`;

-- Actualizar algunos repuestos con precios de ejemplo (opcional)
-- UPDATE SpareParts SET unit_price = 15000, purchase_cost = 10000 WHERE sku = 'LUBE-KIT';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
