import React from 'react';
import { BookOpen, Terminal, ShieldCheck } from 'lucide-react';

export default function Docs() {
  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
          <BookOpen className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Developer Docs</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">API reference and integration guide.</p>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm mb-6">
        <h3 className="text-lg font-black text-slate-900 mb-3">Quick start</h3>
        <pre className="text-xs bg-slate-900 text-white rounded-xl p-4 overflow-x-auto">
{`curl -X POST https://api.supportmate.ai/api/chat \
  -H "Content-Type: application/json" \
  -d '{"chatbotId":"YOUR_ID","message":"Hello"}'`}
        </pre>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="text-slate-600" />
            <h4 className="font-black text-slate-900">API endpoints</h4>
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>POST /api/chat</li>
            <li>GET /api/chat/history</li>
            <li>POST /api/scrape</li>
            <li>POST /api/integrations/:chatbotId/webhook</li>
            <li>GET /api/analytics/summary</li>
          </ul>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="text-slate-600" />
            <h4 className="font-black text-slate-900">Security</h4>
          </div>
          <p className="text-sm text-slate-600">
            Use workspace API keys for server-to-server calls. All requests are rate limited and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
