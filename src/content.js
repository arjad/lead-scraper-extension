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

async function scrapeMapsLeads(workflowId) {
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

async function scrapePlacesLeads(workflowId) {
  const leads = [];
  const processedCards = new Set();
  
  const processNewCards = (docContext) => {
    const cards = docContext.querySelectorAll('.VkpGBb');
    for (const card of cards) {
      if (processedCards.has(card)) continue;
      processedCards.add(card);

      try {
        const nameEl = card.querySelector('.dbg0pd span');
        const name = nameEl ? nameEl.textContent.trim() : '';
        
        const ratingSpan = card.querySelector('.yi40Hd, .Y0A0hc');
        const rating = ratingSpan ? (ratingSpan.querySelector('.yi40Hd') ? ratingSpan.querySelector('.yi40Hd').textContent.trim() : ratingSpan.textContent.trim().split(' ')[0]) : '';
        
        const reviewsSpan = card.querySelector('.RDApEe');
        const reviews = reviewsSpan ? reviewsSpan.textContent.replace(/[()]/g, '').trim() : '';

        let category = '';
        let address = '';
        let phone = '';
        let status = '';

        const detailsWrapper = card.querySelector('.rllt__details');
        if (detailsWrapper) {
           const infoDivs = Array.from(detailsWrapper.children).slice(1);
           infoDivs.forEach((div, index) => {
               const text = div.textContent;
               if (index === 0 && text.includes('·')) {
                   category = text.split('·')[1]?.trim() || '';
               } else if (index === 1 && text.includes('·')) {
                   const parts = text.split('·');
                   address = parts[0]?.trim() || '';
                   phone = parts[1]?.trim() || '';
               } else if (text.toLowerCase().includes('open') || text.toLowerCase().includes('close')) {
                   status = text.trim();
               }
           });
        }
        
        let website = '';
        const websiteBtn = card.querySelector('a.yYlJEf.Q7PwXb[href]');
        if (websiteBtn && !websiteBtn.href.includes('/maps/dir/')) {
           website = websiteBtn.href;
        } else {
           const links = Array.from(card.querySelectorAll('a[href]'));
           for (const link of links) {
               if (link.textContent.includes('Website')) {
                   website = link.href;
                   break;
               }
           }
        }
        
        const newLead = {
          name, rating, reviews, category, address, phone, website, status
        };

        leads.push(newLead);
        
        if (workflowId) {
          chrome.runtime.sendMessage({ action: 'leadScraped', lead: newLead, workflowId });
        }
      } catch (err) {
        console.error('Error parsing Places card:', err);
      }
    }
  };

  // Process initial cards on the current page
  processNewCards(document);

  // Pagination via fetch to avoid page reloads
  let nextBtn = document.querySelector('#pnnext');
  let retries = 0;

  while (nextBtn && retries < 12) {
    try {
      const nextUrl = nextBtn.href;
      if (!nextUrl) break;
      
      const response = await fetch(nextUrl);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      const oldCount = leads.length;
      processNewCards(doc);
      
      if (leads.length === oldCount) {
        retries++;
      } else {
        retries = 0;
      }
      
      // Find the next button in the newly fetched document
      nextBtn = doc.querySelector('#pnnext');
      
      // Delay to avoid hitting Google too fast
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error('Error fetching next page:', err);
      break;
    }
  }

  // Fallback for infinite scroll if no pnnext was ever found
  if (!document.querySelector('#pnnext')) {
    let scrollRetries = 0;
    while (scrollRetries < 12) {
      const placesScrollable = document.querySelector('.rl_ist0') || window;
      const oldScroll = placesScrollable === window ? window.scrollY : placesScrollable.scrollTop;
      
      if (placesScrollable === window) {
        window.scrollTo(0, document.body.scrollHeight);
      } else {
        placesScrollable.scrollTo(0, placesScrollable.scrollHeight);
      }
      
      await new Promise(r => setTimeout(r, 4000));
      const oldCount = leads.length;
      processNewCards(document);
      
      const newScroll = placesScrollable === window ? window.scrollY : placesScrollable.scrollTop;
      if (oldScroll === newScroll && leads.length === oldCount) {
        scrollRetries++;
      } else {
        scrollRetries = 0;
      }
    }
  }

  let title = 'Places Scrape';
  const searchBox = document.querySelector('input[name="q"]');
  if (searchBox && searchBox.value) {
    title = searchBox.value;
  }

  return { title, leads };
}

async function scrapeLeads(workflowId) {
  if (window.location.href.includes('google.com/search')) {
    return scrapePlacesLeads(workflowId);
  }
  return scrapeMapsLeads(workflowId);
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

  const menuWrapper = document.createElement('div');
  menuWrapper.id = 'lead-gen-pro-menu-wrapper';
  menuWrapper.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 0;
    z-index: 2147483647;
    display: flex;
    align-items: flex-end;
    font-family: system-ui, -apple-system, sans-serif;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'lead-gen-pro-toggle-btn';
  toggleBtn.innerHTML = `
    <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
  `;
  toggleBtn.style.cssText = `
    background: #4f46e5;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    box-shadow: -4px 0 12px rgba(79, 70, 229, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
  `;
  toggleBtn.addEventListener('mouseenter', () => toggleBtn.style.opacity = '0.9');
  toggleBtn.addEventListener('mouseleave', () => toggleBtn.style.opacity = '1');

  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-right: 8px;
    position: relative;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `&times;`;
  closeBtn.style.cssText = `
    position: absolute;
    top: -24px;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
    color: #9ca3af;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    z-index: 10;
  `;
  closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#374151');
  closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = '#9ca3af');
  closeBtn.addEventListener('click', () => {
    menuWrapper.style.display = 'none';
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['leadScrapperSettings'], (res) => {
        const settings = res.leadScrapperSettings || {};
        settings.showAutofillButtons = false;
        chrome.storage.local.set({ leadScrapperSettings: settings });
      });
    }
  });

  buttonsContainer.appendChild(closeBtn);

  const buttonStyle = `
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: all 0.2s;
    white-space: nowrap;
  `;

  const scraperBtn = document.createElement('button');
  scraperBtn.innerText = 'Lead Scraper';
  scraperBtn.style.cssText = buttonStyle;
  scraperBtn.addEventListener('mouseenter', () => scraperBtn.style.background = '#f9fafb');
  scraperBtn.addEventListener('mouseleave', () => scraperBtn.style.background = '#ffffff');

  const autofillJobBtn = document.createElement('button');
  autofillJobBtn.innerText = 'Autofill Job';
  autofillJobBtn.style.cssText = buttonStyle;
  autofillJobBtn.addEventListener('mouseenter', () => autofillJobBtn.style.background = '#f9fafb');
  autofillJobBtn.addEventListener('mouseleave', () => autofillJobBtn.style.background = '#ffffff');

  const autofillLeadBtn = document.createElement('button');
  autofillLeadBtn.innerText = 'Autofill Lead Gen';
  autofillLeadBtn.style.cssText = buttonStyle;
  autofillLeadBtn.addEventListener('mouseenter', () => autofillLeadBtn.style.background = '#f9fafb');
  autofillLeadBtn.addEventListener('mouseleave', () => autofillLeadBtn.style.background = '#ffffff');

  buttonsContainer.appendChild(scraperBtn);
  buttonsContainer.appendChild(autofillJobBtn);
  buttonsContainer.appendChild(autofillLeadBtn);

  menuWrapper.appendChild(buttonsContainer);
  menuWrapper.appendChild(toggleBtn);

  let isSidebarOpen = false;

  toggleBtn.addEventListener('click', () => {
    if (isSidebarOpen) {
      // If sidebar is open, clicking the toggle button simply closes the sidebar.
      isSidebarOpen = false;
      wrapper.style.right = '-50vw';
      menuWrapper.style.right = '0px';
      toggleBtn.innerHTML = '<svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>';
    } else {
      // If sidebar is closed, open it
      isSidebarOpen = true;
      wrapper.style.right = '0px';
      menuWrapper.style.right = '50vw';
      toggleBtn.innerHTML = '<svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>';
    }
  });

  const autofillJobApplication = () => {
    const data = {
      name: "Arjad",
      email: "arjad@gmail.com", // Adding an example email as it is commonly required
      phone: "+923024466257",
      city: "Lahore",
      country: "Pakistan",
      state: "Punjab",
      portfolio: "https://arjad-portfolio.netlify.app/",
      linkedin: "https://www.linkedin.com/in/arjad/",
      github: "https://github.com/arjad"
    };

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      
      let labelText = '';
      if (input.labels && input.labels.length > 0) {
        labelText = input.labels[0].innerText;
      } else if (id) {
        const explicitLabel = document.querySelector(`label[for="\${id}"]`);
        if (explicitLabel) labelText = explicitLabel.innerText;
      }
      labelText = labelText.toLowerCase();
      
      const setVal = (val) => {
        if (!val) return;
        input.value = val;
        // React / modern frameworks require triggering native value setter
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        
        if (input.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(input, val);
        } else if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, val);
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      // Helper to check if a keyword exists in the label, name, id, or placeholder
      const isMatch = (keyword) => labelText.includes(keyword) || name.includes(keyword) || id.includes(keyword) || placeholder.includes(keyword);

      if (isMatch('linkedin')) setVal(data.linkedin);
      else if (isMatch('github')) setVal(data.github);
      else if (isMatch('portfolio') || isMatch('website')) setVal(data.portfolio);
      else if (isMatch('phone') || isMatch('mobile')) setVal(data.phone);
      else if (isMatch('email')) setVal(data.email);
      else if (isMatch('city')) setVal(data.city);
      else if (isMatch('state') || isMatch('province')) setVal(data.state);
      else if (isMatch('country')) setVal(data.country);
      else if (isMatch('name') && !isMatch('company')) setVal(data.name);
    });
  };

  autofillJobBtn.addEventListener('click', () => {
    autofillJobApplication();
  });

  autofillLeadBtn.addEventListener('click', () => {
    // Lead generation specific autofill could be placed here if needed.
  });

  scraperBtn.addEventListener('click', () => {
    isSidebarOpen = true;
    wrapper.style.right = '0px';
    menuWrapper.style.right = '50vw';
    toggleBtn.innerHTML = '<svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>';
  });

  wrapper.appendChild(iframe);
  document.body.appendChild(wrapper);
  document.body.appendChild(menuWrapper);
}

// Ensure injection happens correctly whether script runs at document_start or document_idle
const initExtension = () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['leadScrapperSettings'], (result) => {
      const settings = result.leadScrapperSettings || {};
      if (settings.showAutofillButtons !== false) {
        injectSidebar();
      }
    });
  } else {
    injectSidebar();
  }
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initExtension();
} else {
  document.addEventListener('DOMContentLoaded', initExtension);
}
