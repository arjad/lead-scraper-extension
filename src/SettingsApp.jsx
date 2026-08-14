import React, { useState, useEffect } from 'react'
import { useSettings } from './hooks/useSettings.js'
import { useAuth } from './hooks/useAuth.js'
import AuthView from './components/AuthView.jsx'

import ProfileView from './components/ProfileView.jsx'
import SettingsView from './components/SettingsView.jsx'
import IntegrationsView from './components/IntegrationsView.jsx'
import AboutView from './components/AboutView.jsx'
import WorkflowsView from './components/WorkflowsView.jsx'
import SettingsSidebar from './components/SettingsSidebar.jsx'

export default function SettingsApp() {
  const { settings, updateSettings, isLoaded } = useSettings()
  const { token, isLoaded: authLoaded } = useAuth()
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'settings';
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
      window.history.pushState({}, '', url);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'settings';
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!isLoaded || !authLoaded) return <div className="p-10 text-center text-textMuted">Loading settings...</div>

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-[400px] h-[500px] bg-surface shadow-2xl rounded-2xl overflow-hidden border border-secondary/20">
          <AuthView />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-textMain">
      <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className={`flex-1 overflow-y-auto ${activeTab === 'workflows' ? 'p-0' : 'p-10'}`}>
        <div className={activeTab === 'workflows' ? 'w-full h-full' : 'max-w-3xl mx-auto'}>
          {activeTab === 'profile' && <ProfileView />}
          {activeTab === 'workflows' && <WorkflowsView />}
          {activeTab === 'settings' && <SettingsView settings={settings} updateSettings={updateSettings} />}
          {activeTab === 'integrations' && <IntegrationsView />}
          {activeTab === 'about' && <AboutView />}
        </div>
      </main>
    </div>
  )
}
