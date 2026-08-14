import React from 'react';

export default function SettingsSidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'workflows', label: 'Workflows', icon: 'workflows' },
    { id: 'settings', label: 'Settings', icon: 'cog' },
    { id: 'integrations', label: 'Integrations', icon: 'plug' },
    { id: 'about', label: 'About Us', icon: 'info' }
  ]

  const getIcon = (id) => {
    switch(id) {
      case 'profile':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
      case 'workflows':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      case 'settings':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      case 'integrations':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
      case 'about':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    }
  }

  return (
    <aside className="w-64 border-r border-secondary/20 bg-surface/50 p-6 flex flex-col">
      <div className="flex items-center space-x-2 mb-10">
        <div className="w-8 h-8 shrink-0 flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold text-primary truncate">Lead Gen Pro</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium ${
              activeTab === tab.id 
                ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5' 
                : 'text-textMuted hover:bg-background hover:text-textMain'
            }`}
          >
            {getIcon(tab.id)}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
