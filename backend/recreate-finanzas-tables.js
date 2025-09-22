const db = require('./src/db-adapter');

console.log('🔄 RECREANDO TABLAS QUOTES E INVOICES');
console.log('=====================================');

async function recreateFinanzasTables() {
    return new Promise((resolve, reject) => {
        console.log('\n📋 Paso 1: Eliminando tablas existentes...');
        
        // Eliminar tablas en orden correcto (por las FK)
        db.run("DROP TABLE IF EXISTS Invoices", [], (err) => {
            if (err) {
                console.error('❌ Error eliminando tabla Invoices:', err);
                return reject(err);
            }
            
            db.run("DROP TABLE IF EXISTS Quotes", [], (err) => {
                if (err) {
                    console.error('❌ Error eliminando tabla Quotes:', err);
                    return reject(err);
                }
                
                console.log('✅ Tablas eliminadas correctamente');
                
                // Crear tabla Quotes con schema CORRECTO
                createQuotesTable(() => {
                    // Crear tabla Invoices con schema CORRECTO
                    createInvoicesTable(() => {
                        console.log('✅ Recreación completada exitosamente');
                        resolve();
                    });
                });
            });
        });
    });
}

function createQuotesTable(callback) {
    console.log('\n📋 Paso 2: Creando tabla Quotes con schema correcto...');
    
    const createQuotesSQL = `
        CREATE TABLE Quotes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            quote_number VARCHAR(50) UNIQUE,
            created_date DATE NOT NULL,
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
        
        console.log('✅ Tabla Quotes creada correctamente');
        callback();
    });
}

function createInvoicesTable(callback) {
    console.log('\n🧾 Paso 3: Creando tabla Invoices con schema correcto...');
    
    const createInvoicesSQL = `
        CREATE TABLE Invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            invoice_number VARCHAR(50) UNIQUE,
            quote_id INT,
            issue_date DATE NOT NULL,
            due_date DATE,
            description TEXT NOT NULL,
            items JSON,
            subtotal DECIMAL(10,2) DEFAULT 0.00,
            tax_amount DECIMAL(10,2) DEFAULT 0.00,
            total DECIMAL(10,2) NOT NULL,
            payment_terms TEXT,
            notes TEXT,
            status ENUM('Borrador', 'Enviada', 'Pagada', 'Vencida', 'Cancelada') DEFAULT 'Borrador',
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
        
        console.log('✅ Tabla Invoices creada correctamente');
        callback();
    });
}

// Ejecutar recreación
recreateFinanzasTables()
    .then(() => {
        console.log('\n🎉 RECREACIÓN COMPLETADA EXITOSAMENTE');
        console.log('Las tablas Quotes e Invoices han sido recreadas con el schema correcto');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 ERROR EN RECREACIÓN:', error);
        process.exit(1);
    });