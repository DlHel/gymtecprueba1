#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corregir el bloque de event listeners en ticket-detail.js
"""

import re

file_path = 'frontend/js/ticket-detail.js'

# Leer el archivo
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patrón que busca todo el bloque problemático
# Desde "Delegación de eventos para botones de repuestos" hasta el cierre del addEventListener
pattern = r"""    // Delegación de eventos para botones de repuestos \(se crean dinámicamente\)
    document\.addEventListener\('click', \(e\) => \{
        if \(e\.target\.id === 'add-spare-part-btn'.*?
        \}
    \}\);"""

# Nuevo código correcto
replacement = """    // Delegación de eventos para botones de repuestos (se crean dinámicamente)
    document.addEventListener('click', (e) => {
        // Botón "Solicitar Repuesto" - Modal Unificado con Flujo Inteligente
        if (e.target.id === 'request-spare-part-btn' || e.target.closest('#request-spare-part-btn')) {
            e.preventDefault();
            console.log('🔧 Click en botón solicitar repuesto (modal unificado)');
            if (typeof showUnifiedSparePartModal === 'function') {
                showUnifiedSparePartModal();
            } else {
                console.error('❌ showUnifiedSparePartModal no está definida');
            }
        }
        
        // Botón "Agregar Primer Repuesto" (cuando lista está vacía)
        if (e.target.id === 'add-first-spare-part' || e.target.closest('#add-first-spare-part')) {
            e.preventDefault();
            console.log('➕ Click en agregar primer repuesto');
            if (typeof showUnifiedSparePartModal === 'function') {
                showUnifiedSparePartModal();
            } else {
                console.error('❌ showUnifiedSparePartModal no está definida');
            }
        }
    });"""

# Intentar reemplazo con regex DOTALL
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Si no funcionó, buscar el inicio y fin manualmente
if new_content == content:
    print("⚠️ Regex no funcionó, intentando buscar manualmente...")
    
    # Buscar el inicio
    start_marker = "    // Delegación de eventos para botones de repuestos (se crean dinámicamente)"
    end_marker = "    });\n}"
    
    start_pos = content.find(start_marker)
    if start_pos != -1:
        # Buscar el cierre del addEventListener desde start_pos
        search_area = content[start_pos:start_pos+2000]
        end_pos = search_area.find(end_marker)
        
        if end_pos != -1:
            # Encontramos el bloque completo
            full_end_pos = start_pos + end_pos + len(end_marker)
            
            # Reemplazar
            new_content = (
                content[:start_pos] +
                replacement +
                "\n}" +
                content[full_end_pos:]
            )
            print(f"✅ Bloque encontrado y reemplazado (caracteres {start_pos} - {full_end_pos})")
        else:
            print(f"❌ No se encontró el cierre del bloque")
            exit(1)
    else:
        print(f"❌ No se encontró el inicio del bloque")
        exit(1)

# Guardar el archivo modificado
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ Archivo ticket-detail.js corregido exitosamente")
print("🔄 Recarga la página del ticket para probar el modal unificado")
