const puppeteer = require('puppeteer');

(async () => {
    console.log('🧪 Iniciando pruebas de botones y funcionalidad...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();
    
    // Interceptar errores de consola
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ Error en consola:', msg.text());
        }
    });
    
    // Función auxiliar para esperar y hacer click
    async function testButton(selector, name) {
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            const button = await page.$(selector);
            if (button) {
                await button.click();
                console.log(`✅ Botón "${name}" funcional`);
                await page.waitForTimeout(1000);
                return true;
            } else {
                console.log(`❌ Botón "${name}" no encontrado`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Error en botón "${name}":`, error.message);
            return false;
        }
    }
    
    try {
        // ===============================
        // TEST 1: LOGIN
        // ===============================
        console.log('\n📋 TEST 1: Página de Login');
        await page.goto('http://localhost:8080/login.html');
        await page.waitForTimeout(2000);
        
        // Verificar que el formulario existe
        const loginForm = await page.$('form');
        if (loginForm) {
            console.log('✅ Formulario de login presente');
        } else {
            console.log('❌ Formulario de login no encontrado');
        }
        
        // Intentar login con credenciales de prueba
        await page.type('input[name="username"], input[type="text"]', 'admin');
        await page.type('input[name="password"], input[type="password"]', 'admin123');
        
        // Click en botón de login
        const loginBtn = await page.$('button[type="submit"]');
        if (loginBtn) {
            console.log('✅ Botón de login encontrado');
            // No hacer click real para no cambiar de página
        }
        
        // ===============================
        // TEST 2: DASHBOARD
        // ===============================
        console.log('\n📋 TEST 2: Dashboard Principal');
        await page.goto('http://localhost:8080/index.html');
        await page.waitForTimeout(2000);
        
        // Verificar botones del dashboard
        const refreshBtn = await page.$('#refreshBtn, button:has-text("Actualizar")');
        if (refreshBtn) console.log('✅ Botón "Actualizar" presente');
        
        // ===============================
        // TEST 3: CLIENTES
        // ===============================
        console.log('\n📋 TEST 3: Módulo de Clientes');
        await page.goto('http://localhost:8080/clientes.html');
        await page.waitForTimeout(2000);
        
        await testButton('#createClientBtn', 'Crear Cliente');
        await testButton('.btn-search', 'Buscar');
        
        // ===============================
        // TEST 4: TICKETS
        // ===============================
        console.log('\n📋 TEST 4: Módulo de Tickets');
        await page.goto('http://localhost:8080/tickets.html');
        await page.waitForTimeout(2000);
        
        await testButton('#createTicketBtn', 'Crear Ticket');
        await testButton('#filterBtn', 'Filtrar');
        
        // ===============================
        // TEST 5: EQUIPOS
        // ===============================
        console.log('\n📋 TEST 5: Módulo de Equipos');
        await page.goto('http://localhost:8080/equipos.html');
        await page.waitForTimeout(2000);
        
        await testButton('#createEquipmentBtn', 'Crear Equipo');
        
        // ===============================
        // TEST 6: FINANZAS
        // ===============================
        console.log('\n📋 TEST 6: Módulo de Finanzas');
        await page.goto('http://localhost:8080/finanzas.html');
        await page.waitForTimeout(2000);
        
        // Verificar tabs
        const tabs = await page.$$('.tab-button, button[data-tab]');
        console.log(`✅ Encontradas ${tabs.length} pestañas en Finanzas`);
        
        // ===============================
        // TEST 7: SLA DASHBOARD
        // ===============================
        console.log('\n📋 TEST 7: SLA Dashboard (NUEVO)');
        await page.goto('http://localhost:8080/sla-dashboard.html');
        await page.waitForTimeout(3000);
        
        await testButton('#refreshBtn', 'Actualizar SLA');
        
        // Verificar que los gráficos se carguen
        const charts = await page.$$('canvas');
        console.log(`✅ Encontrados ${charts.length} gráficos de Chart.js`);
        
        // Verificar estadísticas
        const stats = await page.$('#sla-cumplido');
        if (stats) {
            const value = await page.evaluate(el => el.textContent, stats);
            console.log(`✅ Estadística SLA Cumplido: ${value}`);
        }
        
        // ===============================
        // TEST 8: INVENTARIO
        // ===============================
        console.log('\n📋 TEST 8: Módulo de Inventario');
        await page.goto('http://localhost:8080/inventario.html');
        await page.waitForTimeout(2000);
        
        await testButton('#createItemBtn', 'Crear Item Inventario');
        
        // ===============================
        // RESUMEN FINAL
        // ===============================
        console.log('\n' + '='.repeat(50));
        console.log('🎉 PRUEBAS COMPLETADAS');
        console.log('='.repeat(50));
        console.log('\nRevisa los resultados arriba para ver qué botones funcionan.');
        console.log('Los botones marcados con ✅ están funcionales.');
        console.log('Los botones marcados con ❌ necesitan revisión.\n');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    } finally {
        await browser.close();
    }
})();
