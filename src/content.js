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
  
  // Use helper method to scroll
  await scrollToBottom(feed, 10, 5000); // Increased retries and timeout (5000ms)

  const leads = [];
  const cards = document.querySelectorAll('.Nv2PK');

  for (const card of cards) {
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
