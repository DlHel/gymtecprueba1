const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database', 'gymtec.db');

// Datos realistas de modelos de equipos de gimnasio basados en marcas reales
const equipmentModels = [
    // === LIFE FITNESS ===
    {
        name: 'Integrity+ Treadmill',
        brand: 'Life Fitness',
        category: 'Cardio',
        model_code: 'LF-INT-TM-2024',
        description: 'Cinta de correr de próxima generación con tecnología Flex Deck Shock Absorption y consola Discover SE4.',
        weight: 185.5,
        dimensions: '213 x 91 x 157',
        voltage: '220V',
        power: 4000,
        specifications: 'Velocidad: 0.8-25 km/h, Inclinación: 0-15%, Superficie: 56x152 cm, Consola SE4 16", WiFi, Bluetooth'
    },
    {
        name: 'Symbio Runner',
        brand: 'Life Fitness',
        category: 'Cardio',
        model_code: 'LF-SYM-RUN-2024',
        description: 'Cinta de correr con plataforma Adaptive Flex Deck patentada y métricas de rendimiento avanzado.',
        weight: 195.0,
        dimensions: '220 x 95 x 160',
        voltage: '220V',
        power: 4500,
        specifications: 'Velocidad: 0.8-30 km/h, Inclinación: -3% a 15%, 5 niveles firmeza, Métricas potencia y cadencia'
    },
    {
        name: 'Symbio Incline Elliptical',
        brand: 'Life Fitness',
        category: 'Cardio',
        model_code: 'LF-SYM-ELL-2024',
        description: 'La elíptica biomecánicamente más avanzada disponible con investigación en cinética humana.',
        weight: 165.0,
        dimensions: '203 x 76 x 173',
        voltage: '220V',
        power: 350,
        specifications: 'Inclinación: 0-40°, Resistencia: 25 niveles, Mapa muscular interactivo, Zancada variable'
    },
    {
        name: 'IC7 Indoor Cycle',
        brand: 'Life Fitness',
        category: 'Cardio',
        model_code: 'LF-IC7-2024',
        description: 'Bicicleta de spinning profesional con tecnología WattRate y conectividad avanzada.',
        weight: 58.0,
        dimensions: '122 x 53 x 114',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Volante: 18 kg, Medición potencia WattRate, ANT+, Bluetooth, Ajuste micro-métrico'
    },
    {
        name: 'HD Elite iD Half Rack',
        brand: 'Life Fitness',
        category: 'Fuerza',
        model_code: 'LF-HD-HR-2024',
        description: 'Half rack compacto con dos pares de soportes verticales para espacios reducidos.',
        weight: 145.0,
        dimensions: '122 x 137 x 244',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Altura: 244 cm, Capacidad: 450 kg, Barra dominadas, Soportes J-cup ajustables'
    },

    // === TECHNOGYM ===
    {
        name: 'Excite Run 1000',
        brand: 'Technogym',
        category: 'Cardio',
        model_code: 'TG-ER-1000',
        description: 'Cinta de correr premium con tecnología de amortiguación avanzada y entretenimiento integrado.',
        weight: 175.0,
        dimensions: '210 x 85 x 155',
        voltage: '220V',
        power: 3500,
        specifications: 'Velocidad: 0.8-25 km/h, Inclinación: 0-15%, Superficie: 55x150 cm, Pantalla 19", mywellness'
    },
    {
        name: 'Excite Bike 700',
        brand: 'Technogym',
        category: 'Cardio',
        model_code: 'TG-EB-700',
        description: 'Bicicleta estática vertical con ergonomía superior y resistencia electromagnética.',
        weight: 65.0,
        dimensions: '125 x 55 x 140',
        voltage: '220V',
        power: 150,
        specifications: 'Resistencia: 25 niveles electromagnéticos, Pantalla LED, 12 programas, mywellness'
    },
    {
        name: 'Selection Pro Chest Press',
        brand: 'Technogym',
        category: 'Fuerza',
        model_code: 'TG-SP-CP',
        description: 'Máquina de press de pecho selectorizada con biomecánica optimizada.',
        weight: 285.0,
        dimensions: '155 x 140 x 150',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Pila: 100 kg, Incrementos: 5 kg, Asiento ajustable, Respaldos ergonómicos'
    },
    {
        name: 'Kinesis One',
        brand: 'Technogym',
        category: 'Funcional',
        model_code: 'TG-KIN-ONE',
        description: 'Estación de entrenamiento funcional 360° con cables independientes.',
        weight: 195.0,
        dimensions: '175 x 175 x 230',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Resistencia: 2 x 75 kg, Cables independientes, Múltiples anclajes, Entrenamiento 3D'
    },

    // === MATRIX FITNESS ===
    {
        name: 'T7x Treadmill',
        brand: 'Matrix',
        category: 'Cardio',
        model_code: 'MX-T7X-2024',
        description: 'Cinta de correr comercial con motor AC de alta eficiencia y sistema Ultimate Deck.',
        weight: 168.0,
        dimensions: '208 x 89 x 156',
        voltage: '220V',
        power: 3500,
        specifications: 'Velocidad: 0.8-25 km/h, Inclinación: 0-15%, Motor AC 4.0 HP, Consola XIR 19"'
    },
    {
        name: 'E7x Elliptical',
        brand: 'Matrix',
        category: 'Cardio',
        model_code: 'MX-E7X-2024',
        description: 'Elíptica con movimiento natural y sistema de resistencia electromagnética.',
        weight: 145.0,
        dimensions: '198 x 71 x 168',
        voltage: '220V',
        power: 300,
        specifications: 'Resistencia: 40 niveles, Zancada: 51 cm, Inclinación motorizada: 0-20°, Bluetooth'
    },
    {
        name: 'U7x Upright Bike',
        brand: 'Matrix',
        category: 'Cardio',
        model_code: 'MX-U7X-2024',
        description: 'Bicicleta vertical con geometría optimizada y resistencia electromagnética precisa.',
        weight: 58.0,
        dimensions: '122 x 56 x 142',
        voltage: '220V',
        power: 150,
        specifications: 'Resistencia: 40 niveles electromagnéticos, Volante: 13.6 kg, Consola XIR'
    },
    {
        name: 'Mega Power Rack',
        brand: 'Matrix',
        category: 'Fuerza',
        model_code: 'MX-MPR-2024',
        description: 'Rack de potencia robusto con múltiples estaciones de entrenamiento.',
        weight: 180.0,
        dimensions: '140 x 140 x 244',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Altura: 244 cm, Capacidad: 500 kg, Barra dominadas, Poleas ajustables'
    },

    // === PRECOR ===
    {
        name: 'TRM 445 Treadmill',
        brand: 'Precor',
        category: 'Cardio',
        model_code: 'PC-TRM-445',
        description: 'Cinta de correr con tecnología Ground Effects Impact Control System.',
        weight: 172.0,
        dimensions: '211 x 89 x 157',
        voltage: '220V',
        power: 3800,
        specifications: 'Velocidad: 0.8-25 km/h, Inclinación: 0-15%, Sistema GFX, Consola P30'
    },
    {
        name: 'EFX 885 Elliptical',
        brand: 'Precor',
        category: 'Cardio',
        model_code: 'PC-EFX-885',
        description: 'Elíptica con tecnología CrossRamp y movimiento natural.',
        weight: 158.0,
        dimensions: '203 x 71 x 168',
        voltage: '220V',
        power: 350,
        specifications: 'CrossRamp: 13-40°, Resistencia: 25 niveles, Zancada fija, Consola P30'
    },
    {
        name: 'UBK 885 Upright Bike',
        brand: 'Precor',
        category: 'Cardio',
        model_code: 'PC-UBK-885',
        description: 'Bicicleta vertical con asiento ergonómico y resistencia electromagnética silenciosa.',
        weight: 62.0,
        dimensions: '124 x 58 x 144',
        voltage: '220V',
        power: 150,
        specifications: 'Resistencia: 25 niveles, Volante: 15 kg, Asiento ventilado, Bluetooth'
    },

    // === CYBEX ===
    {
        name: 'R Series Treadmill',
        brand: 'Cybex',
        category: 'Cardio',
        model_code: 'CX-R-TM-2024',
        description: 'Cinta de correr con tecnología de amortiguación inteligente y motor de alta eficiencia.',
        weight: 178.0,
        dimensions: '214 x 91 x 158',
        voltage: '220V',
        power: 4000,
        specifications: 'Velocidad: 0.8-26 km/h, Inclinación: 0-15%, Motor AC, Consola E3 View'
    },
    {
        name: 'Arc Trainer 770A',
        brand: 'Cybex',
        category: 'Cardio',
        model_code: 'CX-ARC-770A',
        description: 'Entrenador de arco único con movimiento biomecánico superior.',
        weight: 152.0,
        dimensions: '175 x 76 x 168',
        voltage: '220V',
        power: 400,
        specifications: 'Resistencia: 1-750 watts, Inclinación: 0-60°, Movimiento adaptable, 9 programas'
    },
    {
        name: 'Eagle NX Chest Press',
        brand: 'Cybex',
        category: 'Fuerza',
        model_code: 'CX-ENX-CP',
        description: 'Máquina de press de pecho con tecnología de resistencia variable.',
        weight: 295.0,
        dimensions: '160 x 145 x 155',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Pila: 110 kg, Sistema de levas, Asiento neumático, Respaldo ajustable'
    },

    // === HAMMER STRENGTH ===
    {
        name: 'Plate-Loaded Leg Press',
        brand: 'Hammer Strength',
        category: 'Fuerza',
        model_code: 'HS-PL-LP',
        description: 'Prensa de piernas con carga de discos para desarrollo de piernas y glúteos.',
        weight: 165.0,
        dimensions: '180 x 140 x 130',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Capacidad: 450 kg, Ángulo: 45°, Plataforma antideslizante, Topes seguridad'
    },
    {
        name: 'Plate-Loaded Hack Squat',
        brand: 'Hammer Strength',
        category: 'Fuerza',
        model_code: 'HS-PL-HS',
        description: 'Máquina de hack squat con carga de discos y movimiento guiado.',
        weight: 155.0,
        dimensions: '165 x 125 x 185',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Capacidad: 400 kg, Ángulo: 30°, Plataforma texturizada, Respaldo acolchado'
    },
    {
        name: 'Dual Adjustable Pulley',
        brand: 'Hammer Strength',
        category: 'Fuerza',
        model_code: 'HS-DAP-2024',
        description: 'Sistema de poleas duales ajustables para entrenamiento funcional.',
        weight: 225.0,
        dimensions: '150 x 180 x 230',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Pila: 2 x 100 kg, Altura ajustable, Múltiples accesorios, Entrenamiento bilateral'
    },

    // === KEISER ===
    {
        name: 'M3i Indoor Bike',
        brand: 'Keiser',
        category: 'Cardio',
        model_code: 'KS-M3I-2024',
        description: 'Bicicleta de spinning con resistencia magnética y medición de potencia en tiempo real.',
        weight: 48.0,
        dimensions: '122 x 53 x 114',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Resistencia magnética, Medición potencia, Bluetooth, Volante: 8 kg'
    },

    // === CONCEPT2 ===
    {
        name: 'RowErg',
        brand: 'Concept2',
        category: 'Cardio',
        model_code: 'C2-ROWERG-2024',
        description: 'Máquina de remo con resistencia de aire, estándar mundial para entrenamiento.',
        weight: 26.0,
        dimensions: '244 x 61 x 36',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Resistencia aire, Monitor PM5, Plegable, Cadena niquelada, ANT+'
    },

    // === ROGUE FITNESS ===
    {
        name: 'RML-3 Monster Lite Rack',
        brand: 'Rogue',
        category: 'Fuerza',
        model_code: 'RG-RML3-2024',
        description: 'Rack de potencia compacto con construcción de acero de alta calidad.',
        weight: 125.0,
        dimensions: '109 x 109 x 244',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Altura: 244 cm, Acero calibre 11, Capacidad: 450 kg, Barra dominadas'
    },

    // === BOWFLEX ===
    {
        name: 'SelectTech 552',
        brand: 'Bowflex',
        category: 'Accesorios',
        model_code: 'BF-ST552-2024',
        description: 'Mancuernas ajustables que reemplazan 15 pares de mancuernas.',
        weight: 23.8,
        dimensions: '40 x 20 x 20',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Rango: 2.3-23.8 kg por mancuerna, 15 pesos diferentes, Ajuste rápido'
    },

    // === WATERROWER ===
    {
        name: 'Natural Rowing Machine',
        brand: 'WaterRower',
        category: 'Cardio',
        model_code: 'WR-NAT-2024',
        description: 'Máquina de remo con resistencia de agua y construcción en madera de fresno.',
        weight: 30.0,
        dimensions: '210 x 56 x 53',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Resistencia agua, Madera fresno, Monitor S4, Plegable vertical, Silencioso'
    },

    // === GYM80 ===
    {
        name: 'Sygnum Multi Press',
        brand: 'Gym80',
        category: 'Fuerza',
        model_code: 'G80-SMP-2024',
        description: 'Máquina multipress selectorizada con múltiples posiciones de agarre.',
        weight: 320.0,
        dimensions: '170 x 150 x 160',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Pila: 125 kg, Múltiples agarres, Asiento ajustable, Biomecánica alemana'
    }
];

async function runModelsSeed() {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            return console.error('Error al abrir la base de datos', err.message);
        }
        console.log('Conectado a la base de datos SQLite para poblar modelos.');
    });

    const run = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                resolve({ id: this.lastID, changes: this.changes });
            });
        });
    };

    try {
        console.log('Eliminando tabla EquipmentModels existente...');
        await run('DROP TABLE IF EXISTS EquipmentModels');
        
        console.log('Creando nueva tabla EquipmentModels...');
        await run(`
            CREATE TABLE EquipmentModels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                brand TEXT NOT NULL,
                category TEXT NOT NULL,
                model_code TEXT UNIQUE,
                description TEXT,
                weight REAL,
                dimensions TEXT,
                voltage TEXT,
                power INTEGER,
                specifications TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Insertando modelos de equipos...');
        
        for (const model of equipmentModels) {
            await run(`
                INSERT INTO EquipmentModels 
                (name, brand, category, model_code, description, weight, dimensions, voltage, power, specifications) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                model.name,
                model.brand,
                model.category,
                model.model_code,
                model.description,
                model.weight,
                model.dimensions,
                model.voltage,
                model.power,
                model.specifications
            ]);
        }

        console.log(`✅ ${equipmentModels.length} modelos de equipos insertados exitosamente!`);
        console.log('\n📊 Resumen por categoría:');
        
        const categories = {};
        equipmentModels.forEach(model => {
            categories[model.category] = (categories[model.category] || 0) + 1;
        });
        
        Object.entries(categories).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} modelos`);
        });

        console.log('\n🏢 Resumen por marca:');
        const brands = {};
        equipmentModels.forEach(model => {
            brands[model.brand] = (brands[model.brand] || 0) + 1;
        });
        
        Object.entries(brands).forEach(([brand, count]) => {
            console.log(`   ${brand}: ${count} modelos`);
        });

    } catch (error) {
        console.error('❌ Error poblando modelos de equipos:', error.message);
    } finally {
        db.close((err) => {
            if (err) {
                return console.error(err.message);
            }
            console.log('\n🔐 Conexión con la base de datos cerrada.');
        });
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    runModelsSeed();
}

module.exports = { runModelsSeed, equipmentModels };
