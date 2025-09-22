// Test de endpoints Finanzas - Quotes e Invoices
const https = require('http');

// Token JWT válido
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc1ODUwMDEyMywiZXhwIjoxNzU4NTg2NTIzfQ.8tkV2-wiXw205lA5sQ1CoodB5pv9YvbugtVO2tmvoDM';

function testEndpoint(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: endpoint,
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function runTests() {
    console.log('🚀 TESTING FINANZAS MODULE - Backend Communication');
    console.log('==================================================');

    try {
        // Test 1: GET /api/quotes
        console.log('\n📋 Test 1: GET /api/quotes');
        const quotesTest = await testEndpoint('/api/quotes');
        console.log(`Status: ${quotesTest.status}`);
        console.log(`Response:`, quotesTest.data);

        // Test 2: GET /api/invoices  
        console.log('\n🧾 Test 2: GET /api/invoices');
        const invoicesTest = await testEndpoint('/api/invoices');
        console.log(`Status: ${invoicesTest.status}`);
        console.log(`Response:`, invoicesTest.data);

        // Test 3: POST /api/quotes (crear cotización)
        console.log('\n📋 Test 3: POST /api/quotes');
        const newQuote = {
            client_id: 1,
            quote_date: '2025-09-22',
            description: 'Cotización de prueba desde test',
            total: 1500.00,
            payment_terms: '30 días'
        };
        const createQuoteTest = await testEndpoint('/api/quotes', 'POST', newQuote);
        console.log(`Status: ${createQuoteTest.status}`);
        console.log(`Response:`, createQuoteTest.data);

        // Test 4: GET /api/expenses (ya existente)
        console.log('\n💸 Test 4: GET /api/expenses');
        const expensesTest = await testEndpoint('/api/expenses');
        console.log(`Status: ${expensesTest.status}`);
        console.log(`Response:`, expensesTest.data);

        console.log('\n✅ TESTS COMPLETADOS');
        console.log('==================================================');

    } catch (error) {
        console.error('❌ Error en testing:', error);
    }
}

runTests();