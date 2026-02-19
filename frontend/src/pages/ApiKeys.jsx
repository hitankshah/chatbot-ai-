import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { apiKeysAPI } from '../services/api';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    const data = await apiKeysAPI.list();
    setKeys(data.keys || []);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const data = await apiKeysAPI.create(name.trim());
      setNewKey(data.key);
      setName('');
      await fetchKeys();
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (keyId) => {
    await apiKeysAPI.revoke(keyId);
    fetchKeys();
  };

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
          <KeyRound className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">API Keys</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Create and manage API keys for programmatic access.</p>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm mb-8">
        <div className="flex items-center gap-3">
          <input
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium"
            placeholder="Key name (e.g. Production)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Create
          </button>
        </div>

        {newKey && (
          <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">New key</p>
                <p className="text-sm font-bold text-emerald-900 break-all mt-2">{newKey}</p>
              </div>
              <button
                onClick={copyKey}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
            <div className="mt-2 text-xs text-emerald-700 font-medium">
              Copy this key now. You won't see it again.
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">Active keys</h3>
        <div className="space-y-3">
          {keys.length === 0 && (
            <p className="text-sm text-slate-500">No keys created yet.</p>
          )}
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-slate-800">{key.name}</p>
                <p className="text-xs text-slate-400">{key.key_prefix}••••••</p>
              </div>
              <div className="flex items-center gap-3">
                {!key.revoked_at ? (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-2 py-1 rounded-full">
                    Revoked
                  </span>
                )}
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Revoke key"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle2 size={14} className="text-emerald-500" />
        Keys are hashed at rest and scoped to your workspace.
      </div>
    </div>
  );
}
