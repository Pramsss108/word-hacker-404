import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { adMobService } from '../services/admob';
import './AdRewardedPopup.css';

interface VideoPreview {
  thumbnail: string;
  title: string;
  duration: string;
  platform: string;
}

interface AdRewardedPopupProps {
  videoPreview: VideoPreview;
  onAdComplete: () => void;
  onAdFailed: (error: string) => void;
  onClose: () => void;
}

export const AdRewardedPopup: React.FC<AdRewardedPopupProps> = ({
  videoPreview,
  onAdComplete,
  onAdFailed,
  onClose
}) => {
  const [adState, setAdState] = useState<'loading' | 'ready' | 'playing' | 'completed' | 'failed'>('loading');
  const [countdown, setCountdown] = useState(30);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    loadAndShowAd();
  }, []);

  const loadAndShowAd = async () => {
    try {
      setAdState('loading');
      console.log('📺 Loading ad for video:', videoPreview.title);

      // Load the ad
      await adMobService.loadRewardedAd({
        onAdLoaded: () => {
          console.log('✅ Ad loaded, showing now...');
          setAdState('ready');
        },
        onAdCompleted: async () => {
          console.log('✅ Ad completed! Requesting download token...');
          setAdState('completed');
          setCanClose(true);
          
          try {
            // Request download token from server
            const token = await invoke<string>('request_download_token');
            console.log('✅ Download token received:', token);
            
            // Notify parent that ad is complete
            setTimeout(() => {
              onAdComplete();
            }, 1500);
          } catch (err) {
            console.error('❌ Failed to get download token:', err);
            handleError('Failed to authorize download. Please try again.');
          }
        },
        onAdFailed: (err) => {
          console.error('❌ Ad failed:', err);
          handleError(err);
        }
      });

      // Start showing the ad
      setAdState('playing');
      startCountdown();

      await adMobService.showRewardedAd({
        onAdCompleted: () => {
          console.log('✅ Ad show completed');
        },
        onAdFailed: (err) => {
          console.error('❌ Ad show failed:', err);
          handleError(err);
        }
      });

    } catch (err) {
      console.error('❌ Ad flow error:', err);
      handleError(err instanceof Error ? err.message : 'Failed to load ad');
    }
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setAdState('failed');
    setCanClose(true);
    onAdFailed(errorMsg);
  };

  const startCountdown = () => {
    let timeLeft = 30;
    const timer = setInterval(() => {
      timeLeft--;
      setCountdown(timeLeft);
      setProgress(((30 - timeLeft) / 30) * 100);

      if (timeLeft <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  };

  const handleClose = () => {
    if (canClose) {
      onClose();
    }
  };

  return (
    <div className="ad-popup-overlay">
      <div className="ad-popup-container">
        
        {/* Close Button (only when allowed) */}
        {canClose && (
          <button className="ad-popup-close" onClick={handleClose}>
            ✕
          </button>
        )}

        {/* Video Preview Section */}
        <div className="ad-video-preview">
          <div className="preview-thumbnail">
            <img src={videoPreview.thumbnail} alt={videoPreview.title} />
            <div className="preview-platform-badge">{videoPreview.platform}</div>
          </div>
          <div className="preview-info">
            <h3 className="preview-title">{videoPreview.title}</h3>
            <p className="preview-duration">Duration: {videoPreview.duration}</p>
          </div>
        </div>

        {/* Ad Status Section */}
        <div className="ad-status-section">
          
          {/* Loading State */}
          {adState === 'loading' && (
            <div className="ad-status loading">
              <div className="spinner"></div>
              <h2>Loading your ad...</h2>
              <p>Preparing your download experience</p>
            </div>
          )}

          {/* Ready/Playing State */}
          {(adState === 'ready' || adState === 'playing') && (
            <div className="ad-status playing">
              <div className="countdown-circle">
                <svg className="countdown-svg" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="countdown-bg" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    className="countdown-progress"
                    style={{
                      strokeDasharray: `${progress * 2.827} 282.7`
                    }}
                  />
                </svg>
                <div className="countdown-text">
                  <span className="countdown-number">{countdown}</span>
                  <span className="countdown-label">seconds</span>
                </div>
              </div>
              
              <h2>Watch this short ad</h2>
              <p>Your download starts automatically after the ad</p>
              
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {Math.round(progress)}% complete
              </div>
            </div>
          )}

          {/* Completed State */}
          {adState === 'completed' && (
            <div className="ad-status completed">
              <div className="success-icon">✓</div>
              <h2>Ad complete!</h2>
              <p>Starting your download...</p>
              <div className="shimmer-bar"></div>
            </div>
          )}

          {/* Failed State */}
          {adState === 'failed' && (
            <div className="ad-status failed">
              <div className="error-icon">✕</div>
              <h2>Ad couldn't load</h2>
              <p className="error-message">{error || 'Please check your connection and try again'}</p>
              <button className="retry-button" onClick={loadAndShowAd}>
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Info Footer */}
        <div className="ad-popup-footer">
          <p className="ad-info-text">
            💰 Free downloads supported by ads • 
            <span className="upgrade-link"> Upgrade to PRO</span> for ad-free experience
          </p>
        </div>

      </div>
    </div>
  );
};

export default AdRewardedPopup;
