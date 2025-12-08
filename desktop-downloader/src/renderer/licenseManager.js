/**
 * License Manager - Handles premium license validation
 * File-based license storage (no server needed)
 */

class LicenseManager {
  constructor() {
    this.LICENSE_PREFIX = 'WH404-PREMIUM-';
    this.storageKey = 'wh404_license';
    this.activationKey = 'wh404_activation';
  }

  /**
   * Check if user has premium license
   */
  isPremium() {
    try {
      const license = this.getLicense();
      return license && this.validateLicenseFormat(license);
    } catch (error) {
      console.error('License check failed:', error);
      return false;
    }
  }

  /**
   * Get stored license key
   */
  getLicense() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (error) {
      console.error('Failed to read license:', error);
      return null;
    }
  }

  /**
   * Save license key
   */
  async saveLicense(licenseKey) {
    try {
      // Validate format
      if (!this.validateLicenseFormat(licenseKey)) {
        throw new Error('Invalid license key format');
      }

      // Store license
      localStorage.setItem(this.storageKey, licenseKey);

      // Generate activation (for device binding in Phase 3)
      await this.generateActivation(licenseKey);

      return { success: true, message: 'License activated successfully!' };
    } catch (error) {
      console.error('Failed to save license:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove license
   */
  removeLicense() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.activationKey);
      return { success: true, message: 'License removed' };
    } catch (error) {
      console.error('Failed to remove license:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Validate license key format
   */
  validateLicenseFormat(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return false;
    }

    // Must start with prefix
    if (!licenseKey.startsWith(this.LICENSE_PREFIX)) {
      return false;
    }

    // Must have key part after prefix
    const keyPart = licenseKey.substring(this.LICENSE_PREFIX.length);
    if (keyPart.length < 8) {
      return false;
    }

    // Must be alphanumeric
    if (!/^[A-Z0-9-]+$/.test(keyPart)) {
      return false;
    }

    return true;
  }

  /**
   * Generate activation code (for device binding)
   * Phase 3 will add device ID here
   */
  async generateActivation(licenseKey) {
    try {
      // For now, just store the license
      // Phase 3 will add: SHA256(licenseKey + deviceId)
      const activation = licenseKey;
      localStorage.setItem(this.activationKey, activation);
      return activation;
    } catch (error) {
      console.error('Failed to generate activation:', error);
      throw error;
    }
  }

  /**
   * Get license status for UI
   */
  getStatus() {
    const license = this.getLicense();
    const isPremium = this.isPremium();

    if (!license) {
      return {
        active: false,
        type: 'free',
        message: 'Free Version',
        licenseKey: null
      };
    }

    if (isPremium) {
      // Mask license key for display (show first/last 4 chars)
      const masked = license.length > 20 
        ? `${license.substring(0, 14)}...${license.slice(-4)}`
        : license;

      return {
        active: true,
        type: 'premium',
        message: 'Premium Active',
        licenseKey: masked
      };
    }

    return {
      active: false,
      type: 'invalid',
      message: 'Invalid License',
      licenseKey: null
    };
  }

  /**
   * Get premium features list
   */
  getPremiumFeatures() {
    return [
      'Unlimited downloads per day',
      'All video qualities (up to 8K)',
      'Batch downloads (multiple URLs)',
      'Thumbnail downloads',
      'Video trim tool',
      'High-quality audio (320kbps)',
      'Priority support',
      'All future features'
    ];
  }
}

// Create global instance
window.licenseManager = new LicenseManager();
