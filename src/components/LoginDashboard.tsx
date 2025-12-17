import { useState, useEffect } from 'react';
import { X, User, Zap, Shield, LogOut, Lock } from 'lucide-react';
import { proAuth, type UserStatus } from '../services/ProAuth';
import { User as FirebaseUser } from 'firebase/auth';
import './LoginDashboard.css';

interface LoginDashboardProps {
  onClose: () => void;
}

export default function LoginDashboard({ onClose }: LoginDashboardProps) {
  const [status, setStatus] = useState<UserStatus>('loading');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [credits, setCredits] = useState<number | 'inf'>('inf');

  useEffect(() => {
    const unsub = proAuth.subscribe((s, u) => {
      setStatus(s);
      setUser(u);
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
    try {
      await proAuth.signIn();
    } catch (e) {
      alert("Login Failed. Check console.");
    }
  };

  const handleLogout = async () => {
    await proAuth.signOut();
    onClose();
  };

  return (
    <div className="login-overlay">
      <div className="login-card glass">
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <header className="login-header">
          <div className="avatar-ring">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="user-avatar" />
            ) : (
              <User size={40} className="anon-avatar" />
            )}
          </div>
          <h2>{user?.displayName || 'Anonymous User'}</h2>
          <p className="user-email">{user?.email || 'No Identity Linked'}</p>
        </header>

        <div className="status-grid">
          <div className={`status-item ${status === 'god_mode' ? 'god' : ''}`}>
            <Shield size={20} />
            <div>
              <label>Access Level</label>
              <span>{status === 'god_mode' ? 'GOD MODE' : status === 'pro' ? 'PRO AGENT' : 'GUEST'}</span>
            </div>
          </div>
          <div className="status-item">
            <Zap size={20} />
            <div>
              <label>Neural Credits</label>
              <span>{status === 'god_mode' ? 'UNLIMITED' : `${credits}/10 Daily`}</span>
            </div>
          </div>
        </div>

        <div className="login-actions">
          {status === 'anonymous' ? (
            <button className="btn-neon full" onClick={handleLogin}>
              <Zap size={18} /> CONNECT WITH GOOGLE
            </button>
          ) : (
            <button className="btn-ghost full" onClick={handleLogout}>
              <LogOut size={18} /> DISCONNECT
            </button>
          )}
        </div>

        {status === 'anonymous' && (
          <p className="login-note">
            <Lock size={12} /> Login required for advanced AI features.
          </p>
        )}
      </div>
    </div>
  );
}
