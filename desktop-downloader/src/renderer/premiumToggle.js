/**
 * Premium Toggle Button Controller
 * Handles premium activation/deactivation with Apple+Tesla elegance
 */

class PremiumToggle {
  constructor() {
    this.button = null;
    this.isActive = false;
  }

  /**
   * Initialize the toggle button
   */
  init() {
    this.button = document.getElementById('premium-toggle');
    if (!this.button) {
      console.warn('⚠️ Premium toggle button not found');
      return;
    }

    // Check current premium status
    if (window.licenseManager && window.licenseManager.isPremium()) {
      this.activate(false); // Silent activation (no effects on page load)
    }

    // Add click handler
    this.button.addEventListener('click', () => this.handleToggle());

    console.log('✨ Premium Toggle initialized');
  }

  /**
   * Handle toggle button click
   */
  async handleToggle() {
    if (this.isActive) {
      await this.deactivate();
    } else {
      await this.activate(true); // With effects
    }
  }

  /**
   * Activate premium mode
   * @param {boolean} showEffects - Whether to show activation effects
   */
  async activate(showEffects = true) {
    this.isActive = true;

    // Update button UI immediately
    this.button.classList.add('active');
    this.button.title = 'Premium Active - Click to deactivate';

    // Save test license (for testing mode)
    if (window.licenseManager && !window.licenseManager.isPremium()) {
      await window.licenseManager.saveLicense('WH404-PREMIUM-TOGGLE-TEST');
    }

    // Update license badge
    if (window.updateLicenseBadge) {
      window.updateLicenseBadge();
    }

    // Update free tier manager
    if (window.freeTierManager) {
      window.freeTierManager.isPremiumUser = true;
    }

    // Activate premium effects (with or without animation)
    if (window.premiumEffects) {
      if (showEffects) {
        // Full activation sequence with effects
        window.premiumEffects.activate();
      } else {
        // Silent activation (just enable permanent state)
        window.premiumEffects.isActive = true;
        document.body.classList.add('premium-active');
      }
    }

    console.log('✨ Premium activated via toggle');
  }

  /**
   * Deactivate premium mode
   */
  async deactivate() {
    this.isActive = false;

    // Update button UI
    this.button.classList.remove('active');
    this.button.title = 'Toggle Premium (Testing)';

    // Remove test license
    if (window.licenseManager) {
      await window.licenseManager.removeLicense();
    }

    // Deactivate premium effects
    if (window.premiumEffects) {
      window.premiumEffects.deactivate();
    }

    // Update license badge
    if (window.updateLicenseBadge) {
      window.updateLicenseBadge();
    }

    // Update free tier manager
    if (window.freeTierManager) {
      window.freeTierManager.isPremiumUser = false;
    }

    // Show simple toast
    this.showDeactivationToast();

    console.log('💤 Premium deactivated via toggle');
  }

  /**
   * Show deactivation toast (simple, no effects)
   */
  showDeactivationToast() {
    const toast = document.createElement('div');
    toast.className = 'premium-toast';
    toast.innerHTML = `
      <div class="premium-toast-icon">💤</div>
      <div class="premium-toast-content">
        <div class="premium-toast-title" style="color: #888;">Premium Deactivated</div>
        <div class="premium-toast-message">Back to free tier (3 downloads/day)</div>
      </div>
    `;
    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Get current activation state
   */
  isActivated() {
    return this.isActive;
  }

  /**
   * Programmatically set state (for future license activation)
   * @param {boolean} active - Whether premium should be active
   * @param {boolean} showEffects - Whether to show effects
   */
  async setState(active, showEffects = false) {
    if (active && !this.isActive) {
      await this.activate(showEffects);
    } else if (!active && this.isActive) {
      await this.deactivate();
    }
  }
}

// Create global instance
window.premiumToggle = new PremiumToggle();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.premiumToggle.init();
  });
} else {
  window.premiumToggle.init();
}

console.log('✨ Premium Toggle Controller loaded');
