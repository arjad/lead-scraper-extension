import React from 'react';

export default function AboutView() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">About Us</h2>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-9 p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm">
          <div className="w-16 h-16 mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="Lead Gen Pro Logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-sm text-textMuted mb-4">Version 1.0.0</p>
          
          <p className="text-textMain leading-relaxed mb-6">
            Lead Gen Pro is the ultimate tool for automating your outreach. It helps professionals gather verified contact details with a simple, three-step process:
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
              <div>
                <h4 className="font-semibold text-textMain">Extract & Export</h4>
                <p className="text-sm text-textMuted">Instantly extract business leads from Google Maps and export them as a structured CSV file.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</div>
              <div>
                <h4 className="font-semibold text-textMain">Deep Web Scraping</h4>
                <p className="text-sm text-textMuted">Individually scrape each business website to find accurate contact information, such as emails and phone numbers.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
              <div>
                <h4 className="font-semibold text-textMain">Automated Outreach</h4>
                <p className="text-sm text-textMuted">Seamlessly send emails directly to your new leads (support for automated messages coming in the future).</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-textMuted pt-4 border-t border-secondary/20">
            © {new Date().getFullYear()} Lead Gen Pro. All rights reserved.
          </p>
        </div>

        <div className="md:col-span-3 p-6 bg-surface rounded-xl border border-secondary/20 shadow-sm flex flex-col items-center text-center">
          <h3 className="text-sm font-bold text-textMain uppercase tracking-wider mb-4 border-b border-secondary/20 w-full pb-2">Contributors</h3>
          <ul className="space-y-4 w-full">
            <li className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg mb-2">
                AG
              </div>
              <span className="text-sm font-medium text-textMain">Arjad Gohar</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
