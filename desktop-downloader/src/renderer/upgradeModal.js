/**
 * Upgrade Modal - Encourages free users to upgrade
 */

class UpgradeModal {
  constructor() {
    this.isVisible = false;
    this.modalElement = null;
    this.backdropElement = null;
    this.init();
  }

  init() {
    // Create modal HTML
    this.createModal();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  createModal() {
    // Create backdrop
    this.backdropElement = document.createElement('div');
    this.backdropElement.className = 'upgrade-modal-backdrop';
    this.backdropElement.style.display = 'none';

    // Create modal
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'upgrade-modal';
    this.modalElement.innerHTML = `
      <div class="upgrade-modal-content">
        <button class="upgrade-modal-close" aria-label="Close">&times;</button>
        
        <div class="upgrade-modal-header">
          <div class="upgrade-icon">⚡</div>
          <h2>Upgrade to Premium</h2>
          <p class="upgrade-subtitle">Unlock unlimited downloads and all features</p>
        </div>

        <div class="upgrade-modal-body">
          <div class="upgrade-limit-notice">
            <span class="upgrade-limit-icon">🚫</span>
            <div>
              <strong>Daily limit reached</strong>
              <p>You've used <span id="upgrade-count-current">3</span> of <span id="upgrade-count-max">3</span> free downloads today</p>
            </div>
          </div>

          <div class="upgrade-features">
            <h3>Premium Features</h3>
            <ul class="upgrade-features-list">
              <li><span class="feature-icon">✓</span> Unlimited downloads per day</li>
              <li><span class="feature-icon">✓</span> All video qualities (up to 8K)</li>
              <li><span class="feature-icon">✓</span> Batch downloads (multiple URLs)</li>
              <li><span class="feature-icon">✓</span> Thumbnail downloads</li>
              <li><span class="feature-icon">✓</span> Video trim tool</li>
              <li><span class="feature-icon">✓</span> High-quality audio (320kbps)</li>
              <li><span class="feature-icon">✓</span> Priority support</li>
              <li><span class="feature-icon">✓</span> All future features</li>
            </ul>
          </div>

          <div class="upgrade-pricing">
            <div class="pricing-card">
              <div class="pricing-badge">Most Popular</div>
              <div class="pricing-header">
                <h4>Monthly</h4>
                <div class="pricing-price">
                  <span class="price-currency">$</span>
                  <span class="price-amount">4.99</span>
                  <span class="price-period">/month</span>
                </div>
              </div>
              <button class="btn-upgrade btn-primary" data-plan="monthly">
                Get Premium
              </button>
            </div>

            <div class="pricing-card pricing-featured">
              <div class="pricing-badge pricing-badge-featured">Best Value</div>
              <div class="pricing-header">
                <h4>Yearly</h4>
                <div class="pricing-price">
                  <span class="price-currency">$</span>
                  <span class="price-amount">39.99</span>
                  <span class="price-period">/year</span>
                </div>
                <div class="pricing-save">Save 33%</div>
              </div>
              <button class="btn-upgrade btn-primary" data-plan="yearly">
                Get Premium
              </button>
            </div>

            <div class="pricing-card">
              <div class="pricing-badge">One-Time</div>
              <div class="pricing-header">
                <h4>Lifetime</h4>
                <div class="pricing-price">
                  <span class="price-currency">$</span>
                  <span class="price-amount">99.99</span>
                  <span class="price-period">forever</span>
                </div>
              </div>
              <button class="btn-upgrade btn-primary" data-plan="lifetime">
                Get Premium
              </button>
            </div>
          </div>

          <div class="upgrade-guarantee">
            <span class="guarantee-icon">🛡️</span>
            <span>30-day money-back guarantee</span>
          </div>
        </div>

        <div class="upgrade-modal-footer">
          <button class="btn-later">Maybe Later</button>
          <button class="btn-already-have">I Already Have a License</button>
        </div>
      </div>
    `;

    // Append to body
    document.body.appendChild(this.backdropElement);
    document.body.appendChild(this.modalElement);
  }

  setupEventListeners() {
    // Close buttons
    const closeBtn = this.modalElement.querySelector('.upgrade-modal-close');
    const laterBtn = this.modalElement.querySelector('.btn-later');
    
    closeBtn.addEventListener('click', () => this.hide());
    laterBtn.addEventListener('click', () => this.hide());
    this.backdropElement.addEventListener('click', () => this.hide());

    // Upgrade buttons
    const upgradeButtons = this.modalElement.querySelectorAll('.btn-upgrade');
    upgradeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plan = e.target.dataset.plan;
        this.handleUpgrade(plan);
      });
    });

    // Already have license button
    const alreadyHaveBtn = this.modalElement.querySelector('.btn-already-have');
    alreadyHaveBtn.addEventListener('click', () => {
      this.hide();
      this.showLicenseInput();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  show(options = {}) {
    // Update counts if provided
    if (options.current !== undefined) {
      const currentEl = this.modalElement.querySelector('#upgrade-count-current');
      if (currentEl) currentEl.textContent = options.current;
    }

    if (options.max !== undefined) {
      const maxEl = this.modalElement.querySelector('#upgrade-count-max');
      if (maxEl) maxEl.textContent = options.max;
    }

    // Show modal
    this.backdropElement.style.display = 'block';
    this.modalElement.style.display = 'block';
    this.isVisible = true;

    // Add animation class
    setTimeout(() => {
      this.backdropElement.classList.add('active');
      this.modalElement.classList.add('active');
    }, 10);
  }

  hide() {
    // Remove animation class
    this.backdropElement.classList.remove('active');
    this.modalElement.classList.remove('active');

    // Hide after animation
    setTimeout(() => {
      this.backdropElement.style.display = 'none';
      this.modalElement.style.display = 'none';
      this.isVisible = false;
    }, 300);
  }

  handleUpgrade(plan) {
    // Open pricing page in browser
    const baseUrl = 'https://wordhacker404.me/pricing';
    const url = `${baseUrl}?plan=${plan}`;
    
    // Open in external browser
    if (window.api && window.api.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }

    // Close modal
    this.hide();

    // Show thank you message
    this.showThankYou();
  }

  showThankYou() {
    // Show a toast notification
    const toast = document.createElement('div');
    toast.className = 'upgrade-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">💎</span>
        <span>Thank you! Check your email for your license key after payment.</span>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
      toast.classList.remove('active');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  showLicenseInput() {
    // Show license input modal (will be created in Phase 2)
    if (window.settingsModal) {
      window.settingsModal.show('license');
    } else {
      // Fallback: simple prompt for now
      const key = prompt('Enter your premium license key:');
      if (key) {
        const result = window.licenseManager.saveLicense(key);
        alert(result.message);
        if (result.success) {
          location.reload(); // Refresh to apply premium status
        }
      }
    }
  }
}

// Create global instance
window.upgradeModal = new UpgradeModal();
