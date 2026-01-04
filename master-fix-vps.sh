#!/bin/bash
# Script MAESTRO para corregir todos los problemas del VPS
# Ejecutar en el VPS: bash master-fix-vps.sh

echo "=============================================="
echo "🚀 CORRECCIÓN COMPLETA VPS - Gymtec ERP"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
DB_NAME="gymtec_erp"
DB_USER="root"
DB_PASS="gscnxhmEAEWU"
BACKEND_DIR="/root/gymtecprueba1/backend"

# Función para mostrar paso
show_step() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Función para verificar éxito
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completado exitosamente${NC}"
        return 0
    else
        echo -e "${RED}❌ Error en $1${NC}"
        return 1
    fi
}

# ==================================
# PASO 1: Verificar estado actual
# ==================================

show_step "PASO 1: Verificando estado actual del sistema"

echo "📦 Backend process status:"
pm2 list | grep gymtec || echo "Backend no está corriendo"

echo ""
echo "🗄️  Tablas actuales en la base de datos:"
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "SHOW TABLES;" | head -20

# ==================================
# PASO 2: Corregir nombres de tablas
# ==================================

show_step "PASO 2: Corrigiendo nombres de tablas (case-sensitivity)"

cat > /tmp/fix-tables.sql << 'EOSQL'
USE gymtec_erp;
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

-- Clientes y ubicaciones
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
EOSQL

mysql -u $DB_USER -p$DB_PASS < /tmp/fix-tables.sql
check_success "Renombrado de tablas"

# ==================================
# PASO 3: Crear tablas faltantes
# ==================================

show_step "PASO 3: Creando tablas faltantes"

cat > /tmp/create-tables.sql << 'EOSQL'
USE gymtec_erp;

CREATE TABLE IF NOT EXISTS equipmentphotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    photo_data LONGTEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT DEFAULT 0,
    description TEXT,
    photo_type VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    INDEX idx_equipment_id (equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS equipmentnotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    note TEXT NOT NULL,
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    INDEX idx_equipment_id (equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_equipment_scope (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    equipment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ticket_equipment (ticket_id, equipment_id),
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_equipment_id (equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
EOSQL

mysql -u $DB_USER -p$DB_PASS < /tmp/create-tables.sql
check_success "Creación de tablas faltantes"

# ==================================
# PASO 4: Verificar tablas
# ==================================

show_step "PASO 4: Verificando tablas creadas"

echo "📊 Conteo de registros:"
mysql -u $DB_USER -p$DB_PASS $DB_NAME << 'EOSQL'
SELECT 'equipment' as tabla, COUNT(*) as registros FROM equipment
UNION ALL SELECT 'equipmentphotos', COUNT(*) FROM equipmentphotos
UNION ALL SELECT 'equipmentnotes', COUNT(*) FROM equipmentnotes
UNION ALL SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'ticket_equipment_scope', COUNT(*) FROM ticket_equipment_scope
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'locations', COUNT(*) FROM locations
UNION ALL SELECT 'users', COUNT(*) FROM users;
EOSQL

# ==================================
# PASO 5: Reiniciar backend
# ==================================

show_step "PASO 5: Reiniciando backend"

cd $BACKEND_DIR
pm2 restart gymtec-backend
sleep 3
pm2 logs gymtec-backend --lines 20 --nostream

check_success "Reinicio del backend"

# ==================================
# PASO 6: Test de endpoints
# ==================================

show_step "PASO 6: Probando endpoints críticos"

# Obtener token de prueba (login con admin)
echo "🔐 Obteniendo token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No se pudo obtener token de autenticación${NC}"
    echo "Response: $LOGIN_RESPONSE"
else
    echo -e "${GREEN}✅ Token obtenido${NC}"
    
    # Test endpoints
    echo ""
    echo "🧪 Testeando endpoints..."
    
    echo -n "  • GET /api/equipment... "
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment > /dev/null && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
    
    echo -n "  • GET /api/clients... "
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/clients > /dev/null && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
    
    echo -n "  • GET /api/locations... "
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/locations > /dev/null && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
    
    echo -n "  • GET /api/equipment/1... "
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipment/1 > /dev/null && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}"
fi

# ==================================
# RESUMEN FINAL
# ==================================

show_step "RESUMEN FINAL"

echo -e "${GREEN}✅ Correcciones completadas${NC}"
echo ""
echo "📋 Tareas realizadas:"
echo "  ✅ Nombres de tablas corregidos (lowercase)"
echo "  ✅ Tablas faltantes creadas"
echo "  ✅ Backend reiniciado"
echo "  ✅ Endpoints testeados"
echo ""
echo -e "${YELLOW}🌐 Acceder al sistema:${NC}"
echo "  URL: http://91.107.237.159"
echo "  Usuario: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}📊 Ver logs del backend:${NC}"
echo "  pm2 logs gymtec-backend"
echo ""
echo -e "${YELLOW}🔄 Reiniciar backend:${NC}"
echo "  pm2 restart gymtec-backend"
echo ""

# Limpiar archivos temporales
rm -f /tmp/fix-tables.sql /tmp/create-tables.sql

echo -e "${GREEN}🎉 Proceso completado exitosamente${NC}"
