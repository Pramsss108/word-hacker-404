/**
 * Premium Effects Controller - Cyberpunk / Hacker Aesthetic
 * "Coding should fall" - Matrix Rain & Dynamic Animations
 */

class MatrixRain {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.className = 'matrix-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-1'; // Behind everything
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = '0';
    this.canvas.style.transition = 'opacity 1s ease';
    
    this.drops = [];
    this.running = false;
    this.rafId = null;
    
    // Config
    this.fontSize = 14;
    this.columns = 0;
    this.chars = '01'; // Binary rain
    this.speed = 2;
  }

  init() {
    document.body.appendChild(this.canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.columns = Math.floor(this.canvas.width / this.fontSize);
    this.drops = Array(this.columns).fill(1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.canvas.style.opacity = '0.4'; // Increased visibility for Hacker feel
    this.animate();
  }

  stop() {
    this.running = false;
    this.canvas.style.opacity = '0';
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  animate() {
    if (!this.running) return;

    // Translucent black for trail effect
    this.ctx.fillStyle = 'rgba(11, 11, 13, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#0aff6a'; // Neon Green
    this.ctx.font = ${this.fontSize}px 'JetBrains Mono', monospace;

    for (let i = 0; i < this.drops.length; i++) {
      const text = this.chars.charAt(Math.floor(Math.random() * this.chars.length));
      this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);

      if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }
      this.drops[i]++;
    }

    this.rafId = requestAnimationFrame(() => this.animate());
  }
}

class PremiumEffects {
  constructor() {
    this.isActive = false;
    this.matrixRain = new MatrixRain();
    this.matrixRain.init();
  }

  /**
   * Activate premium effects with Hacker sequence
   */
  activate() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log(' Premium activating (Hacker Mode)...');

    // Step 1: Add premium class to body and html
    document.body.classList.add('premium-active');
    document.documentElement.classList.add('premium-active');

    // Step 2: Start Matrix Rain
    this.matrixRain.start();

    // Step 3: Trigger global UI animations
    this.animateUIElements();

    // Step 4: Show activation toast
    this.showActivationToast();

    console.log(' Premium activated (Hacker Mode)');
  }

  /**
   * Deactivate premium effects cleanly
   */
  deactivate() {
    if (!this.isActive) return;

    this.isActive = false;
    document.body.classList.remove('premium-active');
    document.documentElement.classList.remove('premium-active');
    this.matrixRain.stop();

    console.log('💤 Premium deactivated');
  }

  animateUIElements() {
    // Re-trigger animations on key elements
    const elements = document.querySelectorAll('.panel, .card, .input-group, button');
    elements.forEach((el, index) => {
      el.style.animation = 'none';
      el.offsetHeight; /* trigger reflow */
      el.style.animation = slideUpFade 0.5s ease-out s forwards;
    });
  }

  showActivationToast() {
    const toast = document.createElement('div');
    toast.className = 'premium-toast';
    toast.innerHTML = 
      <div class="toast-content">
        <span class="toast-icon"></span>
        <div class="toast-text">
          <div class="toast-title">SYSTEM UNLOCKED</div>
          <div class="toast-desc">Premium features active</div>
        </div>
      </div>
    ;
    
    document.body.appendChild(toast);
    
    // Remove after 3s
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
}

// Initialize
window.premiumEffects = new PremiumEffects();
