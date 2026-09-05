export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrollToBottom(feed, retriesCount = 12, delayMs = 5000, onProgress = null) {
  let lastRecordCount = 0;
  let retries = 0;
  
  while (retries < retriesCount) {
    if (feed === window || !feed) {
      window.scrollTo(0, document.body.scrollHeight);
    } else {
      feed.scrollTo(0, feed.scrollHeight);
    }
    await delay(delayMs);

    
    // Check if new records were loaded by counting the actual result cards
    const currentRecordCount = document.querySelectorAll('.Nv2PK, .VkpGBb').length;
    
    // Check for "end of list" message to stop early
    if (feed.innerText && feed.innerText.includes("You've reached the end of the list")) {
      console.log("Found 'end of list' message, stopping early.");
      break;
    }
    
    if (currentRecordCount > lastRecordCount) {
      lastRecordCount = currentRecordCount;
      retries = 0; // Reset retries since we found new records
      if (onProgress) onProgress(); // Notify about new records
    } else {
      retries++;
    }
  }
}

export function extractName(card) {
  const el = card.querySelector('.qBF1Pd');
  return el ? el.textContent.trim() : '';
}

export function extractRating(card) {
  const el = card.querySelector('.MW4etd');
  return el ? el.textContent.trim() : '';
}

export function extractReviews(card) {
  const el = card.querySelector('.UY7F9');
  return el ? el.textContent.replace(/[()]/g, '').trim() : '';
}

export function extractPhone(card) {
  const el = card.querySelector('.UsdlK');
  return el ? el.textContent.trim() : '';
}

export function extractWebsite(card) {
  const el = card.querySelector('a[data-value="Website"]');
  return el ? el.href : '';
}

export function extractEmail(card) {
  // Emails are rarely visible directly on Google Maps search results.
  // This is a placeholder for future enhancement.
  return '';
}

export function extractAddressAndCategory(card) {
  const infoTextElements = Array.from(card.querySelectorAll('.W4Efsd .W4Efsd > span'));
  const textContents = infoTextElements.map(el => el.textContent.trim()).filter(t => t);
  
  let category = '';
  let address = '';
  
  textContents.forEach(text => {
    if (text.includes('·')) {
      const parts = text.split('·').map(p => p.trim());
      if (!category && !address && parts.length >= 2) {
        category = parts[0];
        address = parts.slice(1).join(' ');
      }
    }
  });
  
  return { category, address };
}

export function extractStatus(card) {
  const infoTextElements = Array.from(card.querySelectorAll('.W4Efsd .W4Efsd > span'));
  let status = '';
  
  infoTextElements.forEach(el => {
    const text = el.textContent.trim();
    if (text.includes('·')) {
      if (text.toLowerCase().includes('open') || text.toLowerCase().includes('close')) {
        status = text;
      }
    } else if (text.toLowerCase().includes('open') || text.toLowerCase().includes('close')) {
      status = text;
    }
  });
  
  if (!status) {
    const openCloseEl = card.querySelector('.UXOu9, .o0Svhf');
    if (openCloseEl) {
      status = openCloseEl.textContent.trim();
    }
  }
  return status;
}

