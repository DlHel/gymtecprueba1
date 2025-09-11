# 🎭 Configuración Playwright E2E Testing con MCP

## 📋 Instalación y Configuración

### 1. Instalar Playwright y dependencias
```bash
npm install --save-dev @playwright/test playwright
npx playwright install
```

### 2. Configuración MCP para Playwright
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "0"
      }
    }
  }
}
```

## 🧪 Estructura de Testing E2E

### Directorio de Pruebas
```
e2e-tests/
├── config/
│   ├── playwright.config.js
│   └── test-data.js
├── tests/
│   ├── auth/
│   │   ├── login.spec.js
│   │   └── logout.spec.js
│   ├── tickets/
│   │   ├── create-ticket.spec.js
│   │   ├── edit-ticket.spec.js
│   │   └── ticket-workflow.spec.js
│   ├── equipment/
│   │   ├── equipment-crud.spec.js
│   │   └── equipment-maintenance.spec.js
│   ├── clients/
│   │   └── client-management.spec.js
│   ├── inventory/
│   │   └── inventory-management.spec.js
│   └── expenses/
│       └── expense-management.spec.js
├── fixtures/
│   ├── test-users.json
│   └── test-data.json
├── utils/
│   ├── auth-helpers.js
│   ├── data-helpers.js
│   └── page-objects/
│       ├── LoginPage.js
│       ├── TicketsPage.js
│       ├── EquipmentPage.js
│       └── DashboardPage.js
└── reports/
    └── .gitkeep
```

## 🎯 Testing Strategy

### 1. **Critical User Flows**
- ✅ Login/Logout flow
- ✅ Ticket creation → assignment → completion
- ✅ Equipment registration → maintenance scheduling
- ✅ Client creation → location assignment
- ✅ Inventory management → low stock alerts
- ✅ Expense creation → approval workflow

### 2. **Cross-Browser Testing**
- 🌐 Chrome (Chromium)
- 🦊 Firefox
- 🍎 Safari (WebKit)

### 3. **Device Testing**
- 💻 Desktop (1920x1080)
- 📱 Mobile (375x667)
- 📟 Tablet (768x1024)

## 📊 Integration with MCP

### MCP Commands for Testing
```javascript
// Usar MCP para navegación automática
await mcp.playwright.navigate('http://localhost:8080');

// Automatizar login
await mcp.playwright.fill('#username', 'admin@test.com');
await mcp.playwright.fill('#password', 'password123');
await mcp.playwright.click('#login-button');

// Verificar autenticación exitosa
await mcp.playwright.expect('#dashboard').toBeVisible();

// Crear ticket completo
await mcp.playwright.click('#new-ticket-btn');
await mcp.playwright.fill('#ticket-title', 'Test Maintenance Ticket');
await mcp.playwright.select('#equipment-select', 'equipment-1');
await mcp.playwright.click('#submit-ticket');
```

## 🔧 Configuración Avanzada

### Performance Testing
```javascript
// Medir performance de páginas críticas
const performanceMetrics = await page.evaluate(() => {
    return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime
    };
});
```

### Visual Regression Testing
```javascript
// Screenshots automáticos para comparación
await page.screenshot({ 
    path: `screenshots/${testName}-${browserName}.png`,
    fullPage: true 
});
```

## 📋 Test Data Management

### Test Database
```sql
-- Datos específicos para testing
INSERT INTO Users (username, email, password_hash, role) 
VALUES ('test-admin', 'admin@test.com', '$2a$10$...', 'admin');

INSERT INTO Clients (name, contact_person, email) 
VALUES ('Test Gym', 'John Doe', 'john@testgym.com');
```

### Environment Isolation
```javascript
// Configuración específica para testing
const testConfig = {
    baseURL: 'http://localhost:8080',
    apiURL: 'http://localhost:3000/api',
    testDatabase: 'gymtec_erp_test',
    timeout: 30000,
    retries: 2
};
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow
```yaml
name: E2E Testing Pipeline

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run start-test-servers
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: e2e-tests/reports/
```

## 📊 Reporting y Métricas

### Test Reports
- 📄 HTML Report con screenshots
- 📊 Métricas de performance
- 🎥 Videos de test failures
- 📈 Trends de testing histórico

### Coverage Metrics
- ✅ Funcionalidad crítica: 100%
- ✅ User flows principales: 100%
- ✅ Error scenarios: 90%
- ✅ Performance benchmarks: 95%

## 🔄 Workflow Integration

### Pre-commit Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit
echo "🧪 Running E2E smoke tests..."
npm run test:e2e:smoke || exit 1
```

### Development Workflow
1. **Develop Feature** → Write/Update E2E tests
2. **Local Testing** → `npm run test:e2e:dev`
3. **Commit** → Pre-commit E2E smoke tests
4. **Pull Request** → Full E2E test suite
5. **Deploy** → Production smoke tests

## 🎯 Expected Benefits

### Quality Assurance
- 🔍 **Early Bug Detection**: Catch issues before production
- 🔄 **Regression Prevention**: Automated validation of existing functionality
- 🎭 **User Experience**: Real user behavior simulation
- 📊 **Performance Monitoring**: Continuous performance validation

### Development Efficiency
- ⚡ **Faster QA Cycles**: Automated testing reduces manual QA time
- 🎯 **Focused Development**: Clear test criteria for features
- 📈 **Quality Metrics**: Measurable quality improvements
- 🔧 **Continuous Feedback**: Immediate test results
