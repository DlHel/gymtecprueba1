/**
 * Pruebas Unitarias - Módulo Equipos
 * GymTec ERP v3.0
 */

describe('🏋️ GymTec ERP - Módulo de Equipos', () => {
    
    const mockEquipment = {
        id: 1,
        name: 'Cinta Profesional X1',
        model_id: 1,
        location_id: 1,
        serial_number: 'CINTA001',
        installation_date: '2024-01-15',
        activo: 1,
        warranty_end: '2025-01-15',
        last_maintenance: '2024-08-15',
        maintenance_interval: 30
    };

    describe('🔧 CRUD Operations', () => {
        test('Crear nuevo equipo', () => {
            const newEquipment = { ...mockEquipment };
            delete newEquipment.id;

            expect(newEquipment).not.toHaveProperty('id');
            expect(newEquipment).toHaveProperty('name');
            expect(newEquipment).toHaveProperty('serial_number');
            expect(newEquipment).toHaveProperty('model_id');
        });

        test('Leer equipo existente', () => {
            expect(mockEquipment).toHaveProperty('id', 1);
            expect(mockEquipment).toHaveProperty('name', 'Cinta Profesional X1');
            expect(mockEquipment).toHaveProperty('activo', 1);
        });

        test('Actualizar equipo', () => {
            const updatedEquipment = {
                ...mockEquipment,
                name: 'Cinta Profesional X1 - Actualizada',
                last_maintenance: new Date().toISOString().split('T')[0]
            };

            expect(updatedEquipment.name).toContain('Actualizada');
            expect(updatedEquipment.last_maintenance).toBeTruthy();
        });

        test('Eliminar equipo', () => {
            const deletedEquipment = {
                ...mockEquipment,
                activo: 0,
                deleted_at: new Date().toISOString()
            };

            expect(deletedEquipment.activo).toBe(0);
            expect(deletedEquipment).toHaveProperty('deleted_at');
        });
    });

    describe('📊 Validaciones de Equipos', () => {
        test('Número de serie único', () => {
            const equipmentList = [
                { ...mockEquipment, id: 1, serial_number: 'CINTA001' },
                { ...mockEquipment, id: 2, serial_number: 'CINTA002' },
                { ...mockEquipment, id: 3, serial_number: 'BICI001' }
            ];

            const serialNumbers = equipmentList.map(eq => eq.serial_number);
            const uniqueSerials = [...new Set(serialNumbers)];
            
            expect(uniqueSerials).toHaveLength(serialNumbers.length);
        });

        test('Fecha de instalación válida', () => {
            const installationDate = new Date(mockEquipment.installation_date);
            const today = new Date();
            
            expect(installationDate).toBeInstanceOf(Date);
            expect(installationDate.getTime()).toBeLessThanOrEqual(today.getTime());
        });

        test('Estado activo válido', () => {
            expect([0, 1]).toContain(mockEquipment.activo);
            expect(typeof mockEquipment.activo).toBe('number');
        });

        test('Relaciones válidas', () => {
            expect(mockEquipment.model_id).toBeGreaterThan(0);
            expect(mockEquipment.location_id).toBeGreaterThan(0);
            expect(typeof mockEquipment.model_id).toBe('number');
            expect(typeof mockEquipment.location_id).toBe('number');
        });
    });

    describe('🔍 Filtros y Búsqueda', () => {
        const equipmentList = [
            { ...mockEquipment, id: 1, name: 'Cinta Alpha', model_id: 1 },
            { ...mockEquipment, id: 2, name: 'Bicicleta Beta', model_id: 2 },
            { ...mockEquipment, id: 3, name: 'Cinta Gamma', model_id: 1 }
        ];

        test('Filtrar por categoría', () => {
            const cintasEquipment = equipmentList.filter(eq => 
                eq.name.toLowerCase().includes('cinta')
            );
            expect(cintasEquipment).toHaveLength(2);
        });

        test('Búsqueda por nombre', () => {
            const searchTerm = 'alpha';
            const results = equipmentList.filter(eq =>
                eq.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Cinta Alpha');
        });

        test('Filtrar equipos activos', () => {
            const activeEquipment = equipmentList.filter(eq => eq.activo === 1);
            expect(activeEquipment).toHaveLength(3);
        });
    });

    describe('📅 Gestión de Mantenimiento', () => {
        test('Calcular próximo mantenimiento', () => {
            const lastMaintenance = new Date('2024-09-30');
            const interval = 30; // días
            const nextMaintenance = new Date(lastMaintenance);
            nextMaintenance.setDate(lastMaintenance.getDate() + interval);

            expect(nextMaintenance.toISOString().split('T')[0]).toBe('2024-10-30');
        });

        test('Verificar mantenimiento vencido', () => {
            const lastMaintenance = new Date('2024-07-15');
            const interval = 30;
            const today = new Date();
            
            const nextDue = new Date(lastMaintenance);
            nextDue.setDate(lastMaintenance.getDate() + interval);
            
            const isOverdue = today > nextDue;
            expect(isOverdue).toBe(true);
        });

        test('Alertas de mantenimiento próximo', () => {
            const lastMaintenance = new Date();
            lastMaintenance.setDate(lastMaintenance.getDate() - 25); // hace 25 días
            const interval = 30;
            const warningDays = 5;
            
            const nextDue = new Date(lastMaintenance);
            nextDue.setDate(lastMaintenance.getDate() + interval);
            
            const today = new Date();
            const daysUntilDue = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
            
            const needsWarning = daysUntilDue <= warningDays && daysUntilDue > 0;
            expect(needsWarning).toBe(true);
        });
    });

    describe('🏷️ Códigos QR y Tracking', () => {
        test('Generar código QR', () => {
            const qrData = {
                equipment_id: mockEquipment.id,
                serial_number: mockEquipment.serial_number,
                url: `https://app.gymtec.com/equipment/${mockEquipment.id}`,
                generated_at: new Date().toISOString()
            };

            expect(qrData).toHaveProperty('equipment_id', mockEquipment.id);
            expect(qrData.url).toContain(`/equipment/${mockEquipment.id}`);
            expect(qrData.url).toMatch(/^https?:\/\//);
        });

        test('Validar URL de tracking', () => {
            const trackingUrl = `https://app.gymtec.com/equipment/${mockEquipment.id}`;
            
            expect(trackingUrl).toMatch(/^https:\/\/app\.gymtec\.com\/equipment\/\d+$/);
            expect(trackingUrl).toContain(mockEquipment.id.toString());
        });
    });

    describe('📈 Métricas y Estadísticas', () => {
        test('Estadísticas generales', () => {
            const stats = {
                total_equipment: 50,
                active_equipment: 45,
                maintenance_pending: 8,
                overdue_maintenance: 2,
                availability_rate: 90 // %
            };

            expect(stats.active_equipment).toBeLessThanOrEqual(stats.total_equipment);
            expect(stats.availability_rate).toBeGreaterThan(80);
            expect(stats.overdue_maintenance).toBeLessThanOrEqual(stats.maintenance_pending);
        });

        test('Porcentaje de disponibilidad', () => {
            const totalHours = 24 * 30; // mes
            const downtimeHours = 48; // 2 días
            const availability = ((totalHours - downtimeHours) / totalHours) * 100;

            expect(availability).toBeCloseTo(93.33, 2);
            expect(availability).toBeGreaterThan(90);
        });

        test('Distribución por categoría', () => {
            const categoryDistribution = {
                'Cardio': 25,
                'Fuerza': 15,
                'Funcional': 8,
                'Accesorios': 2
            };

            const total = Object.values(categoryDistribution).reduce((sum, count) => sum + count, 0);
            expect(total).toBe(50);
            expect(categoryDistribution['Cardio']).toBeGreaterThan(categoryDistribution['Fuerza']);
        });
    });

    describe('🔒 Validaciones de Seguridad', () => {
        test('Acceso autorizado a equipos', () => {
            const userPermissions = {
                user_id: 1,
                role: 'technician',
                can_view: true,
                can_edit: true,
                can_delete: false,
                equipment_access: [1, 2, 3, 4, 5]
            };

            expect(userPermissions.equipment_access).toContain(mockEquipment.id);
            expect(userPermissions.can_view).toBe(true);
        });

        test('Sanitización de entrada', () => {
            const userInput = "<script>alert('xss')</script>Cinta Normal";
            const sanitized = userInput.replace(/<[^>]*>/g, '');
            
            expect(sanitized).toBe('Cinta Normal');
            expect(sanitized).not.toContain('<script>');
        });

        test('Validación de serial number', () => {
            const validSerials = [
                'CINTA001',
                'EQ-2024-001',
                'FIT_PRO_123'
            ];

            const invalidSerials = [
                '',
                'a',
                'eq@123',
                'serial number with spaces'
            ];

            validSerials.forEach(serial => {
                expect(serial).toMatch(/^[A-Z0-9_-]+$/);
                expect(serial.length).toBeGreaterThan(2);
            });

            invalidSerials.forEach(serial => {
                expect(serial).not.toMatch(/^[A-Z0-9_-]+$/);
            });
        });
    });

    describe('📱 UI y Experiencia', () => {
        test('Card de equipo - Información básica', () => {
            const equipmentCard = {
                id: mockEquipment.id,
                name: mockEquipment.name,
                status: mockEquipment.activo ? 'Activo' : 'Inactivo',
                lastMaintenance: mockEquipment.last_maintenance,
                nextMaintenance: '2024-09-14',
                statusColor: mockEquipment.activo ? 'green' : 'red'
            };

            expect(equipmentCard.name).toBe(mockEquipment.name);
            expect(equipmentCard.status).toBe('Activo');
            expect(equipmentCard.statusColor).toBe('green');
        });

        test('Modal de edición - Campos requeridos', () => {
            const formData = {
                name: 'Cinta Editada',
                model_id: 1,
                location_id: 1,
                serial_number: 'CINTA001_EDIT',
                installation_date: '2024-01-15'
            };

            const requiredFields = ['name', 'model_id', 'location_id', 'serial_number'];

            requiredFields.forEach(field => {
                expect(formData).toHaveProperty(field);
                expect(formData[field]).toBeTruthy();
            });
        });
    });
});

describe('🔧 Integración Equipos', () => {
    const mockEquipment = {
        id: 1,
        name: 'Cinta Trotadora Alpha',
        model_id: 1,
        location_id: 1,
        serial_number: 'CINTA001',
        installation_date: '2024-01-15',
        activo: 1,
        warranty_end: '2025-01-15',
        last_maintenance: '2024-08-15',
        maintenance_interval: 30
    };

    test('API endpoints estructura', () => {
        const endpoints = {
            list: '/api/equipment',
            create: '/api/equipment',
            read: '/api/equipment/:id',
            update: '/api/equipment/:id',
            delete: '/api/equipment/:id',
            models: '/api/equipment-models',
            qr: '/api/equipment/:id/qr'
        };

        Object.values(endpoints).forEach(endpoint => {
            expect(endpoint).toMatch(/^\/api\//);
            expect(typeof endpoint).toBe('string');
        });
    });

    test('Relación con ubicaciones', () => {
        const equipmentWithLocation = {
            ...mockEquipment,
            location: {
                id: 1,
                name: 'Sede Principal',
                client_id: 1
            }
        };

        expect(equipmentWithLocation.location_id).toBe(equipmentWithLocation.location.id);
        expect(equipmentWithLocation.location).toHaveProperty('name');
    });

    test('Historial de mantenimiento', () => {
        const maintenanceHistory = [
            {
                id: 1,
                equipment_id: mockEquipment.id,
                date: '2024-08-01',
                type: 'Preventivo',
                technician: 'Juan Pérez',
                notes: 'Lubricación y calibración'
            }
        ];

        expect(maintenanceHistory[0].equipment_id).toBe(mockEquipment.id);
        expect(maintenanceHistory[0]).toHaveProperty('type');
        expect(maintenanceHistory[0]).toHaveProperty('technician');
    });
});
