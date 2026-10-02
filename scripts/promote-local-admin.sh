#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 correo-del-usuario-registrado" >&2
  exit 2
fi

email="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | xargs)"
if [[ ! "$email" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "El correo no parece válido." >&2
  exit 2
fi

updated_email="$(docker-compose exec -T db psql -At -v ON_ERROR_STOP=1 -U postgres -d taskmanager_db \
  -v email="$email" \
  -c "UPDATE users SET role = 'ADMIN' WHERE lower(btrim(email)) = :'email' RETURNING email;")"

if [[ -z "$updated_email" ]]; then
  echo "No encontré una cuenta registrada con ese correo." >&2
  exit 1
fi

echo "Cuenta promovida a ADMIN: $updated_email"
