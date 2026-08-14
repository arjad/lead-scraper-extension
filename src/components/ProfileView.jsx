import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function ProfileView() {
  const { logout, changePassword, fetchProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchProfile().then(data => {
      if (mounted) setProfile(data);
    }).catch(err => {
      console.error("Failed to fetch profile:", err);
    });
    return () => { mounted = false };
  }, [fetchProfile]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setError(null);
    try {
      await changePassword(oldPassword, newPassword);
      setMsg("Password changed successfully!");
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Profile</h2>
      </div>
      <div className="p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-2xl text-white font-bold uppercase">
            {profile ? profile.email?.substring(0, 2) : '...'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textMain">{profile ? profile.username : 'Loading...'}</h3>
            <p className="text-sm text-textMuted">{profile ? profile.email : ''}</p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm">
        <h3 className="font-semibold text-textMain mb-4">Change Password</h3>
        
        {msg && <div className="mb-4 text-green-500 text-sm bg-green-500/10 p-2 rounded">{msg}</div>}
        {error && <div className="mb-4 text-red-500 text-sm bg-red-500/10 p-2 rounded">{error}</div>}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1">Old Password</label>
            <div className="relative">
              <input 
                type={showOldPassword ? "text" : "password"} 
                required
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textMuted hover:text-textMain focus:outline-none"
              >
                {showOldPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1">New Password</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"} 
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textMuted hover:text-textMain focus:outline-none"
              >
                {showNewPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={logout}
          className="px-6 py-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-bold w-full max-w-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
