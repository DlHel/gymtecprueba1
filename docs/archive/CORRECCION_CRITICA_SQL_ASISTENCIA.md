# 🚨 CORRECCIÓN CRÍTICA: Sintaxis SQL de Asistencia

## PROBLEMA DETECTADO

**CRÍTICO**: Los endpoints de asistencia están usando sintaxis **SQLite** pero la base de datos es **MySQL**. Esto causará errores 500 en TODAS las operaciones del módulo.

## CONVERSIONES NECESARIAS

### SQLite → MySQL

| SQLite | MySQL |
|--------|-------|
| `DATE('now')` | `CURDATE()` |
| `DATE("now")` | `CURDATE()` |
| `strftime('%w', 'now')` | `DAYOFWEEK(NOW())` |
| `strftime('%Y', date)` | `YEAR(date)` |
| `strftime('%m', date)` | `MONTH(date)` |
| `datetime('now')` | `NOW()` |

## ENDPOINTS AFECTADOS (20+ queries)

1. `/api/employee-schedules/:userId/active` (línea 5341-5342)
2. `/api/attendance/today` (línea 5441)
3. `/api/attendance/check-in` (línea 5456, 5478, 5491-5492, 5545)
4. `/api/attendance/check-out` (línea ~5570+)
5. `/api/holidays` (línea 5847)
6. `/api/attendance/summary/:userId` (línea 5908)
7. `/api/attendance/stats` (línea 5927-5928)

## IMPACTO

Sin esta corrección:
- ❌ No se podrá marcar entrada/salida
- ❌ No se mostrará asistencia del día
- ❌ No funcionarán reportes
- ❌ Error 500 en todas las operaciones

## ESTADO

🔄 **CORRECCIÓN EN PROCESO**
