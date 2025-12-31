// Tab Manager
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('[data-tab]');
    const containers = document.querySelectorAll('.tab-container');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Toggle Active State
            containers.forEach(c => {
                if (c.id === `tab-${target}`) {
                    c.classList.add('active');
                    c.classList.remove('hidden');
                } else {
                    c.classList.remove('active');
                }
            });

            // Visual feedback on buttons should be added in CSS or here
            tabs.forEach(t => t.style.opacity = '0.5');
            tab.style.opacity = '1';
        });
    });

    // Default to Dashboard
    tabs[0].click();

    // UX FIX: proper buttons for the badges
    const standardBadge = document.querySelector('.badge.free');
    const blackOpsBadge = document.querySelector('#mode-toggle');

    if (standardBadge) {
        standardBadge.style.cursor = 'pointer';
        standardBadge.addEventListener('click', () => {
            const dashboardBtn = document.querySelector('[data-tab="dashboard"]');
            if (dashboardBtn) dashboardBtn.click();
        });
    }

    if (blackOpsBadge) {
        blackOpsBadge.addEventListener('click', () => {
            const blackOpsBtn = document.querySelector('[data-tab="black-ops"]');
            if (blackOpsBtn) blackOpsBtn.click();
        });
    }
});
