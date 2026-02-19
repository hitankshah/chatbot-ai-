import React, { useEffect, useState } from 'react';
import { RefreshCcw, Server, Clock, CheckCircle2 } from 'lucide-react';
import { autoSyncAPI, chatbotsAPI } from '../services/api';

export default function AutoSyncOps() {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [sources, setSources] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeSourceId, setActiveSourceId] = useState('');

  useEffect(() => {
    chatbotsAPI.list().then((data) => {
      const items = data.chatbots || [];
      setChatbots(items);
      if (items[0]) setSelectedChatbotId(items[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedChatbotId) return;
    autoSyncAPI.sources(selectedChatbotId).then((data) => setSources(data.sources || []));
  }, [selectedChatbotId]);

  useEffect(() => {
    autoSyncAPI.jobs().then((data) => setJobs(data.jobs || []));
  }, []);

  useEffect(() => {
    if (!activeSourceId) return;
    autoSyncAPI.sourceLogs(activeSourceId).then((data) => setLogs(data.logs || []));
  }, [activeSourceId]);

  const updateSource = async (sourceId, payload) => {
    await autoSyncAPI.updateSource(sourceId, payload);
    const data = await autoSyncAPI.sources(selectedChatbotId);
    setSources(data.sources || []);
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <Server className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Auto-Sync Ops</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Manage retraining schedules, retry failures, and view sync logs.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Training sources</h3>
              <select
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                value={selectedChatbotId}
                onChange={(e) => setSelectedChatbotId(e.target.value)}
              >
                {chatbots.map((bot) => (
                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {sources.map((source) => (
                <div key={source.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{source.source_label || source.source_url}</p>
                      <p className="text-xs text-slate-400">{source.source_type}</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={source.is_active}
                        onChange={(e) => updateSource(source.id, { isActive: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs w-32"
                      value={source.sync_interval_hours || ''}
                      onChange={(e) => updateSource(source.id, { syncIntervalHours: Number(e.target.value) })}
                    />
                    <span className="text-xs text-slate-400">hours</span>
                    <button
                      onClick={() => setActiveSourceId(source.id)}
                      className="ml-auto text-xs font-black text-indigo-600"
                    >
                      View logs
                    </button>
                  </div>
                </div>
              ))}
              {sources.length === 0 && (
                <p className="text-sm text-slate-400">No auto-sync sources registered yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4">Source logs</h3>
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{log.status}</p>
                    <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-xs text-slate-500">Chunks: {log.chunk_count || 0}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-sm text-slate-400">Select a source to view logs.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-slate-500" />
              <h4 className="font-black text-slate-900">Queue status</h4>
            </div>
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between text-xs text-slate-600">
                  <span>{job.status}</span>
                  <span>{new Date(job.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
              {jobs.length === 0 && (
                <p className="text-xs text-slate-400">No auto-sync jobs yet.</p>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-indigo-600" />
              <div>
                <p className="text-sm font-black text-indigo-900">Auto-sync ready</p>
                <p className="text-xs text-indigo-700/70 font-medium mt-1">
                  Jobs are queued via Supabase scheduled function.
                </p>
              </div>
            </div>
            <button
              onClick={() => autoSyncAPI.jobs().then((data) => setJobs(data.jobs || []))}
              className="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2"
            >
              <RefreshCcw size={14} />
              Refresh jobs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
