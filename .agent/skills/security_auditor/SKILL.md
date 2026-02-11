---
name: Security Auditor
description: Auditor de seguridad enfocado en prevención de vulnerabilidades OWASP (SQLi, XSS, Broken Auth) en entornos Node.js/Express.
version: 1.0.0
source: community-adapted (hoodini/security)
---

# Security Audit Guidelines

Este skill define los controles de seguridad obligatorios para el proyecto GymTec.

## 1. Validación de Inputs (Zero Trust)
- **Regla de Oro**: NUNCA confiar en el `req.body` o `req.params`.
- **Implementación**: Usar `Zod` para definir esquemas estrictos.
  - Rechazar campos desconocidos (`.strict()`).
  - Validar formatos (email, uuid, fechas).

## 2. Base de Datos (SQL Injection)
- **Prohibido**: Concatenar strings en queries.
  ```javascript
  // ❌ INSEGURO
  db.query("SELECT * FROM users WHERE name = '" + name + "'");
  ```
- **Obligatorio**: Usar parámetros preparados (Binding).
  ```javascript
  // ✅ SEGURO
  db.query("SELECT * FROM users WHERE name = ?", [name]);
  ```

## 3. Autenticación y Autorización
- Proteger TODAS las rutas `/api/` con middleware `authenticateToken`.
- Validar roles de usuario para acciones destructivas (`DELETE`, `UPDATE`).

## 4. Exposición de Datos
- No devolver contraseñas (ni hasheadas) en respuestas JSON.
- En errores 500, no devolver stacktraces al cliente en producción.
