// ============================================
// ADMOB INTEGRATION SERVICE
// Professional Rewarded Video Ad System
// ============================================

interface AdConfig {
  adUnitId: string;
  testMode: boolean;
}

interface AdCallbacks {
  onAdLoaded?: () => void;
  onAdCompleted: () => void;
  onAdFailed: (error: string) => void;
  onAdClosed?: (completed: boolean) => void;
}

class AdMobService {
  private config: AdConfig;
  private isInitialized: boolean = false;
  private currentAd: any = null;
  
  constructor() {
    this.config = {
      adUnitId: 'ca-app-pub-5562011235764985/7189957742',
      testMode: false // Set to true for testing
    };
  }
  
  /**
   * Initialize AdMob SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Load Google AdSense script for rewarded ads
      await this.loadAdMobScript();
      this.isInitialized = true;
      console.log('✅ AdMob initialized successfully');
    } catch (error) {
      console.error('❌ AdMob initialization failed:', error);
      throw new Error('Failed to initialize AdMob');
    }
  }
  
  /**
   * Load AdMob SDK script dynamically
   */
  private loadAdMobScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="googlesyndication.com"]')) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ad-client', 'ca-app-pub-5562011235764985');
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load AdMob script'));
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Load a rewarded video ad
   */
  async loadRewardedAd(callbacks: AdCallbacks): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      console.log('📺 Loading rewarded ad...');
      
      // For web-based rewarded ads, we use Google AdSense's rewarded ad format
      // In production, this would be integrated with AdMob's web SDK
      
      // Simulate ad loading (2-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, we'll use a test implementation
      // In production, replace with actual AdMob rewarded ad loading
      if (this.config.testMode) {
        console.log('🧪 Test mode: Simulating ad load');
        this.currentAd = {
          id: 'test-ad-' + Date.now(),
          duration: 30,
          loaded: true
        };
      } else {
        // Production: Load actual AdMob rewarded ad
        this.currentAd = await this.loadProductionAd();
      }
      
      if (callbacks.onAdLoaded) {
        callbacks.onAdLoaded();
      }
      
      console.log('✅ Ad loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load ad:', error);
      callbacks.onAdFailed(error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Load production ad (actual AdMob integration)
   */
  private async loadProductionAd(): Promise<any> {
    return new Promise((resolve, reject) => {
      // This is where you'd integrate with AdMob's actual SDK
      // For now, we'll use a placeholder
      
      // Example structure for real implementation:
      // const ad = new google.ads.Rewarded(this.config.adUnitId);
      // ad.load().then(resolve).catch(reject);
      
      // Placeholder for development:
      setTimeout(() => {
        resolve({
          id: this.config.adUnitId,
          duration: 30,
          loaded: true
        });
      }, 1000);
    });
  }
  
  /**
   * Show the loaded rewarded ad
   */
  async showRewardedAd(callbacks: AdCallbacks): Promise<void> {
    if (!this.currentAd || !this.currentAd.loaded) {
      throw new Error('No ad loaded. Call loadRewardedAd first.');
    }
    
    try {
      console.log('▶️ Showing rewarded ad...');
      
      // In production, this would show the actual ad
      // For now, we simulate the ad experience
      
      if (this.config.testMode) {
        // Test mode: Auto-complete after 2 seconds
        console.log('🧪 Test mode: Simulating 30s ad...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Test ad completed');
        callbacks.onAdCompleted();
      } else {
        // Production: Show actual ad and wait for completion
        await this.showProductionAd(callbacks);
      }
      
      if (callbacks.onAdClosed) {
        callbacks.onAdClosed(true);
      }
      
      // Clear current ad after showing
      this.currentAd = null;
      
    } catch (error) {
      console.error('❌ Failed to show ad:', error);
      callbacks.onAdFailed(error instanceof Error ? error.message : 'Unknown error');
      
      if (callbacks.onAdClosed) {
        callbacks.onAdClosed(false);
      }
    }
  }
  
  /**
   * Show production ad (actual AdMob integration)
   */
  private async showProductionAd(callbacks: AdCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      // This is where you'd show the actual AdMob ad
      // Example structure for real implementation:
      // this.currentAd.show().then(() => {
      //   callbacks.onAdCompleted();
      //   resolve();
      // }).catch(reject);
      
      // Placeholder for development:
      console.log('📺 Production ad would play here (30 seconds)');
      
      // Simulate 30-second ad
      setTimeout(() => {
        callbacks.onAdCompleted();
        resolve();
      }, 30000);
    });
  }
  
  /**
   * Check if an ad is currently loaded and ready
   */
  isAdReady(): boolean {
    return this.currentAd !== null && this.currentAd.loaded;
  }
  
  /**
   * Enable test mode (for development)
   */
  setTestMode(enabled: boolean): void {
    this.config.testMode = enabled;
    console.log(`🧪 Test mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const adMobService = new AdMobService();

// Helper function for easy integration
export async function showRewardedAdForDownload(
  onSuccess: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    console.log('🎬 Initiating rewarded ad flow...');
    
    // Load the ad first
    await adMobService.loadRewardedAd({
      onAdLoaded: () => {
        console.log('✅ Ad ready to show');
      },
      onAdCompleted: () => {
        console.log('✅ User watched complete ad - rewarding download');
        onSuccess();
      },
      onAdFailed: (error) => {
        console.error('❌ Ad failed:', error);
        onError(error);
      }
    });
    
    // Wait a moment for UI to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Show the ad
    await adMobService.showRewardedAd({
      onAdCompleted: () => {
        console.log('✅ Ad completed successfully');
        onSuccess();
      },
      onAdFailed: (error) => {
        console.error('❌ Ad show failed:', error);
        onError(error);
      }
    });
    
  } catch (error) {
    console.error('❌ Rewarded ad flow failed:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Development helper - enable test mode for faster testing
if (import.meta.env.DEV) {
  adMobService.setTestMode(true);
  console.log('🧪 Running in development mode - ads will auto-complete');
}
