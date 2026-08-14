import { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  theme: 'light', // 'light' or 'dark'
  csvHeaders: {
    Name: true,
    Rating: true,
    Reviews: true,
    Category: true,
    Address: true,
    Phone: true,
    Website: true,
    Email: true,
    Status: true
  }
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from Chrome Storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['leadScrapperSettings'], (result) => {
        if (result.leadScrapperSettings) {
          // Merge default settings with saved settings to ensure new keys exist
          setSettings(prev => ({
            ...prev,
            ...result.leadScrapperSettings,
            csvHeaders: {
              ...prev.csvHeaders,
              ...(result.leadScrapperSettings.csvHeaders || {})
            }
          }));
        }
        setIsLoaded(true);
      });
    } else {
      setIsLoaded(true);
    }
  }, []);

  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const updated = { 
        ...prev, 
        ...newSettings,
        csvHeaders: {
          ...prev.csvHeaders,
          ...(newSettings.csvHeaders || {})
        }
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ leadScrapperSettings: updated });
      }
      return updated;
    });
  };

  // Apply theme to document
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return { settings, updateSettings, isLoaded };
}
