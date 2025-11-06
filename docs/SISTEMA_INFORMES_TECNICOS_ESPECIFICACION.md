# 📄 Sistema de Informes Técnicos para Clientes - Especificación v1.0

**Fecha**: 6 de noviembre de 2025  
**Módulo**: Reportes / Informes  
**Propósito**: Generación automatizada de informes técnicos profesionales para clientes

---

## 🎯 Objetivo

Crear un sistema que genere **informes técnicos profesionales** automáticamente a partir de los tickets completados, incluyendo:
- Resumen ejecutivo del trabajo realizado
- Fotos del antes/después/proceso
- Comentarios de cierre documentados
- Posibilidad de agregar notas adicionales
- Formato PDF profesional con branding de Gymtec

---

## 📋 Fuente de Datos

### Tickets Completados
Los informes se generan a partir de tickets con:
- **Estado**: `completed` o `closed`
- **Comentarios etiquetados**: Comentarios que contienen etiquetas específicas:
  - `#trabajo` - Descripción del trabajo realizado
  - `#diagnostico` - Diagnóstico técnico
  - `#solucion` - Solución aplicada
  - `#recomendacion` - Recomendaciones futuras
  - `#cierre` - Comentario final de cierre

### Fotos del Ticket
- **Tabla**: `TicketPhotos`
- **Campos**: `id`, `ticket_id`, `photo_base64`, `uploaded_at`
- **Uso**: Todas las fotos subidas durante el ciclo de vida del ticket

### Comentarios de Cierre
- **Tabla**: `TicketComments`
- **Filtro**: Comentarios del técnico asignado con etiqueta `#cierre`
- **Contenido**: Descripción final del trabajo completado

---

## 🏗️ Estructura del Informe

### 1. Portada
```
┌─────────────────────────────────────┐
│        LOGO GYMTEC ERP              │
│                                     │
│     INFORME TÉCNICO DE SERVICIO     │
│                                     │
│  Ticket #: 183                      │
│  Cliente: Gimnasio Sportlife        │
│  Fecha: 06/11/2025                  │
│  Técnico: Juan Pérez                │
└─────────────────────────────────────┘
```

### 2. Resumen Ejecutivo
```
EQUIPO: Cinta Corredora Matrix T7xe
UBICACIÓN: Sala Cardio - 2do Piso
TIPO DE SERVICIO: Mantenimiento Preventivo
PRIORIDAD: Alta
TIEMPO DE RESOLUCIÓN: 2 días

RESUMEN:
Se realizó mantenimiento preventivo completo según protocolo.
El equipo fue revisado, lubricado y calibrado correctamente.
No se detectaron anomalías adicionales.
```

### 3. Detalles del Trabajo Realizado

#### 3.1 Diagnóstico Inicial
```
[Extraído de comentarios con #diagnostico]

- Revisión visual del equipo
- Prueba de funcionalidad completa
- Medición de parámetros eléctricos
- Inspección de componentes mecánicos
```

#### 3.2 Trabajo Ejecutado
```
[Extraído de comentarios con #trabajo]

✓ Limpieza profunda de banda y rodillos
✓ Lubricación de banda con producto especializado
✓ Ajuste de tensión de banda
✓ Calibración de sensores de velocidad
✓ Verificación de sistema eléctrico
✓ Actualización de firmware a versión 3.2
```

#### 3.3 Solución Aplicada
```
[Extraído de comentarios con #solucion]

Se completó el mantenimiento preventivo según checklist.
Todos los componentes funcionan dentro de parámetros normales.
Equipo listo para operación normal.
```

### 4. Registro Fotográfico

```
┌─────────────────┬─────────────────┐
│  ANTES          │  DESPUÉS        │
├─────────────────┼─────────────────┤
│  [FOTO 1]       │  [FOTO 2]       │
│  Banda desgast. │  Banda renovada │
└─────────────────┴─────────────────┘

PROCESO:
┌─────────────────┬─────────────────┐
│  [FOTO 3]       │  [FOTO 4]       │
│  Lubricación    │  Calibración    │
└─────────────────┴─────────────────┘
```

### 5. Recomendaciones
```
[Extraído de comentarios con #recomendacion]

• Mantener programa de lubricación cada 100 horas de uso
• Revisar tensión de banda semanalmente
• Programar próximo mantenimiento en 3 meses
• Capacitar al personal en uso correcto del equipo
```

### 6. Comentario de Cierre
```
[Extraído de comentarios con #cierre]

El mantenimiento fue completado exitosamente. El equipo fue
probado y funciona correctamente. Se entregó al cliente con
todas las funcionalidades operativas. Cliente satisfecho con
el servicio prestado.

Técnico: Juan Pérez
Fecha: 06/11/2025 14:30
```

### 7. Firma y Conformidad

```
_________________________    _________________________
Técnico Responsable          Cliente (Nombre y Firma)
Juan Pérez                   
RUT: 12.345.678-9            RUT: ___________________

Fecha: 06/11/2025            Fecha: _________________
```

---

## 💻 Implementación Técnica

### Frontend (reportes.js)

#### Estructura de Datos del Informe
```javascript
const informeTecnico = {
    // Datos del Ticket
    ticketId: 183,
    ticketTitle: "Mantenimiento Preventivo - Cinta Matrix",
    priority: "Alta",
    status: "completed",
    
    // Cliente
    cliente: {
        nombre: "Gimnasio Sportlife",
        rut: "76.123.456-7",
        contacto: "María González",
        telefono: "+56 9 8765 4321"
    },
    
    // Ubicación
    ubicacion: {
        nombre: "Sala Cardio",
        direccion: "Av. Providencia 1234, Santiago"
    },
    
    // Equipo
    equipo: {
        modelo: "Matrix T7xe",
        tipo: "Cinta Corredora",
        serial: "MTX-2023-00456"
    },
    
    // Técnico
    tecnico: {
        nombre: "Juan Pérez",
        rut: "12.345.678-9",
        especialidad: "Equipos Cardio"
    },
    
    // Fechas
    fechas: {
        creacion: "2025-11-04T09:00:00",
        inicio: "2025-11-04T10:30:00",
        cierre: "2025-11-06T14:30:00",
        duracion: "2 días, 4 horas"
    },
    
    // Contenido
    contenido: {
        diagnostico: "...",
        trabajoRealizado: ["...", "..."],
        solucion: "...",
        recomendaciones: ["...", "..."],
        comentarioCierre: "..."
    },
    
    // Fotos (Base64)
    fotos: [
        {
            id: 1,
            data: "data:image/jpeg;base64,...",
            categoria: "antes", // antes, durante, despues
            descripcion: "Estado inicial banda desgastada"
        }
    ],
    
    // Notas adicionales (opcional, escritas por usuario)
    notasAdicionales: "..."
};
```

#### Función de Generación del Informe

```javascript
async generateInformeTecnico(ticketId) {
    try {
        // 1. Cargar datos del ticket
        const ticket = await this.loadTicketDetails(ticketId);
        
        // 2. Extraer comentarios etiquetados
        const comentarios = await this.loadTicketComments(ticketId);
        const contenido = this.extractTaggedComments(comentarios);
        
        // 3. Cargar fotos
        const fotos = await this.loadTicketPhotos(ticketId);
        
        // 4. Construir objeto de informe
        const informe = this.buildInformeData(ticket, contenido, fotos);
        
        // 5. Generar PDF
        await this.generatePDF(informe);
        
        // 6. Registrar informe generado
        await this.saveInformeRecord(informe);
        
    } catch (error) {
        console.error('Error generando informe técnico:', error);
        this.showNotification('Error al generar informe', 'error');
    }
}

// Extraer contenido de comentarios etiquetados
extractTaggedComments(comentarios) {
    const contenido = {
        diagnostico: [],
        trabajo: [],
        solucion: [],
        recomendaciones: [],
        cierre: null
    };
    
    comentarios.forEach(comment => {
        const texto = comment.comment_text;
        
        if (texto.includes('#diagnostico')) {
            contenido.diagnostico.push(this.cleanComment(texto, '#diagnostico'));
        }
        if (texto.includes('#trabajo')) {
            contenido.trabajo.push(this.cleanComment(texto, '#trabajo'));
        }
        if (texto.includes('#solucion')) {
            contenido.solucion.push(this.cleanComment(texto, '#solucion'));
        }
        if (texto.includes('#recomendacion')) {
            contenido.recomendaciones.push(this.cleanComment(texto, '#recomendacion'));
        }
        if (texto.includes('#cierre')) {
            contenido.cierre = this.cleanComment(texto, '#cierre');
        }
    });
    
    return contenido;
}

// Limpiar comentario removiendo etiqueta
cleanComment(texto, tag) {
    return texto.replace(tag, '').trim();
}
```

#### Generación de PDF con jsPDF

```javascript
async generatePDF(informe) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    
    // 1. PORTADA
    doc.setFontSize(24);
    doc.text('GYMTEC ERP', 105, yPos, { align: 'center' });
    yPos += 15;
    
    doc.setFontSize(16);
    doc.text('INFORME TÉCNICO DE SERVICIO', 105, yPos, { align: 'center' });
    yPos += 20;
    
    doc.setFontSize(12);
    doc.text(`Ticket #${informe.ticketId}`, 20, yPos);
    yPos += 8;
    doc.text(`Cliente: ${informe.cliente.nombre}`, 20, yPos);
    yPos += 8;
    doc.text(`Fecha: ${this.formatDate(informe.fechas.cierre)}`, 20, yPos);
    yPos += 8;
    doc.text(`Técnico: ${informe.tecnico.nombre}`, 20, yPos);
    yPos += 20;
    
    // 2. RESUMEN EJECUTIVO
    doc.setFontSize(14);
    doc.text('RESUMEN EJECUTIVO', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Equipo: ${informe.equipo.modelo}`, 20, yPos);
    yPos += 6;
    doc.text(`Ubicación: ${informe.ubicacion.nombre}`, 20, yPos);
    yPos += 6;
    doc.text(`Prioridad: ${informe.priority}`, 20, yPos);
    yPos += 6;
    doc.text(`Duración: ${informe.fechas.duracion}`, 20, yPos);
    yPos += 15;
    
    // 3. DIAGNÓSTICO
    if (informe.contenido.diagnostico.length > 0) {
        doc.setFontSize(12);
        doc.text('DIAGNÓSTICO INICIAL', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        informe.contenido.diagnostico.forEach(item => {
            doc.text(`• ${item}`, 25, yPos);
            yPos += 6;
        });
        yPos += 10;
    }
    
    // 4. TRABAJO REALIZADO
    if (informe.contenido.trabajo.length > 0) {
        doc.setFontSize(12);
        doc.text('TRABAJO EJECUTADO', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        informe.contenido.trabajo.forEach(item => {
            doc.text(`✓ ${item}`, 25, yPos);
            yPos += 6;
        });
        yPos += 10;
    }
    
    // 5. FOTOS
    if (informe.fotos.length > 0) {
        // Nueva página para fotos
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(12);
        doc.text('REGISTRO FOTOGRÁFICO', 20, yPos);
        yPos += 15;
        
        // Insertar fotos (máximo 4 por página)
        let fotosEnPagina = 0;
        for (const foto of informe.fotos) {
            if (fotosEnPagina >= 4) {
                doc.addPage();
                yPos = 20;
                fotosEnPagina = 0;
            }
            
            try {
                doc.addImage(foto.data, 'JPEG', 20, yPos, 80, 60);
                doc.setFontSize(8);
                doc.text(foto.descripcion || '', 20, yPos + 65);
                
                fotosEnPagina++;
                yPos += 80;
            } catch (error) {
                console.error('Error agregando foto:', error);
            }
        }
    }
    
    // 6. RECOMENDACIONES
    if (informe.contenido.recomendaciones.length > 0) {
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(12);
        doc.text('RECOMENDACIONES', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        informe.contenido.recomendaciones.forEach(item => {
            doc.text(`• ${item}`, 25, yPos);
            yPos += 6;
        });
        yPos += 15;
    }
    
    // 7. COMENTARIO DE CIERRE
    if (informe.contenido.cierre) {
        doc.setFontSize(12);
        doc.text('COMENTARIO DE CIERRE', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        const splitText = doc.splitTextToSize(informe.contenido.cierre, 170);
        doc.text(splitText, 20, yPos);
        yPos += splitText.length * 6 + 15;
    }
    
    // 8. FIRMAS
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(12);
    doc.text('CONFORMIDAD Y FIRMAS', 20, yPos);
    yPos += 20;
    
    // Técnico
    doc.line(20, yPos, 80, yPos); // Línea de firma
    yPos += 6;
    doc.setFontSize(10);
    doc.text('Técnico Responsable', 20, yPos);
    yPos += 5;
    doc.text(informe.tecnico.nombre, 20, yPos);
    yPos += 5;
    doc.text(`RUT: ${informe.tecnico.rut}`, 20, yPos);
    
    // Cliente
    yPos -= 16;
    doc.line(120, yPos, 180, yPos); // Línea de firma
    yPos += 6;
    doc.text('Cliente (Nombre y Firma)', 120, yPos);
    yPos += 5;
    doc.text('_______________________', 120, yPos);
    yPos += 5;
    doc.text('RUT: ___________________', 120, yPos);
    
    // Guardar PDF
    const filename = `Informe_tecnico_${informe.ticketId}_${Date.now()}.pdf`;
    doc.save(filename);
    
    return filename;
}
```

---

## 🎨 Interfaz de Usuario

### Modal de Generación de Informe

```html
<div id="generate-informe-modal" class="base-modal">
    <div class="base-modal-content max-w-4xl">
        <div class="base-modal-header">
            <h3>Generar Informe Técnico</h3>
            <button class="base-modal-close">&times;</button>
        </div>
        
        <div class="base-modal-body">
            <!-- Selección de Ticket -->
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">
                    Ticket Completado
                </label>
                <select id="informe-ticket-select" class="w-full p-2 border rounded">
                    <option value="">Seleccionar ticket...</option>
                    <!-- Opciones cargadas dinámicamente -->
                </select>
            </div>
            
            <!-- Preview de Datos Extraídos -->
            <div id="informe-preview" class="hidden">
                <h4 class="font-semibold mb-3">Vista Previa de Datos</h4>
                
                <!-- Resumen -->
                <div class="bg-gray-50 p-4 rounded mb-4">
                    <h5 class="font-medium mb-2">Resumen</h5>
                    <div id="informe-resumen"></div>
                </div>
                
                <!-- Trabajo Realizado -->
                <div class="bg-gray-50 p-4 rounded mb-4">
                    <h5 class="font-medium mb-2">Trabajo Realizado</h5>
                    <ul id="informe-trabajo" class="list-disc pl-5"></ul>
                </div>
                
                <!-- Fotos -->
                <div class="bg-gray-50 p-4 rounded mb-4">
                    <h5 class="font-medium mb-2">Fotos Incluidas</h5>
                    <div id="informe-fotos" class="grid grid-cols-4 gap-2"></div>
                </div>
                
                <!-- Notas Adicionales (Usuario puede escribir) -->
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">
                        Notas Adicionales (Opcional)
                    </label>
                    <textarea 
                        id="informe-notas-adicionales" 
                        rows="4" 
                        class="w-full p-2 border rounded"
                        placeholder="Agregar información adicional para el informe..."
                    ></textarea>
                </div>
            </div>
        </div>
        
        <div class="base-modal-footer">
            <button 
                id="generate-informe-btn" 
                class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
                <i data-lucide="file-text" class="inline w-4 h-4 mr-2"></i>
                Generar Informe PDF
            </button>
            <button class="base-modal-close px-6 py-2 border rounded hover:bg-gray-100">
                Cancelar
            </button>
        </div>
    </div>
</div>
```

---

## 📊 Tabla de Informes Generados

```sql
CREATE TABLE IF NOT EXISTS InformesTecnicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    generated_by INT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_to_client BOOLEAN DEFAULT FALSE,
    client_email VARCHAR(255),
    sent_at TIMESTAMP NULL,
    notas_adicionales TEXT,
    
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id),
    FOREIGN KEY (generated_by) REFERENCES Users(id),
    
    INDEX idx_ticket (ticket_id),
    INDEX idx_generated_at (generated_at)
);
```

---

## 🚀 Plan de Implementación

### Fase 1: Backend (1-2 horas)
1. ✅ Crear endpoint `/api/tickets/:id/informe-data`
   - Devuelve ticket completo con comentarios etiquetados
   - Incluye fotos en Base64
   - Datos de cliente, ubicación, equipo, técnico

2. ✅ Crear endpoint `/api/informes`
   - POST: Registrar nuevo informe generado
   - GET: Listar informes generados
   - GET /:id: Ver informe específico

3. ✅ Crear tabla `InformesTecnicos`

### Fase 2: Frontend (2-3 horas)
1. ✅ Actualizar reportes.js con función `generateInformeTecnico()`
2. ✅ Crear modal de generación
3. ✅ Implementar extracción de comentarios etiquetados
4. ✅ Implementar generación de PDF con jsPDF
5. ✅ Agregar preview de datos antes de generar

### Fase 3: Testing (1 hora)
1. ✅ Probar con ticket real completado
2. ✅ Verificar calidad del PDF
3. ✅ Validar todas las secciones
4. ✅ Probar con/sin fotos
5. ✅ Verificar diferentes etiquetas

### Fase 4: Mejoras Futuras
- [ ] Envío automático por email al cliente
- [ ] Plantillas personalizables
- [ ] Firma digital del técnico
- [ ] QR code para validación
- [ ] Almacenamiento en servidor de PDFs

---

## 📝 Uso del Sistema

### Para el Técnico (Durante el Servicio)

1. **Agregar comentarios etiquetados** durante el trabajo:
   ```
   #diagnostico Revisión visual completa, banda desgastada
   #trabajo Limpieza profunda y lubricación aplicada
   #solucion Equipo funcionando correctamente
   #recomendacion Programar mantenimiento en 3 meses
   #cierre Servicio completado satisfactoriamente
   ```

2. **Subir fotos** en cada etapa del proceso

3. **Cerrar el ticket** con estado `completed`

### Para Admin/Manager (Generación de Informe)

1. Ir a **Reportes > Informes Técnicos**
2. Click en **"Nuevo Informe"**
3. Seleccionar **ticket completado** de la lista
4. Revisar **preview automático** de datos extraídos
5. Agregar **notas adicionales** si es necesario
6. Click en **"Generar Informe PDF"**
7. PDF se descarga automáticamente
8. **Opción de enviar por email** al cliente (futuro)

---

## ✅ Checklist de Calidad

- [ ] PDF incluye toda la información del ticket
- [ ] Fotos se ven correctamente (sin distorsión)
- [ ] Texto legible y bien formateado
- [ ] Branding de Gymtec presente
- [ ] Secciones bien organizadas
- [ ] Firmas claramente definidas
- [ ] Información de contacto correcta
- [ ] Formato profesional y presentable al cliente

---

**Documento creado**: 6 de noviembre de 2025  
**Autor**: Sistema Gymtec ERP  
**Estado**: ✅ Especificación completa - Lista para implementación
