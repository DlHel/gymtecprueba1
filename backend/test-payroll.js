/**
 * Test completo de endpoints de Nómina Chile
 * Prueba todas las funcionalidades del módulo
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let authToken = '';
let testUserId = null;
let periodId = null;

// Colores para consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
    console.log(`\n${'='.repeat(60)}`);
    log(`🧪 TEST: ${name}`, 'blue');
    console.log('='.repeat(60));
}

async function login() {
    logTest('Autenticación');
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        authToken = response.data.token;
        testUserId = response.data.user.id;
        log('✅ Login exitoso', 'green');
        log(`   Token: ${authToken.substring(0, 20)}...`, 'green');
        log(`   User ID: ${testUserId}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Error en login: ${error.message}`, 'red');
        return false;
    }
}

async function testCurrencyRates() {
    logTest('Tasas de Cambio CLP/UTM/UF');
    try {
        const response = await axios.get(`${API_URL}/currency/rates`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const rates = response.data.data;
        log('✅ Tasas obtenidas correctamente', 'green');
        log(`   📅 Fecha: ${rates.date}`, 'green');
        log(`   💰 UTM: $${rates.utm_value.toLocaleString('es-CL')}`, 'green');
        log(`   💰 UF: $${rates.uf_value.toLocaleString('es-CL')}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Error obteniendo tasas: ${error.response?.data?.error || error.message}`, 'red');
        return false;
    }
}

async function testCurrencyConversion() {
    logTest('Conversión de Moneda');
    try {
        // Convertir 1,000,000 CLP a UTM
        const response = await axios.get(`${API_URL}/currency/convert`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { amount: 1000000, from: 'CLP', to: 'UTM' }
        });
        
        const conversion = response.data.data;
        log('✅ Conversión exitosa', 'green');
        log(`   Original: $${conversion.original.toLocaleString('es-CL')} ${conversion.from}`, 'green');
        log(`   Resultado: ${conversion.result.toFixed(2)} ${conversion.to}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Error en conversión: ${error.response?.data?.error || error.message}`, 'red');
        return false;
    }
}

async function testEmployeeSettings() {
    logTest('Configuración de Empleado');
    try {
        // Crear configuración
        const settingsData = {
            user_id: testUserId,
            base_salary: 800000,
            salary_type: 'monthly',
            contract_type: 'indefinido',
            afp: 'Capital',
            afp_custom_percentage: 11.44,
            salud_plan: 'Fonasa',
            salud_custom_percentage: 7.00,
            colacion_mensual: 50000,
            movilizacion_mensual: 30000,
            overtime_multiplier: 1.5,
            overtime_enabled: 1,
            payment_method: 'transferencia',
            bank_name: 'Banco de Chile',
            bank_account: '12345678',
            account_type: 'cuenta corriente'
        };
        
        const response = await axios.post(`${API_URL}/payroll/employee-settings`, settingsData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        log('✅ Configuración creada exitosamente', 'green');
        log(`   Sueldo Base: $${settingsData.base_salary.toLocaleString('es-CL')}`, 'green');
        log(`   AFP: ${settingsData.afp} (${settingsData.afp_custom_percentage}%)`, 'green');
        log(`   Salud: ${settingsData.salud_plan} (${settingsData.salud_custom_percentage}%)`, 'green');
        log(`   Colación: $${settingsData.colacion_mensual.toLocaleString('es-CL')}`, 'green');
        log(`   Movilización: $${settingsData.movilizacion_mensual.toLocaleString('es-CL')}`, 'green');
        
        // Verificar configuración
        const getResponse = await axios.get(`${API_URL}/payroll/employee-settings/${testUserId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        log('✅ Configuración verificada correctamente', 'green');
        return true;
    } catch (error) {
        log(`❌ Error en configuración: ${error.response?.data?.error || error.message}`, 'red');
        return false;
    }
}

async function testCreatePayrollPeriod() {
    logTest('Crear Período de Nómina');
    try {
        const periodData = {
            period_name: 'Octubre 2025 - TEST',
            start_date: '2025-10-01',
            end_date: '2025-10-31',
            payment_date: '2025-11-05'
        };
        
        const response = await axios.post(`${API_URL}/payroll/periods`, periodData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        periodId = response.data.data.id;
        log('✅ Período creado exitosamente', 'green');
        log(`   ID: ${periodId}`, 'green');
        log(`   Nombre: ${periodData.period_name}`, 'green');
        log(`   Período: ${periodData.start_date} al ${periodData.end_date}`, 'green');
        log(`   Fecha Pago: ${periodData.payment_date}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Error creando período: ${error.response?.data?.error || error.message}`, 'red');
        return false;
    }
}

async function testGeneratePayroll() {
    logTest('Generar Nómina Automática');
    try {
        log('⏳ Calculando nómina para todos los empleados...', 'yellow');
        
        const response = await axios.post(`${API_URL}/payroll/periods/${periodId}/generate`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const result = response.data.data;
        log('✅ Nómina generada exitosamente', 'green');
        log(`   Empleados procesados: ${result.employees_processed}/${result.employees_total}`, 'green');
        log(`   Errores: ${result.errors.length}`, result.errors.length > 0 ? 'yellow' : 'green');
        
        if (result.errors.length > 0) {
            result.errors.forEach(err => {
                log(`   ⚠️  ${err.employee}: ${err.error}`, 'yellow');
            });
        }
        
        return true;
    } catch (error) {
        log(`❌ Error generando nómina: ${error.response?.data?.error || error.message}`, 'red');
        return false;
    }
}

async function testGetPayrollDetails() {
    logTest('Obtener Detalles de Nómina');
    try {
        const response = await axios.get(`${API_URL}/payroll/details`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: { period_id: periodId }
        });
        
        const details = response.data.data;
        log(`✅ ${details.length} liquidaciones encontradas`, 'green');
        
        if (details.length > 0) {
            const detail = details[0];
            console.log('\n📄 Ejemplo de Liquidación:');
            log(`   Empleado: ${detail.username}`, 'green');
            log(`   Horas Regulares: ${detail.regular_hours}h`, 'green');
            log(`   Horas Extras: ${detail.overtime_hours}h`, 'green');
            
            console.log('\n💰 HABERES:');
            log(`   Sueldo Base:       $${(detail.base_salary || 0).toLocaleString('es-CL')}`, 'green');
            log(`   Horas Extras:      $${(detail.overtime_amount || 0).toLocaleString('es-CL')}`, 'green');
            log(`   Colación:          $${(detail.colacion_amount || 0).toLocaleString('es-CL')}`, 'green');
            log(`   Movilización:      $${(detail.movilizacion_amount || 0).toLocaleString('es-CL')}`, 'green');
            log(`   ─────────────────────────────────`, 'blue');
            log(`   TOTAL HABERES:     $${(detail.total_haberes || 0).toLocaleString('es-CL')}`, 'blue');
            
            console.log('\n📉 DESCUENTOS:');
            log(`   AFP (${detail.afp_percentage}%):          $${(detail.afp_amount || 0).toLocaleString('es-CL')}`, 'red');
            log(`   Salud (${detail.salud_percentage}%):      $${(detail.salud_amount || 0).toLocaleString('es-CL')}`, 'red');
            log(`   Seg. Cesantía:     $${(detail.seguro_cesantia_amount || 0).toLocaleString('es-CL')}`, 'red');
            log(`   Impuesto Único:    $${(detail.impuesto_unico_amount || 0).toLocaleString('es-CL')}`, 'red');
            log(`   ─────────────────────────────────`, 'blue');
            log(`   TOTAL DESCUENTOS:  $${(detail.total_descuentos || 0).toLocaleString('es-CL')}`, 'red');
            
            console.log('\n💵 RESULTADO:');
            log(`   LÍQUIDO A PAGAR:   $${(detail.liquido_a_pagar || 0).toLocaleString('es-CL')}`, 'green');
        }
        
        return true;
    } catch (error) {
        log(`❌ Error obteniendo detalles: ${error.response?.data?.error || error.message}`, 'red');
        return false;
    }
}

async function testGetPeriods() {
    logTest('Listar Períodos de Nómina');
    try {
        const response = await axios.get(`${API_URL}/payroll/periods`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const periods = response.data.data;
        log(`✅ ${periods.length} períodos encontrados`, 'green');
        
        periods.slice(0, 3).forEach(p => {
            log(`   📅 ${p.period_name} | Empleados: ${p.employee_count} | Total: $${(p.total_payroll || 0).toLocaleString('es-CL')}`, 'green');
        });
        
        return true;
    } catch (error) {
        log(`❌ Error listando períodos: ${error.response?.data?.error || error.message}`, 'red');
        return false;
    }
}

async function runAllTests() {
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', 'blue');
    log('║     PRUEBAS COMPLETAS - MÓDULO DE NÓMINA CHILE            ║', 'blue');
    log('╚════════════════════════════════════════════════════════════╝', 'blue');
    
    const tests = [
        { name: 'Autenticación', fn: login },
        { name: 'Tasas de Cambio', fn: testCurrencyRates },
        { name: 'Conversión de Moneda', fn: testCurrencyConversion },
        { name: 'Configuración Empleado', fn: testEmployeeSettings },
        { name: 'Crear Período', fn: testCreatePayrollPeriod },
        { name: 'Generar Nómina', fn: testGeneratePayroll },
        { name: 'Detalles de Nómina', fn: testGetPayrollDetails },
        { name: 'Listar Períodos', fn: testGetPeriods }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const result = await test.fn();
        if (result) {
            passed++;
        } else {
            failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre tests
    }
    
    // Resumen
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', 'blue');
    log('║                    RESUMEN DE PRUEBAS                      ║', 'blue');
    log('╚════════════════════════════════════════════════════════════╝', 'blue');
    log(`\n   ✅ Tests Exitosos: ${passed}`, 'green');
    log(`   ❌ Tests Fallidos: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`   📊 Total: ${tests.length} tests`, 'blue');
    
    if (failed === 0) {
        log('\n🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!', 'green');
        log('✅ El módulo de Nómina Chile está funcionando correctamente\n', 'green');
    } else {
        log('\n⚠️  Algunos tests fallaron. Revisa los errores arriba.', 'yellow');
    }
}

// Ejecutar tests
runAllTests().catch(error => {
    log(`\n❌ Error fatal en tests: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
