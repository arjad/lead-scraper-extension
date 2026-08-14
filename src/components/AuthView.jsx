import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function AuthView() {
  const { signup, signin, confirmSignup, resendCode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isVerifying) {
        await confirmSignup(email, code);
        await signin(email, password);
        window.location.href = '?tab=profile';
      } else if (isLogin) {
        await signin(email, password);
        window.location.href = '?tab=profile';
      } else {
        await signup(email, password);
        setIsVerifying(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      await resendCode(email);
      setError("Code resent successfully! Please check your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6">
      <div className="w-16 h-16 mb-6 flex items-center justify-center">
        <img src="/logo.png" alt="Lead Gen Pro Logo" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-textMain mb-2">{isVerifying ? 'Verify Email' : isLogin ? 'Welcome Back' : 'Create Account'}</h1>
      <p className="text-sm text-textMuted mb-6 text-center">
        {isVerifying ? 'Enter the verification code sent to your email.' : isLogin ? 'Sign in to access your scraping workflows.' : 'Sign up to start scraping Google Maps leads.'}
      </p>

      {error && (
        <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {!isVerifying && (
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-surface border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
            />
          </div>
        )}
        {!isVerifying && (
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textMuted hover:text-textMain focus:outline-none"
              >
                {showPassword ? (
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
        )}
        
        {isVerifying && (
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1">Verification Code</label>
            <input 
              type="text" 
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full px-4 py-2 bg-surface border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors"
              placeholder="123456"
            />
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 px-4 bg-primary hover:opacity-90 active:scale-95 transition-all duration-200 rounded-lg font-semibold text-white shadow-md shadow-primary/20 flex items-center justify-center space-x-2 mt-2"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <span>{isVerifying ? 'Verify & Sign In' : isLogin ? 'Sign In' : 'Sign Up'}</span>
          )}
        </button>
      </form>

      {!isVerifying && (
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm text-primary hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      )}

      {isVerifying && (
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-primary hover:underline"
          >
            Didn't receive the code? Resend
          </button>
        </div>
      )}
    </div>
  );
}
