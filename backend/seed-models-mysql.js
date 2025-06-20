const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🏭 POBLANDO MODELOS EN MYSQL - GYMTEC ERP\n');

// Configuración de conexión
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

const connection = mysql.createConnection(config);

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
        weight: 63.0,
        dimensions: '125 x 56 x 142',
        voltage: '220V',
        power: 150,
        specifications: 'Resistencia: 25 niveles electromagnéticos, Volante: 13.6 kg, Consola P30'
    },

    // === CYBEX ===
    {
        name: 'Arc Trainer 770A',
        brand: 'Cybex',
        category: 'Cardio',
        model_code: 'CX-ARC-770A',
        description: 'Entrenador de arco con movimiento único que minimiza el estrés en las articulaciones.',
        weight: 152.0,
        dimensions: '198 x 76 x 168',
        voltage: '220V',
        power: 400,
        specifications: 'Inclinación: 0-60°, Resistencia: 1-100, Movimiento Arc, Consola E3 View'
    },

    // === HAMMER STRENGTH ===
    {
        name: 'HD Elite Power Rack',
        brand: 'Hammer Strength',
        category: 'Fuerza',
        model_code: 'HS-HD-PR',
        description: 'Rack de potencia de grado olímpico con construcción de acero de alta resistencia.',
        weight: 195.0,
        dimensions: '140 x 140 x 244',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Altura: 244 cm, Capacidad: 680 kg, Barra olímpica, Soportes J-hook'
    },
    {
        name: 'Plate Loaded Chest Press',
        brand: 'Hammer Strength',
        category: 'Fuerza',
        model_code: 'HS-PL-CP',
        description: 'Press de pecho con carga de discos y movimiento convergente natural.',
        weight: 125.0,
        dimensions: '142 x 135 x 145',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Capacidad: 180 kg por brazo, Movimiento convergente, Asiento ajustable'
    },
    {
        name: 'Iso-Lateral Row',
        brand: 'Hammer Strength',
        category: 'Fuerza',
        model_code: 'HS-ISO-ROW',
        description: 'Máquina de remo con movimiento independiente bilateral.',
        weight: 142.0,
        dimensions: '165 x 122 x 145',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Capacidad: 180 kg por brazo, Movimiento iso-lateral, Agarre múltiple'
    },

    // === KEISER ===
    {
        name: 'Pneumatic Leg Press',
        brand: 'Keiser',
        category: 'Fuerza',
        model_code: 'KS-PNE-LP',
        description: 'Prensa de piernas neumática con tecnología de aire comprimido.',
        weight: 89.0,
        dimensions: '132 x 84 x 137',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Resistencia: 0-180 kg, Tecnología neumática, Medición de potencia'
    },

    // === CONCEPT2 ===
    {
        name: 'Model D Indoor Rower',
        brand: 'Concept2',
        category: 'Cardio',
        model_code: 'C2-MD-ROWER',
        description: 'Remo indoor con resistencia de aire y monitor PM5.',
        weight: 26.0,
        dimensions: '244 x 61 x 36',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Resistencia: aire variable, Monitor PM5, Plegable, Cadena níquel'
    },

    // === ROGUE FITNESS ===
    {
        name: 'R-4 Power Rack',
        brand: 'Rogue',
        category: 'Fuerza',
        model_code: 'RG-R4-PR',
        description: 'Rack de potencia de 4 postes con construcción de acero resistente.',
        weight: 136.0,
        dimensions: '122 x 122 x 244',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Altura: 244 cm, Acero calibre 11, Agujeros Westside, Barra dominadas'
    },

    // === BOWFLEX ===
    {
        name: 'Max Trainer M8',
        brand: 'Bowflex',
        category: 'Cardio',
        model_code: 'BF-MT-M8',
        description: 'Entrenador Max con movimiento de cuerpo completo y resistencia electromagnética.',
        weight: 68.0,
        dimensions: '119 x 66 x 160',
        voltage: '220V',
        power: 200,
        specifications: '16 niveles resistencia, Monitor cardíaco, Programas HIIT, Bluetooth'
    },

    // === WATERROWER ===
    {
        name: 'Natural Rowing Machine',
        brand: 'WaterRower',
        category: 'Cardio',
        model_code: 'WR-NAT-OAK',
        description: 'Máquina de remo de madera de fresno con resistencia de agua.',
        weight: 30.0,
        dimensions: '210 x 56 x 53',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Resistencia: agua variable, Madera fresno, Monitor S4, Plegable vertical'
    },

    // === GYM80 ===
    {
        name: 'Sygnum Multi Station',
        brand: 'Gym80',
        category: 'Accesorios',
        model_code: 'G80-SYG-MS',
        description: 'Estación multi-ejercicio con poleas ajustables y múltiples accesorios.',
        weight: 245.0,
        dimensions: '160 x 180 x 230',
        voltage: 'Sin conexión eléctrica',
        power: 0,
        specifications: 'Pila: 125 kg, Poleas ajustables, Accesorios múltiples, Construcción alemana'
    }
];

async function populateModels() {
    try {
        console.log('📡 Conectando a MySQL...');
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('✅ Conectado a MySQL exitosamente\n');

        // Limpiar tabla existente
        console.log('🗑️  Limpiando tabla equipmentmodels...');
        await new Promise((resolve, reject) => {
            connection.query('DELETE FROM equipmentmodels', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Insertar modelos
        console.log('📥 Insertando modelos de equipos...');
        let insertedCount = 0;

        for (const model of equipmentModels) {
            await new Promise((resolve, reject) => {
                connection.query('INSERT INTO equipmentmodels SET ?', model, (err, result) => {
                    if (err) {
                        console.error(`❌ Error insertando modelo ${model.name}:`, err.message);
                        reject(err);
                    } else {
                        insertedCount++;
                        console.log(`   ✅ Insertado: ${model.name} (${model.brand})`);
                        resolve(result);
                    }
                });
            });
        }

        // Mostrar estadísticas
        console.log(`\n🎉 ${insertedCount} modelos de equipos insertados exitosamente!\n`);

        // Contar por categoría
        const categoryStats = await new Promise((resolve, reject) => {
            connection.query(
                'SELECT category, COUNT(*) as count FROM equipmentmodels GROUP BY category ORDER BY count DESC',
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        console.log('📊 Resumen por categoría:');
        categoryStats.forEach(stat => {
            console.log(`   ${stat.category}: ${stat.count} modelos`);
        });

        // Contar por marca
        const brandStats = await new Promise((resolve, reject) => {
            connection.query(
                'SELECT brand, COUNT(*) as count FROM equipmentmodels GROUP BY brand ORDER BY count DESC',
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        console.log('\n🏢 Resumen por marca:');
        brandStats.forEach(stat => {
            console.log(`   ${stat.brand}: ${stat.count} modelos`);
        });

        console.log('\n✅ Población de modelos completada exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

// Ejecutar
populateModels(); 