import React, { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { auditAPI } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (nextPage = 1) => {
    const data = await auditAPI.list(nextPage, 50);
    setLogs(data.logs || []);
    setPage(data.pagination?.page || nextPage);
    setTotal(data.pagination?.total || 0);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
          <FileText className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Audit Logs</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Security-grade event trail across your workspace.</p>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900">Recent activity</h3>
          <a
            href={auditAPI.exportUrl()}
            className="inline-flex items-center gap-2 text-sm font-black text-slate-700"
          >
            <Download size={16} />
            Export CSV
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400">
                <th className="py-3">Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-4 font-bold text-slate-800">{log.action}</td>
                  <td className="text-slate-500">{log.target_type || '-'}</td>
                  <td className="text-slate-500">
                    {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : '-'}
                  </td>
                  <td className="text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">No audit logs yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 50 && (
          <div className="mt-6 flex items-center gap-3">
            <button
              className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-black"
              disabled={page <= 1}
              onClick={() => fetchLogs(page - 1)}
            >
              Prev
            </button>
            <button
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black"
              disabled={page * 50 >= total}
              onClick={() => fetchLogs(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
