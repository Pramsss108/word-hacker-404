/**
 * Premium Toggle Button Controller
 * Handles premium activation/deactivation for testing and real license activation
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
      console.warn('Premium toggle button not found');
      return;
    }

    // Check current premium status
    if (window.licenseManager && window.licenseManager.isPremium()) {
      this.activate(false); // Silent activation (no confetti on page load)
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
      // Deactivate premium
      this.deactivate();
    } else {
      // Activate premium
      this.activate(true); // With celebration
    }
  }

  /**
   * Activate premium mode
   * @param {boolean} showCelebration - Whether to show confetti/toast
   */
  async activate(showCelebration = true) {
    this.isActive = true;

    // Update button UI
    this.button.classList.add('active');
    this.button.title = 'Premium Active - Click to deactivate';

    // Update license badge
    if (window.updateLicenseBadge) {
      window.updateLicenseBadge();
    }

    // Save test license (for testing mode)
    if (window.licenseManager && !window.licenseManager.isPremium()) {
      await window.licenseManager.saveLicense('WH404-PREMIUM-TOGGLE-TEST');
    }

    // Activate premium effects
    if (window.premiumEffects) {
      window.premiumEffects.activate();
      
      if (showCelebration) {
        // Show celebration effects
        window.premiumEffects.showConfetti();
        this.showActivationToast();
      }
    }

    // Update free tier manager
    if (window.freeTierManager) {
      window.freeTierManager.isPremiumUser = true;
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

    this.showDeactivationToast();

    console.log('💤 Premium deactivated via toggle');
  }

  /**
   * Show activation toast notification
   */
  showActivationToast() {
    const toast = document.createElement('div');
    toast.className = 'premium-toast';
    toast.innerHTML = `
      <div class="premium-toast-icon">✨</div>
      <div class="premium-toast-content">
        <div class="premium-toast-title">Premium Activated!</div>
        <div class="premium-toast-message">Enjoy unlimited downloads & all features</div>
      </div>
    `;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Show deactivation toast notification
   */
  showDeactivationToast() {
    const toast = document.createElement('div');
    toast.className = 'premium-toast deactivate';
    toast.innerHTML = `
      <div class="premium-toast-icon">💤</div>
      <div class="premium-toast-content">
        <div class="premium-toast-title">Premium Deactivated</div>
        <div class="premium-toast-message">Back to free tier (3 downloads/day)</div>
      </div>
    `;
    document.body.appendChild(toast);

    // Animate in
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
   * @param {boolean} showCelebration - Whether to show celebration
   */
  async setState(active, showCelebration = false) {
    if (active && !this.isActive) {
      await this.activate(showCelebration);
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
