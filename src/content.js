import {
  scrollToBottom,
  extractName,
  extractRating,
  extractReviews,
  extractPhone,
  extractWebsite,
  extractEmail,
  extractAddressAndCategory,
  extractStatus
} from './helpers.js';

async function scrapeLeads(workflowId) {
  // Find the scrollable feed container in Google Maps
  const feed = document.querySelector('div[role="feed"]');
  
  const leads = [];
  const processedCards = new Set();

  const processNewCards = () => {
    const cards = document.querySelectorAll('.Nv2PK');
    for (const card of cards) {
      if (processedCards.has(card)) continue;
      processedCards.add(card);

      try {
        const { category, address } = extractAddressAndCategory(card);
        let website = extractWebsite(card);

        const newLead = {
          name: extractName(card),
          rating: extractRating(card),
          reviews: extractReviews(card),
          category: category,
          address: address,
          phone: extractPhone(card),
          website: website,
          email: extractEmail(card),
          status: extractStatus(card)
        };

        leads.push(newLead);
        
        // Send real-time update
        if (workflowId) {
          chrome.runtime.sendMessage({ action: 'leadScraped', lead: newLead, workflowId });
        }
      } catch (err) {
        console.error('Error parsing a card:', err);
      }
    }
  };

  // Process initial cards
  processNewCards();

  // Use helper method to scroll (12 retries * 5000ms = 60 seconds)
  await scrollToBottom(feed, 12, 5000, processNewCards); 


  // Get the search title
  let title = 'Untitled Scrape';
  const searchBox = document.querySelector('#searchboxinput');
  if (searchBox && searchBox.value) {
    title = searchBox.value;
  }

  return { title, leads };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTitle') {
    let title = 'Untitled Scrape';
    const searchBox = document.querySelector('#searchboxinput');
    if (searchBox && searchBox.value) {
      title = searchBox.value;
    } else if (document.title) {
      title = document.title.replace(' - Google Maps', '').trim() || 'Untitled Scrape';
    }
    sendResponse({ success: true, title });
    return true;
  }
  
  if (request.action === 'scrape') {
    scrapeLeads(request.workflowId).then(data => {
      sendResponse({ success: true, data });
    }).catch(err => {
      console.error("Scraping error:", err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }
});

// Sidebar Injection Logic
function injectSidebar() {
  if (document.getElementById('lead-gen-pro-sidebar-wrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'lead-gen-pro-sidebar-wrapper';
  wrapper.style.cssText = `
    position: fixed;
    top: 0;
    right: -50vw;
    width: 50vw;
    height: 100vh;
    background: #fff;
    box-shadow: -2px 0 10px rgba(0,0,0,0.2);
    z-index: 2147483647;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    border-left: 1px solid #e5e7eb;
  `;

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  `;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'lead-gen-pro-toggle-btn';
  toggleBtn.innerHTML = `
    <svg style="width: 14px; height: 14px; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
    Lead Gen Pro
  `;
  toggleBtn.style.cssText = `
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    background: #4f46e5;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 600;
    font-size: 13px;
    box-shadow: -4px 0 12px rgba(79, 70, 229, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
  `;

  let isOpen = false;

  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      wrapper.style.right = '0px';
      toggleBtn.style.right = '50vw';
      toggleBtn.innerHTML = `
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      `;
      toggleBtn.style.padding = '8px';
      toggleBtn.title = 'Close Lead Gen Pro';
    } else {
      wrapper.style.right = '-50vw';
      toggleBtn.style.right = '0px';
      toggleBtn.innerHTML = `
        <svg style="width: 14px; height: 14px; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        Lead Gen Pro
      `;
      toggleBtn.style.padding = '8px 12px';
      toggleBtn.title = 'Open Lead Gen Pro';
    }
  });

  toggleBtn.addEventListener('mouseenter', () => {
    if (!isOpen) toggleBtn.style.transform = 'translateY(-50%) translateX(-4px)';
  });
  toggleBtn.addEventListener('mouseleave', () => {
    if (!isOpen) toggleBtn.style.transform = 'translateY(-50%)';
  });

  wrapper.appendChild(iframe);
  document.body.appendChild(wrapper);
  document.body.appendChild(toggleBtn);
}

// Ensure injection happens correctly whether script runs at document_start or document_idle
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  injectSidebar();
} else {
  document.addEventListener('DOMContentLoaded', injectSidebar);
}
