import React from 'react';

export default function SecurityTrust() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Trust & Security</h1>
      <p className="text-sm text-gray-500">Security controls and compliance posture for enterprise buyers.</p>
      <div className="bg-white border rounded-xl p-6">
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
          <li>Data hosted in your Supabase project.</li>
          <li>Role-based access policies in database (RLS).</li>
          <li>Signed webhooks and inbound secret verification.</li>
          <li>Audit-friendly records for leads, handoffs, and summaries.</li>
          <li>DPA/privacy workflow placeholder for legal team review.</li>
        </ul>
      </div>
    </div>
  );
}
