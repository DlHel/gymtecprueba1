// Test rápido para verificar endpoints de nómina
const API_URL = 'http://localhost:3000';

async function testPayrollEndpoints() {
    console.log('🧪 Testing Payroll Endpoints...\n');
    
    try {
        // 1. Login para obtener token
        console.log('1️⃣ Testing Authentication...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status}`);
        }
        
        const { token } = await loginRes.json();
        console.log('✅ Login successful - Token obtained\n');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 2. Test GET /api/payroll/periods
        console.log('2️⃣ Testing GET /api/payroll/periods...');
        const periodsRes = await fetch(`${API_URL}/api/payroll/periods`, { headers });
        
        if (!periodsRes.ok) {
            console.error(`❌ FAILED: Status ${periodsRes.status}`);
            const error = await periodsRes.text();
            console.error('Error:', error);
        } else {
            const data = await periodsRes.json();
            console.log(`✅ SUCCESS: ${data.data?.length || 0} periods found`);
            if (data.data && data.data.length > 0) {
                console.log('First period:', data.data[0]);
            }
        }
        console.log('');
        
        // 3. Test GET /api/currency/rates
        console.log('3️⃣ Testing GET /api/currency/rates...');
        const ratesRes = await fetch(`${API_URL}/api/currency/rates`, { headers });
        
        if (!ratesRes.ok) {
            console.error(`❌ FAILED: Status ${ratesRes.status}`);
            const error = await ratesRes.text();
            console.error('Error:', error);
        } else {
            const data = await ratesRes.json();
            console.log(`✅ SUCCESS: Currency rates loaded`);
            console.log('Rates:', data.data);
        }
        console.log('');
        
        // 4. Test POST /api/payroll/periods (crear período de prueba)
        console.log('4️⃣ Testing POST /api/payroll/periods...');
        const testPeriod = {
            period_name: 'Test ' + new Date().toISOString(),
            start_date: '2025-11-01',
            end_date: '2025-11-30',
            payment_date: '2025-12-05'
        };
        
        const createRes = await fetch(`${API_URL}/api/payroll/periods`, {
            method: 'POST',
            headers,
            body: JSON.stringify(testPeriod)
        });
        
        if (!createRes.ok) {
            console.error(`❌ FAILED: Status ${createRes.status}`);
            const error = await createRes.text();
            console.error('Error:', error);
        } else {
            const data = await createRes.json();
            console.log(`✅ SUCCESS: Period created with ID ${data.data?.id}`);
            console.log('Created period:', data.data);
        }
        console.log('');
        
        console.log('✅ All endpoint tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Ejecutar tests
testPayrollEndpoints();
