#!/bin/bash

# Script para corregir nombres de tablas en el servidor VPS

SERVER_FILE="/var/www/gymtec/backend/src/server-clean.js"

echo "🔧 Corrigiendo nombres de tablas en server-clean.js..."

# Crear backup
cp "$SERVER_FILE" "$SERVER_FILE.backup"

# Reemplazar nombres de tablas (case-sensitive)
sed -i 's/FROM equipment /FROM Equipment /g' "$SERVER_FILE"
sed -i 's/JOIN equipment /JOIN Equipment /g' "$SERVER_FILE"
sed -i 's/INTO equipment /INTO Equipment /g' "$SERVER_FILE"
sed -i 's/UPDATE equipment /UPDATE Equipment /g' "$SERVER_FILE"

sed -i 's/FROM equipmentphotos/FROM EquipmentPhotos/g' "$SERVER_FILE"
sed -i 's/JOIN equipmentphotos/JOIN EquipmentPhotos/g' "$SERVER_FILE"
sed -i 's/INTO equipmentphotos/INTO EquipmentPhotos/g' "$SERVER_FILE"
sed -i 's/UPDATE equipmentphotos/UPDATE EquipmentPhotos/g' "$SERVER_FILE"
sed -i 's/DELETE FROM equipmentphotos/DELETE FROM EquipmentPhotos/g' "$SERVER_FILE"

sed -i 's/FROM equipmentnotes/FROM EquipmentNotes/g' "$SERVER_FILE"
sed -i 's/JOIN equipmentnotes/JOIN EquipmentNotes/g' "$SERVER_FILE"
sed -i 's/INTO equipmentnotes/INTO EquipmentNotes/g' "$SERVER_FILE"
sed -i 's/UPDATE equipmentnotes/UPDATE EquipmentNotes/g' "$SERVER_FILE"
sed -i 's/DELETE FROM equipmentnotes/DELETE FROM EquipmentNotes/g' "$SERVER_FILE"

sed -i 's/FROM equipmentmodels/FROM EquipmentModels/g' "$SERVER_FILE"
sed -i 's/JOIN equipmentmodels/JOIN EquipmentModels/g' "$SERVER_FILE"

sed -i 's/FROM locations /FROM Locations /g' "$SERVER_FILE"
sed -i 's/JOIN locations /JOIN Locations /g' "$SERVER_FILE"

sed -i 's/FROM clients /FROM Clients /g' "$SERVER_FILE"
sed -i 's/JOIN clients /JOIN Clients /g' "$SERVER_FILE"

sed -i 's/FROM tickets /FROM Tickets /g' "$SERVER_FILE"
sed -i 's/JOIN tickets /JOIN Tickets /g' "$SERVER_FILE"
sed -i 's/INTO tickets /INTO Tickets /g' "$SERVER_FILE"
sed -i 's/UPDATE tickets /UPDATE Tickets /g' "$SERVER_FILE"

echo "✅ Correcciones aplicadas"
echo "📁 Backup guardado en: $SERVER_FILE.backup"
echo ""
echo "🔄 Reiniciando servidor..."
pm2 restart gymtec-backend

echo "✅ Servidor reiniciado"
