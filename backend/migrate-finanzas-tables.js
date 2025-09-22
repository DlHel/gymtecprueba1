// Migración para corregir tablas Quotes e Invoices - Finanzas Module
const db = require('./src/db-adapter');

console.log('🔧 MIGRACIÓN: Ajustando esquema de tablas Quotes e Invoices');
console.log('===========================================================');

async function migrateFinanzasTables() {
    return new Promise((resolve, reject) => {
        console.log('📋 Paso 1: Verificando existencia de tablas...');
        
        // Verificar si las tablas existen
        db.all("SHOW TABLES LIKE 'Quotes'", [], (err, quotesRows) => {
            if (err) {
                console.error('❌ Error verificando tabla Quotes:', err);
                return reject(err);
            }
            
            db.all("SHOW TABLES LIKE 'Invoices'", [], (err, invoicesRows) => {
                if (err) {
                    console.error('❌ Error verificando tabla Invoices:', err);
                    return reject(err);
                }
                
                console.log(`📋 Tabla Quotes existe: ${quotesRows.length > 0 ? 'SÍ' : 'NO'}`);
                console.log(`🧾 Tabla Invoices existe: ${invoicesRows.length > 0 ? 'SÍ' : 'NO'}`);
                
                // Crear o actualizar tabla Quotes
                createOrUpdateQuotesTable(() => {
                    // Crear o actualizar tabla Invoices
                    createOrUpdateInvoicesTable(() => {
                        console.log('✅ Migración completada exitosamente');
                        resolve();
                    });
                });
            });
        });
    });
}

function createOrUpdateQuotesTable(callback) {
    console.log('\n📋 Paso 2: Creando/actualizando tabla Quotes...');
    
    const createQuotesSQL = `
        CREATE TABLE IF NOT EXISTS Quotes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            quote_number VARCHAR(50) UNIQUE,
            quote_date DATE NOT NULL,
            valid_until DATE,
            description TEXT NOT NULL,
            items JSON,
            subtotal DECIMAL(10,2) DEFAULT 0.00,
            tax_amount DECIMAL(10,2) DEFAULT 0.00,
            total DECIMAL(10,2) NOT NULL,
            payment_terms TEXT,
            notes TEXT,
            status ENUM('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Expirada') DEFAULT 'Borrador',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES Clients(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
        )
    `;
    
    db.run(createQuotesSQL, [], (err) => {
        if (err) {
            console.error('❌ Error creando tabla Quotes:', err);
            return callback(err);
        }
        
        console.log('✅ Tabla Quotes creada/actualizada correctamente');
        callback();
    });
}

function createOrUpdateInvoicesTable(callback) {
    console.log('\n🧾 Paso 3: Creando/actualizando tabla Invoices...');
    
    const createInvoicesSQL = `
        CREATE TABLE IF NOT EXISTS Invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            quote_id INT,
            invoice_number VARCHAR(50) UNIQUE,
            invoice_date DATE NOT NULL,
            due_date DATE,
            description TEXT NOT NULL,
            items JSON,
            subtotal DECIMAL(10,2) DEFAULT 0.00,
            tax_amount DECIMAL(10,2) DEFAULT 0.00,
            total DECIMAL(10,2) NOT NULL,
            payment_terms TEXT,
            notes TEXT,
            status ENUM('Pendiente', 'Pagada', 'Vencida', 'Cancelada') DEFAULT 'Pendiente',
            paid_date DATE,
            paid_amount DECIMAL(10,2),
            payment_method VARCHAR(100),
            payment_notes TEXT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES Clients(id) ON DELETE CASCADE,
            FOREIGN KEY (quote_id) REFERENCES Quotes(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
        )
    `;
    
    db.run(createInvoicesSQL, [], (err) => {
        if (err) {
            console.error('❌ Error creando tabla Invoices:', err);
            return callback(err);
        }
        
        console.log('✅ Tabla Invoices creada/actualizada correctamente');
        callback();
    });
}

// Ejecutar migración
migrateFinanzasTables()
    .then(() => {
        console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('📋 Tabla Quotes lista para endpoints');
        console.log('🧾 Tabla Invoices lista para endpoints');
        console.log('===========================================================');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 ERROR EN MIGRACIÓN:', error);
        process.exit(1);
    });