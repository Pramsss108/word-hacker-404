/**
 * Upgrade Modal - DISABLED (App is now FREE)
 * All pricing features removed. This file kept for compatibility only.
 */

class UpgradeModal {
  constructor() {
    this.isVisible = false;
    this.modalElement = null;
    this.backdropElement = null;
  }

  init() {
    // DISABLED - No modal creation
  }

  createModal() {
    // DISABLED - No pricing cards or HTML
  }

  setupEventListeners() {
    // DISABLED - No events
  }

  show(options = {}) {
    // DISABLED - Never show upgrade modal
    console.log('[UpgradeModal] Disabled - App is FREE');
    return false;
  }

  hide() {
    // DISABLED - Nothing to hide
  }

  handleUpgrade(plan) {
    // DISABLED - No upgrade links
    console.log('[UpgradeModal] Upgrade disabled - App is FREE');
  }

  showThankYou() {
    // DISABLED
  }

  showLicenseInput() {
    // DISABLED
  }
}

// Create global instance for compatibility
window.upgradeModal = new UpgradeModal();
