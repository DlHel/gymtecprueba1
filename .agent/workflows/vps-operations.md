---
description: Workflow para operaciones del VPS con auto-ejecución
---

# VPS Operations Workflow

Este workflow permite ejecutar comandos en el VPS sin requerir aprobación manual.

// turbo-all

## Comandos comunes:

1. Subir archivos al VPS:
```bash
scp -o BatchMode=yes [archivo_local] root@91.107.237.159:/var/www/gymtec/[ruta_destino]
```

2. Reiniciar backend:
```bash
ssh root@91.107.237.159 "pm2 restart gymtec-backend"
```

3. Ver logs:
```bash
ssh root@91.107.237.159 "pm2 logs gymtec-backend --lines 20 --nostream"
```

4. Ejecutar SQL:
```bash
scp [archivo.sql] root@91.107.237.159:/root/query.sql && ssh root@91.107.237.159 "mysql -u gymtec_user -p'k/kKDJBZeLPa+KkborYduq4Dbfm1M06eOdXmz19aINc=' gymtec_erp < /root/query.sql"
```

5. Verificar estado:
```bash
ssh root@91.107.237.159 "pm2 status"
```
