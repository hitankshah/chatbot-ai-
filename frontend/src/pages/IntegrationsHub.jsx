import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  ExternalLink, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Settings2,
  Database,
  Unplug
} from 'lucide-react';
import { chatbotsAPI, integrationsAPI } from '../services/api';

export default function IntegrationsHub() {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [provider, setProvider] = useState('zendesk');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [inboundSecret, setInboundSecret] = useState('');
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    chatbotsAPI.list().then((data) => {
      const items = data.chatbots || [];
      setChatbots(items);
      if (items[0]) setSelectedChatbotId(items[0].id);
    });
  }, []);

  const saveIntegration = async () => {
    setMessage('');
    setIsError(false);
    try {
      await integrationsAPI.updateWebhook(selectedChatbotId, {
        provider,
        webhookUrl,
        webhookSecret,
        isActive: active,
        metadata: { inboundSecret },
      });
      setMessage('Integration saved successfully.');
    } catch (err) {
      setMessage(err.message);
      setIsError(true);
    }
  };

  const testHandoff = async () => {
    setMessage('');
    setIsError(false);
    try {
      const data = await integrationsAPI.testHandoff(selectedChatbotId, 'Manual inbox test');
      setMessage(data.message || 'Test sent');
    } catch (err) {
      setMessage(err.message);
      setIsError(true);
    }
  };

  const providers = [
    { id: 'zendesk', name: 'Zendesk', desc: 'Omnichannel ticket sync', color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'intercom', name: 'Intercom', desc: 'Live chat & conversation handoff', color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'crisp', name: 'Crisp', desc: 'Simple team messaging', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'custom-webhook', name: 'Custom Webhook', desc: 'Enterprise data pipelines', color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Zap className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Integrations Hub</h1>
        </div>
        <p className="text-slate-500 font-medium max-w-2xl">
          Connect your chatbots to the tools your team already uses. Sync conversations, leads, and customer data across your stack automatically.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm"
          >
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings2 size={20} className="text-indigo-600" />
                Connection Settings
              </h3>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[13px] font-black text-slate-700 uppercase tracking-widest block mb-2 px-1">Active Chatbot</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                    value={selectedChatbotId} 
                    onChange={(e) => setSelectedChatbotId(e.target.value)}
                  >
                    {chatbots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-black text-slate-700 uppercase tracking-widest block mb-2 px-1">Service Provider</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                    value={provider} 
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <label className="text-[13px] font-black text-slate-700 uppercase tracking-widest block">Outbound Webhook URL</label>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">Push updates</span>
                </div>
                <input 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-600 placeholder:text-slate-300"
                  placeholder="https://hooks.your-crm.com/v1/..." 
                  value={webhookUrl} 
                  onChange={(e) => setWebhookUrl(e.target.value)} 
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[13px] font-black text-slate-700 uppercase tracking-widest block mb-2 px-1">Webhook Secret</label>
                  <input 
                    type="password"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-600"
                    value={webhookSecret} 
                    onChange={(e) => setWebhookSecret(e.target.value)} 
                  />
                  <p className="text-[11px] text-slate-400 mt-2 px-1 font-medium italic">Shared secret for payload verification.</p>
                </div>
                <div>
                  <label className="text-[13px] font-black text-slate-700 uppercase tracking-widest block mb-2 px-1">Inbound Secret</label>
                  <input 
                    type="password"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-600"
                    value={inboundSecret} 
                    onChange={(e) => setInboundSecret(e.target.value)} 
                  />
                  <p className="text-[11px] text-slate-400 mt-2 px-1 font-medium italic">Required for secure state updates.</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={active} 
                    onChange={(e) => setActive(e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  <span className="ms-3 text-sm font-black text-slate-700">Integration Active</span>
                </label>

                <div className="flex gap-3">
                  <button 
                    onClick={testHandoff}
                    className="flex items-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black transition-all active:scale-[0.98]"
                  >
                    <Unplug size={18} />
                    Test Handoff
                  </button>
                  <button 
                    onClick={saveIntegration}
                    className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
                  >
                    <CheckCircle2 size={18} />
                    Save Changes
                  </button>
                </div>
              </div>

              {message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`flex items-center gap-3 p-4 rounded-2xl font-bold text-sm ${
                    isError ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-green-50 text-green-600 border border-green-100'
                  }`}
                >
                  {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                  {message}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-10 rounded-full -mr-10 -mt-10" />
            <h4 className="text-xl font-black mb-6 flex items-center gap-2">
              <Database size={20} className="text-indigo-400" />
              Supported Tech
            </h4>
            <div className="space-y-4">
              {providers.map((p) => (
                <div key={p.id} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <div className={`w-8 h-8 rounded-lg ${p.bg} ${p.color} flex items-center justify-center font-black text-xs shrink-0`}>
                    {p.name[0]}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">{p.name}</h5>
                    <p className="text-[11px] text-white/40 mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-8">
            <h4 className="text-indigo-900 font-black mb-2">Developer Docs</h4>
            <p className="text-sm text-indigo-700/70 font-medium mb-4">Want to build your own custom connector? Read our documentation on building webhook adapters.</p>
            <button className="flex items-center gap-2 text-indigo-600 font-black hover:gap-3 transition-all">
              API Reference
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

