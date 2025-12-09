/**
 * Premium Effects Controller - Apple + Tesla Aesthetic
 * Minimal elegance with confident power
 */

class PremiumEffects {
  constructor() {
    this.isActive = false;
    this.cursorTrailTimeout = null;
    this.lastCursorMove = 0;
  }

  /**
   * Activate premium effects with elegant sequence
   */
  activate() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('✨ Premium activating...');

    // Step 1: Add premium class to body
    document.body.classList.add('premium-active');

    // Step 2: Activation flash (600ms)
    this.showActivationFlash();

    // Step 3: Ripple from badge (1200ms, starts at 200ms)
    setTimeout(() => this.showActivationRipple(), 200);

    // Step 4: Toast notification (appears at 800ms)
    setTimeout(() => this.showActivationToast(), 800);

    // Step 5: Enable subtle cursor trail
    setTimeout(() => this.enableCursorTrail(), 1000);

    console.log('✨ Premium activated (Apple+Tesla mode)');
  }

  /**
   * Deactivate premium effects cleanly
   */
  deactivate() {
    if (!this.isActive) return;

    this.isActive = false;
    document.body.classList.remove('premium-active');
    this.disableCursorTrail();

    console.log('💤 Premium deactivated');
  }

  /**
   * Show activation flash - Subtle screen power-up
   */
  showActivationFlash() {
    const flash = document.createElement('div');
    flash.className = 'premium-activation-flash';
    document.body.appendChild(flash);

    setTimeout(() => flash.remove(), 600);
  }

  /**
   * Show activation ripple from badge position
   */
  showActivationRipple() {
    const badge = document.getElementById('license-badge');
    if (!badge) return;

    const rect = badge.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'premium-activation-ripple';
    
    // Position ripple at badge center
    ripple.style.left = `${rect.left + rect.width / 2 - 100}px`;
    ripple.style.top = `${rect.top + rect.height / 2 - 100}px`;
    
    document.body.appendChild(ripple);

    setTimeout(() => ripple.remove(), 1200);
  }

  /**
   * Show elegant activation toast
   */
  showActivationToast() {
    const toast = document.createElement('div');
    toast.className = 'premium-toast';
    toast.innerHTML = `
      <div class="premium-toast-icon">✨</div>
      <div class="premium-toast-content">
        <div class="premium-toast-title">Premium Activated</div>
        <div class="premium-toast-message">Enjoy unlimited downloads & enhanced experience</div>
      </div>
    `;
    
    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Enable minimal cursor trail (only on click)
   */
  enableCursorTrail() {
    if (this.cursorTrailEnabled) return;
    
    this.cursorTrailEnabled = true;
    this.cursorTrailHandler = (e) => {
      // Only on click, not constant movement
      if (e.type !== 'click') return;
      
      // Throttle to max 5 trails per second
      const now = Date.now();
      if (now - this.lastCursorMove < 200) return;
      this.lastCursorMove = now;

      this.createCursorTrail(e.clientX, e.clientY);
    };

    document.addEventListener('click', this.cursorTrailHandler);
  }

  /**
   * Disable cursor trail
   */
  disableCursorTrail() {
    if (!this.cursorTrailEnabled) return;
    
    this.cursorTrailEnabled = false;
    document.removeEventListener('click', this.cursorTrailHandler);
  }

  /**
   * Create single cursor trail particle
   */
  createCursorTrail(x, y) {
    const trail = document.createElement('div');
    trail.className = 'premium-cursor-trail';
    trail.style.left = `${x}px`;
    trail.style.top = `${y}px`;
    
    document.body.appendChild(trail);

    setTimeout(() => trail.remove(), 600);
  }

  /**
   * Add success ripple to button click
   */
  addSuccessRipple(button) {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'premium-success-ripple';
    
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${rect.left + rect.width / 2 - size / 2}px`;
    ripple.style.top = `${rect.top + rect.height / 2 - size / 2}px`;
    
    document.body.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }

  /**
   * Enhance button with ripple on click
   */
  enhanceButton(selector) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        if (this.isActive) {
          this.addSuccessRipple(button);
        }
      });
    });
  }

  /**
   * Check if premium is currently active
   */
  isPremiumActive() {
    return this.isActive;
  }
}

// Create global instance
window.premiumEffects = new PremiumEffects();

// Auto-enhance primary buttons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.premiumEffects.enhanceButton('button.primary, button[class*="primary"], #add-to-queue, #export-confirm');
  });
} else {
  window.premiumEffects.enhanceButton('button.primary, button[class*="primary"], #add-to-queue, #export-confirm');
}

console.log('✨ Premium Effects Controller loaded (Apple+Tesla mode)');
