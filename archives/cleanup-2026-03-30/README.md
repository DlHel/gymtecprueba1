# Archivo de limpieza 2026-03-30

Este directorio contiene material retirado del árbol operativo para mantener la arquitectura activa legible y segura.

## Secciones

- `backend-src/`: entrypoints y rutas backend legacy.
- `backend-tests-legacy/`: tests antiguos contra entornos remotos o fuera del baseline actual.
- `scripts-legacy/`: utilidades y automatizaciones antiguas fuera del flujo soportado.
- `planning/`: documentos de planificación no operativos.
- `logs-artifacts/`: logs locales generados.
- `e2e-artifacts/`: salidas de pruebas E2E no vigentes.
- `react-cra/`: frontend React/CRA archivado.
- `repo-root-legacy/`: scripts, SQL, parches, BAT/SH y archivos temporales que antes ensuciaban la raíz del repo.

## Criterio

- El contenido aquí no participa del deploy soportado por Docker Compose.
- No debe reactivarse sin revisión explícita de seguridad y compatibilidad.
