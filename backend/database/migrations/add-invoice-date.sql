-- Migración: Agregar columna invoice_date a tabla Invoices
-- Fecha: 2026-02-03

-- Agregar columna invoice_date si no existe
ALTER TABLE Invoices 
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT NULL AFTER invoice_number;

-- Actualizar invoice_date con created_at para registros existentes
UPDATE Invoices 
SET invoice_date = DATE(created_at) 
WHERE invoice_date IS NULL;

-- Verificar cambio
SELECT id, invoice_number, invoice_date, due_date, created_at 
FROM Invoices 
LIMIT 5;
