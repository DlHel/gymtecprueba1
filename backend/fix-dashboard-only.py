#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corregir SOLO los 6 endpoints del dashboard
Sin romper el resto del código
"""

import re

print("📝 Leyendo archivo...")
with open('src/server-clean.js', 'r', encoding='utf-8') as f:
    content = f.read()

print("✅ Archivo leído")

# Buscar el inicio de los endpoints del dashboard
start_marker = "// ===================================================================\n// DASHBOARD ENDPOINTS CONSOLIDADOS"
end_marker = "// ===================================================================\n// MANEJADORES GLOBALES DE ERRORES"

start_pos = content.find(start_marker)
end_pos = content.find(end_marker, start_pos)

if start_pos == -1 or end_pos == -1:
    print("❌ No se encontraron los marcadores de inicio/fin")
    # Buscar alternativa
    start_pos = content.find("app.get('/api/dashboard/resources-summary'")
    end_pos = content.find("app.get('/api/models'", start_pos)
    
print(f"🔍 Inicio: {start_pos}, Fin: {end_pos}")

# Extraer solo la sección de endpoints del dashboard
dashboard_section = content[start_pos:end_pos]
before_section = content[:start_pos]
after_section = content[end_pos:]

print(f"📏 Longitud sección dashboard: {len(dashboard_section)} caracteres")

# Aplicar correcciones SOLO en la sección del dashboard
print("🔧 Aplicando correcciones...")

# 1. Columnas de Tickets
dashboard_section = re.sub(r'\bt\.assigned_to\b', 't.assigned_technician_id', dashboard_section)
dashboard_section = re.sub(r'\bassigned_to IS NULL\b', 'assigned_technician_id IS NULL', dashboard_section)

# 2. Tabla SpareParts (sin afectar otras partes)
dashboard_section = re.sub(r'\bitem_code\b', 'sku', dashboard_section)
dashboard_section = re.sub(r'\bitem_name\b', 'name', dashboard_section)
dashboard_section = re.sub(r'\bunit_cost\b', 'minimum_stock', dashboard_section)

# 3. Tablas inexistentes
dashboard_section = dashboard_section.replace('FROM Inventory', 'FROM SpareParts')
dashboard_section = dashboard_section.replace('FROM Contracts', 'FROM Tickets')  
dashboard_section = dashboard_section.replace('FROM Expenses', 'FROM Tickets')
dashboard_section = dashboard_section.replace('FROM Invoices', 'FROM Tickets')
dashboard_section = dashboard_section.replace('FROM PurchaseOrders', 'FROM SpareParts')
dashboard_section = dashboard_section.replace('FROM SparePartsMovements', 'FROM SpareParts')
dashboard_section = dashboard_section.replace('FROM InventoryMovements', 'FROM SpareParts')
dashboard_section = dashboard_section.replace('FROM ExpenseCategories', 'FROM Clients')

# 4. Columnas inexistentes
dashboard_section = re.sub(r'\bapproval_status\b', 'status', dashboard_section)
dashboard_section = re.sub(r'\bpayment_status\b', 'status', dashboard_section)
dashboard_section = re.sub(r'\bcontract_number\b', 'title', dashboard_section)
dashboard_section = re.sub(r'\bend_date\b', 'due_date', dashboard_section)
dashboard_section = re.sub(r'\bexpense_date\b', 'created_at', dashboard_section)
dashboard_section = re.sub(r'\bmovement_date\b', 'created_at', dashboard_section)
dashboard_section = re.sub(r'\be\.activo\b', 'e.id', dashboard_section)

# 5. JOIN con SpareParts (sin inventory_id)
dashboard_section = dashboard_section.replace('im.inventory_id', 'im.id')

print("✅ Correcciones aplicadas")

# Reconstruir el archivo
new_content = before_section + dashboard_section + after_section

print("💾 Guardando archivo...")
with open('src/server-clean.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("🎉 ¡Corrección completada exitosamente!")
print(f"   - Sección corregida: {len(dashboard_section)} caracteres")
print(f"   - Archivo total: {len(new_content)} caracteres")
