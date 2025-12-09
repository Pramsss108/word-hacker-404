/**
 * Digital Aurora - Premium Visual Effect
 * A subtle, professional particle network that responds to mouse movement.
 * Replaces the distracting Matrix Rain.
 */

class DigitalAurora {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.isActive = false;
        
        this.init();
    }

    init() {
        this.canvas.id = 'premium-effects-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none'; // CRITICAL: Never capture clicks
        this.canvas.style.zIndex = '1'; // Behind all UI elements
        this.canvas.style.opacity = '0';
        this.canvas.style.transition = 'opacity 1s ease';
        
        // Force pointer-events to stay none (prevent CSS overrides)
        Object.defineProperty(this.canvas.style, 'pointerEvents', {
            value: 'none',
            writable: false
        });
        
        document.body.appendChild(this.canvas);
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createParticles();
    }

    createParticles() {
        this.particles = [];
        const count = Math.floor((this.canvas.width * this.canvas.height) / 15000); // Density
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 2, // Bigger particles for visibility
                color: Math.random() > 0.5 ? '#0aff6a' : '#00ffcc', // Brighter colors
                alpha: Math.random() * 0.6 + 0.2 // Higher opacity
            });
        }
    }

    start() {
        if (this.isActive) {
            console.log('⚠️ Digital Aurora already active, skipping');
            return;
        }
        this.isActive = true;
        this.canvas.style.opacity = '1';
        this.canvas.style.pointerEvents = 'none'; // Re-enforce
        this.animate();
        console.log('✨ Digital Aurora Activated');
    }

    stop() {
        this.isActive = false;
        this.canvas.style.opacity = '0';
    }

    animate() {
        if (!this.isActive) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw particles
        this.particles.forEach((p, index) => {
            // Movement
            p.x += p.vx;
            p.y += p.vy;
            
            // Mouse interaction (gentle push)
            const dx = this.mouseX - p.x;
            const dy = this.mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 200) {
                const force = (200 - dist) / 200;
                p.x -= (dx / dist) * force * 2;
                p.y -= (dy / dist) * force * 2;
            }
            
            // Wrap around screen
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
            
            // Draw
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fill();
            
            // Connections
            for (let j = index + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx2 = p.x - p2.x;
                const dy2 = p.y - p2.y;
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                
                if (dist2 < 100) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = p.color;
                    this.ctx.globalAlpha = (1 - dist2 / 100) * 0.15;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Singleton instance
const aurora = new DigitalAurora();

// Global API for compatibility with licenseManager (MUST be synchronous)
if (!window.premiumEffects) {
    window.premiumEffects = {
        activate: () => {
            console.log('✨ Premium activating via API...');
            aurora.start();
        },
        deactivate: () => {
            console.log('💤 Premium deactivating via API...');
            aurora.stop();
        },
        showConfetti: () => {
            console.log('🎉 Confetti effect triggered');
            // Optional: Add a quick particle burst effect here
        },
        start: () => aurora.start(),
        stop: () => aurora.stop()
    };
    console.log('✅ window.premiumEffects API installed');
}

// Auto-start if premium is already active (checked via localStorage or similar)
// For now, we'll listen for the premium-activated event
window.addEventListener('premium-status-change', (e) => {
    if (e.detail.isPremium) {
        aurora.start();
    } else {
        aurora.stop();
    }
});

// Check initial state
// Also check if the user has manually enabled it via the toggle
const isPremium = localStorage.getItem('wh404-premium') === 'true';
const isEffectsEnabled = localStorage.getItem('wh404-effects-enabled') !== 'false'; // Default true

if (isPremium && isEffectsEnabled) {
    aurora.start();
}
