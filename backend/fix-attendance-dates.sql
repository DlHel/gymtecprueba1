-- Fix para corregir horas trabajadas negativas en Attendance
-- Este script limpia los registros con horas negativas

-- Eliminar registros con horas negativas
DELETE FROM Attendance WHERE worked_hours < 0;

-- Opcional: Si quieres corregir en lugar de eliminar, usa esto:
-- UPDATE Attendance 
-- SET worked_hours = ABS(worked_hours) 
-- WHERE worked_hours < 0;

SELECT 'Registros de asistencia con horas negativas eliminados' as resultado;
