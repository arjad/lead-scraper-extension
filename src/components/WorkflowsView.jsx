import React, { useState } from 'react';
import { useWorkflows } from '../hooks/useWorkflows.js';
import { useSettings } from '../hooks/useSettings.js';
import { exportToCSV } from '../helpers.js';

export default function WorkflowsView() {
  const { workflows, deleteWorkflow, updateWorkflow } = useWorkflows()
  const { settings } = useSettings()
  
  const [activeWorkflowId, setActiveWorkflowId] = useState(null)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState(null)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId)
  
  const sortedLeads = React.useMemo(() => {
    if (!activeWorkflow) return [];
    let sortableLeads = activeWorkflow.leads.map((lead, index) => ({ ...lead, originalIndex: index }));
    if (sortConfig.key !== null) {
      sortableLeads.sort((a, b) => {
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';
        
        if (sortConfig.key === 'status') {
           aVal = a.error ? 'error' : (a.email ? 'success' : 'none');
           bVal = b.error ? 'error' : (b.email ? 'success' : 'none');
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableLeads;
  }, [activeWorkflow, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleNoteChange = (originalIndex, newNote) => {
    if (!activeWorkflow) return;
    const newLeads = [...activeWorkflow.leads];
    newLeads[originalIndex] = { ...newLeads[originalIndex], notes: newNote };
    updateWorkflow(activeWorkflow.id, { leads: newLeads });
  };

  const SortHeader = ({ label, sortKey }) => (
    <th className="p-3 font-semibold cursor-pointer hover:bg-surface/80 transition-colors" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === sortKey ? (
          <span className="text-xs text-primary font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <span className="text-xs text-textMuted/30">↕</span>
        )}
      </div>
    </th>
  )

  const exportCSV = (filter = 'all') => {
    if (activeWorkflow) {
      let leadsToExport = activeWorkflow.leads;
      if (filter === 'email') leadsToExport = leadsToExport.filter(l => l.email);
      else if (filter === 'phone') leadsToExport = leadsToExport.filter(l => l.phone);
      else if (filter === 'website') leadsToExport = leadsToExport.filter(l => l.website);

      exportToCSV(leadsToExport, `${activeWorkflow.title.replace(/\s+/g, '_')}_leads_${filter}.csv`, settings?.csvHeaders || {})
    }
  }

  const startIndividualScraping = async () => {
    if (!activeWorkflow) return;

    setEnriching(true)
    setError(null)
    updateWorkflow(activeWorkflow.id, { status: 'enriching' })
    
    try {
      const response = await fetch("http://127.0.0.1:8000/process-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ leads: activeWorkflow.leads })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start job. Status: ${response.status}`);
      }
      
      const { job_id } = await response.json();
      
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`http://127.0.0.1:8000/job-status/${job_id}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            
            if (statusData.results && statusData.results.length > 0) {
              updateWorkflow(activeWorkflow.id, { leads: statusData.results });
            }

            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              updateWorkflow(activeWorkflow.id, { leads: statusData.results || activeWorkflow.leads, enriched: true, status: 'completed' });
              setEnriching(false);
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              setError("Scraping job failed: " + statusData.error);
              updateWorkflow(activeWorkflow.id, { status: 'completed' });
              setEnriching(false);
            }
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 3000);

    } catch (err) {
      setError("Scraping request failed: " + err.message)
      updateWorkflow(activeWorkflow.id, { status: 'completed' })
      setEnriching(false)
    }
  }

  if (activeWorkflow) {
    return (
      <div className="flex flex-col h-screen">
        <div className="px-10 pt-10">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          <div className="mb-4 pb-4 border-b border-surface">
            <div className="flex items-center space-x-2">
              <button onClick={() => setActiveWorkflowId(null)} className="p-1 hover:bg-surface rounded text-textMuted hover:text-textMain transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <h2 className="text-2xl font-bold text-textMain truncate pr-2" title={activeWorkflow.title}>{activeWorkflow.title}</h2>
            </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-textMuted bg-surface px-3 py-1.5 rounded-lg border border-secondary/10">
                {activeWorkflow.status === 'scraping' ? 'Scraping in progress...' : `${activeWorkflow.leads.length} leads found`}
              </span>
              {activeWorkflow.status === 'scraping' && (
                <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={startIndividualScraping}
                disabled={enriching || activeWorkflow.enriched || activeWorkflow.status === 'scraping'}
                className={`text-sm py-2 px-4 rounded-lg transition-all flex items-center space-x-2 font-medium ${
                  activeWorkflow.enriched || activeWorkflow.status === 'scraping'
                    ? 'bg-surface text-textMuted border border-secondary/20 cursor-not-allowed'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm'
                }`}
              >
                {enriching ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Processing...</span></>
                ) : activeWorkflow.enriched ? (
                  <><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg><span>Scraped</span></>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span>Start individual scraping</span></>
                )}
              </button>

              <div className="relative">
                <button 
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={activeWorkflow.status === 'scraping'}
                  className={`text-sm py-2 px-4 bg-surface border border-secondary/30 rounded-lg transition-all flex items-center space-x-2 font-medium shadow-sm ${activeWorkflow.status === 'scraping' ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:text-primary'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  <span>Export CSV</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {exportDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-surface border border-secondary/30 rounded-md shadow-lg z-50 py-1 flex flex-col">
                    <button onClick={() => { exportCSV('all'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface/80 text-textMain transition-colors">All Leads</button>
                    <button onClick={() => { exportCSV('email'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface/80 text-textMain transition-colors">Only with Email</button>
                    <button onClick={() => { exportCSV('phone'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface/80 text-textMain transition-colors">Only with Phone</button>
                    <button onClick={() => { exportCSV('website'); setExportDropdownOpen(false) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface/80 text-textMain transition-colors">Only with Website</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
        
        <div className="flex-1 overflow-auto px-10 pb-10">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-surface text-textMuted bg-surface/50">
                <th className="p-3 font-semibold w-10 text-center">#</th>
                <SortHeader label="Company Name" sortKey="name" />
                <SortHeader label="Website" sortKey="website" />
                {(activeWorkflow.enriched || activeWorkflow.status === 'enriching') && (
                  <>
                    <SortHeader label="Phone" sortKey="phone" />
                    <SortHeader label="Email" sortKey="email" />
                    <SortHeader label="Facebook" sortKey="facebook" />
                    <SortHeader label="Instagram" sortKey="instagram" />
                    <SortHeader label="Twitter" sortKey="twitter" />
                    <SortHeader label="Status/Error" sortKey="status" />
                  </>
                )}
                <th className="p-3 font-semibold min-w-[150px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map((lead, i) => (
                <tr key={lead.originalIndex} className="border-b border-surface hover:bg-surface/30 transition-colors">
                  <td className="p-3 text-center text-textMuted max-w-[50px] truncate">{i + 1}</td>
                  <td className="p-3 max-w-[50px] truncate" title={lead.name}>{lead.name || 'Unnamed Business'}</td>
                  <td className="p-3 max-w-[50px] truncate" title={lead.website}>
                    {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.website}</a> : '-'}
                  </td>
                  {(activeWorkflow.enriched || activeWorkflow.status === 'enriching') && (
                    <>
                      <td className="p-3 max-w-[50px] truncate" title={lead.phone}>{lead.phone || '-'}</td>
                      <td className="p-3 max-w-[50px] truncate" title={lead.email}>{lead.email ? <span className="text-green-500">{lead.email}</span> : '-'}</td>
                      <td className="p-3 max-w-[50px] truncate" title={lead.facebook}>{lead.facebook ? <a href={lead.facebook} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.facebook}</a> : '-'}</td>
                      <td className="p-3 max-w-[50px] truncate" title={lead.instagram}>{lead.instagram ? <a href={lead.instagram} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.instagram}</a> : '-'}</td>
                      <td className="p-3 max-w-[50px] truncate" title={lead.twitter}>{lead.twitter ? <a href={lead.twitter} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.twitter}</a> : '-'}</td>
                      <td className="p-3 max-w-[50px] truncate" title={lead.error}>
                        {lead.error ? <span className="text-red-500">{lead.error}</span> : (lead.email ? <span className="text-green-500">Success</span> : <span className="text-textMuted">-</span>)}
                      </td>
                    </>
                  )}
                  <td className="p-2 min-w-[150px]">
                    <textarea 
                      defaultValue={lead.notes || ''}
                      onBlur={(e) => handleNoteChange(lead.originalIndex, e.target.value)}
                      className="w-full bg-surface border border-secondary/20 rounded p-1.5 text-xs text-textMain focus:border-primary focus:outline-none resize-y min-h-[36px]"
                      placeholder="Add note..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="p-10 max-w-3xl mx-auto w-full h-full">
      <h2 className="text-2xl font-bold mb-4">Workflows</h2>
      <div className="p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm">
        <h3 className="font-semibold text-textMain mb-4">Scraping History</h3>
        
        {workflows.length === 0 ? (
          <p className="text-sm text-textMuted text-center py-10">You have no workflows yet. Try scraping Google Maps!</p>
        ) : (
          <div className="space-y-3">
            {workflows.map(wf => (
              <div 
                key={wf.id} 
                onClick={() => setActiveWorkflowId(wf.id)}
                className="p-4 border border-secondary/20 rounded-lg flex items-center justify-between cursor-pointer hover:border-primary/30 hover:bg-surface/80 transition-all group"
              >
                <div>
                  <h4 className="font-semibold text-textMain group-hover:text-primary transition-colors">{wf.title}</h4>
                  <p className="text-xs text-textMuted mt-1">
                    {new Date(wf.timestamp).toLocaleDateString()} at {new Date(wf.timestamp).toLocaleTimeString()} • {wf.leads.length} leads
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {wf.enriched && (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-primary/10 text-primary uppercase">Processed</span>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}
                    className="p-2 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete workflow"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                  <svg className="w-5 h-5 text-secondary group-hover:text-primary transition-colors ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
