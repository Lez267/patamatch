#!/usr/bin/env bash
set -e

# Cambiar a la carpeta del proyecto
cd "$(dirname "$0")"

echo "=================================================="
echo "🐾 INICIANDO PATAMATCH (Localhost + Red Local)"
echo "=================================================="

# Liberar puerto 3000 si quedó algún proceso previo colgado
PID_3000=$(lsof -ti :3000 2>/dev/null || true)
if [ -n "$PID_3000" ]; then
  echo "ℹ️  Cerrando proceso previo en el puerto 3000..."
  kill -9 $PID_3000 2>/dev/null || true
  sleep 1
fi

# Detectar IP local para acceso desde celular
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "🚀 Servidor disponible en:"
echo "   💻 En tu computadora:       http://localhost:3000"
if [ "$LOCAL_IP" != "localhost" ] && [ -n "$LOCAL_IP" ]; then
echo "   📱 En tu celular (Wi-Fi):   http://$LOCAL_IP:3000"
fi
echo ""
echo "Presiona Ctrl + C para detener el servidor cuando termines."
echo "=================================================="
echo ""

# Ejecutar el runner local (base de datos postgres + seed + Next.js)
npm run local
