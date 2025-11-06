print("🔧 Integrando endpoints del dashboard...")

# Leer archivo base
with open('src/server-clean.js', 'r', encoding='utf-8') as f:
    base_content = f.read()

# Leer endpoints corregidos
with open('src/dashboard-endpoints-corrected.js', 'r', encoding='utf-8') as f:
    endpoints_content = f.read()

# Limpiar encabezado de los endpoints
endpoints_content = endpoints_content.replace(
    '// ===================================================================\n// NUEVOS ENDPOINTS PARA DASHBOARD CONSOLIDADO\n// Agregar estos endpoints después de /api/dashboard/activity en server-clean.js\n// ===================================================================\n\n',
    ''
)

# Encontrar el punto de inserción (después de /api/dashboard/activity)
marker = '// MANEJADORES GLOBALES DE ERRORES Y FINALIZACI'
insert_pos = base_content.find(marker)

if insert_pos == -1:
    print("❌ No se encontró el marcador de inserción")
    exit(1)

# Insertar endpoints
before = base_content[:insert_pos]
after = base_content[insert_pos:]

new_content = before + '\n// ===================================================================\n// DASHBOARD CONSOLIDADO - NUEVOS ENDPOINTS\n// ===================================================================\n\n' + endpoints_content + '\n\n' + after

# Guardar archivo integrado
with open('src/server-clean.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"✅ Integración completada")
print(f"   - Longitud original: {len(base_content)} caracteres")
print(f"   - Endpoints agregados: {len(endpoints_content)} caracteres")
print(f"   - Longitud final: {len(new_content)} caracteres")
print(f"   - Nuevos endpoints: 6")
