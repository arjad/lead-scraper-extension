import { useState, useEffect } from 'react';

export function useWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from Chrome Storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['leadScrapperWorkflows'], (result) => {
        if (result.leadScrapperWorkflows) {
          setWorkflows(result.leadScrapperWorkflows);
        }
        setIsLoaded(true);
      });
    } else {
      setIsLoaded(true);
    }
  }, []);

  const addWorkflow = (title, leads, initialStatus = 'completed') => {
    const newWorkflow = {
      id: Date.now().toString(),
      title: title || 'Untitled Scrape',
      timestamp: Date.now(),
      leads: leads,
      enriched: false,
      status: initialStatus // 'scraping', 'completed', 'enriching', 'enriched'
    };

    setWorkflows(prev => {
      const updated = [newWorkflow, ...prev];
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ leadScrapperWorkflows: updated });
      }
      return updated;
    });

    return newWorkflow;
  };

  const updateWorkflow = (id, updates) => {
    setWorkflows(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, ...updates } : w);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ leadScrapperWorkflows: updated });
      }
      return updated;
    });
  };

  const deleteWorkflow = (id) => {
    setWorkflows(prev => {
      const updated = prev.filter(w => w.id !== id);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ leadScrapperWorkflows: updated });
      }
      return updated;
    });
  };

  const addLeadToWorkflow = (id, lead) => {
    setWorkflows(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, leads: [...w.leads, lead] } : w);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ leadScrapperWorkflows: updated });
      }
      return updated;
    });
  };

  return { workflows, addWorkflow, updateWorkflow, deleteWorkflow, addLeadToWorkflow, isLoaded };
}
