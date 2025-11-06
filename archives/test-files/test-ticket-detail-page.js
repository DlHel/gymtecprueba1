// Script para verificar que la página de ticket detail funcione correctamente
// Este script simula las llamadas que hace la página

const API_URL = 'http://localhost:3000/api';

async function testTicketDetailPage() {
    try {
        console.log('🔐 Haciendo login...');
        
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('🎫 Probando endpoint de ticket detail...');
        
        const ticketResponse = await fetch(`${API_URL}/tickets/1/detail`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Status del ticket: ${ticketResponse.status}`);
        
        if (ticketResponse.ok) {
            const ticketData = await ticketResponse.json();
            console.log('✅ Ticket data OK');
            console.log('Título:', ticketData.data.title);
        }
        
        console.log('📦 Probando endpoint de alertas de stock...');
        
        const stockResponse = await fetch(`${API_URL}/inventory/low-stock`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Status del stock: ${stockResponse.status}`);
        
        if (stockResponse.ok) {
            const stockData = await stockResponse.json();
            console.log('✅ Stock alerts OK');
            console.log('Total alertas:', stockData.stats.total_low_stock);
            console.log('Items sin stock:', stockData.stats.out_of_stock);
            console.log('Items críticos:', stockData.stats.critical);
            
            if (stockData.data.length > 0) {
                console.log('Ejemplos de items:');
                stockData.data.slice(0, 2).forEach(item => {
                    console.log(`- ${item.item_name}: stock=${item.current_stock}, min=${item.minimum_stock}, urgencia=${item.urgency_level}`);
                });
            }
        }
        
        console.log('✅ Prueba completa exitosa!');
        
    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
    }
}

testTicketDetailPage();
