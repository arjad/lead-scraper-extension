export function exportToCSV(leads, filename = 'google_maps_leads.csv', selectedHeadersMap = null) {
  if (!leads || leads.length === 0) return;

  // Expand leads with multiple emails
  const expandedLeads = [];
  leads.forEach(lead => {
    if (lead.email && lead.email.includes(',')) {
      const emails = lead.email.split(',').map(e => e.trim()).filter(Boolean);
      emails.forEach((email) => {
        expandedLeads.push({ ...lead, email });
      });
    } else {
      expandedLeads.push(lead);
    }
  });

  // Default all to true if no map provided
  const allHeaders = ['Name', 'Rating', 'Reviews', 'Category', 'Address', 'Phone', 'Website', 'Email', 'Insta DM', 'Instagram Profile', 'Facebook', 'Twitter', 'LinkedIn', 'Status'];
  const headers = selectedHeadersMap 
    ? allHeaders.filter(h => selectedHeadersMap[h] !== false) // Assuming it might not have the new keys, default to keep
    : allHeaders;

  if (headers.length === 0) return;

  const csvContent = [
    headers.join(','),
    ...expandedLeads.map(lead => {
      const row = [];
      if (headers.includes('Name')) row.push(`"${lead.name || ''}"`);
      if (headers.includes('Rating')) row.push(`"${lead.rating || ''}"`);
      if (headers.includes('Reviews')) row.push(`"${lead.reviews || ''}"`);
      if (headers.includes('Category')) row.push(`"${lead.category || ''}"`);
      if (headers.includes('Address')) row.push(`"${lead.address || ''}"`);
      if (headers.includes('Phone')) row.push(`"${lead.phone || ''}"`);
      if (headers.includes('Website')) row.push(`"${lead.website || ''}"`);
      if (headers.includes('Email')) row.push(`"${lead.email || ''}"`);
      
      // Calculate Insta DM link if Instagram exists
      const igMessageLink = lead.instagram ? (() => {
        try {
          const urlObj = new URL(lead.instagram.startsWith('http') ? lead.instagram : `https://${lead.instagram}`);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          const username = pathParts[0];
          return username ? `https://ig.me/m/${username}` : lead.instagram;
        } catch(e) { return lead.instagram; }
      })() : '';

      if (headers.includes('Insta DM')) row.push(`"${igMessageLink}"`);
      if (headers.includes('Instagram Profile')) row.push(`"${lead.instagram || ''}"`);
      if (headers.includes('Facebook')) row.push(`"${lead.facebook || ''}"`);
      if (headers.includes('Twitter')) row.push(`"${lead.twitter || ''}"`);
      if (headers.includes('LinkedIn')) row.push(`"${lead.linkedin || ''}"`);
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

  // Expand leads with multiple emails
  const expandedLeads = [];
  leads.forEach(lead => {
    if (lead.email && lead.email.includes(',')) {
      const emails = lead.email.split(',').map(e => e.trim()).filter(Boolean);
      emails.forEach((email) => {
        expandedLeads.push({ ...lead, email });
      });
    } else {
      expandedLeads.push(lead);
    }
  });

  const allHeaders = ['Name', 'Rating', 'Reviews', 'Category', 'Address', 'Phone', 'Website', 'Email', 'Insta DM', 'Instagram Profile', 'Facebook', 'Twitter', 'LinkedIn', 'Status'];
  const headers = selectedHeadersMap 
    ? allHeaders.filter(h => selectedHeadersMap[h] !== false)
    : allHeaders;

  if (headers.length === 0) return;

  let table = '<table><thead><tr>';
  headers.forEach(h => {
    table += `<th>${h}</th>`;
  });
  table += '</tr></thead><tbody>';

  expandedLeads.forEach(lead => {
    table += '<tr>';
    if (headers.includes('Name')) table += `<td>${lead.name || ''}</td>`;
    if (headers.includes('Rating')) table += `<td>${lead.rating || ''}</td>`;
    if (headers.includes('Reviews')) table += `<td>${lead.reviews || ''}</td>`;
    if (headers.includes('Category')) table += `<td>${lead.category || ''}</td>`;
    if (headers.includes('Address')) table += `<td>${lead.address || ''}</td>`;
    if (headers.includes('Phone')) table += `<td>${lead.phone || ''}</td>`;
    if (headers.includes('Website')) table += `<td>${lead.website || ''}</td>`;
    if (headers.includes('Email')) table += `<td>${lead.email || ''}</td>`;

    const igMessageLink = lead.instagram ? (() => {
      try {
        const urlObj = new URL(lead.instagram.startsWith('http') ? lead.instagram : `https://${lead.instagram}`);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const username = pathParts[0];
        return username ? `https://ig.me/m/${username}` : lead.instagram;
      } catch(e) { return lead.instagram; }
    })() : '';

    if (headers.includes('Insta DM')) table += `<td>${igMessageLink}</td>`;
    if (headers.includes('Instagram Profile')) table += `<td>${lead.instagram || ''}</td>`;
    if (headers.includes('Facebook')) table += `<td>${lead.facebook || ''}</td>`;
    if (headers.includes('Twitter')) table += `<td>${lead.twitter || ''}</td>`;
    if (headers.includes('LinkedIn')) table += `<td>${lead.linkedin || ''}</td>`;
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
