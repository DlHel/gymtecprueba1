---
name: Security Auditor
description: Controles de seguridad prácticos para Gymtec ERP en su baseline Docker actual.
version: 2.0.0
---

# Security Audit Guidelines

Este skill funciona como especialista de seguridad dentro del esquema multiagente del proyecto.

## 1. Secretos y configuración

- Nunca dejar contraseñas, JWTs, IPs productivas o comandos con credenciales en el repo.
- Todo valor sensible debe venir por entorno.
- Revisar especialmente `.env*`, `config.env`, documentación de operaciones y scripts shell.

## 2. API y autenticación

- Rutas protegidas deben pasar por `authenticateToken`.
- No devolver datos sensibles en respuestas ni errores de producción.
- Mantener `/api/health` libre de dependencias sensibles para smoke tests y healthchecks.

## 3. Base de datos

- Usar queries parametrizadas.
- No introducir SQL construido con concatenación de valores del usuario.
- Si el esquema real difiere del supuesto, documentarlo antes de cambiar queries críticas.

## 4. Deploy

- Solo se considera soportado el camino Docker Compose detrás de Nginx.
- No reintroducir flujos PM2/VPS/manuales en scripts o docs activos.
