#!/bin/bash
# Script para aplicar fixes al servidor VPS

echo "======================================================================"
echo "🚀 APLICANDO CORRECCIONES AL SERVIDOR VPS - GYMTEC ERP"
echo "======================================================================"
echo ""

VPS_IP="91.107.237.159"
VPS_USER="root"
VPS_PASSWORD="gscnxhmEAEWU"
PROJECT_PATH="/var/www/gymtec"

echo "📡 Conectando al VPS..."
echo ""

# Crear archivo temporal con los comandos a ejecutar
cat > /tmp/vps-fix-commands.sh << 'SCRIPT_END'
#!/bin/bash
cd /var/www/gymtec/backend/src

echo "📁 Backup del servidor actual..."
cp server-clean.js server-clean.js.backup.$(date +%Y%m%d_%H%M%S)

echo "✅ Backup creado"
echo ""
echo "🔄 Reiniciando servidor backend..."

# Encontrar proceso de Node y matarlo
pkill -f "node.*server-clean.js" || echo "No hay proceso previo"

# Esperar un segundo
sleep 2

# Iniciar servidor en background
cd /var/www/gymtec/backend
nohup npm start > /var/www/gymtec/logs/backend.log 2>&1 &

echo "✅ Servidor reiniciado"
echo ""
echo "📊 Verificando estado del servidor..."
sleep 3

if pgrep -f "node.*server-clean.js" > /dev/null; then
    echo "✅ Servidor backend está corriendo"
    echo "PID: $(pgrep -f 'node.*server-clean.js')"
else
    echo "❌ ERROR: El servidor no está corriendo"
    exit 1
fi

echo ""
echo "======================================================================"
echo "✅ CORRECCIONES APLICADAS EXITOSAMENTE"
echo "======================================================================"
SCRIPT_END

chmod +x /tmp/vps-fix-commands.sh

echo "📤 Subiendo archivo corregido al VPS..."
scp backend/src/server-clean.js ${VPS_USER}@${VPS_IP}:${PROJECT_PATH}/backend/src/

echo ""
echo "🔧 Ejecutando comandos de reinicio en VPS..."
ssh ${VPS_USER}@${VPS_IP} 'bash -s' < /tmp/vps-fix-commands.sh

echo ""
echo "🧪 Probando endpoints corregidos..."
echo ""

# Probar algunos endpoints
echo "1️⃣ Probando /api/dashboard/activity..."
curl -s http://${VPS_IP}/api/dashboard/activity?limit=5 -H "Authorization: Bearer YOUR_TOKEN" | head -c 200
echo "..."
echo ""

echo "2️⃣ Probando /api/locations/5/equipment..."
curl -s http://${VPS_IP}/api/locations/5/equipment -H "Authorization: Bearer YOUR_TOKEN" | head -c 200
echo "..."
echo ""

echo "======================================================================"
echo "✅ PROCESO COMPLETADO"
echo "======================================================================"
echo ""
echo "📝 Próximos pasos:"
echo "  1. Verificar en el navegador que el sistema funciona"
echo "  2. Revisar logs en: /var/www/gymtec/logs/backend.log"
echo "  3. Probar cada módulo sistemáticamente"
echo ""
