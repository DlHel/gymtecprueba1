#!/bin/bash
# Migración invoice_date - Sintaxis MySQL compatible

mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp -e "
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='gymtec_erp' AND TABLE_NAME='Invoices' AND COLUMN_NAME='invoice_date');
SET @query := IF(@exist = 0, 'ALTER TABLE Invoices ADD COLUMN invoice_date DATE DEFAULT NULL AFTER invoice_number', 'SELECT \"Column already exists\" AS status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
UPDATE Invoices SET invoice_date = DATE(created_at) WHERE invoice_date IS NULL;
SELECT 'Migration completed' AS status;
"
