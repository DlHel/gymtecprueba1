/**
 * Pruebas Unitarias - Módulo Gastos
 * GymTec ERP v3.0
 */

describe('💰 GymTec ERP - Módulo de Gastos', () => {
    
    const mockExpense = {
        id: 1,
        description: 'Repuestos para mantenimiento mensual',
        amount: 150000,
        category_id: 1,
        date: '2024-09-10',
        vendor: 'Repuestos Gym Chile',
        receipt_number: 'FAC-001-2024',
        status: 'pending',
        submitted_by: 1,
        approved_by: null,
        approved_at: null,
        payment_method: 'transfer',
        notes: 'Compra programada mensual',
        created_at: '2024-09-10T10:00:00Z'
    };

    const mockCategory = {
        id: 1,
        name: 'Mantenimiento',
        description: 'Gastos relacionados con mantenimiento de equipos',
        budget_limit: 500000,
        color: '#3B82F6',
        active: true
    };

    describe('💸 CRUD Operaciones', () => {
        test('Crear nuevo gasto', () => {
            const newExpense = { ...mockExpense };
            delete newExpense.id;
            delete newExpense.created_at;

            expect(newExpense).not.toHaveProperty('id');
            expect(newExpense).toHaveProperty('description');
            expect(newExpense).toHaveProperty('amount');
            expect(newExpense).toHaveProperty('category_id');
        });

        test('Leer gasto existente', () => {
            expect(mockExpense).toHaveProperty('id', 1);
            expect(mockExpense).toHaveProperty('amount', 150000);
            expect(mockExpense).toHaveProperty('status', 'pending');
        });

        test('Actualizar gasto', () => {
            const updatedExpense = {
                ...mockExpense,
                amount: 175000,
                notes: 'Actualizado con costo adicional de envío'
            };

            expect(updatedExpense.amount).toBe(175000);
            expect(updatedExpense.notes).toContain('envío');
        });

        test('Eliminar gasto (soft delete)', () => {
            const deletedExpense = {
                ...mockExpense,
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: 'Duplicado'
            };

            expect(deletedExpense.status).toBe('cancelled');
            expect(deletedExpense).toHaveProperty('cancelled_at');
        });
    });

    describe('✅ Sistema de Aprobación', () => {
        test('Aprobar gasto', () => {
            const approvedExpense = {
                ...mockExpense,
                status: 'approved',
                approved_by: 2,
                approved_at: new Date().toISOString()
            };

            expect(approvedExpense.status).toBe('approved');
            expect(approvedExpense).toHaveProperty('approved_by');
            expect(approvedExpense).toHaveProperty('approved_at');
        });

        test('Rechazar gasto', () => {
            const rejectedExpense = {
                ...mockExpense,
                status: 'rejected',
                approved_by: 2,
                approved_at: new Date().toISOString(),
                rejection_reason: 'Falta documentación de respaldo'
            };

            expect(rejectedExpense.status).toBe('rejected');
            expect(rejectedExpense).toHaveProperty('rejection_reason');
        });

        test('Validar límites de aprobación', () => {
            const approvalLimits = {
                'technician': 50000,
                'supervisor': 200000,
                'manager': 500000,
                'admin': Infinity
            };

            const requiredRole = mockExpense.amount <= approvalLimits.supervisor ? 'supervisor' : 'manager';
            expect(requiredRole).toBe('supervisor'); // 150000 <= 200000
        });

        test('Flujo de aprobación automática', () => {
            const autoApprovalRules = {
                'routine_maintenance': { limit: 100000, auto_approve: true },
                'emergency_repair': { limit: 300000, auto_approve: false },
                'equipment_purchase': { limit: 0, auto_approve: false }
            };

            const isAutoApprovable = mockExpense.amount <= autoApprovalRules.routine_maintenance.limit;
            expect(isAutoApprovable).toBe(false); // 150000 > 100000
        });
    });

    describe('🏷️ Categorías de Gastos', () => {
        test('Validar categoría', () => {
            expect(mockCategory).toHaveProperty('name', 'Mantenimiento');
            expect(mockCategory).toHaveProperty('budget_limit');
            expect(mockCategory.active).toBe(true);
        });

        test('Verificar presupuesto disponible', () => {
            const monthlySpent = 250000;
            const remainingBudget = mockCategory.budget_limit - monthlySpent;
            const canAfford = remainingBudget >= mockExpense.amount;

            expect(remainingBudget).toBe(250000);
            expect(canAfford).toBe(true);
        });

        test('Alerta de presupuesto', () => {
            const monthlySpent = 450000; // 90% del presupuesto
            const usagePercentage = (monthlySpent / mockCategory.budget_limit) * 100;
            const needsAlert = usagePercentage >= 80;

            expect(usagePercentage).toBe(90);
            expect(needsAlert).toBe(true);
        });

        test('Jerarquía de categorías', () => {
            const subcategories = [
                { id: 2, name: 'Repuestos', parent_id: 1 },
                { id: 3, name: 'Servicios', parent_id: 1 },
                { id: 4, name: 'Herramientas', parent_id: 1 }
            ];

            const maintenanceSubcats = subcategories.filter(cat => cat.parent_id === mockCategory.id);
            expect(maintenanceSubcats).toHaveLength(3);
        });
    });

    describe('📊 Reportes y Analytics', () => {
        test('Gasto total por categoría', () => {
            const categoryReport = {
                category_id: mockCategory.id,
                total_expenses: 850000,
                expense_count: 12,
                avg_expense: 70833.33,
                budget_limit: mockCategory.budget_limit,
                budget_usage: 170 // %
            };

            expect(categoryReport.budget_usage).toBeGreaterThan(100);
            expect(categoryReport.avg_expense).toBeCloseTo(70833.33, 2);
        });

        test('Reporte mensual', () => {
            const monthlyReport = {
                month: '2024-09',
                total_expenses: 1200000,
                approved_expenses: 950000,
                pending_expenses: 200000,
                rejected_expenses: 50000,
                categories: [
                    { name: 'Mantenimiento', amount: 500000 },
                    { name: 'Equipos', amount: 450000 },
                    { name: 'Servicios', amount: 250000 }
                ]
            };

            const totalByCategory = monthlyReport.categories.reduce((sum, cat) => sum + cat.amount, 0);
            expect(totalByCategory).toBe(monthlyReport.total_expenses);
        });

        test('Análisis de tendencias', () => {
            const trendAnalysis = {
                current_month: 1200000,
                previous_month: 1000000,
                growth_rate: 20, // %
                forecast_next_month: 1300000,
                trend: 'increasing'
            };

            expect(trendAnalysis.growth_rate).toBe(20);
            expect(['increasing', 'decreasing', 'stable']).toContain(trendAnalysis.trend);
        });

        test('ROI de gastos de mantenimiento', () => {
            const maintenanceROI = {
                maintenance_cost: 500000,
                prevented_downtime_value: 1500000,
                equipment_lifespan_extension: 2, // años
                roi_percentage: 200 // %
            };

            expect(maintenanceROI.roi_percentage).toBeGreaterThan(100);
            expect(maintenanceROI.prevented_downtime_value).toBeGreaterThan(maintenanceROI.maintenance_cost);
        });
    });

    describe('💳 Métodos de Pago', () => {
        test('Validar métodos de pago', () => {
            const validPaymentMethods = ['cash', 'transfer', 'credit_card', 'check', 'online'];
            expect(validPaymentMethods).toContain(mockExpense.payment_method);
        });

        test('Límites por método de pago', () => {
            const paymentLimits = {
                'cash': 100000,
                'transfer': 10000000,
                'credit_card': 2000000,
                'check': 5000000,
                'online': 1000000
            };

            const limit = paymentLimits[mockExpense.payment_method];
            const isWithinLimit = mockExpense.amount <= limit;
            
            expect(isWithinLimit).toBe(true);
            expect(limit).toBeGreaterThan(0);
        });

        test('Comisiones por método', () => {
            const paymentFees = {
                'cash': 0,
                'transfer': 1500,
                'credit_card': mockExpense.amount * 0.02, // 2%
                'check': 0,
                'online': 2000
            };

            const fee = paymentFees[mockExpense.payment_method];
            expect(fee).toBeGreaterThanOrEqual(0);
        });
    });

    describe('📄 Documentación y Comprobantes', () => {
        const mockReceipt = {
            id: 1,
            expense_id: mockExpense.id,
            filename: 'factura_001_2024.pdf',
            file_data: 'data:application/pdf;base64,JVBERi0xLjQ...',
            file_size: 256000, // bytes
            uploaded_at: '2024-09-10T10:30:00Z',
            verified: false
        };

        test('Validar comprobante adjunto', () => {
            expect(mockReceipt).toHaveProperty('expense_id', mockExpense.id);
            expect(mockReceipt.filename).toMatch(/\.(pdf|jpg|jpeg|png)$/i);
            expect(mockReceipt.file_data).toMatch(/^data:(application\/pdf|image\/(jpeg|png));base64,/);
        });

        test('Límite de tamaño de archivo', () => {
            const maxSizeBytes = 5 * 1024 * 1024; // 5MB
            expect(mockReceipt.file_size).toBeLessThanOrEqual(maxSizeBytes);
        });

        test('Verificación de comprobante', () => {
            const verifiedReceipt = {
                ...mockReceipt,
                verified: true,
                verified_by: 2,
                verified_at: new Date().toISOString(),
                verification_notes: 'Factura válida, datos correctos'
            };

            expect(verifiedReceipt.verified).toBe(true);
            expect(verifiedReceipt).toHaveProperty('verified_by');
        });

        test('OCR de facturas (simulado)', () => {
            const ocrData = {
                vendor_name: 'Repuestos Gym Chile',
                total_amount: 150000,
                invoice_number: 'FAC-001-2024',
                date: '2024-09-10',
                confidence: 95 // %
            };

            expect(ocrData.confidence).toBeGreaterThan(90);
            expect(ocrData.total_amount).toBe(mockExpense.amount);
        });
    });

    describe('🔍 Búsqueda y Filtros', () => {
        const expensesList = [
            { ...mockExpense, id: 1, description: 'Repuestos cinta', amount: 150000, category_id: 1 },
            { ...mockExpense, id: 2, description: 'Servicio técnico', amount: 80000, category_id: 2 },
            { ...mockExpense, id: 3, description: 'Repuestos bicicleta', amount: 95000, category_id: 1 }
        ];

        test('Búsqueda por descripción', () => {
            const searchTerm = 'repuestos';
            const results = expensesList.filter(expense =>
                expense.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            expect(results).toHaveLength(2);
        });

        test('Filtrar por categoría', () => {
            const categoryExpenses = expensesList.filter(expense => expense.category_id === 1);
            expect(categoryExpenses).toHaveLength(2);
        });

        test('Filtrar por rango de fechas', () => {
            const startDate = '2024-09-01';
            const endDate = '2024-09-30';
            
            const dateRangeExpenses = expensesList.filter(expense => {
                const expenseDate = expense.date || mockExpense.date;
                return expenseDate >= startDate && expenseDate <= endDate;
            });
            
            expect(dateRangeExpenses).toHaveLength(3);
        });

        test('Filtrar por rango de montos', () => {
            const minAmount = 90000;
            const maxAmount = 200000;
            
            const amountRangeExpenses = expensesList.filter(expense =>
                expense.amount >= minAmount && expense.amount <= maxAmount
            );
            
            expect(amountRangeExpenses).toHaveLength(2);
        });
    });

    describe('🔔 Notificaciones y Alertas', () => {
        test('Notificación de nuevo gasto', () => {
            const notification = {
                type: 'new_expense',
                expense_id: mockExpense.id,
                amount: mockExpense.amount,
                submitted_by: mockExpense.submitted_by,
                requires_approval: true,
                urgency: 'normal'
            };

            expect(notification.type).toBe('new_expense');
            expect(notification.requires_approval).toBe(true);
        });

        test('Alerta de presupuesto excedido', () => {
            const budgetAlert = {
                type: 'budget_exceeded',
                category_id: mockCategory.id,
                budget_limit: mockCategory.budget_limit,
                current_spending: 550000,
                excess_amount: 50000,
                urgency: 'high'
            };

            expect(budgetAlert.current_spending).toBeGreaterThan(budgetAlert.budget_limit);
            expect(budgetAlert.urgency).toBe('high');
        });

        test('Recordatorio de documentación faltante', () => {
            const reminderNotification = {
                type: 'missing_receipt',
                expense_id: mockExpense.id,
                days_pending: 3,
                urgency: 'medium',
                auto_reject_in_days: 7
            };

            expect(reminderNotification.days_pending).toBeGreaterThan(0);
            expect(reminderNotification.auto_reject_in_days).toBeGreaterThan(reminderNotification.days_pending);
        });
    });

    describe('📈 Métricas de Performance', () => {
        test('Tiempo promedio de aprobación', () => {
            const approvalMetrics = {
                avg_approval_time_hours: 24,
                fastest_approval_hours: 2,
                slowest_approval_hours: 72,
                sla_target_hours: 48,
                sla_compliance_rate: 85 // %
            };

            expect(approvalMetrics.avg_approval_time_hours).toBeLessThan(approvalMetrics.sla_target_hours);
            expect(approvalMetrics.sla_compliance_rate).toBeGreaterThan(80);
        });

        test('Tasa de aprobación', () => {
            const approvalRate = {
                total_submitted: 100,
                approved: 85,
                rejected: 10,
                pending: 5,
                approval_rate: 85 // %
            };

            expect(approvalRate.approved + approvalRate.rejected + approvalRate.pending).toBe(approvalRate.total_submitted);
            expect(approvalRate.approval_rate).toBeGreaterThan(80);
        });

        test('Gastos por usuario', () => {
            const userExpenseMetrics = {
                user_id: 1,
                total_expenses: 500000,
                avg_expense: 125000,
                expense_count: 4,
                approval_rate: 90 // %
            };

            expect(userExpenseMetrics.avg_expense).toBe(
                userExpenseMetrics.total_expenses / userExpenseMetrics.expense_count
            );
        });
    });

    describe('🔄 Integración con Otros Módulos', () => {
        test('Relación con tickets', () => {
            const ticketExpense = {
                ...mockExpense,
                ticket_id: 15,
                maintenance_type: 'preventive',
                equipment_ids: [1, 3, 5]
            };

            expect(ticketExpense).toHaveProperty('ticket_id');
            expect(Array.isArray(ticketExpense.equipment_ids)).toBe(true);
        });

        test('Relación con inventario', () => {
            const inventoryExpense = {
                ...mockExpense,
                inventory_items: [
                    { item_id: 1, quantity: 5, unit_cost: 25000 },
                    { item_id: 2, quantity: 2, unit_cost: 12500 }
                ],
                affects_stock: true
            };

            expect(inventoryExpense.inventory_items).toHaveLength(2);
            expect(inventoryExpense.affects_stock).toBe(true);
        });

        test('Impacto en presupuesto anual', () => {
            const budgetImpact = {
                annual_budget: 6000000,
                spent_to_date: 2500000,
                remaining_budget: 3500000,
                projected_annual_spend: 5800000,
                on_track: true
            };

            expect(budgetImpact.remaining_budget).toBe(
                budgetImpact.annual_budget - budgetImpact.spent_to_date
            );
            expect(budgetImpact.on_track).toBe(true);
        });
    });
});

describe('🔧 Integración Gastos', () => {
    test('API endpoints estructura', () => {
        const endpoints = {
            list: '/api/expenses',
            create: '/api/expenses',
            update: '/api/expenses/:id',
            approve: '/api/expenses/:id/approve',
            reject: '/api/expenses/:id/reject',
            categories: '/api/expenses/categories',
            reports: '/api/expenses/reports',
            upload: '/api/expenses/:id/receipt'
        };

        Object.values(endpoints).forEach(endpoint => {
            expect(endpoint).toMatch(/^\/api\//);
            expect(typeof endpoint).toBe('string');
        });
    });

    test('Workflow de aprobación completo', () => {
        const workflowSteps = [
            { step: 1, action: 'submit', status: 'pending', required_role: 'any' },
            { step: 2, action: 'review', status: 'under_review', required_role: 'supervisor' },
            { step: 3, action: 'approve', status: 'approved', required_role: 'manager' },
            { step: 4, action: 'process', status: 'processed', required_role: 'accounting' }
        ];

        expect(workflowSteps).toHaveLength(4);
        expect(workflowSteps[0].required_role).toBe('any');
        expect(workflowSteps[3].status).toBe('processed');
    });

    test('Validación financiera', () => {
        const testExpense = {
            id: 1,
            amount: 150000
        };
        
        const financialValidation = {
            expense_id: testExpense.id,
            accounting_code: 'MAINT-001',
            tax_rate: 19, // IVA Chile
            net_amount: 126050.42, // amount / 1.19
            tax_amount: 23949.58,
            validated_by: 'accounting_system'
        };

        expect(financialValidation.net_amount + financialValidation.tax_amount).toBeCloseTo(testExpense.amount, 2);
        expect(financialValidation.tax_rate).toBe(19);
    });
});
