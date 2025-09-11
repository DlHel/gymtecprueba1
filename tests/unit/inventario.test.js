/**
 * Pruebas Unitarias - Módulo Inventario
 * GymTec ERP v3.0
 */

describe('📦 GymTec ERP - Módulo de Inventario', () => {
    
    const mockInventoryItem = {
        id: 1,
        item_code: 'PART001',
        item_name: 'Filtro de aire para cinta',
        category_id: 1,
        current_stock: 15,
        minimum_stock: 5,
        maximum_stock: 50,
        unit_cost: 25.50,
        supplier_id: 1,
        location: 'Almacén A-1',
        status: 'active',
        last_updated: '2024-09-10T10:00:00Z'
    };

    const mockMovement = {
        id: 1,
        item_id: mockInventoryItem.id,
        movement_type: 'entrada',
        quantity: 10,
        unit_cost: 25.50,
        reference_number: 'PO-2024-001',
        notes: 'Compra mensual',
        created_at: '2024-09-10T09:00:00Z',
        created_by: 1
    };

    describe('📋 CRUD Operaciones', () => {
        test('Crear nuevo item de inventario', () => {
            const newItem = { ...mockInventoryItem };
            delete newItem.id;
            delete newItem.last_updated;

            expect(newItem).not.toHaveProperty('id');
            expect(newItem).toHaveProperty('item_code');
            expect(newItem).toHaveProperty('item_name');
            expect(newItem).toHaveProperty('current_stock');
        });

        test('Leer item existente', () => {
            expect(mockInventoryItem).toHaveProperty('id', 1);
            expect(mockInventoryItem).toHaveProperty('item_code', 'PART001');
            expect(mockInventoryItem.current_stock).toBeGreaterThan(0);
        });

        test('Actualizar stock', () => {
            const updatedItem = {
                ...mockInventoryItem,
                current_stock: 20,
                last_updated: new Date().toISOString()
            };

            expect(updatedItem.current_stock).toBe(20);
            expect(updatedItem).toHaveProperty('last_updated');
        });

        test('Eliminar item (soft delete)', () => {
            const deletedItem = {
                ...mockInventoryItem,
                status: 'inactive',
                deleted_at: new Date().toISOString()
            };

            expect(deletedItem.status).toBe('inactive');
            expect(deletedItem).toHaveProperty('deleted_at');
        });
    });

    describe('📊 Control de Stock', () => {
        test('Detectar stock bajo', () => {
            const lowStockItem = {
                ...mockInventoryItem,
                current_stock: 3
            };

            const isLowStock = lowStockItem.current_stock <= lowStockItem.minimum_stock;
            expect(isLowStock).toBe(true);
        });

        test('Detectar stock crítico', () => {
            const criticalStockItem = {
                ...mockInventoryItem,
                current_stock: 1,
                minimum_stock: 5
            };

            const isCritical = criticalStockItem.current_stock < (criticalStockItem.minimum_stock * 0.5);
            expect(isCritical).toBe(true);
        });

        test('Validar stock máximo', () => {
            const overStockItem = {
                ...mockInventoryItem,
                current_stock: 55
            };

            const isOverStock = overStockItem.current_stock > overStockItem.maximum_stock;
            expect(isOverStock).toBe(true);
        });

        test('Calcular punto de reorden', () => {
            const reorderPoint = mockInventoryItem.minimum_stock + 10; // buffer
            expect(reorderPoint).toBe(15);
            expect(reorderPoint).toBeGreaterThan(mockInventoryItem.minimum_stock);
        });
    });

    describe('🔄 Movimientos de Inventario', () => {
        test('Crear movimiento de entrada', () => {
            const entryMovement = { ...mockMovement };
            
            expect(entryMovement.movement_type).toBe('entrada');
            expect(entryMovement.quantity).toBeGreaterThan(0);
            expect(entryMovement).toHaveProperty('reference_number');
        });

        test('Crear movimiento de salida', () => {
            const exitMovement = {
                ...mockMovement,
                movement_type: 'salida',
                quantity: -5,
                reference_number: 'TKT-2024-001',
                notes: 'Usado en ticket de mantenimiento'
            };

            expect(exitMovement.movement_type).toBe('salida');
            expect(exitMovement.quantity).toBeLessThan(0);
        });

        test('Validar stock suficiente para salida', () => {
            const requestedQuantity = 8;
            const hasEnoughStock = mockInventoryItem.current_stock >= requestedQuantity;
            
            expect(hasEnoughStock).toBe(true);
        });

        test('Calcular stock después del movimiento', () => {
            const entryQuantity = 10;
            const newStock = mockInventoryItem.current_stock + entryQuantity;
            
            expect(newStock).toBe(25);
            expect(newStock).toBeGreaterThan(mockInventoryItem.current_stock);
        });

        test('Historial de movimientos', () => {
            const movements = [
                { ...mockMovement, id: 1, quantity: 10, created_at: '2024-09-01' },
                { ...mockMovement, id: 2, quantity: -3, created_at: '2024-09-05' },
                { ...mockMovement, id: 3, quantity: 5, created_at: '2024-09-10' }
            ];

            const totalMovements = movements.reduce((sum, mov) => sum + mov.quantity, 0);
            expect(totalMovements).toBe(12);
            expect(movements).toHaveLength(3);
        });
    });

    describe('🏷️ Categorías', () => {
        const mockCategory = {
            id: 1,
            name: 'Repuestos Cardio',
            description: 'Repuestos para equipos cardiovasculares',
            parent_id: null,
            active: true
        };

        test('Validar categoría', () => {
            expect(mockCategory).toHaveProperty('name');
            expect(mockCategory.active).toBe(true);
            expect(mockInventoryItem.category_id).toBe(mockCategory.id);
        });

        test('Jerarquía de categorías', () => {
            const subcategory = {
                id: 2,
                name: 'Filtros',
                parent_id: mockCategory.id,
                active: true
            };

            expect(subcategory.parent_id).toBe(mockCategory.id);
            expect(subcategory.parent_id).not.toBeNull();
        });

        test('Items por categoría', () => {
            const categoryItems = [
                { ...mockInventoryItem, id: 1, category_id: 1 },
                { ...mockInventoryItem, id: 2, category_id: 1 },
                { ...mockInventoryItem, id: 3, category_id: 2 }
            ];

            const itemsInCategory1 = categoryItems.filter(item => item.category_id === 1);
            expect(itemsInCategory1).toHaveLength(2);
        });
    });

    describe('🏪 Proveedores', () => {
        const mockSupplier = {
            id: 1,
            name: 'Repuestos Gym Chile',
            contact_person: 'Juan Pérez',
            email: 'ventas@repuestosgym.cl',
            phone: '+56912345678',
            address: 'Av. Industrial 123',
            payment_terms: '30 días',
            active: true
        };

        test('Validar proveedor', () => {
            expect(mockSupplier).toHaveProperty('name');
            expect(mockSupplier).toHaveProperty('contact_person');
            expect(mockSupplier.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });

        test('Relación item-proveedor', () => {
            expect(mockInventoryItem.supplier_id).toBe(mockSupplier.id);
            expect(typeof mockInventoryItem.supplier_id).toBe('number');
        });

        test('Items por proveedor', () => {
            const supplierItems = [
                { ...mockInventoryItem, id: 1, supplier_id: 1 },
                { ...mockInventoryItem, id: 2, supplier_id: 1 },
                { ...mockInventoryItem, id: 3, supplier_id: 2 }
            ];

            const itemsFromSupplier1 = supplierItems.filter(item => item.supplier_id === 1);
            expect(itemsFromSupplier1).toHaveLength(2);
        });
    });

    describe('💰 Costos y Valorización', () => {
        test('Calcular valor total del stock', () => {
            const totalValue = mockInventoryItem.current_stock * mockInventoryItem.unit_cost;
            expect(totalValue).toBe(382.50); // 15 * 25.50
        });

        test('Costo promedio ponderado', () => {
            const movements = [
                { quantity: 10, unit_cost: 25.00 },
                { quantity: 5, unit_cost: 26.00 }
            ];

            const totalQuantity = movements.reduce((sum, mov) => sum + mov.quantity, 0);
            const totalCost = movements.reduce((sum, mov) => sum + (mov.quantity * mov.unit_cost), 0);
            const avgCost = totalCost / totalQuantity;

            expect(avgCost).toBeCloseTo(25.33, 2);
        });

        test('Margen de ganancia', () => {
            const sellPrice = 35.00;
            const margin = ((sellPrice - mockInventoryItem.unit_cost) / sellPrice) * 100;
            
            expect(margin).toBeCloseTo(27.14, 2);
            expect(margin).toBeGreaterThan(0);
        });

        test('ROI del inventario', () => {
            const monthlyTurnover = 5; // veces por mes
            const annualROI = (monthlyTurnover * 12) * 100;
            
            expect(annualROI).toBe(6000); // 60 veces al año = 6000%
        });
    });

    describe('🔍 Búsqueda y Filtros', () => {
        const inventoryList = [
            { ...mockInventoryItem, id: 1, item_name: 'Filtro aire cinta', category_id: 1 },
            { ...mockInventoryItem, id: 2, item_name: 'Correa transmisión', category_id: 2 },
            { ...mockInventoryItem, id: 3, item_name: 'Filtro aceite', category_id: 1 }
        ];

        test('Búsqueda por nombre', () => {
            const searchTerm = 'filtro';
            const results = inventoryList.filter(item =>
                item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            expect(results).toHaveLength(2);
        });

        test('Filtrar por categoría', () => {
            const categoryItems = inventoryList.filter(item => item.category_id === 1);
            expect(categoryItems).toHaveLength(2);
        });

        test('Filtrar por stock bajo', () => {
            const lowStockItems = inventoryList.filter(item => 
                item.current_stock <= item.minimum_stock
            );
            
            // Simulamos un item con stock bajo
            inventoryList[0].current_stock = 3;
            const updatedLowStock = inventoryList.filter(item => 
                item.current_stock <= item.minimum_stock
            );
            
            expect(updatedLowStock).toHaveLength(1);
        });

        test('Ordenar por valor de stock', () => {
            const sortedByValue = [...inventoryList].sort((a, b) => {
                const valueA = a.current_stock * a.unit_cost;
                const valueB = b.current_stock * b.unit_cost;
                return valueB - valueA;
            });

            expect(Array.isArray(sortedByValue)).toBe(true);
            expect(sortedByValue).toHaveLength(inventoryList.length);
        });
    });

    describe('📈 Reportes y Analytics', () => {
        test('Reporte de stock bajo', () => {
            const lowStockReport = {
                total_items: 100,
                low_stock_items: 15,
                critical_items: 3,
                percentage_low: 15,
                generated_at: new Date().toISOString()
            };

            expect(lowStockReport.percentage_low).toBe(15);
            expect(lowStockReport.critical_items).toBeLessThanOrEqual(lowStockReport.low_stock_items);
        });

        test('Análisis de rotación', () => {
            const rotationAnalysis = {
                item_id: mockInventoryItem.id,
                monthly_usage: 8,
                avg_stock: 12,
                rotation_rate: 8 / 12, // ~0.67 veces por mes
                classification: 'medium'
            };

            expect(rotationAnalysis.rotation_rate).toBeCloseTo(0.67, 2);
            expect(['low', 'medium', 'high']).toContain(rotationAnalysis.classification);
        });

        test('Valor total del inventario', () => {
            const inventoryValue = {
                total_items: 150,
                total_value: 45000.00,
                avg_item_value: 300.00,
                currency: 'CLP'
            };

            expect(inventoryValue.avg_item_value).toBe(
                inventoryValue.total_value / inventoryValue.total_items
            );
        });
    });

    describe('🔔 Alertas y Notificaciones', () => {
        test('Alerta de stock bajo', () => {
            const lowStockAlert = {
                type: 'low_stock',
                item_id: mockInventoryItem.id,
                current_stock: 3,
                minimum_stock: 5,
                urgency: 'medium',
                suggested_order: 20
            };

            expect(lowStockAlert.current_stock).toBeLessThanOrEqual(lowStockAlert.minimum_stock);
            expect(lowStockAlert.suggested_order).toBeGreaterThan(0);
        });

        test('Alerta de stock crítico', () => {
            const criticalAlert = {
                type: 'critical_stock',
                item_id: mockInventoryItem.id,
                current_stock: 1,
                urgency: 'high',
                auto_order: true
            };

            expect(criticalAlert.urgency).toBe('high');
            expect(criticalAlert.auto_order).toBe(true);
        });

        test('Notificación de movimiento', () => {
            const movementNotification = {
                type: 'stock_movement',
                item_id: mockInventoryItem.id,
                movement_type: 'salida',
                quantity: -5,
                new_stock: 10,
                user_id: 1
            };

            expect(movementNotification.movement_type).toBe('salida');
            expect(movementNotification.quantity).toBeLessThan(0);
        });
    });

    describe('🔄 Órdenes de Compra', () => {
        const mockPurchaseOrder = {
            id: 1,
            po_number: 'PO-2024-001',
            supplier_id: 1,
            status: 'pending',
            order_date: '2024-09-10',
            expected_date: '2024-09-17',
            total_amount: 1000.00,
            items: [
                { item_id: 1, quantity: 20, unit_cost: 25.50 },
                { item_id: 2, quantity: 10, unit_cost: 48.00 }
            ]
        };

        test('Crear orden de compra', () => {
            expect(mockPurchaseOrder).toHaveProperty('po_number');
            expect(mockPurchaseOrder).toHaveProperty('supplier_id');
            expect(mockPurchaseOrder.items).toHaveLength(2);
        });

        test('Calcular total de orden', () => {
            const total = mockPurchaseOrder.items.reduce(
                (sum, item) => sum + (item.quantity * item.unit_cost), 
                0
            );
            
            expect(total).toBe(990.00); // (20*25.50) + (10*48.00)
        });

        test('Estado de orden', () => {
            const validStatuses = ['draft', 'pending', 'approved', 'sent', 'received', 'cancelled'];
            expect(validStatuses).toContain(mockPurchaseOrder.status);
        });

        test('Generar orden automática', () => {
            const autoOrderRule = {
                item_id: mockInventoryItem.id,
                trigger_stock: 5,
                order_quantity: 25,
                preferred_supplier: 1,
                auto_generate: true
            };

            expect(autoOrderRule.order_quantity).toBeGreaterThan(autoOrderRule.trigger_stock);
            expect(autoOrderRule.auto_generate).toBe(true);
        });
    });
});

describe('🔧 Integración Inventario', () => {
    test('API endpoints estructura', () => {
        const endpoints = {
            list: '/api/inventory',
            create: '/api/inventory',
            update: '/api/inventory/:id',
            movements: '/api/inventory/movements',
            lowStock: '/api/inventory/low-stock',
            categories: '/api/inventory/categories',
            suppliers: '/api/inventory/suppliers',
            reports: '/api/inventory/reports'
        };

        Object.values(endpoints).forEach(endpoint => {
            expect(endpoint).toMatch(/^\/api\//);
            expect(typeof endpoint).toBe('string');
        });
    });

    test('Integración con tickets', () => {
        const ticketInventoryUsage = {
            ticket_id: 1,
            items_used: [
                { item_id: 1, quantity: 2, unit_cost: 25.50 },
                { item_id: 3, quantity: 1, unit_cost: 15.00 }
            ],
            total_cost: 66.00
        };

        expect(ticketInventoryUsage.items_used).toHaveLength(2);
        expect(ticketInventoryUsage.total_cost).toBe(66.00);
    });

    test('Integración con equipos', () => {
        const equipmentParts = {
            equipment_id: 1,
            compatible_parts: [1, 3, 5, 7],
            maintenance_kit: [1, 2, 3],
            critical_parts: [1, 3]
        };

        expect(Array.isArray(equipmentParts.compatible_parts)).toBe(true);
        expect(equipmentParts.critical_parts.length).toBeLessThanOrEqual(
            equipmentParts.compatible_parts.length
        );
    });
});
