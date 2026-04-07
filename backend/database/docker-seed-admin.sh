#!/bin/sh
set -eu

if [ -n "${APP_ADMIN_PASSWORD_HASH_FILE:-}" ] && [ -f "$APP_ADMIN_PASSWORD_HASH_FILE" ]; then
    APP_ADMIN_PASSWORD_HASH="$(cat "$APP_ADMIN_PASSWORD_HASH_FILE")"
    export APP_ADMIN_PASSWORD_HASH
fi

if [ -z "${APP_ADMIN_USERNAME:-}" ] || [ -z "${APP_ADMIN_PASSWORD_HASH:-}" ]; then
    echo "Skipping admin bootstrap: APP_ADMIN_USERNAME/APP_ADMIN_PASSWORD_HASH not set."
    exit 0
fi

sql_escape() {
    printf "%s" "$1" | sed "s/'/''/g"
}

ADMIN_USERNAME_ESCAPED="$(sql_escape "$APP_ADMIN_USERNAME")"
ADMIN_PASSWORD_HASH_ESCAPED="$(sql_escape "$APP_ADMIN_PASSWORD_HASH")"
ADMIN_EMAIL_ESCAPED="$(sql_escape "${APP_ADMIN_EMAIL:-admin@gymtec.local}")"
ADMIN_ROLE_ESCAPED="$(sql_escape "${APP_ADMIN_ROLE:-Admin}")"

if [ -n "${MYSQL_ROOT_PASSWORD_FILE:-}" ] && [ -f "$MYSQL_ROOT_PASSWORD_FILE" ]; then
    MYSQL_ROOT_PASSWORD="$(cat "$MYSQL_ROOT_PASSWORD_FILE")"
    export MYSQL_ROOT_PASSWORD
fi

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" <<SQL
INSERT INTO Users (username, email, password, role, status)
VALUES (
    '${ADMIN_USERNAME_ESCAPED}',
    '${ADMIN_EMAIL_ESCAPED}',
    '${ADMIN_PASSWORD_HASH_ESCAPED}',
    '${ADMIN_ROLE_ESCAPED}',
    'Activo'
)
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    password = VALUES(password),
    role = VALUES(role),
    status = VALUES(status);
SQL

echo "Admin bootstrap user ensured for ${APP_ADMIN_USERNAME}."
