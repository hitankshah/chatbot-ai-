import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Status() {
  return (
    <div className="max-w-[900px] mx-auto py-12">
      <h1 className="text-3xl font-black text-slate-900 mb-4">System Status</h1>
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600" />
          <p className="font-bold text-slate-800">All systems operational</p>
        </div>
        <p className="text-sm text-slate-500 mt-2">Realtime status updates will appear here.</p>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-amber-600" />
          <p className="font-bold text-amber-900">No incidents reported</p>
        </div>
      </div>
    </div>
  );
}
