# -*- coding: utf-8 -*-
import sys
import os

print("🚀 Integrando nuevos endpoints del dashboard...")

# Rutas de archivos
server_file = "src/server-clean.js"
endpoints_file = "src/dashboard-endpoints-new.js"

try:
    # Leer contenido de ambos archivos
    with open(server_file, 'r', encoding='utf-8') as f:
        server_content = f.read()
    
    with open(endpoints_file, 'r', encoding='utf-8') as f:
        endpoints_lines = f.readlines()
    
    # Remover las primeras 4 líneas de comentarios
    endpoints_to_insert = ''.join(endpoints_lines[4:])
    
    # Buscar el marcador donde insertar
    marker = "// ===================================================================\n// MANEJADORES GLOBALES DE ERRORES Y FINALIZACI"
    
    # Encontrar la posición del marcador
    marker_pos = server_content.find(marker)
    
    if marker_pos == -1:
        print("❌ No se encontró el marcador en server-clean.js")
        sys.exit(1)
    
    # Insertar los endpoints ANTES del marcador
    new_content = server_content[:marker_pos] + endpoints_to_insert + "\n\n" + server_content[marker_pos:]
    
    # Guardar el archivo modificado
    with open(server_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Endpoints integrados exitosamente!")
    print("")
    print("📋 Endpoints agregados:")
    print("  1. GET /api/dashboard/resources-summary")
    print("  2. GET /api/dashboard/financial-summary")
    print("  3. GET /api/dashboard/inventory-summary")
    print("  4. GET /api/dashboard/contracts-sla-summary")
    print("  5. GET /api/dashboard/critical-alerts")
    print("  6. GET /api/dashboard/kpis-enhanced")
    print("")
    print(f"📊 Total de líneas ahora: {len(new_content.splitlines())}")
    print("")
    print("🔄 Ahora reinicia el servidor backend: npm start")

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
