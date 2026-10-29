#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")/.."

if [[ ! -t 0 ]]; then
  printf 'Ejecuta este comando en tu terminal interactiva.\n' >&2
  exit 1
fi

connection=''
password=''
confirmation=''
trap 'unset connection password confirmation' EXIT
printf 'Restablecerá solo patamatchadmin@gmail.com y cerrará sus sesiones anteriores.\n'
read -r -s -p 'Pega la conexión de Neon de producción (no se mostrará): ' connection
printf '\n'
read -r -s -p 'Nueva contraseña privada (mínimo 16 caracteres): ' password
printf '\n'
read -r -s -p 'Repite la contraseña: ' confirmation
printf '\n'
if [[ "$password" != "$confirmation" ]]; then
  printf 'Las contraseñas no coinciden. No se cambió nada.\n' >&2
  exit 1
fi
read -r -p 'Escribe patamatchadmin@gmail.com para confirmar: ' email
if [[ "$email" != 'patamatchadmin@gmail.com' ]]; then
  printf 'Confirmación incorrecta. No se cambió nada.\n' >&2
  exit 1
fi
printf '%s\0%s\0%s\0' "$connection" "$email" "$password" | node --import tsx scripts/reset-admin-password.mjs
