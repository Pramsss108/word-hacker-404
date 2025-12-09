/**
 * Privacy Bridge - Secure Access Verification System
 * Handles "Private Video" errors by bridging browser cookies securely.
 */

class PrivacyBridge {
    constructor() {
        this.injectStyles();
        this.activeUrl = null;
    }

    injectStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './privacyBridge.css';
        document.head.appendChild(link);
    }

    show(url) {
        this.activeUrl = url;
        
        // Remove existing if any
        const existing = document.querySelector('.privacy-bridge-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'privacy-bridge-overlay';
        
        overlay.innerHTML = `
            <div class="privacy-bridge-modal">
                <button class="bridge-close" onclick="window.privacyBridge.close()">×</button>
                <div class="bridge-icon">🔒</div>
                <h2 class="bridge-title">Private Access Required</h2>
                <p class="bridge-desc">
                    This content is marked as private. To download it, we need to verify access using your browser's secure session.
                </p>
                
                <div class="bridge-options">
                    <div class="bridge-btn" onclick="window.privacyBridge.verify('chrome')">
                        <span class="bridge-btn-icon">🌐</span>
                        <span class="bridge-btn-label">Chrome</span>
                    </div>
                    <div class="bridge-btn" onclick="window.privacyBridge.verify('edge')">
                        <span class="bridge-btn-icon">🌊</span>
                        <span class="bridge-btn-label">Edge</span>
                    </div>
                    <div class="bridge-btn" onclick="window.privacyBridge.verify('firefox')">
                        <span class="bridge-btn-icon">🦊</span>
                        <span class="bridge-btn-label">Firefox</span>
                    </div>
                </div>

                <div class="bridge-footer">
                    <span style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span style="width: 6px; height: 6px; background: #0aff6a; border-radius: 50%;"></span>
                        Secure Local Bridge • No Passwords Stored
                    </span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    close() {
        const overlay = document.querySelector('.privacy-bridge-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
            window.dispatchEvent(new CustomEvent('privacy-bridge-cancel'));
        }
    }

    async verify(browser) {
        const btn = event.currentTarget;
        const originalContent = btn.innerHTML;
        
        // Loading state
        btn.innerHTML = `
            <span class="bridge-btn-icon" style="animation: spin 1s linear infinite">↻</span>
            <span class="bridge-btn-label">Verifying...</span>
        `;
        
        try {
            console.log(`[PrivacyBridge] Attempting verification via ${browser} for ${this.activeUrl}`);
            
            // Call the backend to retry with specific browser cookies
            const result = await window.electronAPI.invoke('downloader:retry-with-browser', {
                url: this.activeUrl,
                browser: browser
            });

            if (result.success) {
                // Success! Close modal and trigger the download flow in the main UI
                this.close();
                
                // We need to tell the main UI that we found formats
                // This is a bit tricky since we are outside the React/Vue loop
                // We'll dispatch a custom event that bridge.js can listen to
                const event = new CustomEvent('privacy-bridge-success', { 
                    detail: result.data 
                });
                window.dispatchEvent(event);
                
            } else {
                throw new Error(result.error || 'Verification failed');
            }

        } catch (error) {
            console.error('[PrivacyBridge] Error:', error);
            btn.innerHTML = `
                <span class="bridge-btn-icon">❌</span>
                <span class="bridge-btn-label">Failed</span>
            `;
            setTimeout(() => {
                btn.innerHTML = originalContent;
            }, 2000);
            
            // Optional: Show a toast or shake animation
            const modal = document.querySelector('.privacy-bridge-modal');
            modal.style.animation = 'none';
            modal.offsetHeight; /* trigger reflow */
            modal.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
        }
    }
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0) scale(0.95); }
  20%, 80% { transform: translate3d(2px, 0, 0) scale(0.95); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0) scale(0.95); }
  40%, 60% { transform: translate3d(4px, 0, 0) scale(0.95); }
}
@keyframes spin { 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

// Initialize
window.privacyBridge = new PrivacyBridge();
