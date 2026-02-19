import React from 'react';

export default function Distribution() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Distribution Channels</h1>
      <p className="text-sm text-gray-500">Ship support AI where your customers already are.</p>
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold mb-2">Current channels</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Website widget embed script</li>
          <li>Public API for custom client integrations</li>
        </ul>
        <h3 className="font-semibold mt-4 mb-2">Planned launch channels</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>WordPress plugin</li>
          <li>One-click snippets for Shopify/Webflow</li>
          <li>Agency multi-tenant partner console</li>
        </ul>
      </div>
    </div>
  );
}
