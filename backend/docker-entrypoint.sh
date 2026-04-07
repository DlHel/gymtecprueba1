#!/bin/sh
set -eu

mkdir -p /app/uploads/models /app/uploads/reports
chown -R node:node /app/uploads

exec gosu node "$@"
