import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export function useAuth() {
  const [token, setToken] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['auth_token'], (result) => {
        if (result.auth_token) {
          setToken(result.auth_token);
        }
        setIsLoaded(true);
      });
    } else {
      setIsLoaded(true);
    }
  }, []);

  const saveToken = (newToken) => {
    setToken(newToken);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ auth_token: newToken });
    }
  };

  const clearToken = () => {
    setToken(null);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['auth_token']);
    }
  };

  const signup = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      let errorMsg = data.detail;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0].msg;
      }
      throw new Error(errorMsg || 'Failed to sign up');
    }
    if (data.access_token) {
      saveToken(data.access_token);
    }
    return data;
  };

  const confirmSignup = async (email, code) => {
    const response = await fetch(`${API_BASE_URL}/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await response.json();
    if (!response.ok) {
      let errorMsg = data.detail;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0].msg;
      }
      throw new Error(errorMsg || 'Failed to verify code');
    }
    return data;
  };

  const resendCode = async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) {
      let errorMsg = data.detail;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0].msg;
      }
      throw new Error(errorMsg || 'Failed to resend code');
    }
    return data;
  };

  const signin = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      let errorMsg = data.detail;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0].msg;
      }
      throw new Error(errorMsg || 'Failed to sign in');
    }
    if (data.access_token) {
      saveToken(data.access_token);
    }
    return data;
  };

  const changePassword = async (old_password, new_password) => {
    if (!token) throw new Error("Not authenticated");
    
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      // Backend expects access_token inside the request body based on schema
      body: JSON.stringify({ access_token: token, old_password, new_password })
    });
    const data = await response.json();
    if (!response.ok) {
      let errorMsg = data.detail;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0].msg;
      }
      throw new Error(errorMsg || 'Failed to change password');
    }
    return data;
  };

  const fetchProfile = async () => {
    if (!token) throw new Error("Not authenticated");
    
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) {
      let errorMsg = data.detail;
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg[0].msg;
      }
      throw new Error(errorMsg || 'Failed to fetch profile');
    }
    return data;
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/signout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Backend signout failed", err);
      }
    }
    clearToken();
    window.location.reload();
  };

  return { token, isLoaded, signup, confirmSignup, resendCode, signin, changePassword, fetchProfile, logout, saveToken };
}
