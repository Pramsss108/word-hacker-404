
console.log('[ViewManager] Initializing...');

export function initViewManager() {
    const appBasic = document.getElementById('app-basic');
    const appBlackOps = document.getElementById('app-blackops');
    const launchBtn = document.getElementById('launch-black-ops');
    const exitBtn = document.getElementById('exit-black-ops');

    // State Tracking
    let currentView = 'basic';

    function switchView(mode) {
        console.log(`[ViewManager] Switching to ${mode}`);

        if (mode === 'blackops') {
            if (!appBlackOps) return console.error('Black Ops container not found!');

            // 1. Hide Basic
            appBasic.classList.add('view-hidden');
            appBasic.classList.remove('view-active');

            // 2. Show Black Ops
            appBlackOps.style.display = 'flex';

            // Animation Frame
            requestAnimationFrame(() => {
                appBlackOps.classList.remove('view-hidden');
                appBlackOps.classList.add('view-active');
            });

            // Init Sniffer if needed
            if (window.initBlackOps) {
                window.initBlackOps();
            }

            currentView = 'blackops';

        } else {
            // BACK TO BASIC
            if (!appBasic) return console.error('Basic container not found!');

            appBlackOps.classList.add('view-hidden');
            appBlackOps.classList.remove('view-active');

            appBasic.classList.remove('view-hidden');
            appBasic.classList.add('view-active');

            setTimeout(() => {
                if (currentView === 'basic') {
                    appBlackOps.style.display = 'none';
                }
            }, 300);

            currentView = 'basic';
        }
    }

    // Bindings
    if (launchBtn) {
        // Remove old listeners by cloning (nuclear option to ensure clean slate)
        const newBtn = launchBtn.cloneNode(true);
        launchBtn.parentNode.replaceChild(newBtn, launchBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[ViewManager] Launch Clicked');
            switchView('blackops');
        });
        console.log('[ViewManager] Launch Button Bound');
    } else {
        console.error('[ViewManager] Launch Button NOT FOUND');
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[ViewManager] Exit Clicked');
            switchView('basic');
        });
        console.log('[ViewManager] Exit Button Bound');
    }

    // Expose global for debugging
    window.switchView = switchView;
}

// Auto-run if DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewManager);
} else {
    initViewManager();
}
