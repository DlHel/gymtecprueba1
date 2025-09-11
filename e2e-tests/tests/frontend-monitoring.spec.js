const { test, expect } = require('@playwright/test');
const FrontendErrorMonitor = require('../utils/frontend-error-monitor');

/**
 * FRONTEND ERROR MONITORING TESTS
 * Tests específicos para detectar problemas de frontend sin abrir navegador
 * NUEVA REGLA: Ejecutar en cada cambio de frontend
 */

test.describe('Frontend Error Monitoring', () => {
  
  test('should detect and report all frontend issues @monitoring @critical', async ({ page }) => {
    console.log('🔍 Iniciando monitoreo completo de errores frontend...');
    
    const pages = [
      { url: 'http://localhost:8080', name: 'main-page' },
      { url: 'http://localhost:8080/login.html', name: 'login-page' },
      { url: 'http://localhost:8080/tickets.html', name: 'tickets-page' },
      { url: 'http://localhost:8080/equipment.html', name: 'equipment-page' },
      { url: 'http://localhost:8080/clients.html', name: 'clients-page' },
      { url: 'http://localhost:8080/inventory.html', name: 'inventory-page' },
      { url: 'http://localhost:8080/expenses.html', name: 'expenses-page' },
      { url: 'http://localhost:8080/users.html', name: 'users-page' }
    ];

    const allReports = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    let criticalIssues = [];

    for (const pageInfo of pages) {
      console.log(`\n📄 Analizando: ${pageInfo.name}`);
      
      try {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');
        
        // Monitorear errores
        const errorReport = await FrontendErrorMonitor.monitorPage(page, pageInfo.name);
        allReports.push(errorReport);
        
        totalErrors += errorReport.summary.totalErrors;
        totalWarnings += errorReport.summary.totalWarnings;
        
        // Detectar issues críticos
        if (errorReport.summary.totalErrors > 0) {
          criticalIssues.push({
            page: pageInfo.name,
            errors: errorReport.summary.totalErrors,
            details: errorReport.errors
          });
        }
        
        // Performance alerts
        if (errorReport.summary.performanceScore < 70) {
          console.log(`⚡ Performance issue en ${pageInfo.name}: Score ${errorReport.summary.performanceScore}/100`);
        }
        
      } catch (error) {
        console.log(`❌ Error accediendo a ${pageInfo.name}: ${error.message}`);
        criticalIssues.push({
          page: pageInfo.name,
          errors: 1,
          details: [{ type: 'Navigation Error', message: error.message }]
        });
      }
    }

    // Generar reporte consolidado
    await generateConsolidatedReport(allReports);
    
    // Log summary final
    console.log('\n🎯 RESUMEN FINAL DE MONITOREO');
    console.log('===============================');
    console.log(`📊 Total páginas analizadas: ${pages.length}`);
    console.log(`🚨 Total errores encontrados: ${totalErrors}`);
    console.log(`⚠️ Total warnings encontrados: ${totalWarnings}`);
    console.log(`🔥 Páginas con problemas críticos: ${criticalIssues.length}`);
    
    if (criticalIssues.length > 0) {
      console.log('\n🚨 ISSUES CRÍTICOS DETECTADOS:');
      criticalIssues.forEach(issue => {
        console.log(`   ${issue.page}: ${issue.errors} errores`);
      });
    }
    
    // REGLA: Si hay más de 5 errores críticos, fallar el test
    expect(totalErrors).toBeLessThan(5);
    
    console.log('\n✅ Monitoreo de errores frontend completado');
  });

  test('should validate specific GymTec ERP requirements @monitoring', async ({ page }) => {
    console.log('🔧 Validando requerimientos específicos de GymTec ERP...');
    
    const testCases = [
      {
        page: 'http://localhost:8080/login.html',
        name: 'Login Requirements',
        checks: [
          () => page.locator('#username').isVisible(),
          () => page.locator('#password').isVisible(),
          () => page.locator('#login-btn').isVisible(),
          () => page.evaluate(() => typeof window.API_URL !== 'undefined'),
          () => page.evaluate(() => document.title.includes('Gymtec'))
        ]
      },
      {
        page: 'http://localhost:8080/tickets.html',
        name: 'Tickets Page Requirements',
        checks: [
          () => page.evaluate(() => typeof window.AuthManager !== 'undefined'),
          () => page.evaluate(() => typeof authenticatedFetch !== 'undefined' || window.location.href.includes('login')),
          () => page.evaluate(() => document.title.includes('Tickets') || window.location.href.includes('login'))
        ]
      }
    ];

    const results = [];
    
    for (const testCase of testCases) {
      await page.goto(testCase.page);
      await page.waitForLoadState('networkidle');
      
      const pageResults = {
        name: testCase.name,
        url: testCase.page,
        passed: 0,
        failed: 0,
        errors: []
      };
      
      for (let i = 0; i < testCase.checks.length; i++) {
        try {
          const result = await testCase.checks[i]();
          if (result) {
            pageResults.passed++;
          } else {
            pageResults.failed++;
            pageResults.errors.push(`Check ${i + 1} failed`);
          }
        } catch (error) {
          pageResults.failed++;
          pageResults.errors.push(`Check ${i + 1} error: ${error.message}`);
        }
      }
      
      results.push(pageResults);
      
      console.log(`📋 ${testCase.name}: ${pageResults.passed} passed, ${pageResults.failed} failed`);
      if (pageResults.errors.length > 0) {
        pageResults.errors.forEach(error => console.log(`   ❌ ${error}`));
      }
    }
    
    // Verificar que al menos el 80% de las validaciones pasaron
    const totalChecks = results.reduce((sum, r) => sum + r.passed + r.failed, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const successRate = (totalPassed / totalChecks) * 100;
    
    console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}%`);
    expect(successRate).toBeGreaterThan(80);
  });

  test('should monitor performance across all pages @monitoring @performance', async ({ page }) => {
    console.log('⚡ Monitoreando performance de todas las páginas...');
    
    const pages = [
      'http://localhost:8080',
      'http://localhost:8080/login.html',
      'http://localhost:8080/tickets.html'
    ];

    const performanceResults = [];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      const metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: perfData.loadEventEnd - perfData.loadEventStart,
          totalTime: perfData.loadEventEnd - perfData.navigationStart,
          domElements: document.querySelectorAll('*').length
        };
      });
      
      performanceResults.push({
        url,
        ...metrics
      });
      
      console.log(`📄 ${url}: Load ${metrics.loadTime}ms, Total ${metrics.totalTime}ms, DOM ${metrics.domElements} elements`);
      
      // Alertas de performance
      if (metrics.totalTime > 3000) {
        console.log(`⚠️ Slow page detected: ${url} (${metrics.totalTime}ms)`);
      }
    }
    
    // Verificar que ninguna página tome más de 5 segundos
    const slowPages = performanceResults.filter(p => p.totalTime > 5000);
    expect(slowPages.length).toBe(0);
    
    console.log('✅ Performance monitoring completado');
  });
});

// Función helper para generar reporte consolidado
async function generateConsolidatedReport(reports) {
  const fs = require('fs');
  const path = require('path');
  
  const consolidatedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPages: reports.length,
      totalErrors: reports.reduce((sum, r) => sum + r.summary.totalErrors, 0),
      totalWarnings: reports.reduce((sum, r) => sum + r.summary.totalWarnings, 0),
      averagePerformanceScore: Math.round(
        reports.reduce((sum, r) => sum + r.summary.performanceScore, 0) / reports.length
      )
    },
    pageReports: reports,
    recommendations: generateGlobalRecommendations(reports)
  };
  
  const reportsDir = path.join(__dirname, '../reports/consolidated');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `consolidated-error-report-${timestamp}.json`;
  const filepath = path.join(reportsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(consolidatedReport, null, 2));
  console.log(`📊 Consolidated report saved: ${filepath}`);
  
  return consolidatedReport;
}

function generateGlobalRecommendations(reports) {
  const recommendations = [];
  
  const totalErrors = reports.reduce((sum, r) => sum + r.summary.totalErrors, 0);
  if (totalErrors > 0) {
    recommendations.push('🔧 Prioridad ALTA: Corregir errores de JavaScript detectados');
  }
  
  const avgPerformance = reports.reduce((sum, r) => sum + r.summary.performanceScore, 0) / reports.length;
  if (avgPerformance < 80) {
    recommendations.push('⚡ Optimizar performance general del frontend');
  }
  
  const pagesWithIssues = reports.filter(r => r.summary.totalErrors > 0).length;
  if (pagesWithIssues > reports.length * 0.3) {
    recommendations.push('🚨 Revisión general requerida: >30% de páginas con errores');
  }
  
  return recommendations;
}
