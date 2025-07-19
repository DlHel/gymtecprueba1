const db = require('./src/mysql-database.js');

// Checklists específicos por modelo de equipo
const specificChecklists = {
    // === LIFE FITNESS ===
    'LF-INT-TM-2024': { // Integrity+ Treadmill
        name: 'Checklist Life Fitness Integrity+ Treadmill',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar estado general del equipo y panel de control SE4"},
            {"title": "Limpieza superficie de carrera", "description": "Limpiar banda de correr con productos específicos para cintas"},
            {"title": "Verificar consola Discover SE4", "description": "Probar pantalla táctil 16\", WiFi y conectividad Bluetooth"},
            {"title": "Sistema Flex Deck Shock Absorption", "description": "Verificar funcionamiento del sistema de amortiguación patentado"},
            {"title": "Calibración velocidad e inclinación", "description": "Probar rango 0.8-25 km/h y inclinación 0-15%"},
            {"title": "Lubricación sistema de transmisión", "description": "Aplicar lubricante en motor 4000W y componentes móviles"},
            {"title": "Verificar sensores de frecuencia cardíaca", "description": "Probar sensores táctiles en manubrio y compatibilidad telemetría"},
            {"title": "Inspección sistema eléctrico 220V", "description": "Verificar conexiones y consumo eléctrico (4000W)"},
            {"title": "Prueba de funcionamiento completo", "description": "Ejecutar ciclo completo con diferentes velocidades e inclinaciones"},
            {"title": "Verificar superficie de 56x152 cm", "description": "Inspeccionar desgaste y tensión de la banda de correr"}
        ]
    },

    'LF-SYM-RUN-2024': { // Symbio Runner  
        name: 'Checklist Life Fitness Symbio Runner',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar estado general y sistema Adaptive Flex Deck"},
            {"title": "Sistema Adaptive Flex Deck", "description": "Verificar los 5 niveles de firmeza ajustable"},
            {"title": "Métricas de potencia y cadencia", "description": "Calibrar sensores de potencia y cadencia patentados"},
            {"title": "Rango de inclinación -3% a 15%", "description": "Probar inclinación negativa y positiva completa"},
            {"title": "Velocidad máxima 30 km/h", "description": "Verificar funcionamiento a velocidades extremas"},
            {"title": "Motor 4500W", "description": "Inspeccionar motor de alta potencia y sistema de refrigeración"},
            {"title": "Limpieza consola avanzada", "description": "Limpiar pantalla y verificar métricas de rendimiento"},
            {"title": "Lubricación sistema de alto rendimiento", "description": "Aplicar lubricación específica para uso intensivo"},
            {"title": "Prueba biomecánica", "description": "Verificar análisis de pisada y métricas deportivas"},
            {"title": "Inspección cables y conectores", "description": "Revisar integridad de conexiones de alto voltaje"}
        ]
    },

    'LF-SYM-ELL-2024': { // Symbio Incline Elliptical
        name: 'Checklist Life Fitness Symbio Incline Elliptical',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar estructura y pedales de la elíptica"},
            {"title": "Sistema de inclinación 0-40°", "description": "Probar rango completo de inclinación motorizada"},
            {"title": "Mapa muscular interactivo", "description": "Verificar funcionamiento de la interfaz de músculos"},
            {"title": "Zancada variable", "description": "Probar ajuste automático de zancada según usuario"},
            {"title": "25 niveles de resistencia", "description": "Calibrar todos los niveles de resistencia electromagnética"},
            {"title": "Limpieza pedales y manubrios", "description": "Desinfectar puntos de contacto del usuario"},
            {"title": "Lubricación ejes y pivotes", "description": "Aplicar grasa en puntos de articulación"},
            {"title": "Verificar sensores biomecánicos", "description": "Probar sensores de análisis de movimiento"},
            {"title": "Sistema de frenado electromagnético", "description": "Verificar respuesta y suavidad del frenado"},
            {"title": "Prueba cinética humana", "description": "Ejecutar análisis completo de movimiento natural"}
        ]
    },

    'LF-IC7-2024': { // IC7 Indoor Cycle
        name: 'Checklist Life Fitness IC7 Indoor Cycle',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar estructura, pedales y manubrio ajustable"},
            {"title": "Volante de 18 kg", "description": "Inspeccionar volante de inercia y equilibrado"},
            {"title": "Tecnología WattRate", "description": "Calibrar medición de potencia en tiempo real"},
            {"title": "Conectividad ANT+ y Bluetooth", "description": "Probar sincronización con dispositivos externos"},
            {"title": "Ajuste micro-métrico", "description": "Verificar precisión de ajustes de sillín y manubrio"},
            {"title": "Sistema de resistencia magnética", "description": "Probar resistencia variable y respuesta inmediata"},
            {"title": "Limpieza cadena y transmisión", "description": "Limpiar y lubricar sistema de transmisión"},
            {"title": "Pedales con calas", "description": "Verificar funcionamiento de sistema de enganche"},
            {"title": "Estabilidad y nivelación", "description": "Comprobar estabilidad en uso intensivo"},
            {"title": "Pantalla de métricas", "description": "Verificar display de potencia, cadencia y calorías"}
        ]
    },

    'LF-HD-HR-2024': { // HD Elite iD Half Rack
        name: 'Checklist Life Fitness HD Elite Half Rack',
        items: [
            {"title": "Inspección estructura principal", "description": "Verificar integridad del bastidor de acero"},
            {"title": "Capacidad de carga 450 kg", "description": "Inspeccionar soportes y puntos de anclaje"},
            {"title": "Soportes J-cup ajustables", "description": "Verificar ajuste y seguro de soportes para barra"},
            {"title": "Barra de dominadas", "description": "Probar resistencia y estabilidad de la barra superior"},
            {"title": "Sistema de seguridad", "description": "Verificar barras de seguridad y limitadores de altura"},
            {"title": "Anclaje al piso", "description": "Inspeccionar tornillos y anclajes de seguridad"},
            {"title": "Limpieza superficies metálicas", "description": "Limpiar y desinfectar todas las superficies"},
            {"title": "Lubricación mecanismos ajustables", "description": "Aplicar lubricante en puntos de ajuste"},
            {"title": "Verificar accesorios opcionales", "description": "Inspeccionar poleas, bancos y accesorios instalados"},
            {"title": "Prueba de estabilidad", "description": "Verificar que no hay movimiento o vibración excesiva"}
        ]
    },

    // === TECHNOGYM ===
    'TG-ER-1000': { // Excite Run 1000
        name: 'Checklist Technogym Excite Run 1000',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar estado general y diseño premium Technogym"},
            {"title": "Consola mywellness", "description": "Probar pantalla 19\" y conectividad cloud mywellness"},
            {"title": "Tecnología amortiguación avanzada", "description": "Verificar sistema de absorción de impacto patentado"},
            {"title": "Superficie de carrera 55x150 cm", "description": "Inspeccionar banda premium y sistema de tensión"},
            {"title": "Motor 3500W Technogym", "description": "Verificar rendimiento y eficiencia energética del motor"},
            {"title": "Entretenimiento integrado", "description": "Probar sistema multimedia y aplicaciones integradas"},
            {"title": "Sensores biométricos", "description": "Calibrar sensores de frecuencia cardíaca y telemetría"},
            {"title": "Limpieza superficies premium", "description": "Usar productos específicos para acabados Technogym"},
            {"title": "Calibración velocidad 0.8-25 km/h", "description": "Verificar precisión en todo el rango de velocidad"},
            {"title": "Sistema de enfriamiento", "description": "Inspeccionar ventilación del motor y electrónicos"}
        ]
    },

    'TG-EB-700': { // Excite Bike 700
        name: 'Checklist Technogym Excite Bike 700',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar diseño ergonómico y acabados Technogym"},
            {"title": "Resistencia electromagnética", "description": "Probar todos los niveles de resistencia suave"},
            {"title": "Ergonomía superior", "description": "Verificar ajustes de sillín y posición optimizada"},
            {"title": "Consola interactiva", "description": "Probar interfaz usuario y programas preestablecidos"},
            {"title": "Pedales con correas", "description": "Inspeccionar sistema de sujeción y seguridad"},
            {"title": "Volante equilibrado", "description": "Verificar suavidad y silencio del volante"},
            {"title": "Sensores de contacto", "description": "Probar sensores de pulso en manubrio"},
            {"title": "Limpieza tapicería", "description": "Desinfectar sillín y superficies de contacto"},
            {"title": "Lubricación mecanismo de ajuste", "description": "Aplicar lubricante en sistemas de ajuste"},
            {"title": "Verificar estabilidad", "description": "Comprobar nivelación y estabilidad durante uso"}
        ]
    },

    // === MATRIX ===
    'MX-T7X-2024': { // Matrix T7x Treadmill
        name: 'Checklist Matrix T7x Treadmill',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar estado general y consola Matrix"},
            {"title": "Motor 4000W Matrix", "description": "Verificar rendimiento del motor de alto rendimiento"},
            {"title": "Sistema de amortiguación Matrix", "description": "Probar sistema de absorción de impacto específico"},
            {"title": "Velocidad 0.8-26 km/h", "description": "Calibrar rango completo de velocidad"},
            {"title": "Inclinación 0-15%", "description": "Verificar sistema de inclinación motorizada"},
            {"title": "Consola táctil avanzada", "description": "Probar interfaz táctil y programas preestablecidos"},
            {"title": "Limpieza superficie de carrera", "description": "Limpiar banda con productos Matrix recomendados"},
            {"title": "Sistema de lubricación automática", "description": "Verificar funcionamiento del sistema automático"},
            {"title": "Sensores cardíacos integrados", "description": "Probar sensores táctiles y telemetría"},
            {"title": "Prueba de estabilidad Matrix", "description": "Verificar estabilidad específica del chasis Matrix"}
        ]
    },

    // === PRECOR ===
    'PC-TRM-445': { // Precor TRM 445 Treadmill
        name: 'Checklist Precor TRM 445 Treadmill',
        items: [
            {"title": "Inspección visual externa", "description": "Verificar estado general y acabados Precor"},
            {"title": "Ground Effects Impact Control", "description": "Verificar sistema patentado de absorción de impacto"},
            {"title": "Motor 3800W Precor", "description": "Inspeccionar motor de precisión y rendimiento"},
            {"title": "Consola P30", "description": "Probar consola P30 y todas sus funcionalidades"},
            {"title": "Sistema de velocidad precisa", "description": "Calibrar velocidad 0.8-25 km/h con precisión Precor"},
            {"title": "Inclinación 0-15% motorizada", "description": "Verificar sistema de inclinación suave y precisa"},
            {"title": "Superficie de carrera premium", "description": "Inspeccionar banda y sistema de tensión Precor"},
            {"title": "Lubricación sistema Precor", "description": "Aplicar lubricación específica según manuales"},
            {"title": "Sensores de frecuencia cardíaca", "description": "Probar sensores táctiles y compatibilidad"},
            {"title": "Verificar sistema de seguridad", "description": "Probar llave de seguridad y parada de emergencia"}
        ]
    }

    // Más modelos se pueden agregar aquí...
};

async function createSpecificChecklists() {
    try {
        console.log('🔧 Iniciando creación de checklists específicos por modelo...');
        
        // Primero, obtener todos los modelos de la base de datos
        const models = await db.query('SELECT * FROM EquipmentModels ORDER BY brand, name');
        
        console.log(`📋 Encontrados ${models.length} modelos en la base de datos`);
        
        // Limpiar templates existentes específicos
        console.log('🧹 Limpiando templates existentes específicos...');
        await db.query('DELETE FROM ChecklistTemplates WHERE model_id IS NOT NULL');
        
        let createdCount = 0;
        
        // Crear checklist específico para cada modelo
        for (const model of models) {
            const checklistData = specificChecklists[model.model_code];
            
            if (checklistData) {
                console.log(`✅ Creando checklist para ${model.brand} ${model.name} (${model.model_code})`);
                
                const sql = `
                    INSERT INTO ChecklistTemplates 
                    (name, equipment_type, model_id, items, is_active)
                    VALUES (?, ?, ?, ?, 1)
                `;
                
                await db.query(sql, [
                    checklistData.name,
                    model.category,
                    model.id,
                    JSON.stringify(checklistData.items)
                ]);
                
                createdCount++;
            } else {
                console.log(`⚠️  No hay checklist específico para ${model.brand} ${model.name} (${model.model_code})`);
            }
        }
        
        console.log(`\n🎉 ¡Proceso completado!`);
        console.log(`📊 Estadísticas:`);
        console.log(`   - Modelos encontrados: ${models.length}`);
        console.log(`   - Checklists creados: ${createdCount}`);
        console.log(`   - Checklists específicos disponibles: ${Object.keys(specificChecklists).length}`);
        
        // Mostrar modelos sin checklist específico
        const modelsWithoutChecklist = models.filter(model => !specificChecklists[model.model_code]);
        if (modelsWithoutChecklist.length > 0) {
            console.log(`\n📝 Modelos que necesitan checklist específico:`);
            modelsWithoutChecklist.forEach(model => {
                console.log(`   - ${model.brand} ${model.name} (${model.model_code})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error creando checklists específicos:', error);
    }
}

// Ejecutar el script
if (require.main === module) {
    createSpecificChecklists().then(() => {
        console.log('✅ Script completado');
        process.exit(0);
    });
}

module.exports = { createSpecificChecklists }; 