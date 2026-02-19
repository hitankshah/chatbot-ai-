import React from 'react';

export default function Privacy() {
  return (
    <div className="max-w-[900px] mx-auto py-12">
      <h1 className="text-3xl font-black text-slate-900 mb-4">Privacy Policy</h1>
      <p className="text-slate-600 mb-6">Summarizes how SupportMate handles personal data. Replace with final legal text.</p>
      <div className="space-y-4 text-sm text-slate-600">
        <p>We collect account information, usage metrics, and chatbot interactions.</p>
        <p>We do not sell personal data and use encryption in transit.</p>
        <p>Data retention follows your subscription settings.</p>
      </div>
    </div>
  );
}
