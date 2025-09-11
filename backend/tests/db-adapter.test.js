const DatabaseAdapter = require('../src/db-adapter');
const mysql = require('mysql2');

/**
 * Pruebas Unitarias - Database Adapter
 * Testing de abstracción SQLite→MySQL
 */

// Mock mysql2 para testing
jest.mock('mysql2', () => ({
    createConnection: jest.fn(() => ({
        connect: jest.fn((callback) => callback(null)),
        query: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
    }))
}));

describe('Database Adapter', () => {
    let db;
    let mockConnection;
    
    beforeEach(() => {
        mockConnection = {
            connect: jest.fn((callback) => callback(null)),
            query: jest.fn(),
            end: jest.fn(),
            on: jest.fn()
        };
        
        mysql.createConnection.mockReturnValue(mockConnection);
        db = new DatabaseAdapter();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('Constructor', () => {
        test('should create MySQL connection with correct config', () => {
            expect(mysql.createConnection).toHaveBeenCalledWith({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'gymtec_erp',
                acquireTimeout: 60000,
                timeout: 60000
            });
        });
        
        test('should set up error handling', () => {
            expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
        
        test('should attempt connection on creation', () => {
            expect(mockConnection.connect).toHaveBeenCalled();
        });
    });
    
    describe('SQLite compatibility layer', () => {
        test('should provide all() method for multiple rows', (done) => {
            const mockRows = [
                { id: 1, name: 'Test 1' },
                { id: 2, name: 'Test 2' }
            ];
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, mockRows);
            });
            
            db.all('SELECT * FROM test WHERE id > ?', [0], (err, rows) => {
                expect(err).toBeNull();
                expect(rows).toEqual(mockRows);
                expect(mockConnection.query).toHaveBeenCalledWith(
                    'SELECT * FROM test WHERE id > ?',
                    [0],
                    expect.any(Function)
                );
                done();
            });
        });
        
        test('should provide get() method for single row', (done) => {
            const mockRow = { id: 1, name: 'Test 1' };
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, [mockRow]); // MySQL returns array, we return first item
            });
            
            db.get('SELECT * FROM test WHERE id = ?', [1], (err, row) => {
                expect(err).toBeNull();
                expect(row).toEqual(mockRow);
                done();
            });
        });
        
        test('should provide run() method for INSERT/UPDATE/DELETE', (done) => {
            const mockResult = { 
                insertId: 123, 
                affectedRows: 1,
                changedRows: 1
            };
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, mockResult);
            });
            
            db.run('INSERT INTO test (name) VALUES (?)', ['New Test'], function(err) {
                expect(err).toBeNull();
                expect(this.lastID).toBe(123);
                expect(this.changes).toBe(1);
                done();
            });
        });
    });
    
    describe('Error Handling', () => {
        test('should handle database connection errors', (done) => {
            const connectionError = new Error('Connection failed');
            mockConnection.connect.mockImplementation((callback) => {
                callback(connectionError);
            });
            
            // Create new instance to trigger connection error
            const dbWithError = new DatabaseAdapter();
            
            // Wait for error to be processed
            setTimeout(() => {
                // Test that error was handled (logged)
                expect(mockConnection.connect).toHaveBeenCalled();
                done();
            }, 100);
        });
        
        test('should handle query errors in all()', (done) => {
            const queryError = new Error('Query failed');
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(queryError, null);
            });
            
            db.all('SELECT * FROM nonexistent', [], (err, rows) => {
                expect(err).toBe(queryError);
                expect(rows).toBeUndefined();
                done();
            });
        });
        
        test('should handle query errors in get()', (done) => {
            const queryError = new Error('Query failed');
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(queryError, null);
            });
            
            db.get('SELECT * FROM nonexistent WHERE id = ?', [1], (err, row) => {
                expect(err).toBe(queryError);
                expect(row).toBeUndefined();
                done();
            });
        });
        
        test('should handle query errors in run()', (done) => {
            const queryError = new Error('Insert failed');
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(queryError, null);
            });
            
            db.run('INSERT INTO nonexistent (name) VALUES (?)', ['test'], function(err) {
                expect(err).toBe(queryError);
                expect(this.lastID).toBeUndefined();
                expect(this.changes).toBeUndefined();
                done();
            });
        });
    });
    
    describe('Parameter Handling', () => {
        test('should handle queries without parameters', (done) => {
            mockConnection.query.mockImplementation((sql, callback) => {
                callback(null, []);
            });
            
            db.all('SELECT * FROM test', (err, rows) => {
                expect(err).toBeNull();
                expect(mockConnection.query).toHaveBeenCalledWith(
                    'SELECT * FROM test',
                    expect.any(Function)
                );
                done();
            });
        });
        
        test('should handle empty parameter arrays', (done) => {
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, []);
            });
            
            db.all('SELECT * FROM test', [], (err, rows) => {
                expect(err).toBeNull();
                expect(mockConnection.query).toHaveBeenCalledWith(
                    'SELECT * FROM test',
                    [],
                    expect.any(Function)
                );
                done();
            });
        });
        
        test('should handle multiple parameters', (done) => {
            const params = [1, 'test', true];
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, []);
            });
            
            db.all('SELECT * FROM test WHERE id = ? AND name = ? AND active = ?', params, (err, rows) => {
                expect(err).toBeNull();
                expect(mockConnection.query).toHaveBeenCalledWith(
                    'SELECT * FROM test WHERE id = ? AND name = ? AND active = ?',
                    params,
                    expect.any(Function)
                );
                done();
            });
        });
    });
    
    describe('Result Processing', () => {
        test('should return empty array for no results in all()', (done) => {
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, []);
            });
            
            db.all('SELECT * FROM test WHERE id = -1', [], (err, rows) => {
                expect(err).toBeNull();
                expect(rows).toEqual([]);
                expect(Array.isArray(rows)).toBe(true);
                done();
            });
        });
        
        test('should return undefined for no results in get()', (done) => {
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, []);
            });
            
            db.get('SELECT * FROM test WHERE id = -1', [], (err, row) => {
                expect(err).toBeNull();
                expect(row).toBeUndefined();
                done();
            });
        });
        
        test('should return only first row in get() when multiple results', (done) => {
            const mockRows = [
                { id: 1, name: 'First' },
                { id: 2, name: 'Second' }
            ];
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, mockRows);
            });
            
            db.get('SELECT * FROM test', [], (err, row) => {
                expect(err).toBeNull();
                expect(row).toEqual(mockRows[0]);
                done();
            });
        });
    });
    
    describe('Connection Management', () => {
        test('should provide close() method', () => {
            expect(typeof db.close).toBe('function');
            
            db.close();
            expect(mockConnection.end).toHaveBeenCalled();
        });
        
        test('should handle connection close gracefully', () => {
            mockConnection.end.mockImplementation((callback) => {
                if (callback) callback();
            });
            
            expect(() => db.close()).not.toThrow();
        });
    });
    
    describe('Integration with Express Routes', () => {
        test('should work with typical GET route pattern', (done) => {
            const mockEquipment = [
                { id: 1, name: 'Treadmill 1', model_id: 1 },
                { id: 2, name: 'Bike 1', model_id: 2 }
            ];
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, mockEquipment);
            });
            
            // Simular uso en ruta Express
            const getEquipmentByLocation = (locationId, callback) => {
                db.all(
                    'SELECT * FROM Equipment WHERE location_id = ? AND activo = 1',
                    [locationId],
                    callback
                );
            };
            
            getEquipmentByLocation(1, (err, equipment) => {
                expect(err).toBeNull();
                expect(equipment).toEqual(mockEquipment);
                done();
            });
        });
        
        test('should work with typical POST route pattern', (done) => {
            const mockResult = { insertId: 456, affectedRows: 1 };
            
            mockConnection.query.mockImplementation((sql, params, callback) => {
                callback(null, mockResult);
            });
            
            // Simular creación de cliente
            const createClient = (clientData, callback) => {
                db.run(
                    'INSERT INTO Clients (name, email, phone, address) VALUES (?, ?, ?, ?)',
                    [clientData.name, clientData.email, clientData.phone, clientData.address],
                    callback
                );
            };
            
            const newClient = {
                name: 'Test Gym',
                email: 'test@gym.com',
                phone: '555-0123',
                address: '123 Test St'
            };
            
            createClient(newClient, function(err) {
                expect(err).toBeNull();
                expect(this.lastID).toBe(456);
                expect(this.changes).toBe(1);
                done();
            });
        });
    });
});
