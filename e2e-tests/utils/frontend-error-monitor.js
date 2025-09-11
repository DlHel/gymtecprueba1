/**
 * 🔍 FRONTEND ERROR MONITORING SYSTEM
 * Sistema avanzado de monitoreo de errores para tests E2E
 * Permite detectar problemas sin abrir navegador
 */

const fs = require('fs');
const path = require('path');

class FrontendErrorMonitor {
  constructor(page) {
    this.page = page;
    this.errors = [];
    this.warnings = [];
    this.networkIssues = [];
    this.performanceMetrics = {};
    this.consoleMessages = [];
    
    this.setupErrorListeners();
  }

  setupErrorListeners() {
    // 1. ERRORES DE JAVASCRIPT
    this.page.on('pageerror', (error) => {
      this.errors.push({
        type: 'JavaScript Error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
      console.log(`🚨 JS Error: ${error.message}`);
    });

    // 2. ERRORES DE CONSOLE
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      this.consoleMessages.push({
        type,
        message: text,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });

      if (type === 'error') {
        this.errors.push({
          type: 'Console Error',
          message: text,
          timestamp: new Date().toISOString(),
          url: this.page.url()
        });
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warn') {
        this.warnings.push({
          type: 'Console Warning',
          message: text,
          timestamp: new Date().toISOString(),
          url: this.page.url()
        });
        console.log(`⚠️ Console Warning: ${text}`);
      }
    });

    // 3. ERRORES DE NETWORK
    this.page.on('response', (response) => {
      if (!response.ok()) {
        this.networkIssues.push({
          type: 'Network Error',
          status: response.status(),
          statusText: response.statusText(),
          url: response.url(),
          timestamp: new Date().toISOString()
        });
        console.log(`🌐 Network Error: ${response.status()} ${response.url()}`);
      }
    });

    // 4. REQUESTS FALLIDAS
    this.page.on('requestfailed', (request) => {
      this.networkIssues.push({
        type: 'Request Failed',
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText || 'Unknown error',
        timestamp: new Date().toISOString()
      });
      console.log(`🔌 Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  }

  // MONITOREAR PERFORMANCE
  async capturePerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        totalLoadTime: perfData.loadEventEnd - perfData.navigationStart,
        domElements: document.querySelectorAll('*').length,
        imageCount: document.querySelectorAll('img').length,
        scriptCount: document.querySelectorAll('script').length,
        stylesheetCount: document.querySelectorAll('link[rel="stylesheet"]').length
      };
    });

    this.performanceMetrics = {
      ...metrics,
      timestamp: new Date().toISOString(),
      url: this.page.url()
    };

    // Alertas de performance
    if (metrics.totalLoadTime > 3000) {
      this.warnings.push({
        type: 'Performance Warning',
        message: `Slow page load: ${metrics.totalLoadTime}ms (>3s)`,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
      console.log(`⚡ Performance Warning: Page load ${metrics.totalLoadTime}ms`);
    }

    return metrics;
  }

  // VERIFICAR ERRORES ESPECÍFICOS DEL PROYECTO
  async checkProjectSpecificIssues() {
    const issues = [];

    // Verificar que AuthManager esté disponible
    const authManagerExists = await this.page.evaluate(() => {
      return typeof window.AuthManager !== 'undefined';
    });

    if (!authManagerExists) {
      issues.push({
        type: 'AuthManager Missing',
        message: 'window.AuthManager no está disponible',
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }

    // Verificar configuración de API
    const apiConfigExists = await this.page.evaluate(() => {
      return typeof window.API_URL !== 'undefined';
    });

    if (!apiConfigExists) {
      issues.push({
        type: 'API Config Missing',
        message: 'window.API_URL no está configurado',
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    }

    // Verificar elementos críticos de UI
    const criticalElements = await this.page.evaluate(() => {
      const checks = [];
      
      // Para páginas con formularios
      const forms = document.querySelectorAll('form');
      forms.forEach((form, index) => {
        if (!form.id && !form.className) {
          checks.push(`Form ${index} sin identificadores`);
        }
      });

      // Para botones sin event listeners
      const buttons = document.querySelectorAll('button[type="submit"]');
      buttons.forEach((button, index) => {
        if (!button.onclick && !button.form) {
          checks.push(`Submit button ${index} sin handler`);
        }
      });

      return checks;
    });

    criticalElements.forEach(issue => {
      issues.push({
        type: 'UI Issue',
        message: issue,
        severity: 'medium',
        timestamp: new Date().toISOString()
      });
    });

    return issues;
  }

  // GENERAR REPORTE COMPLETO
  async generateErrorReport(testName) {
    const performance = await this.capturePerformanceMetrics();
    const projectIssues = await this.checkProjectSpecificIssues();
    
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        networkIssues: this.networkIssues.length,
        projectIssues: projectIssues.length,
        performanceScore: this.calculatePerformanceScore(performance)
      },
      errors: this.errors,
      warnings: this.warnings,
      networkIssues: this.networkIssues,
      projectIssues,
      performance,
      consoleMessages: this.consoleMessages,
      recommendations: this.generateRecommendations()
    };

    // Guardar reporte
    await this.saveReport(report);
    
    // Log resumido en consola
    this.logSummary(report);

    return report;
  }

  calculatePerformanceScore(metrics) {
    let score = 100;
    
    // Penalizar tiempos de carga lentos
    if (metrics.totalLoadTime > 2000) score -= 20;
    if (metrics.totalLoadTime > 3000) score -= 30;
    if (metrics.totalLoadTime > 5000) score -= 50;
    
    // Penalizar muchos elementos DOM
    if (metrics.domElements > 1000) score -= 10;
    if (metrics.domElements > 2000) score -= 20;
    
    return Math.max(0, score);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.errors.length > 0) {
      recommendations.push('🔧 Corregir errores de JavaScript identificados');
    }
    
    if (this.networkIssues.length > 0) {
      recommendations.push('🌐 Revisar errores de conectividad y APIs');
    }
    
    if (this.performanceMetrics.totalLoadTime > 3000) {
      recommendations.push('⚡ Optimizar tiempo de carga de página');
    }
    
    if (this.warnings.length > 5) {
      recommendations.push('⚠️ Revisar warnings de consola para problemas potenciales');
    }
    
    return recommendations;
  }

  async saveReport(report) {
    const reportsDir = path.join(__dirname, '../reports/error-monitoring');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `error-report-${report.testName}-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📊 Error report saved: ${filepath}`);
  }

  logSummary(report) {
    console.log('\n📊 FRONTEND ERROR MONITORING SUMMARY');
    console.log('=====================================');
    console.log(`🎯 Test: ${report.testName}`);
    console.log(`🌐 URL: ${report.url}`);
    console.log(`🚨 Errors: ${report.summary.totalErrors}`);
    console.log(`⚠️ Warnings: ${report.summary.totalWarnings}`);
    console.log(`🔌 Network Issues: ${report.summary.networkIssues}`);
    console.log(`🏗️ Project Issues: ${report.summary.projectIssues}`);
    console.log(`⚡ Performance Score: ${report.summary.performanceScore}/100`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    
    console.log('=====================================\n');
  }

  // MÉTODO ESTÁTICO PARA USAR EN TESTS
  static async monitorPage(page, testName) {
    const monitor = new FrontendErrorMonitor(page);
    
    // Esperar un poco para capturar errores iniciales
    await page.waitForTimeout(1000);
    
    const report = await monitor.generateErrorReport(testName);
    return report;
  }
}

module.exports = FrontendErrorMonitor;
