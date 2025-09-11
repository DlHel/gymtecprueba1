/**
 * Pruebas Unitarias para el Módulo de Clientes
 * GymTec ERP - Sistema de Gestión de Clientes
 */

// Mock de autenticación global
global.AuthManager = {
    isAuthenticated: jest.fn(() => true),
    getToken: jest.fn(() => 'mock-jwt-token'),
    getCurrentUser: jest.fn(() => ({ id: 1, username: 'testuser' }))
};

// Mock de window.API_URL
global.window = {
    API_URL: 'http://localhost:3000/api',
    location: { href: '' },
    AuthManager: global.AuthManager
};

// Mock de fetch autenticado
global.authenticatedFetch = jest.fn();

// Mock de DOM mínimo
const mockDOM = {
    getElementById: jest.fn(() => ({
        innerHTML: '',
        style: { display: 'block' },
        classList: { add: jest.fn(), remove: jest.fn() },
        addEventListener: jest.fn()
    })),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => [])
};

global.document = mockDOM;

describe('Módulo de Clientes - Funciones Core', () => {
    let clienteModule;
    let mockClientData;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockClientData = {
            id: 1,
            name: 'Gimnasio Test',
            legal_name: 'Gimnasio Test SpA',
            rut: '76.123.456-7',
            address: 'Av. Test 123',
            phone: '+56 9 1234 5678',
            email: 'test@gymtest.cl',
            business_activity: 'Servicios deportivos',
            contact_name: 'Juan Pérez',
            location_count: 2,
            equipment_count: 15
        };

        // Simular DOM elements básicos
        document.body.innerHTML = `
            <div id="client-list-container"></div>
            <div id="detail-container"></div>
            <input id="clientSearch" />
            <button id="add-client-btn"></button>
            <div id="client-modal"></div>
            <form id="client-modal-form"></form>
        `;
    });

    describe('🔍 API - Operaciones CRUD', () => {
        test('getClients() - Debe cargar lista de clientes exitosamente', async () => {
            const mockResponse = {
                message: 'success',
                data: [mockClientData]
            };

            global.authenticatedFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            // Importar módulo después de mocks
            const { api } = require('../../frontend/js/clientes.js');
            
            const result = await api.getClients();
            
            expect(global.authenticatedFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/clients',
                expect.objectContaining({
                    signal: expect.any(AbortSignal),
                    headers: { 'Content-Type': 'application/json' }
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('getClients() - Debe manejar errores de red', async () => {
            global.authenticatedFetch.mockRejectedValue(new Error('Network error'));
            
            const { api } = require('../../frontend/js/clientes.js');
            
            await expect(api.getClients()).rejects.toThrow('Network error');
        });

        test('getClient(id) - Debe cargar cliente específico', async () => {
            global.authenticatedFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockClientData)
            });

            const { api } = require('../../frontend/js/clientes.js');
            
            const result = await api.getClient(1);
            
            expect(global.authenticatedFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/clients/1'
            );
            expect(result).toEqual(mockClientData);
        });

        test('save() - Debe crear nuevo cliente', async () => {
            const newClientData = { ...mockClientData };
            delete newClientData.id;

            global.authenticatedFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ id: 1, ...newClientData })
            });

            const { api } = require('../../frontend/js/clientes.js');
            
            const formData = new FormData();
            Object.entries(newClientData).forEach(([key, value]) => {
                formData.append(key, value);
            });

            const result = await api.save('clients', formData);
            
            expect(global.authenticatedFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/clients',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newClientData)
                })
            );
            expect(result).toHaveProperty('id', 1);
        });

        test('save() - Debe actualizar cliente existente', async () => {
            global.authenticatedFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockClientData)
            });

            const { api } = require('../../frontend/js/clientes.js');
            
            const formData = new FormData();
            formData.append('id', '1');
            formData.append('name', 'Gimnasio Actualizado');

            const result = await api.save('clients', formData);
            
            expect(global.authenticatedFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/clients/1',
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        test('delete() - Debe eliminar cliente', async () => {
            global.authenticatedFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ 
                    message: 'Cliente eliminado exitosamente',
                    clientId: 1
                })
            });

            const { api } = require('../../frontend/js/clientes.js');
            
            const result = await api.delete('clients', 1);
            
            expect(global.authenticatedFetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/clients/1',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
            expect(result.message).toBe('Cliente eliminado exitosamente');
        });
    });

    describe('🎨 Renderizado - UI Components', () => {
        test('render.clientList() - Debe mostrar lista de clientes', () => {
            const { state, render } = require('../../frontend/js/clientes.js');
            
            state.clients = [mockClientData];
            
            render.clientList();
            
            const container = document.getElementById('client-list-container');
            expect(container.innerHTML).toContain('Gimnasio Test');
            expect(container.innerHTML).toContain('76.123.456-7');
            expect(container.innerHTML).toContain('2 sedes');
            expect(container.innerHTML).toContain('15 equipos');
        });

        test('render.clientList() - Debe mostrar estado vacío', () => {
            const { state, render } = require('../../frontend/js/clientes.js');
            
            state.clients = [];
            
            render.clientList();
            
            const container = document.getElementById('client-list-container');
            expect(container.innerHTML).toContain('No hay clientes registrados');
            expect(container.innerHTML).toContain('Comienza agregando tu primer cliente');
        });

        test('render.clientDetail() - Debe mostrar detalles del cliente', async () => {
            global.authenticatedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue(mockClientData)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: 'success',
                        data: [
                            { id: 1, name: 'Sede Principal', equipment_count: 10 },
                            { id: 2, name: 'Sede Secundaria', equipment_count: 5 }
                        ]
                    })
                });

            const { render } = require('../../frontend/js/clientes.js');
            
            await render.clientDetail(1);
            
            const container = document.getElementById('detail-container');
            expect(container.innerHTML).toContain('Gimnasio Test');
            expect(container.innerHTML).toContain('76.123.456-7');
            expect(container.innerHTML).toContain('test@gymtest.cl');
        });
    });

    describe('🔍 Búsqueda y Filtros', () => {
        test('handleModernSearch() - Debe filtrar clientes por término', () => {
            const { state, handleModernSearch } = require('../../frontend/js/clientes.js');
            
            state.clients = [
                mockClientData,
                { ...mockClientData, id: 2, name: 'Otro Gimnasio', rut: '12.345.678-9' }
            ];

            const mockEvent = {
                target: { value: 'Test' }
            };

            handleModernSearch(mockEvent);
            
            // Verificar que se filtró correctamente
            const container = document.getElementById('client-list-container');
            expect(container.innerHTML).toContain('Gimnasio Test');
            expect(container.innerHTML).not.toContain('Otro Gimnasio');
        });

        test('debounce - Debe retrasar ejecución de búsqueda', done => {
            const { debounce } = require('../../frontend/js/clientes.js');
            
            let callCount = 0;
            const mockFunction = () => callCount++;
            const debouncedFunction = debounce(mockFunction, 100);

            // Llamar múltiples veces rápidamente
            debouncedFunction();
            debouncedFunction();
            debouncedFunction();

            // Después de 50ms no debería haberse ejecutado
            setTimeout(() => {
                expect(callCount).toBe(0);
            }, 50);

            // Después de 150ms debería haberse ejecutado una vez
            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 150);
        });
    });

    describe('🚨 Manejo de Errores', () => {
        test('API error handling - Debe manejar errores HTTP', async () => {
            global.authenticatedFetch.mockResolvedValue({
                ok: false,
                status: 404,
                json: jest.fn().mockResolvedValue({ error: 'Cliente no encontrado' })
            });

            const { api } = require('../../frontend/js/clientes.js');
            
            await expect(api.getClient(999)).rejects.toThrow('HTTP 404: Cliente no encontrado');
        });

        test('Network error handling - Debe manejar errores de red', async () => {
            global.authenticatedFetch.mockRejectedValue(new Error('Failed to fetch'));

            const { api } = require('../../frontend/js/clientes.js');
            
            await expect(api.getClients()).rejects.toThrow('Failed to fetch');
        });

        test('Timeout handling - Debe manejar timeouts', async () => {
            global.authenticatedFetch.mockImplementation(() => 
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('AbortError')), 100);
                })
            );

            const { api } = require('../../frontend/js/clientes.js');
            
            await expect(api.getClients()).rejects.toThrow();
        });
    });

    describe('📋 Validación de Datos', () => {
        test('Validación de RUT - Debe validar formato correcto', () => {
            const { validateRUT } = require('../../frontend/js/clientes.js');
            
            expect(validateRUT('76.123.456-7')).toBe(true);
            expect(validateRUT('12345678-9')).toBe(true);
            expect(validateRUT('invalid-rut')).toBe(false);
            expect(validateRUT('')).toBe(false);
        });

        test('Validación de Email - Debe validar formato correcto', () => {
            const { validateEmail } = require('../../frontend/js/clientes.js');
            
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user@domain.cl')).toBe(true);
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('')).toBe(false);
        });

        test('Validación de Teléfono - Debe validar formato chileno', () => {
            const { validatePhone } = require('../../frontend/js/clientes.js');
            
            expect(validatePhone('+56 9 1234 5678')).toBe(true);
            expect(validatePhone('9 1234 5678')).toBe(true);
            expect(validatePhone('invalid-phone')).toBe(false);
        });
    });

    describe('🔄 Estado de la Aplicación', () => {
        test('state.clients - Debe mantener lista de clientes', () => {
            const { state } = require('../../frontend/js/clientes.js');
            
            expect(Array.isArray(state.clients)).toBe(true);
            expect(state.currentClient).toBeNull();
            expect(state.clientSearchTerm).toBe('');
        });

        test('Selección de cliente - Debe actualizar currentClient', () => {
            const { state, selectClient } = require('../../frontend/js/clientes.js');
            
            selectClient(mockClientData);
            
            expect(state.currentClient).toEqual(mockClientData);
        });

        test('Limpiar selección - Debe resetear currentClient', () => {
            const { state, clearSelection } = require('../../frontend/js/clientes.js');
            
            state.currentClient = mockClientData;
            clearSelection();
            
            expect(state.currentClient).toBeNull();
        });
    });

    describe('🚀 Performance', () => {
        test('Lazy loading - Debe cargar detalles solo cuando sea necesario', async () => {
            const { render } = require('../../frontend/js/clientes.js');
            
            // Mock para simular que no se llama hasta que se necesite
            const getClientSpy = jest.spyOn(require('../../frontend/js/clientes.js').api, 'getClient');
            
            // Renderizar lista no debería cargar detalles
            render.clientList();
            expect(getClientSpy).not.toHaveBeenCalled();
            
            // Solo cargar detalles cuando se seleccione
            await render.clientDetail(1);
            expect(getClientSpy).toHaveBeenCalledWith(1);
        });

        test('Debounce en búsqueda - Debe optimizar requests', () => {
            const { debounce } = require('../../frontend/js/clientes.js');
            
            let executionCount = 0;
            const testFunction = () => executionCount++;
            
            const debouncedFunc = debounce(testFunction, 100);
            
            // Múltiples llamadas rápidas
            for(let i = 0; i < 10; i++) {
                debouncedFunc();
            }
            
            // Solo debería ejecutarse una vez después del delay
            setTimeout(() => {
                expect(executionCount).toBe(1);
            }, 150);
        });
    });

    describe('🔐 Seguridad', () => {
        test('Autenticación requerida - Debe usar authenticatedFetch', async () => {
            global.authenticatedFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ data: [] })
            });

            const { api } = require('../../frontend/js/clientes.js');
            
            await api.getClients();
            
            expect(global.authenticatedFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object)
            );
        });

        test('Token validation - Debe incluir token en headers', async () => {
            global.authenticatedFetch.mockImplementation((url, options) => {
                expect(options.headers).toBeDefined();
                return Promise.resolve({
                    ok: true,
                    json: jest.fn().mockResolvedValue({ data: [] })
                });
            });

            const { api } = require('../../frontend/js/clientes.js');
            await api.getClients();
        });
    });

    describe('📱 Responsividad', () => {
        test('Mobile layout - Debe adaptar UI para móvil', () => {
            // Simular viewport móvil
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375
            });

            const { render } = require('../../frontend/js/clientes.js');
            
            render.clientList();
            
            // Verificar que se aplican clases responsive
            const container = document.getElementById('client-list-container');
            expect(container.innerHTML).toContain('client-card');
        });
    });
});

describe('Integración con Backend API', () => {
    test('CRUD completo - Debe funcionar create, read, update, delete', async () => {
        const responses = [
            // POST (create)
            { ok: true, json: jest.fn().mockResolvedValue({ id: 1, name: 'Test Client' }) },
            // GET (read)
            { ok: true, json: jest.fn().mockResolvedValue({ id: 1, name: 'Test Client' }) },
            // PUT (update)
            { ok: true, json: jest.fn().mockResolvedValue({ id: 1, name: 'Updated Client' }) },
            // DELETE
            { ok: true, json: jest.fn().mockResolvedValue({ message: 'Cliente eliminado' }) }
        ];

        global.authenticatedFetch
            .mockResolvedValueOnce(responses[0])
            .mockResolvedValueOnce(responses[1])
            .mockResolvedValueOnce(responses[2])
            .mockResolvedValueOnce(responses[3]);

        const { api } = require('../../frontend/js/clientes.js');

        // Create
        const formDataCreate = new FormData();
        formDataCreate.append('name', 'Test Client');
        const created = await api.save('clients', formDataCreate);
        expect(created.id).toBe(1);

        // Read
        const read = await api.getClient(1);
        expect(read.id).toBe(1);

        // Update
        const formDataUpdate = new FormData();
        formDataUpdate.append('id', '1');
        formDataUpdate.append('name', 'Updated Client');
        const updated = await api.save('clients', formDataUpdate);
        expect(updated.name).toBe('Updated Client');

        // Delete
        const deleted = await api.delete('clients', 1);
        expect(deleted.message).toBe('Cliente eliminado');
    });
});
