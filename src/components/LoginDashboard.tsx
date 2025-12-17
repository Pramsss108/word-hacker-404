import { useState, useEffect } from 'react';
import { X, User, Zap, Shield, LogOut, Lock, LayoutDashboard, Settings, CreditCard, History, ChevronRight, Mail, UserCircle, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { proAuth, type UserStatus } from '../services/ProAuth';
import { User as FirebaseUser } from 'firebase/auth';
import './LoginDashboard.css';

interface LoginDashboardProps {
  onClose: () => void;
}

type Tab = 'overview' | 'settings' | 'billing';
type AuthMode = 'select' | 'email-login' | 'email-signup';

export default function LoginDashboard({ onClose }: LoginDashboardProps) {
  const [status, setStatus] = useState<UserStatus>('loading');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [credits, setCredits] = useState<number | 'inf'>('inf');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Auth UI State
  const [authMode, setAuthMode] = useState<AuthMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    const unsub = proAuth.subscribe((s, u) => {
      console.log("📊 Dashboard received auth update:", s, u?.email);
      setStatus(s);
      setUser(u);
      // Reset loading state when user changes
      if (u) {
        setAuthLoading(false);
        setAuthSuccess('Logged in successfully!');
      }
      checkCredits();
    });
    return unsub;
  }, []);

  const checkCredits = async () => {
    const access = await proAuth.checkAccess();
    if (access.remaining !== undefined) {
      setCredits(access.remaining > 100 ? 'inf' : access.remaining);
    }
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      // Use redirect method directly - more reliable than popup
      await proAuth.signInWithRedirect();
      // Page will redirect to Google, no need for timeout
    } catch (e: any) {
      setAuthError(e.message || "Login Failed. Please try again.");
      setAuthLoading(false);
    }
  };

  const handleRedirectLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await proAuth.signInWithRedirect();
      // Page will redirect, no need for success message
    } catch (e: any) {
      setAuthError(e.message || "Redirect login failed.");
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (isSignup: boolean) => {
    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    
    setAuthLoading(true);
    setAuthError('');
    try {
      if (isSignup) {
        await proAuth.signUpWithEmail(email, password);
        setAuthSuccess('Account created successfully!');
      } else {
        await proAuth.signInWithEmail(email, password);
        setAuthSuccess('Logged in!');
      }
      setEmail('');
      setPassword('');
      setAuthMode('select');
    } catch (e: any) {
      const msg = e.code?.includes('user-not-found') ? 'No account found. Try signing up.' :
                  e.code?.includes('wrong-password') ? 'Incorrect password.' :
                  e.code?.includes('email-already-in-use') ? 'Email already registered. Try logging in.' :
                  e.code?.includes('invalid-email') ? 'Invalid email format.' :
                  e.message || 'Authentication failed';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await proAuth.signInAsGuest();
      setAuthSuccess('Signed in as Guest!');
    } catch (e: any) {
      setAuthError(e.message || "Guest login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await proAuth.signOut();
    onClose();
  };

  return (
    <div className="login-overlay">
      <div className="dashboard-container glass">
        
        {/* Sidebar */}
        <aside className="dash-sidebar">
          <div className="dash-brand">
            <Zap className="brand-icon" />
            <span>Word Hacker</span>
          </div>
          
          <nav className="dash-nav">
            <button 
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={18} /> Overview
            </button>
            <button 
              className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              <CreditCard size={18} /> Plan & Billing
            </button>
            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={18} /> Settings
            </button>
          </nav>

          <div className="dash-footer">
            {user && (
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={16} /> Sign Out
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="dash-content">
          <button className="close-btn-corner" onClick={onClose}>
            <X size={20} />
          </button>

          {!user ? (
            <div className="guest-view">
              {authMode === 'select' ? (
                <>
                  <div className="guest-hero">
                    <div className="hero-icon-ring">
                      <Lock size={32} />
                    </div>
                    <h2>Unlock the Neural Network</h2>
                    <p>Sign in to access the Central AI Brain, save your history, and unlock Pro tools.</p>
                  </div>
                  
                  <div className="feature-list">
                    <div className="feature">
                      <Zap size={16} className="f-icon" />
                      <span>GPT-OSS-120B Access</span>
                    </div>
                    <div className="feature">
                      <History size={16} className="f-icon" />
                      <span>Save Chat History</span>
                    </div>
                    <div className="feature">
                      <Shield size={16} className="f-icon" />
                      <span>Pro Security Badge</span>
                    </div>
                  </div>

                  {/* Auth Status Messages */}
                  {authError && (
                    <div className="auth-message error">
                      <AlertCircle size={16} />
                      <span>{authError}</span>
                    </div>
                  )}
                  {authSuccess && (
                    <div className="auth-message success">
                      <CheckCircle size={16} />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  {/* Auth Buttons */}
                  <div className="auth-buttons">
                    <button className="auth-btn google" onClick={handleLogin} disabled={authLoading}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
                      <span>{authLoading ? 'Connecting...' : 'Continue with Google'}</span>
                    </button>
                    
                    <button className="auth-btn email" onClick={() => { setAuthMode('email-login'); setAuthError(''); }}>
                      <Mail size={20} />
                      <span>Continue with Email</span>
                    </button>
                    
                    <div className="auth-divider">
                      <span>or</span>
                    </div>
                    
                    <button className="auth-btn guest" onClick={handleGuestLogin} disabled={authLoading}>
                      <UserCircle size={20} />
                      <span>Continue as Guest</span>
                    </button>
                  </div>
                  
                  <p className="auth-note">Guest access has limited features. Sign in to save your progress.</p>
                  
                  <button className="trouble-link" onClick={handleRedirectLogin} disabled={authLoading}>
                    Trouble logging in? Try redirect method →
                  </button>
                </>
              ) : (
                /* Email Login/Signup Form */
                <div className="email-form-container">
                  <button className="back-to-select" onClick={() => { setAuthMode('select'); setAuthError(''); }}>
                    ← Back to options
                  </button>
                  
                  <div className="email-form-header">
                    <Mail size={32} className="email-icon" />
                    <h2>{authMode === 'email-login' ? 'Sign In' : 'Create Account'}</h2>
                    <p>{authMode === 'email-login' ? 'Enter your credentials' : 'Set up your new account'}</p>
                  </div>

                  {authError && (
                    <div className="auth-message error">
                      <AlertCircle size={16} />
                      <span>{authError}</span>
                    </div>
                  )}

                  <form className="email-form" onSubmit={(e) => { e.preventDefault(); handleEmailAuth(authMode === 'email-signup'); }}>
                    <div className="form-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Password</label>
                      <div className="password-input">
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete={authMode === 'email-login' ? 'current-password' : 'new-password'}
                        />
                        <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    
                    <button type="submit" className="submit-btn" disabled={authLoading}>
                      {authLoading ? 'Please wait...' : (authMode === 'email-login' ? 'Sign In' : 'Create Account')}
                    </button>
                  </form>
                  
                  <div className="auth-switch">
                    {authMode === 'email-login' ? (
                      <p>Don't have an account? <button onClick={() => { setAuthMode('email-signup'); setAuthError(''); }}>Sign Up</button></p>
                    ) : (
                      <p>Already have an account? <button onClick={() => { setAuthMode('email-login'); setAuthError(''); }}>Sign In</button></p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="user-view">
              <header className="content-header">
                <div className="user-welcome">
                  <div className="avatar-small">
                    {user.photoURL ? <img src={user.photoURL} alt="User" /> : <User size={20} />}
                  </div>
                  <div>
                    <h1>Welcome{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ' back'}!</h1>
                    <p className="user-email">{user.email || (user.isAnonymous ? 'Guest User' : 'No email')}</p>
                  </div>
                </div>
                <span className={`plan-badge ${user.isAnonymous ? 'guest' : ''}`}>
                  {status === 'god_mode' ? 'GOD MODE' : (user.isAnonymous ? 'GUEST' : 'PRO PLAN')}
                </span>
              </header>

              {user.isAnonymous && (
                <div className="guest-upgrade-banner">
                  <p>🔒 You're browsing as a guest. Sign in to unlock all features and save your progress.</p>
                  <button onClick={() => { proAuth.signOut(); }}>Upgrade Account</button>
                </div>
              )}

              <div className="stats-row">
                <div className="stat-card">
                  <label>Daily Credits</label>
                  <div className="stat-value">
                    {status === 'god_mode' ? '∞' : (user.isAnonymous ? '3' : credits)}
                    <span className="stat-total">/{user.isAnonymous ? '3' : '10'}</span>
                  </div>
                  <div className="stat-bar">
                    <div className="stat-fill" style={{ width: status === 'god_mode' ? '100%' : `${(Number(credits)/10)*100}%` }}></div>
                  </div>
                </div>
                <div className="stat-card">
                  <label>Account Status</label>
                  <div className={`stat-value ${user.isAnonymous ? '' : 'ok'}`}>{user.isAnonymous ? 'Limited' : 'Active'}</div>
                  <div className="stat-sub">{user.isAnonymous ? 'Anonymous Session' : 'Verified Identity'}</div>
                </div>
              </div>

              <div className="action-section">
                <h3>Quick Actions</h3>
                <div className="action-grid">
                  <button className="action-card">
                    <History size={20} />
                    <span>View History</span>
                    <ChevronRight size={16} className="arrow" />
                  </button>
                  <button className="action-card">
                    <Shield size={20} />
                    <span>Security Log</span>
                    <ChevronRight size={16} className="arrow" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
