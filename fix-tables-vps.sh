#!/bin/bash
# Script para corregir nombres de tablas en el VPS
# Ejecutar en el VPS como: bash fix-tables-vps.sh

echo "============================================"
echo "🔧 Corrección de Tablas en VPS - Gymtec ERP"
echo "============================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración de base de datos
DB_NAME="gymtec_erp"
DB_USER="root"
DB_PASS="gscnxhmEAEWU"

echo -e "${YELLOW}📋 Paso 1: Verificando tablas existentes...${NC}"
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "SHOW TABLES;" 

echo ""
echo -e "${YELLOW}🔄 Paso 2: Aplicando correcciones de nombres de tablas...${NC}"

# Crear archivo temporal con los comandos SQL
cat > /tmp/fix-tables.sql << 'EOF'
USE gymtec_erp;

-- Renombrar tablas críticas a lowercase
SET FOREIGN_KEY_CHECKS = 0;

-- Equipment y relacionadas
RENAME TABLE IF EXISTS EquipmentPhotos TO equipmentphotos;
RENAME TABLE IF EXISTS EquipmentNotes TO equipmentnotes;
RENAME TABLE IF EXISTS Equipment TO equipment;
RENAME TABLE IF EXISTS EquipmentModels TO equipmentmodels;

-- Tickets
RENAME TABLE IF EXISTS Tickets TO tickets;
RENAME TABLE IF EXISTS TicketPhotos TO ticketphotos;
RENAME TABLE IF EXISTS TicketChecklist TO ticketchecklist;
RENAME TABLE IF EXISTS Ticket_Equipment_Scope TO ticket_equipment_scope;

-- Clientes
RENAME TABLE IF EXISTS Clients TO clients;
RENAME TABLE IF EXISTS Locations TO locations;

-- Usuarios
RENAME TABLE IF EXISTS Users TO users;

-- Inventario
RENAME TABLE IF EXISTS Inventory TO inventory;
RENAME TABLE IF EXISTS InventoryMovements TO inventorymovements;
RENAME TABLE IF EXISTS Suppliers TO suppliers;
RENAME TABLE IF EXISTS PurchaseOrders TO purchaseorders;
RENAME TABLE IF EXISTS PurchaseOrderItems TO purchaseorderitems;

-- Contratos
RENAME TABLE IF EXISTS Contracts TO contracts;
RENAME TABLE IF EXISTS ContractSLA TO contractsla;

-- Personal
RENAME TABLE IF EXISTS Technicians TO technicians;
RENAME TABLE IF EXISTS TechnicianAvailability TO technicianavailability;

-- Finanzas
RENAME TABLE IF EXISTS Invoices TO invoices;
RENAME TABLE IF EXISTS InvoiceItems TO invoiceitems;

-- Notificaciones
RENAME TABLE IF EXISTS Notifications TO notifications;

-- Asistencia
RENAME TABLE IF EXISTS AttendanceRecords TO attendancerecords;
RENAME TABLE IF EXISTS WorkSchedules TO workschedules;
RENAME TABLE IF EXISTS ShiftTypes TO shifttypes;
RENAME TABLE IF EXISTS EmployeeSchedules TO employeeschedules;

-- Repuestos
RENAME TABLE IF EXISTS SpareParts TO spareparts;
RENAME TABLE IF EXISTS SparePartMovements TO sparepartmovements;

-- Checklist
RENAME TABLE IF EXISTS ChecklistTemplates TO checklisttemplates;

-- Informes
RENAME TABLE IF EXISTS InformesTecnicos TO informestecnicos;
RENAME TABLE IF EXISTS InformeTecnicoDetalle TO informetecnicodetalle;
RENAME TABLE IF EXISTS InformeTecnicoPhotos TO informetecnicophotos;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ Tablas renombradas exitosamente' AS status;
EOF

# Ejecutar el script SQL
mysql -u $DB_USER -p$DB_PASS < /tmp/fix-tables.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Correcciones aplicadas exitosamente${NC}"
else
    echo -e "${RED}❌ Error aplicando correcciones${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📊 Paso 3: Verificando tablas después de correcciones...${NC}"
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "SHOW TABLES;" | grep -E "equipment|ticket|client|location"

echo ""
echo -e "${YELLOW}🔍 Paso 4: Verificando estructura de tablas críticas...${NC}"

# Verificar equipmentphotos
echo -e "${GREEN}Tabla: equipmentphotos${NC}"
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "DESC equipmentphotos;" 2>/dev/null || echo -e "${RED}⚠️  Tabla no existe${NC}"

# Verificar equipmentnotes
echo -e "${GREEN}Tabla: equipmentnotes${NC}"
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "DESC equipmentnotes;" 2>/dev/null || echo -e "${RED}⚠️  Tabla no existe${NC}"

# Verificar ticket_equipment_scope
echo -e "${GREEN}Tabla: ticket_equipment_scope${NC}"
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "DESC ticket_equipment_scope;" 2>/dev/null || echo -e "${RED}⚠️  Tabla no existe${NC}"

echo ""
echo -e "${YELLOW}📈 Paso 5: Conteo de registros...${NC}"
mysql -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 'equipment' as tabla, COUNT(*) as registros FROM equipment
UNION ALL
SELECT 'equipmentphotos', COUNT(*) FROM equipmentphotos
UNION ALL
SELECT 'equipmentnotes', COUNT(*) FROM equipmentnotes
UNION ALL
SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'users', COUNT(*) FROM users;
EOF

echo ""
echo -e "${GREEN}✅ Verificación completada${NC}"
echo ""
echo -e "${YELLOW}💡 Siguiente paso: Reiniciar el backend${NC}"
echo "cd /root/gymtecprueba1/backend && pm2 restart gymtec-backend"

# Limpiar archivo temporal
rm -f /tmp/fix-tables.sql
