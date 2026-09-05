import React from 'react';

export default function SettingsView({ settings, updateSettings }) {
  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })
  }

  const toggleHeader = (header) => {
    const newHeaders = { ...settings.csvHeaders, [header]: !settings.csvHeaders[header] }
    updateSettings({ csvHeaders: newHeaders })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Appearance</h2>
        <div className="space-y-4">
          <div className="p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-textMain">Dark Mode</h3>
              <p className="text-sm text-textMuted">Toggle between light and dark themes</p>
            </div>
            <button 
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.theme === 'dark' ? 'bg-primary' : 'bg-secondary/30'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className="p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-textMain">Show Action Widget</h3>
              <p className="text-sm text-textMuted">Show or hide the floating Lead Scraper & Autofill widget</p>
            </div>
            <button 
              onClick={() => updateSettings({ showAutofillButtons: !settings.showAutofillButtons })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.showAutofillButtons !== false ? 'bg-primary' : 'bg-secondary/30'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.showAutofillButtons !== false ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Export Preferences</h2>
        <div className="p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm">
          <h3 className="font-semibold text-textMain mb-1">CSV Headers</h3>
          <p className="text-sm text-textMuted mb-4">Select which columns you want to include in your exported CSV files.</p>
          
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(settings.csvHeaders).map(header => (
              <label key={header} className="flex items-center space-x-3 p-3 border border-secondary/20 rounded-lg hover:bg-background/50 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={settings.csvHeaders[header]}
                  onChange={() => toggleHeader(header)}
                  className="w-4 h-4 text-primary rounded border-secondary/30 focus:ring-primary/50"
                />
                <span className="text-sm font-medium">{header}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
