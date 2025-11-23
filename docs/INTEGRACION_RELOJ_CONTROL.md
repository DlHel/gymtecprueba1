# Integración con Reloj Control Biométrico

## Resumen

Este documento describe cómo integrar el Sistema de Asistencia GymTec con relojes control biométricos estándar que utilizan comunicación TCP/IP, API REST, o archivos de intercambio.

## Arquitectura Propuesta

```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Reloj Control      │   ───>  │  Middleware      │   ───>  │  API GymTec     │
│  Biométrico         │         │  Bridge Service  │         │  /api/attendance│
│  (TCP/IP o REST)    │         │  (Node.js)       │         │                 │
└─────────────────────┘         └──────────────────┘         └─────────────────┘
```

## Tipos de Integración Soportados

### 1. API REST (Recomendado)

El reloj control envía datos directamente al endpoint de GymTec mediante HTTP POST.

**Endpoint para recibir marcaciones:**
```
POST /api/attendance/external-clock
```

**Payload esperado:**
```json
{
  "device_id": "CLOCK_001",
  "employee_id": "12345",
  "timestamp": "2025-11-21T15:30:00Z",
  "event_type": "check_in",  // o "check_out"
  "location": "Entrada Principal",
  "verification_method": "fingerprint"  // fingerprint, face, card, pin
}
```

### 2. TCP/IP Socket (Polling)

Para relojes que no soportan push, implementar servicio que consulta periódicamente.

**Archivo:** `backend/services/time-clock-bridge.js`

```javascript
const net = require('net');
const axios = require('axios');

class TimeClockBridge {
    constructor(config) {
        this.host = config.host;
        this.port = config.port;
        this.apiUrl = config.apiUrl;
        this.pollInterval = config.pollInterval || 5000;
    }

    async connect() {
        this.client = new net.Socket();
        this.client.connect(this.port, this.host, () => {
            console.log('✅ Conectado al reloj control');
            this.startPolling();
        });

        this.client.on('data', (data) => {
            this.processData(data.toString());
        });

        this.client.on('error', (err) => {
            console.error('❌ Error de conexión:', err);
        });
    }

    async processData(rawData) {
        try {
            // Parsear según protocolo del fabricante
            const event = this.parseEvent(rawData);
            
            // Enviar a API de GymTec
            await axios.post(`${this.apiUrl}/api/attendance/external-clock`, event, {
                headers: { 'Authorization': `Bearer ${this.apiToken}` }
            });
            
            console.log('✅ Marcación sincronizada:', event);
        } catch (error) {
            console.error('❌ Error procesando marcación:', error);
        }
    }

    parseEvent(rawData) {
        // IMPLEMENTAR según protocolo del fabricante
        // Ejemplo para formato común:
        // "001,12345,2025-11-21 15:30:00,1"
        const [deviceId, employeeId, timestamp, type] = rawData.split(',');
        
        return {
            device_id: deviceId,
            employee_id: employeeId,
            timestamp: new Date(timestamp).toISOString(),
            event_type: type === '1' ? 'check_in' : 'check_out',
            location: 'Reloj Control',
            verification_method: 'fingerprint'
        };
    }

    startPolling() {
        setInterval(() => {
            // Enviar comando de consulta según fabricante
            this.client.write('GET_EVENTS\\n');
        }, this.pollInterval);
    }
}

module.exports = TimeClockBridge;
```

### 3. Archivo de Intercambio (CSV/TXT)

Para relojes que exportan archivos periódicamente.

**Servicio de monitoreo:**
```javascript
const chokidar = require('chokidar');
const fs = require('fs').promises;
const csv = require('csv-parser');

class FileWatcher {
    constructor(watchPath, apiUrl) {
        this.watchPath = watchPath;
        this.apiUrl = apiUrl;
    }

    start() {
        const watcher = chokidar.watch(this.watchPath, {
            ignored: /^\./,
            persistent: true
        });

        watcher.on('add', async (path) => {
            console.log(`📁 Nuevo archivo detectado: ${path}`);
            await this.processFile(path);
        });
    }

    async processFile(filePath) {
        const events = [];
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                events.push(this.mapRowToEvent(row));
            })
            .on('end', async () => {
                for (const event of events) {
                    await this.sendToAPI(event);
                }
                
                // Mover archivo a procesados
                await fs.rename(filePath, `${filePath}.processed`);
            });
    }

    mapRowToEvent(row) {
        return {
            device_id: row.DeviceID,
            employee_id: row.EmployeeID,
            timestamp: new Date(row.DateTime).toISOString(),
            event_type: row.Type === 'IN' ? 'check_in' : 'check_out',
            location: row.Location || 'Reloj Control',
            verification_method: row.Method || 'unknown'
        };
    }
}
```

## Implementación en Backend

### Endpoint para Recibir Marcaciones Externas

**Ubicación:** `backend/src/server-clean.js`

```javascript
// POST - Recibir marcación desde reloj control externo
app.post('/api/attendance/external-clock', async (req, res) => {
    try {
        const { device_id, employee_id, timestamp, event_type, location, verification_method } = req.body;
        
        console.log(`🕐 Marcación desde reloj ${device_id}: ${employee_id} - ${event_type}`);
        
        // Buscar usuario por ID de empleado (puede ser username, employee_number, etc.)
        const [users] = await db.promise().query(
            'SELECT id FROM Users WHERE username = ? OR email LIKE ?',
            [employee_id, `%${employee_id}%`]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                message: 'error', 
                error: 'Empleado no encontrado' 
            });
        }
        
        const userId = users[0].id;
        const eventDate = new Date(timestamp);
        const dateOnly = eventDate.toISOString().split('T')[0];
        
        if (event_type === 'check_in') {
            // Verificar si ya existe registro para hoy
            const [existing] = await db.promise().query(
                'SELECT * FROM Attendance WHERE user_id = ? AND date = ?',
                [userId, dateOnly]
            );
            
            if (existing.length > 0 && existing[0].check_in_time) {
                return res.status(400).json({ 
                    message: 'error', 
                    error: 'Ya registró entrada hoy' 
                });
            }
            
            // Registrar entrada
            await db.promise().query(
                `INSERT INTO Attendance (user_id, date, check_in_time, check_in_location, check_in_ip, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE 
                    check_in_time = VALUES(check_in_time),
                    check_in_location = VALUES(check_in_location)`,
                [userId, dateOnly, timestamp, location || 'Reloj Control', device_id]
            );
            
            res.json({ message: 'success', data: { event: 'check_in', user_id: userId } });
            
        } else if (event_type === 'check_out') {
            // Registrar salida
            const [result] = await db.promise().query(
                `UPDATE Attendance 
                 SET check_out_time = ?, 
                     check_out_location = ?,
                     worked_hours = TIMESTAMPDIFF(MINUTE, check_in_time, ?) / 60
                 WHERE user_id = ? AND date = ?`,
                [timestamp, location || 'Reloj Control', timestamp, userId, dateOnly]
            );
            
            if (result.affectedRows === 0) {
                return res.status(400).json({ 
                    message: 'error', 
                    error: 'No hay registro de entrada para hoy' 
                });
            }
            
            res.json({ message: 'success', data: { event: 'check_out', user_id: userId } });
        }
        
    } catch (error) {
        console.error('❌ Error procesando marcación externa:', error);
        res.status(500).json({ message: 'error', error: error.message });
    }
});

// GET - Consultar estado de reloj (health check)
app.get('/api/attendance/clock-status/:deviceId', authenticateToken, requireRole(['Admin']), (req, res) => {
    // TODO: Implementar consulta de estado del reloj
    res.json({ 
        message: 'success', 
        data: { 
            device_id: req.params.deviceId,
            status: 'online',
            last_sync: new Date().toISOString()
        } 
    });
});
```

## Configuración

### Variables de Entorno

Agregar a `backend/config.env`:

```env
# Configuración de Reloj Control
TIMECLOCK_ENABLED=true
TIMECLOCK_TYPE=rest  # rest, tcp, file
TIMECLOCK_HOST=192.168.1.100
TIMECLOCK_PORT=4370
TIMECLOCK_POLL_INTERVAL=5000
TIMECLOCK_FILE_PATH=../uploads/timeclock/
TIMECLOCK_API_TOKEN=your_secure_token_here
```

### Mapeo de Empleados

Crear tabla de mapeo si el reloj usa IDs diferentes:

```sql
CREATE TABLE IF NOT EXISTS EmployeeDeviceMapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_employee_id VARCHAR(50) NOT NULL,
    device_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mapping (device_employee_id, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Fabricantes Comunes y Protocolos

### ZKTeco
- **Protocolo:** TCP/IP (Puerto 4370)
- **SDK:** ZKTeco Standalone SDK
- **Formato:** Binario propietario
- **Librerías:** `zklib-js`, `node-zklib`

### Anviz
- **Protocolo:** TCP/IP (Puerto 5010)
- **API:** REST API disponible
- **Formato:** JSON/XML

### Suprema
- **Protocolo:** BioStar 2 API REST
- **Autenticación:** OAuth 2.0
- **Documentación:** https://kb.supremainc.com/

### Genérico (CSV)
- **Formato ejemplo:**
```csv
DeviceID,EmployeeID,DateTime,Type,Location,Method
CLOCK_001,12345,2025-11-21 15:30:00,IN,Entrada Principal,Fingerprint
CLOCK_001,12345,2025-11-21 18:00:00,OUT,Entrada Principal,Fingerprint
```

## Pruebas

### 1. Simular Marcación desde Reloj

```bash
curl -X POST http://localhost:3000/api/attendance/external-clock \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "CLOCK_TEST_001",
    "employee_id": "admin",
    "timestamp": "2025-11-21T15:30:00Z",
    "event_type": "check_in",
    "location": "Entrada Principal",
    "verification_method": "fingerprint"
  }'
```

### 2. Verificar Registro

```bash
curl -X GET http://localhost:3000/api/attendance/today \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Consideraciones de Seguridad

1. **Autenticación del Dispositivo:**
   - Usar tokens de API exclusivos por dispositivo
   - Validar IP de origen
   - Renovación periódica de tokens

2. **Validación de Datos:**
   - Verificar formato de timestamp
   - Validar que employee_id exista
   - Detectar intentos de duplicación

3. **Logging:**
   - Registrar todas las marcaciones externas
   - Auditoría de fallos de autenticación
   - Monitoreo de anomalías

4. **Redundancia:**
   - Buffer local en caso de pérdida de conexión
   - Sincronización automática al recuperar conexión
   - Alertas por dispositivo offline

## Monitoreo

### Dashboard de Relojes Conectados

Agregar a la vista de administración:
- Estado de cada reloj (online/offline)
- Última sincronización
- Cantidad de marcaciones procesadas
- Errores recientes

## Próximos Pasos

1. ✅ Crear endpoint `/api/attendance/external-clock`
2. ⚠️ Implementar bridge service según fabricante del reloj
3. ⚠️ Configurar tabla de mapeo de empleados
4. ⚠️ Agregar monitoring dashboard
5. ⚠️ Implementar sistema de alertas
6. ⚠️ Documentar procedimiento de enrollment de huellas

## Referencias

- [ZKTeco Protocol Documentation](https://github.com/caobo171/node-zklib)
- [Anviz API Documentation](https://www.anviz.com)
- [Suprema BioStar 2 API](https://kb.supremainc.com/knowledge/doku.php?id=en:bs2_api)
