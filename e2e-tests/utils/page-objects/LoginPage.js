/**
 * Page Object Model: Login Page
 * Encapsula interacciones con la página de login
 */

class LoginPage {
  constructor(page) {
    this.page = page;
    
    // Selectores
    this.usernameInput = '#username';
    this.passwordInput = '#password';
    this.loginButton = '#login-button';
    this.errorMessage = '.error-message, .alert-error';
    this.loginForm = '#login-form';
    this.loadingIndicator = '.loading, .spinner';
  }

  // Navegación
  async goto() {
    await this.page.goto('/login.html');
    await this.page.waitForLoadState('networkidle');
  }

  // Acciones de login
  async login(username, password) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async fillUsername(username) {
    await this.page.fill(this.usernameInput, username);
  }

  async fillPassword(password) {
    await this.page.fill(this.passwordInput, password);
  }

  async clickLogin() {
    await this.page.click(this.loginButton);
  }

  // Verificaciones
  async isLoginFormVisible() {
    return await this.page.isVisible(this.loginForm);
  }

  async isErrorVisible() {
    return await this.page.isVisible(this.errorMessage);
  }

  async getErrorMessage() {
    if (await this.isErrorVisible()) {
      return await this.page.textContent(this.errorMessage);
    }
    return null;
  }

  async isLoginButtonEnabled() {
    return await this.page.isEnabled(this.loginButton);
  }

  async isLoading() {
    return await this.page.isVisible(this.loadingIndicator);
  }

  // Métodos de utilidad
  async waitForRedirect(expectedUrl = '**/dashboard.html') {
    await this.page.waitForURL(expectedUrl, { timeout: 10000 });
  }

  async getPageTitle() {
    return await this.page.title();
  }

  // Login con credenciales predefinidas
  async loginAsAdmin() {
    await this.login('admin@gymtec.com', 'admin123');
    await this.waitForRedirect();
  }

  async loginAsManager() {
    await this.login('manager@gymtec.com', 'manager123');
    await this.waitForRedirect();
  }

  async loginAsTechnician() {
    await this.login('tech@gymtec.com', 'tech123');
    await this.waitForRedirect();
  }

  // Validaciones específicas
  async validateLoginForm() {
    const validations = {
      usernameVisible: await this.page.isVisible(this.usernameInput),
      passwordVisible: await this.page.isVisible(this.passwordInput),
      loginButtonVisible: await this.page.isVisible(this.loginButton),
      formVisible: await this.isLoginFormVisible()
    };

    return validations;
  }

  async validateFieldAttributes() {
    const attributes = {
      usernameType: await this.page.getAttribute(this.usernameInput, 'type'),
      passwordType: await this.page.getAttribute(this.passwordInput, 'type'),
      usernameRequired: await this.page.getAttribute(this.usernameInput, 'required'),
      passwordRequired: await this.page.getAttribute(this.passwordInput, 'required')
    };

    return attributes;
  }
}

module.exports = LoginPage;
