# 🧪 Test Files Archive

**Archivos**: 43 archivos test-*.js  
**Fecha movido**: 6 de noviembre de 2025  
**Razón**: Limpieza de archivos de desarrollo/testing

---

## ⚠️ IMPORTANTE

Estos archivos son **scripts de testing** usados durante el desarrollo.  
**NO son necesarios** para el funcionamiento del sistema en producción.

---

## 📝 Contenido

Scripts de prueba para diferentes módulos:
- Tests de API endpoints
- Tests de autenticación
- Tests de módulos (tickets, equipos, inventario, etc.)
- Tests de integración
- Tests de flujos completos

---

## 🔄 Restaurar

```powershell
# Restaurar todos los archivos test
Move-Item *.js ..\..\

# Restaurar un archivo específico
Move-Item test-tickets-listing.js ..\..\
```

---

✅ **Seguro eliminar**: Sí, estos archivos son solo para testing
