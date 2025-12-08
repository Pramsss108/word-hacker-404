/**
 * PREMIUM EFFECTS CONTROLLER
 * Manages stunning visual effects for premium users
 * All animations are CSS-based, this file just triggers/controls them
 */

class PremiumEffects {
  constructor() {
    this.isActive = false;
    this.particles = [];
    this.sparkleInterval = null;
    this.trailElements = [];
  }

  /**
   * Activate premium visual effects
   */
  activate() {
    if (this.isActive) return;
    
    console.log('[PremiumFX] Activating premium visual effects...');
    this.isActive = true;
    
    // Add premium class to body
    document.body.classList.add('premium-active');
    
    // Create background particles
    this.createParticles();
    
    // Start sparkle effects
    this.startSparkles();
    
    // Add cursor trail (optional, can be performance-heavy)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.enableCursorTrail();
    }
    
    // Show celebration confetti
    this.showConfetti();
    
    // Enhance existing UI elements
    this.enhanceUI();
    
    console.log('[PremiumFX] Premium effects activated ✨');
  }

  /**
   * Deactivate premium effects (when license removed)
   */
  deactivate() {
    if (!this.isActive) return;
    
    console.log('[PremiumFX] Deactivating premium effects...');
    this.isActive = false;
    
    // Remove premium class
    document.body.classList.remove('premium-active');
    
    // Clean up particles
    this.cleanupParticles();
    
    // Stop sparkles
    this.stopSparkles();
    
    // Disable cursor trail
    this.disableCursorTrail();
    
    console.log('[PremiumFX] Premium effects deactivated');
  }

  /**
   * Create floating particles in background
   */
  createParticles() {
    const container = document.createElement('div');
    container.className = 'premium-particles';
    
    // Create 10 floating particles
    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.className = 'premium-particle';
      
      // Random starting position
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particle.style.animationDuration = `${12 + Math.random() * 6}s`;
      
      container.appendChild(particle);
      this.particles.push(particle);
    }
    
    document.body.appendChild(container);
    this.particleContainer = container;
  }

  /**
   * Clean up particles
   */
  cleanupParticles() {
    if (this.particleContainer) {
      this.particleContainer.remove();
      this.particleContainer = null;
      this.particles = [];
    }
  }

  /**
   * Start random sparkle effects
   */
  startSparkles() {
    // Create sparkles every 2-4 seconds
    const createSparkle = () => {
      if (!this.isActive) return;
      
      const sparkle = document.createElement('div');
      sparkle.className = 'premium-sparkle';
      
      // Random position
      sparkle.style.left = `${Math.random() * window.innerWidth}px`;
      sparkle.style.top = `${Math.random() * window.innerHeight}px`;
      
      document.body.appendChild(sparkle);
      
      // Remove after animation
      setTimeout(() => sparkle.remove(), 1500);
    };
    
    // Create initial sparkle
    createSparkle();
    
    // Schedule random sparkles
    this.sparkleInterval = setInterval(() => {
      if (Math.random() > 0.5) { // 50% chance each interval
        createSparkle();
      }
    }, 2000);
  }

  /**
   * Stop sparkles
   */
  stopSparkles() {
    if (this.sparkleInterval) {
      clearInterval(this.sparkleInterval);
      this.sparkleInterval = null;
    }
  }

  /**
   * Enable glowing cursor trail
   */
  enableCursorTrail() {
    this.cursorTrailHandler = (e) => {
      if (!this.isActive) return;
      
      // Throttle trail creation
      if (this.trailElements.length > 10) {
        return; // Max 10 trails at once
      }
      
      const trail = document.createElement('div');
      trail.className = 'premium-cursor-trail';
      trail.style.left = `${e.clientX - 10}px`;
      trail.style.top = `${e.clientY - 10}px`;
      
      document.body.appendChild(trail);
      this.trailElements.push(trail);
      
      // Remove after animation
      setTimeout(() => {
        trail.remove();
        const index = this.trailElements.indexOf(trail);
        if (index > -1) {
          this.trailElements.splice(index, 1);
        }
      }, 1000);
    };
    
    // Only create trail on every 5th mouse move (performance)
    let moveCount = 0;
    this.throttledTrailHandler = (e) => {
      moveCount++;
      if (moveCount % 5 === 0) {
        this.cursorTrailHandler(e);
      }
    };
    
    document.addEventListener('mousemove', this.throttledTrailHandler);
  }

  /**
   * Disable cursor trail
   */
  disableCursorTrail() {
    if (this.throttledTrailHandler) {
      document.removeEventListener('mousemove', this.throttledTrailHandler);
      this.throttledTrailHandler = null;
    }
    
    // Clean up existing trails
    this.trailElements.forEach(trail => trail.remove());
    this.trailElements = [];
  }

  /**
   * Show confetti celebration when premium is first activated
   */
  showConfetti() {
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'premium-confetti';
        
        // Random horizontal position
        confetti.style.left = `${Math.random() * 100}%`;
        
        // Random animation duration
        confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        
        document.body.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => confetti.remove(), 4000);
      }, i * 30); // Stagger creation
    }
  }

  /**
   * Enhance existing UI elements with premium effects
   */
  enhanceUI() {
    // Add success icon animation to premium badge
    const badge = document.querySelector('.license-badge-premium');
    if (badge) {
      const icon = badge.textContent.includes('✓') 
        ? badge.textContent.split(' ')[0] 
        : '✓';
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'premium-success-icon';
      iconSpan.textContent = icon + ' ';
      
      badge.textContent = badge.textContent.replace('✓ ', '');
      badge.insertBefore(iconSpan, badge.firstChild);
    }
    
    // Add subtle glow to primary buttons
    const primaryButtons = document.querySelectorAll('.primary');
    primaryButtons.forEach(btn => {
      btn.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    });
    
    // Add smooth animations to queue entries
    const queueEntries = document.querySelectorAll('.queue-entry');
    queueEntries.forEach((entry, index) => {
      entry.style.animationDelay = `${index * 0.1}s`;
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      active: this.isActive,
      particles: this.particles.length,
      effects: {
        particles: !!this.particleContainer,
        sparkles: !!this.sparkleInterval,
        cursorTrail: !!this.throttledTrailHandler
      }
    };
  }

  /**
   * Performance-friendly pulse effect on element
   */
  pulseElement(element) {
    if (!element) return;
    
    element.style.animation = 'premium-success-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    setTimeout(() => {
      element.style.animation = '';
    }, 600);
  }

  /**
   * Show premium activation toast with effects
   */
  showActivationToast() {
    const toast = document.createElement('div');
    toast.className = 'upgrade-toast';
    toast.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon premium-success-icon">✨</span>
        <span><strong>Premium Activated!</strong> Enjoy unlimited downloads and all features.</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('active'), 10);
    
    setTimeout(() => {
      toast.classList.remove('active');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// Create global instance
window.premiumEffects = new PremiumEffects();

// Auto-activate if user is already premium on page load
window.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure license manager is initialized
  setTimeout(() => {
    if (window.licenseManager && window.licenseManager.isPremium()) {
      console.log('[PremiumFX] Premium user detected, activating effects...');
      window.premiumEffects.activate();
    }
  }, 500);
});
