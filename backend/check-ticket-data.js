const db = require('./src/db-adapter');

console.log('🔍 Verificando datos completos del ticket 7...\n');

// Función para verificar comentarios
function checkComments() {
    return new Promise((resolve) => {
        db.all('SELECT * FROM ticketnotes WHERE ticket_id = 7 ORDER BY created_at DESC', [], (err, comments) => {
            if (err) {
                console.error('❌ Error consultando comentarios:', err);
                resolve([]);
                return;
            }
            console.log('📝 COMENTARIOS encontrados para ticket 7:', comments.length);
            if (comments.length > 0) {
                comments.forEach((comment, index) => {
                    console.log(`   ${index + 1}. ID: ${comment.id}`);
                    console.log(`      Usuario: ${comment.user_id || 'Sistema'}`);
                    console.log(`      Texto: ${comment.note || 'Sin texto'}`);
                    console.log(`      Tipo: ${comment.note_type || 'General'}`);
                    console.log(`      Autor: ${comment.author || 'Desconocido'}`);
                    console.log(`      Fecha: ${comment.created_at}`);
                    console.log('');
                });
            } else {
                console.log('   ❌ No hay comentarios guardados\n');
            }
            resolve(comments);
        });
    });
}

// Función para verificar checklist
function checkChecklist() {
    return new Promise((resolve) => {
        db.all('SELECT * FROM ticketchecklists WHERE ticket_id = 7 ORDER BY created_at DESC', [], (err, checklist) => {
            if (err) {
                console.error('❌ Error consultando checklist:', err);
                resolve([]);
                return;
            }
            console.log('✅ CHECKLIST encontrado para ticket 7:', checklist.length);
            if (checklist.length > 0) {
                checklist.forEach((item, index) => {
                    console.log(`   ${index + 1}. ID: ${item.id}`);
                    console.log(`      Descripción: ${item.description || 'Sin descripción'}`);
                    console.log(`      Completado: ${item.completed ? 'Sí' : 'No'}`);
                    console.log(`      Fecha: ${item.created_at}`);
                    console.log('');
                });
            } else {
                console.log('   ❌ No hay items de checklist guardados\n');
            }
            resolve(checklist);
        });
    });
}

// Función para verificar fotos
function checkPhotos() {
    return new Promise((resolve) => {
        db.all('SELECT * FROM TicketPhotos WHERE ticket_id = 7 ORDER BY created_at DESC', [], (err, photos) => {
            if (err) {
                console.error('❌ Error consultando fotos:', err);
                resolve([]);
                return;
            }
            console.log('📸 FOTOS encontradas para ticket 7:', photos.length);
            if (photos.length > 0) {
                photos.forEach((photo, index) => {
                    console.log(`   ${index + 1}. ID: ${photo.id}`);
                    console.log(`      Descripción: ${photo.description || 'Sin descripción'}`);
                    console.log(`      Tamaño de imagen: ${photo.image_data ? photo.image_data.length + ' caracteres' : 'Sin imagen'}`);
                    console.log(`      Fecha: ${photo.created_at}`);
                    console.log('');
                });
            } else {
                console.log('   ❌ No hay fotos guardadas\n');
            }
            resolve(photos);
        });
    });
}

// Función para verificar el ticket principal
function checkTicket() {
    return new Promise((resolve) => {
        db.get('SELECT * FROM Tickets WHERE id = 7', [], (err, ticket) => {
            if (err) {
                console.error('❌ Error consultando ticket:', err);
                resolve(null);
                return;
            }
            if (ticket) {
                console.log('🎫 TICKET 7 información:');
                console.log(`   Título: ${ticket.title}`);
                console.log(`   Estado: ${ticket.status}`);
                console.log(`   Prioridad: ${ticket.priority}`);
                console.log(`   Creado: ${ticket.created_at}`);
                console.log('');
            } else {
                console.log('❌ Ticket 7 no encontrado');
            }
            resolve(ticket);
        });
    });
}

// Ejecutar todas las verificaciones
async function runChecks() {
    try {
        await checkTicket();
        await checkComments();
        await checkChecklist();
        await checkPhotos();
        
        console.log('🏁 Verificación completada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        process.exit(1);
    }
}

runChecks();
