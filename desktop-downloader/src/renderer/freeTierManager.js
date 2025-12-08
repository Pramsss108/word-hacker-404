/**
 * Free Tier Manager - Local download counter (no server needed)
 * Tracks daily downloads and enforces 3/day limit for free users
 */

class FreeTierManager {
  constructor() {
    this.MAX_DOWNLOADS_PER_DAY = 3;
    this.storageKey = 'wh404_free_tier';
  }

  /**
   * Get current download count for today
   */
  getTodayCount() {
    const today = new Date().toDateString();
    const data = this.loadData();
    
    // Reset if different day
    if (data.date !== today) {
      this.resetCount();
      return 0;
    }
    
    return data.count || 0;
  }

  /**
   * Increment download count
   */
  incrementCount() {
    const today = new Date().toDateString();
    const data = this.loadData();
    
    // Reset if new day
    if (data.date !== today) {
      this.saveData({ date: today, count: 1 });
      return 1;
    }
    
    // Increment existing count
    const newCount = (data.count || 0) + 1;
    this.saveData({ date: today, count: newCount });
    return newCount;
  }

  /**
   * Check if user can download
   */
  canDownload() {
    // Always allow premium users
    if (window.licenseManager && window.licenseManager.isPremium()) {
      return { allowed: true, reason: 'premium' };
    }

    const count = this.getTodayCount();
    
    if (count >= this.MAX_DOWNLOADS_PER_DAY) {
      return { 
        allowed: false, 
        reason: 'limit_reached',
        count: count,
        max: this.MAX_DOWNLOADS_PER_DAY 
      };
    }
    
    return { 
      allowed: true, 
      reason: 'free',
      count: count,
      max: this.MAX_DOWNLOADS_PER_DAY 
    };
  }

  /**
   * Get remaining downloads today
   */
  getRemainingDownloads() {
    if (window.licenseManager && window.licenseManager.isPremium()) {
      return Infinity; // Unlimited for premium
    }
    
    const count = this.getTodayCount();
    return Math.max(0, this.MAX_DOWNLOADS_PER_DAY - count);
  }

  /**
   * Reset counter (for testing or midnight reset)
   */
  resetCount() {
    const today = new Date().toDateString();
    this.saveData({ date: today, count: 0 });
  }

  /**
   * Load data from localStorage
   */
  loadData() {
    try {
      const json = localStorage.getItem(this.storageKey);
      return json ? JSON.parse(json) : { date: null, count: 0 };
    } catch (error) {
      console.error('Failed to load free tier data:', error);
      return { date: null, count: 0 };
    }
  }

  /**
   * Save data to localStorage
   */
  saveData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save free tier data:', error);
    }
  }

  /**
   * Get status for UI display
   */
  getStatus() {
    const isPremium = window.licenseManager && window.licenseManager.isPremium();
    const count = this.getTodayCount();
    const remaining = this.getRemainingDownloads();
    
    return {
      isPremium,
      downloadsToday: count,
      downloadsRemaining: remaining,
      maxDownloads: this.MAX_DOWNLOADS_PER_DAY,
      limitReached: !isPremium && count >= this.MAX_DOWNLOADS_PER_DAY
    };
  }
}

// Create global instance
window.freeTierManager = new FreeTierManager();
