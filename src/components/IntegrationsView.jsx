import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function IntegrationsView() {
  const { token } = useAuth();
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  const handleConnectGmail = () => {
    // Open the Google OAuth login route in a new tab. 
    // Usually the backend should handle redirecting back or showing success.
    window.open(`${API_BASE_URL}/auth/google/login?token=${token}`, '_blank');
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // Passing token in case backend requires it
        },
        body: JSON.stringify({
          to_email: toEmail,
          subject: subject,
          content: content
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send email");
      }

      setStatus({ type: 'success', message: 'Email sent successfully!' });
      setToEmail('');
      setSubject('');
      setContent('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="border-b border-surface pb-4">
        <h2 className="text-2xl font-bold text-textMain">Integrations</h2>
        <p className="text-sm text-textMuted mt-1">Connect third-party services to enhance your workflows.</p>
      </div>

      {status && (
        <div className={`p-4 rounded-lg text-sm ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
          {status.message}
        </div>
      )}

      {/* Gmail Integration Card */}
      <div className="bg-surface/50 border border-secondary/20 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              {/* Simple Google 'G' logo placeholder */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-textMain">Gmail</h3>
              <p className="text-sm text-textMuted">Send emails directly from Lead Gen Pro.</p>
            </div>
          </div>
          <button 
            onClick={handleConnectGmail}
            className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-semibold transition-colors"
          >
            Connect Gmail
          </button>
        </div>

        {/* Test Email Form */}
        <div className="border-t border-secondary/20 pt-6 mt-2">
          <h4 className="text-sm font-semibold text-textMain mb-4">Test Email Integration</h4>
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">To Email</label>
              <input 
                type="email" 
                required
                value={toEmail}
                onChange={e => setToEmail(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors"
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">Subject</label>
              <input 
                type="text" 
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors"
                placeholder="Hello from API"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">Content</label>
              <textarea 
                required
                rows="4"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-secondary/20 rounded-lg text-sm text-textMain focus:outline-none focus:border-primary transition-colors resize-none"
                placeholder="This is a test email sent from the FastAPI Google integration."
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2.5 bg-primary hover:opacity-90 active:scale-95 transition-all duration-200 rounded-lg font-semibold text-white shadow-md shadow-primary/20 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <span>Send Email</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
