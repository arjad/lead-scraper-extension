import { useState, useEffect } from 'react'
import './index.css'
import { exportToCSV } from './exportHelpers.js'
import { useSettings } from './hooks/useSettings.js'
import { useWorkflows } from './hooks/useWorkflows.js'
import { useAuth } from './hooks/useAuth.js'
import AuthView from './components/AuthView.jsx'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

function App() {
  const { settings, isLoaded: settingsLoaded } = useSettings()
  const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, addLeadToWorkflow, isLoaded: workflowsLoaded } = useWorkflows()
  const { token, isLoaded: authLoaded, fetchProfile, logout } = useAuth()
  
  const [view, setView] = useState('home') // 'home' | 'workflow'
  const [activeWorkflowId, setActiveWorkflowId] = useState(null)
  const [selectedWorkflows, setSelectedWorkflows] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedWorkflows');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (niche) => {
    setExpandedGroups(prev => ({ ...prev, [niche]: !prev[niche] }));
  };

  useEffect(() => {
    try {
      localStorage.setItem('selectedWorkflows', JSON.stringify(selectedWorkflows));
    } catch (e) {
      console.error('Failed to save selected workflows to local storage', e);
    }
  }, [selectedWorkflows]);

  useEffect(() => {
    if (token) {
      fetchProfile().catch((err) => {
        console.error("Profile fetch failed, logging user out:", err);
        logout();
      });
    }
  }, [token]);

  useEffect(() => {
    const handleMessage = (request, sender, sendResponse) => {
      if (request.action === 'leadScraped' && request.workflowId && request.lead) {
        addLeadToWorkflow(request.workflowId, request.lead);
      }
    };
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }
  }, [addLeadToWorkflow]);

  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState(null)

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId)

  const handleScrape = async () => {

    setLoading(true)
    setError(null)
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.url.includes("google.com/maps") && !tab.url.includes("google.com/search")) {
        setError("Please navigate to Google Maps or Google Search to scrape leads.")
        setLoading(false)
        return
      }

      // Step 1: Immediately get title and create workflow
      chrome.tabs.sendMessage(tab.id, { action: 'getTitle' }, (res) => {
        const title = res && res.success ? res.title : 'Untitled Scrape';
        const newWf = addWorkflow(title, [], 'scraping');
        // Do NOT change view, stay on home page
        // setView('workflow');

        // Step 2: Start scraping
        chrome.tabs.sendMessage(tab.id, { action: 'scrape', workflowId: newWf.id }, (response) => {
          if (chrome.runtime.lastError) {
            setError("Could not establish connection. Try refreshing the page.")
            updateWorkflow(newWf.id, { status: 'completed' })
          } else if (response && response.success) {
            // We already added leads in real-time, just mark as completed
            updateWorkflow(newWf.id, { status: 'completed' });
          } else {
            setError("Failed to scrape leads.")
            updateWorkflow(newWf.id, { status: 'completed' })
          }
          setLoading(false)
        })
      });
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const exportCSV = (filter = 'all') => {
    if (activeWorkflow) {
      let leadsToExport = activeWorkflow.leads;
      if (filter === 'email') leadsToExport = leadsToExport.filter(l => l.email);
      else if (filter === 'phone') leadsToExport = leadsToExport.filter(l => l.phone);
      else if (filter === 'website') leadsToExport = leadsToExport.filter(l => l.website);

      exportToCSV(leadsToExport, `${activeWorkflow.title.replace(/\s+/g, '_')}_leads_${filter}.csv`, settings.csvHeaders)
    }
  }

  const exportSelectedAs = (format) => {
    const selectedData = workflows.filter(w => selectedWorkflows.includes(w.id)).flatMap(w => w.leads);
    if (selectedData.length === 0) return;
    
    if (format === 'csv') {
      exportToCSV(selectedData, `selected_workflows_leads.csv`, settings.csvHeaders);
    } else {
      import('./exportHelpers.js').then(m => m.exportToExcel(selectedData, `selected_workflows_leads.xls`, settings.csvHeaders));
    }
  }

  const startIndividualScraping = async () => {
    if (!activeWorkflow) return;

    let leadsToProcess = activeWorkflow.leads;
    if (activeWorkflow.enriched) {
      leadsToProcess = activeWorkflow.leads.filter(lead => lead.error || (lead.website && !lead.email));
      if (leadsToProcess.length === 0) {
        setError("No failed leads to retry.");
        return;
      }
    }

    setEnriching(true)
    setError(null)
    updateWorkflow(activeWorkflow.id, { status: 'enriching' })
    
    try {
      // POST to /process-leads
      const response = await fetch(`${API_BASE_URL}/process-leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ leads: leadsToProcess })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start job. Status: ${response.status}`);
      }
      
      const { job_id } = await response.json();
      
      // Stop automatic polling as requested. Instead, we save the job_id.
      updateWorkflow(activeWorkflow.id, { status: 'enriching', job_id: job_id });
      setEnriching(false);

    } catch (err) {
      setError("Scraping request failed: " + err.message)
      updateWorkflow(activeWorkflow.id, { status: 'completed' })
      setEnriching(false)
    }
  }
  const handleLeadCheck = (index, checked) => {
    if (!activeWorkflow) return;
    const newLeads = [...activeWorkflow.leads];
    newLeads[index] = { ...newLeads[index], checked };
    updateWorkflow(activeWorkflow.id, { leads: newLeads });
  };

  const getFbMessageLink = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      if (urlObj.searchParams.has('id')) return `https://m.me/${urlObj.searchParams.get('id')}`;
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const username = pathParts[pathParts.length - 1];
      return username ? `https://m.me/${username}` : url;
    } catch(e) { return url; }
  };

  const getIgMessageLink = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const username = pathParts[0];
      return username ? `https://ig.me/m/${username}` : url;
    } catch(e) { return url; }
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return null;
    const digitsOnly = phone.replace(/\D/g, '');
    return `https://wa.me/${digitsOnly}`;
  };

  const handleRefreshStatus = async () => {
    if (!activeWorkflow || !activeWorkflow.job_id) return;
    
    setEnriching(true);
    setError(null);
    try {
      const statusRes = await fetch(`${API_BASE_URL}/job-status/${activeWorkflow.job_id}`);
      if (!statusRes.ok) throw new Error("Failed to fetch status");
      
      const statusData = await statusRes.json();
      
      const getMergedLeads = (results) => {
        if (!results) return activeWorkflow.leads;
        return activeWorkflow.leads.map(originalLead => {
          const updatedLead = results.find(r => r.name === originalLead.name && r.website === originalLead.website);
          return updatedLead || originalLead;
        });
      };

      const mergedResults = getMergedLeads(statusData.results);

      if (statusData.results && statusData.results.length > 0) {
        updateWorkflow(activeWorkflow.id, { 
          leads: mergedResults,
          completed_leads: statusData.completed_leads,
          total_leads: statusData.total_leads
        });
      }

      if (statusData.status === 'completed') {
        updateWorkflow(activeWorkflow.id, { 
          leads: mergedResults, 
          enriched: true, 
          status: 'completed',
          completed_leads: statusData.completed_leads,
          total_leads: statusData.total_leads
        });
      } else if (statusData.status === 'failed') {
        setError("Scraping job failed: " + statusData.error);
        updateWorkflow(activeWorkflow.id, { status: 'completed' });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch results: " + err.message);
    } finally {
      setEnriching(false);
    }
  }


  const openSettings = (tab = 'settings') => {
    window.open(chrome.runtime.getURL(`settings.html?tab=${tab}`))
  }

  if (!settingsLoaded || !workflowsLoaded || !authLoaded) return null



  const getExpandedLeads = (leads) => {
    if (!leads) return [];
    const expanded = [];
    leads.forEach((lead, originalIndex) => {
      if (showDuplicates && lead.email && lead.email.includes(',')) {
        const emails = lead.email.split(',').map(e => e.trim()).filter(Boolean);
        emails.forEach((email, i) => {
          expanded.push({
            ...lead,
            originalIndex: lead.originalIndex ?? originalIndex,
            email: email,
            isDuplicateEmail: i > 0,
            emailIndex: i
          });
        });
      } else {
        expanded.push({ ...lead, originalIndex: lead.originalIndex ?? originalIndex });
      }
    });
    return expanded;
  };

  return (
    <div className="w-full h-full flex flex-col p-5 bg-background text-textMain relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-surface pb-3">
        <div className="flex items-center space-x-2">
          {view === 'workflow' && (
            <button onClick={() => setView('home')} className="mr-1 p-1 hover:bg-surface rounded text-textMuted hover:text-textMain transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
          )}
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <h1 className="text-lg font-bold text-primary truncate">Lead Gen Pro</h1>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Profile/Login Icon */}
          <button 
            onClick={() => openSettings('profile')}
            className="p-1.5 rounded-full hover:bg-surface text-textMuted hover:text-textMain transition-colors"
            title={token ? "Profile" : "Log In"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </button>
          
          {/* Settings Icon */}
          <button 
            onClick={() => openSettings('settings')}
            className="p-1.5 rounded-full hover:bg-surface text-textMuted hover:text-textMain transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* HOME VIEW */}
      {view === 'home' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <button 
            onClick={handleScrape}
            disabled={loading}
            className="w-full py-3 px-4 mb-6 bg-primary hover:opacity-90 active:scale-95 transition-all duration-200 rounded-lg font-semibold text-white shadow-md shadow-primary/20 flex items-center justify-center space-x-2 shrink-0"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <span>Scrape Current Page</span>
              </>
            )}
          </button>

          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-sm font-semibold text-textMuted uppercase tracking-wider">Your Workflows</h2>
            {selectedWorkflows.length > 0 && (
              <div className="flex space-x-2">
                <button 
                  onClick={() => exportSelectedAs('csv')}
                  className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 font-medium transition-colors"
                >
                  Export CSV
                </button>
                <button 
                  onClick={() => exportSelectedAs('excel')}
                  className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 font-medium transition-colors"
                >
                  Export Excel
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {workflows.length === 0 ? (
              <div className="text-center py-10 text-sm text-textMuted">No workflows yet. Try scraping a page!</div>
            ) : (
              (() => {
                const groups = {};
                workflows.forEach(wf => {
                  const match = wf.title.match(/^(.*?)(?:\s+in\s+|\s+-\s+)(.*)$/i);
                  const niche = match ? match[1].trim() : wf.title.trim();
                  const location = match ? match[2].trim() : 'Unknown Location';
                  
                  if (!groups[niche]) {
                    groups[niche] = { niche, workflows: [], totalLeads: 0, latestTimestamp: 0, ids: [] };
                  }
                  groups[niche].workflows.push({ ...wf, parsedLocation: location });
                  groups[niche].totalLeads += wf.leads.length;
                  groups[niche].ids.push(wf.id);
                  if (wf.timestamp > groups[niche].latestTimestamp) {
                    groups[niche].latestTimestamp = wf.timestamp;
                  }
                });
                
                const sortedGroups = Object.values(groups).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
                
                return sortedGroups.map(group => {
                  const isExpanded = expandedGroups[group.niche];
                  const isAllSelected = group.ids.every(id => selectedWorkflows.includes(id));
                  const isSomeSelected = group.ids.some(id => selectedWorkflows.includes(id)) && !isAllSelected;

                  return (
                    <div key={group.niche} className="bg-surface rounded-xl border border-secondary/10 overflow-hidden">
                      {/* Group Header */}
                      <div 
                        className="p-4 hover:bg-surface/80 cursor-pointer transition-all flex items-center justify-between"
                        onClick={() => toggleGroup(group.niche)}
                      >
                        <div className="shrink-0 pr-4 flex items-center justify-center h-full">
                          <input 
                            type="checkbox"
                            ref={input => {
                              if (input) {
                                input.indeterminate = isSomeSelected;
                              }
                            }}
                            checked={isAllSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWorkflows(prev => [...new Set([...prev, ...group.ids])]);
                              } else {
                                setSelectedWorkflows(prev => prev.filter(id => !group.ids.includes(id)));
                              }
                            }}
                            className="w-4 h-4 cursor-pointer text-primary border-secondary/30 rounded focus:ring-primary/50"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-4">
                          <h3 className="font-semibold text-sm truncate text-textMain group-hover:text-primary transition-colors">{group.niche}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-textMuted bg-background px-2 py-0.5 rounded-full border border-secondary/20">
                              {group.workflows.length} {group.workflows.length === 1 ? 'Location' : 'Locations'}
                            </span>
                            <span className="text-xs text-textMuted">• {group.totalLeads} total leads</span>
                          </div>
                        </div>

                        <div className="flex items-center shrink-0">
                          <svg className={`w-5 h-5 text-textMuted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>

                      {/* Group Content (Workflows by Location) */}
                      {isExpanded && (
                        <div className="border-t border-secondary/10 bg-background/50 p-2 space-y-2">
                          {group.workflows.sort((a, b) => b.timestamp - a.timestamp).map(wf => (
                            <div 
                              key={wf.id} 
                              className="relative group p-3 bg-surface rounded-lg border border-secondary/5 hover:border-secondary/30 hover:bg-surface/80 cursor-pointer transition-all flex items-center justify-between ml-8"
                              onClick={() => { setActiveWorkflowId(wf.id); setView('workflow') }}
                            >
                              <div className="shrink-0 pr-3 flex items-center justify-center h-full">
                                <input 
                                  type="checkbox" 
                                  checked={selectedWorkflows.includes(wf.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedWorkflows(prev => [...prev, wf.id]);
                                    else setSelectedWorkflows(prev => prev.filter(id => id !== wf.id));
                                  }}
                                  className="w-3.5 h-3.5 cursor-pointer text-primary border-secondary/30 rounded focus:ring-primary/50"
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0 pr-3">
                                <h4 className="font-medium text-xs truncate text-textMain group-hover:text-primary transition-colors">{wf.parsedLocation}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-[10px] text-textMuted">
                                    {new Date(wf.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                  <span className="text-[10px] text-textMuted">• {wf.leads.length} leads</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2 shrink-0">
                                {(wf.status === 'scraping' || wf.status === 'enriching') && (
                                   <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/10 text-yellow-600 uppercase tracking-wide hidden sm:inline-block">In Progress</span>
                                )}
                                {wf.enriched && wf.status === 'completed' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wide hidden sm:inline-block">Processed</span>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}
                                  className="text-textMuted p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors z-10"
                                  title="Delete Workflow"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>
      )}

      {/* WORKFLOW DETAIL VIEW */}
      {view === 'workflow' && activeWorkflow && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="mb-4 pb-4 border-b border-surface">
            <h2 className="text-lg font-bold text-textMain truncate pr-2" title={activeWorkflow.title}>{activeWorkflow.title}</h2>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-textMuted bg-surface px-2 py-1 rounded">
                  {activeWorkflow.status === 'scraping' ? 'Scraping in progress...' : (activeWorkflow.status === 'enriching' ? `Scraping websites: ${activeWorkflow.completed_leads || 0} / ${activeWorkflow.total_leads || activeWorkflow.leads.length} done` : `${activeWorkflow.leads.length} leads found`)}
                </span>
                {activeWorkflow.status === 'scraping' && (
                  <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
              </div>
              <div className="flex items-center space-x-2">
              {activeWorkflow.status === 'enriching' && (
                <button
                  onClick={handleRefreshStatus}
                  disabled={enriching}
                  className="px-6 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg font-medium transition-colors border border-blue-600/30 disabled:opacity-50 flex items-center"
                >
                  {enriching ? (
                    <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Refreshing...</>
                  ) : "Refresh Results"}
                </button>
              )}
              
              {!activeWorkflow.enriched && activeWorkflow.status !== 'enriching' && (
                <button 
                  onClick={startIndividualScraping}
                  disabled={enriching || activeWorkflow.status === 'scraping'}
                  className={`text-xs py-1.5 px-3 rounded-md transition-all flex items-center space-x-1 ${
                    enriching || activeWorkflow.status === 'scraping'
                      ? 'bg-surface text-textMuted border border-secondary/20 cursor-not-allowed'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                  }`}
                >
                  {enriching ? (
                    <><svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Processing...</span></>
                  ) : activeWorkflow.enriched ? (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Retry Failed</span></>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span>Start individual scraping</span></>
                  )}
                </button>
              )}

              <div className="relative">
                  <button 
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    disabled={activeWorkflow.status === 'scraping'}
                    className={`text-xs py-1.5 px-3 bg-surface border border-secondary/30 rounded-md transition-all flex items-center space-x-1 ${activeWorkflow.status === 'scraping' ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    <span>Export CSV</span>
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  {exportDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-surface border border-secondary/30 rounded-md shadow-lg z-50 py-1 flex flex-col">
                      <button onClick={() => { exportCSV('all'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-xs hover:bg-surface/80 text-textMain transition-colors">All Leads</button>
                      <button onClick={() => { exportCSV('email'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-xs hover:bg-surface/80 text-textMain transition-colors">Only with Email</button>
                      <button onClick={() => { exportCSV('phone'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-xs hover:bg-surface/80 text-textMain transition-colors">Only with Phone</button>
                      <button onClick={() => { exportCSV('website'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-xs hover:bg-surface/80 text-textMain transition-colors">Only with Website</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-3 px-2 flex items-center">
            <label className="flex items-center space-x-2 text-sm text-textMuted cursor-pointer hover:text-textMain transition-colors">
              <input type="checkbox" checked={showDuplicates} onChange={(e) => setShowDuplicates(e.target.checked)} className="rounded border-secondary/30 text-primary focus:ring-primary/50 cursor-pointer" />
              <span>Show all duplicate emails</span>
            </label>
          </div>
          
          <div className="flex-1 overflow-auto -mx-5">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap relative">
              <thead className="sticky top-0 z-30">
                <tr className="border-b border-surface text-textMuted bg-surface">
                  <th className="p-3 pl-5 font-semibold w-[50px] min-w-[50px] text-center sticky left-0 z-30 bg-surface">✔</th>
                  <th className="p-3 font-semibold w-[40px] min-w-[40px] text-center sticky left-[50px] z-30 bg-surface shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)]">#</th>
                  <th className="p-3 font-semibold">Company Name</th>
                  <th className="p-3 font-semibold">Website</th>
                  <th className="p-3 font-semibold">Phone</th>
                  {(activeWorkflow.enriched || activeWorkflow.status === 'enriching') && (
                    <>
                      <th className="p-3 font-semibold">Email</th>
                      <th className="p-3 font-semibold">Facebook</th>
                      <th className="p-3 font-semibold">Insta DM</th>
                      <th className="p-3 font-semibold">Instagram Profile</th>
                      <th className="p-3 font-semibold">Twitter</th>
                      <th className="p-3 font-semibold">LinkedIn</th>
                      <th className="p-3 pr-5 font-semibold">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {getExpandedLeads(activeWorkflow.leads).map((lead, i) => (
                  <tr key={`${lead.originalIndex}-${lead.emailIndex || 0}`} className={`group border-b border-surface transition-colors ${lead.isDuplicateEmail ? 'bg-gray-500/10 hover:bg-gray-500/20' : 'hover:bg-surface/30'}`}>
                    <td className={`p-3 pl-5 text-center sticky left-0 z-20 ${lead.isDuplicateEmail ? 'bg-[#f3f4f6] dark:bg-[#1f2937]' : 'bg-background group-hover:bg-surface'}`}>
                      <input type="checkbox" checked={lead.checked || false} onChange={(e) => handleLeadCheck(lead.originalIndex, e.target.checked)} className="cursor-pointer" />
                    </td>
                    <td className={`p-3 text-center text-textMuted w-[40px] min-w-[40px] sticky left-[50px] z-20 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)] ${lead.isDuplicateEmail ? 'bg-[#f3f4f6] dark:bg-[#1f2937]' : 'bg-background group-hover:bg-surface'}`}>{lead.originalIndex + 1}</td>
                    <td className="p-3 max-w-[150px] truncate" title={lead.name}>{lead.name || 'Unnamed Business'}</td>
                    <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.website}>
                      {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.website}</a> : '-'}
                    </td>
                    <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.phone}>{lead.phone ? <a href={getWhatsAppLink(lead.phone)} target="_blank" rel="noreferrer" className="text-primary hover:underline" title="Message on WhatsApp">{lead.phone}</a> : '-'}</td>
                    {(activeWorkflow.enriched || activeWorkflow.status === 'enriching') && (
                      <>
                        <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.email}>{lead.email ? <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${lead.email}`} target="_blank" rel="noreferrer" className="text-green-500 hover:underline">{lead.email}</a> : '-'}</td>
                        <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.facebook}>{lead.facebook ? <a href={getFbMessageLink(lead.facebook)} target="_blank" rel="noreferrer" className="text-primary hover:underline" title="Send Message on Facebook">{lead.facebook}</a> : '-'}</td>
                        <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.instagram}>{lead.instagram ? <a href={getIgMessageLink(lead.instagram)} target="_blank" rel="noreferrer" className="text-primary hover:underline" title="Send Message on Instagram">Message</a> : '-'}</td>
                        <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.instagram}>{lead.instagram ? <a href={lead.instagram} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.instagram}</a> : '-'}</td>
                        <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.twitter}>{lead.twitter ? <a href={lead.twitter} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.twitter}</a> : '-'}</td>
                        <td className="p-3 min-w-[60px] max-w-[150px] truncate" title={lead.linkedin}>{lead.linkedin ? <a href={lead.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.linkedin}</a> : '-'}</td>
                        <td className="p-3 pr-5 max-w-[100px] truncate" title={lead.status || '-'}>
                          {(lead.status === 'success' || (!lead.error && (lead.email || lead.phone || lead.website))) ? <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface text-textMuted border border-secondary/20">Completed</span> : (lead.status === 'failed' ? <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface text-textMuted border border-secondary/20">Failed</span> : (lead.status === 'pending' ? <span className="text-yellow-500">Pending</span> : (lead.status === 'processing' ? <span className="text-blue-400">Processing</span> : (!lead.error ? <span className="text-textMuted">-</span> : null))))}
                          {lead.error && <div className="text-red-400 text-xs mt-1">{lead.error}</div>}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
