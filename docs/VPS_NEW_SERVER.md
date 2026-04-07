# Despliegue en VPS nuevo

Esta es la ruta estándar para levantar Gymtec en un VPS nuevo usando Docker Compose, Nginx interno y secretos montados como archivos.

## Requisitos

- Docker Engine y Docker Compose Plugin instalados.
- Puerto externo disponible para Gymtec, por defecto `8082`.
- Proxy frontal del VPS, si existe, apuntando desde `80/443` hacia `127.0.0.1:8082`.
- Firewall permitiendo solo `80/443` públicamente; `3000` y MySQL no deben quedar expuestos.

## Preparar entorno

```bash
git clone https://github.com/DlHel/gymtecprueba1.git
cd gymtecprueba1
git checkout codex/modular-monolith-refactor
cp vps.env.example .env
mkdir -p secrets
openssl rand -base64 48 > secrets/mysql_root_password.txt
openssl rand -base64 48 > secrets/db_password.txt
openssl rand -base64 64 > secrets/jwt_secret.txt
```

Edita `.env` y define al menos:

```bash
CORS_ORIGIN=https://tu-dominio.example
HTTP_PORT=8082
APP_ADMIN_USERNAME=admin
APP_ADMIN_EMAIL=admin@tu-dominio.example
```

## Crear hash bcrypt para admin inicial

Genera el hash localmente o en el VPS:

```bash
cd backend
npm ci
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash(process.argv[1],12).then(console.log)" "CAMBIA_ESTA_CLAVE"
cd ..
```

Copia el resultado completo a:

```bash
secrets/app_admin_password_hash.txt
```

No guardes la contraseña plana en el repo ni en `.env`.

## Levantar stack estándar VPS

```bash
docker compose -f docker-compose.vps.yml --env-file .env up --build -d
docker compose -f docker-compose.vps.yml --env-file .env ps
```

Todos los servicios deben quedar `healthy`.

## Validación post-deploy

```bash
curl -f http://127.0.0.1:8082/healthz
curl -f http://127.0.0.1:8082/api/health
```

Luego revisa en navegador:

- Login
- Tickets
- Inventario
- Finanzas
- Reportes
- Descarga autenticada de PDF

## Backups mínimos

Respaldar volúmenes antes de upgrades:

```bash
mkdir -p backups
docker run --rm -v gymtec_mysql_data:/var/lib/mysql -v "$PWD/backups:/backup" alpine tar czf /backup/mysql_data_$(date +%F).tgz /var/lib/mysql
docker run --rm -v gymtec_uploads_data:/uploads -v "$PWD/backups:/backup" alpine tar czf /backup/uploads_$(date +%F).tgz /uploads
```

## Notas de seguridad

- No expongas `backend:3000` ni `mysql:3306` a internet.
- Usa `docker-compose.vps.yml` para VPS nuevo; `docker-compose.yml` queda como modo simple con `.env`.
- `uploads/reports` no es público; debe descargarse por endpoints autenticados.
- Rota `jwt_secret.txt`, `db_password.txt` y `mysql_root_password.txt` si alguien fuera del equipo tuvo acceso al servidor.

