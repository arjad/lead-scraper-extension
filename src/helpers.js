export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrollToBottom(feed, retriesCount = 12, delayMs = 5000, onProgress = null) {
  if (!feed) return;
  let lastRecordCount = 0;
  let retries = 0;
  
  while (retries < retriesCount) {
    feed.scrollTo(0, feed.scrollHeight);
    await delay(delayMs);
    
    // Check if new records were loaded by counting the actual result cards
    const currentRecordCount = document.querySelectorAll('.Nv2PK').length;
    
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

export function exportToCSV(leads, filename = 'google_maps_leads.csv', selectedHeadersMap = null) {
  if (!leads || leads.length === 0) return;

  // Default all to true if no map provided
  const allHeaders = ['Name', 'Rating', 'Reviews', 'Category', 'Address', 'Phone', 'Website', 'Email', 'Status'];
  const headers = selectedHeadersMap 
    ? allHeaders.filter(h => selectedHeadersMap[h])
    : allHeaders;

  if (headers.length === 0) return;

  const csvContent = [
    headers.join(','),
    ...leads.map(lead => {
      const row = [];
      if (headers.includes('Name')) row.push(`"${lead.name || ''}"`);
      if (headers.includes('Rating')) row.push(`"${lead.rating || ''}"`);
      if (headers.includes('Reviews')) row.push(`"${lead.reviews || ''}"`);
      if (headers.includes('Category')) row.push(`"${lead.category || ''}"`);
      if (headers.includes('Address')) row.push(`"${lead.address || ''}"`);
      if (headers.includes('Phone')) row.push(`"${lead.phone || ''}"`);
      if (headers.includes('Website')) row.push(`"${lead.website || ''}"`);
      if (headers.includes('Email')) row.push(`"${lead.email || ''}"`);
      if (headers.includes('Status')) row.push(`"${lead.status || ''}"`);
      return row.join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(leads, filename = 'google_maps_leads.xls', selectedHeadersMap = null) {
  if (!leads || leads.length === 0) return;

  const allHeaders = ['Name', 'Rating', 'Reviews', 'Category', 'Address', 'Phone', 'Website', 'Email', 'Status'];
  const headers = selectedHeadersMap 
    ? allHeaders.filter(h => selectedHeadersMap[h])
    : allHeaders;

  if (headers.length === 0) return;

  let table = '<table><thead><tr>';
  headers.forEach(h => {
    table += `<th>${h}</th>`;
  });
  table += '</tr></thead><tbody>';

  leads.forEach(lead => {
    table += '<tr>';
    if (headers.includes('Name')) table += `<td>${lead.name || ''}</td>`;
    if (headers.includes('Rating')) table += `<td>${lead.rating || ''}</td>`;
    if (headers.includes('Reviews')) table += `<td>${lead.reviews || ''}</td>`;
    if (headers.includes('Category')) table += `<td>${lead.category || ''}</td>`;
    if (headers.includes('Address')) table += `<td>${lead.address || ''}</td>`;
    if (headers.includes('Phone')) table += `<td>${lead.phone || ''}</td>`;
    if (headers.includes('Website')) table += `<td>${lead.website || ''}</td>`;
    if (headers.includes('Email')) table += `<td>${lead.email || ''}</td>`;
    if (headers.includes('Status')) table += `<td>${lead.status || ''}</td>`;
    table += '</tr>';
  });
  table += '</tbody></table>';

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Leads</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>${table}</body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
