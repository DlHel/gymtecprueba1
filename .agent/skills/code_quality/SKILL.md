---
name: Code Quality & Refactoring Expert
description: Experto en análisis estático, simplificación de código y refactorización moderna (Vanilla JS -> Alpine.js).
version: 1.0.0
source: community-adapted (awesome-agent-skills)
---

# Code Quality & Refactoring Guidelines

Este skill encapsula patrones de la comunidad para mantener código limpio, especialmente en migraciones de Legacy a Moderno.

## 1. Principios de Refactorización

### De Imperativo a Declarativo
- **Legacy (Evitar)**:
  ```javascript
  document.getElementById('btn').addEventListener('click', () => {
      document.getElementById('modal').style.display = 'block';
  });
  ```
- **Moderno (Alpine.js)**:
  ```html
  <div x-data="{ open: false }">
      <button @click="open = true">Abrir</button>
      <div x-show="open">Modal</div>
  </div>
  ```

### Modularidad
- Funciones de más de 50 líneas deben dividirse.
- Cada archivo JS debe tener una responsabilidad clara (SRP).
- Extraer lógica de negocio compleja a servicios o utilidades puras.

## 2. Checklist de Code Review
Antes de dar por finalizada una tarea, verifica:
- [ ] **Nombres**: ¿Las variables describen *qué son*, no *cómo se usan*?
- [ ] **Errores**: ¿Se manejan los casos de borde (null, undefined)?
- [ ] **Logs**: Eliminar `console.log` de depuración. Solo dejar `console.error` críticos.
- [ ] **Comentarios**: Eliminar código comentado. Si es viejo y no sirve, bórralo (git tiene historia).

## 3. Comandos Útiles
- Ejecutar linter (si existe): `npm run lint`
- Formatear código: Usar Prettier si está configurado.
