import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Inbox, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw, 
  User, 
  ChevronRight,
  MoreVertical,
  ArrowUpRight,
  ShieldAlert,
  Search
} from 'lucide-react';
import { chatbotsAPI, integrationsAPI } from '../services/api';

export default function AgentInbox() {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    chatbotsAPI.list().then((data) => {
      const items = data.chatbots || [];
      setChatbots(items);
      if (items[0]) setSelectedChatbotId(items[0].id);
    }).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedChatbotId) return;
    loadHandoffs();
  }, [selectedChatbotId]);

  const loadHandoffs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await integrationsAPI.listHandoffs(selectedChatbotId);
      setHandoffs(data.handoffs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (handoffId, status) => {
    try {
      await integrationsAPI.updateHandoff(selectedChatbotId, handoffId, { status });
      await loadHandoffs();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredHandoffs = handoffs.filter(h => filter === 'all' || h.status === filter);

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-100">
              <Inbox className="text-white w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agent Inbox</h1>
          </div>
          <p className="text-slate-500 font-medium whitespace-nowrap">Manage human escalation requests and live resolution workflow.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedChatbotId}
              onChange={(e) => setSelectedChatbotId(e.target.value)}
              className="pl-5 pr-10 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all appearance-none min-w-[200px]"
            >
              {chatbots.map((bot) => (
                <option key={bot.id} value={bot.id}>{bot.name}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
          </div>
          <button 
            onClick={loadHandoffs}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Filters</h3>
            <div className="space-y-2">
              {[
                { id: 'all', label: 'All Requests', icon: <Inbox size={16} />, count: handoffs.length },
                { id: 'pending', label: 'Pending', icon: <Clock size={16} />, count: handoffs.filter(h => h.status === 'pending').length, color: 'text-amber-600' },
                { id: 'acknowledged', label: 'Active', icon: <ArrowUpRight size={16} />, count: handoffs.filter(h => h.status === 'acknowledged').length, color: 'text-blue-600' },
                { id: 'resolved', label: 'Resolved', icon: <CheckCircle2 size={16} />, count: handoffs.filter(h => h.status === 'resolved').length, color: 'text-emerald-600' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                    filter === item.id 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                    : 'text-slate-600 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={filter === item.id ? 'text-white' : item.color}>{item.icon}</span>
                    <span className="text-sm font-black">{item.label}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    filter === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 relative overflow-hidden">
             <ShieldAlert className="absolute -right-4 -bottom-4 w-24 h-24 text-rose-500 opacity-5" />
             <h4 className="text-rose-900 font-black text-sm mb-2">Priority Alerts</h4>
             <p className="text-xs text-rose-700/70 font-medium">Auto-escalation is active. Pending requests over 5 minutes will trigger a Slack notification.</p>
          </div>
        </div>

        {/* Main Inbox List */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h2 className="font-black text-slate-900 flex items-center gap-2">
                Queue: <span className="text-slate-400 capitalize">{filter}</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Seach requests..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 outline-none w-48"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-50">
              <AnimatePresence mode='popLayout'>
                {loading ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-20 text-center"
                  >
                    <RefreshCcw className="mx-auto h-8 w-8 text-rose-500 animate-spin mb-4" />
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Polling server...</p>
                  </motion.div>
                ) : filteredHandoffs.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-24 text-center"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                      <Inbox className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-black">All caught up! No requests here.</p>
                  </motion.div>
                ) : (
                  filteredHandoffs.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-6 hover:bg-slate-50/50 transition-all flex items-start gap-6 group"
                    >
                      <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 border border-slate-200 group-hover:bg-white group-hover:shadow-md transition-all">
                        {item.metadata?.user_name ? item.metadata.user_name[0] : <User size={20} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-black text-slate-900 truncate pr-4">
                            {item.reason || 'Escalation requested by user'}
                          </h4>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                             item.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                             item.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' :
                             'bg-blue-100 text-blue-600'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                           <div className="flex items-center gap-1">
                             <Clock size={12} />
                             {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                           <div className="flex items-center gap-1">
                             <MessageCircle size={12} />
                             Chatbot ID: {item.chatbot_id.slice(0,8)}...
                           </div>
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                          {item.status === 'pending' && (
                            <button 
                              onClick={() => updateStatus(item.id, 'acknowledged')}
                              className="px-5 py-2.5 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                            >
                              Claim Ticket
                            </button>
                          )}
                          {item.status !== 'resolved' && (
                            <button 
                              onClick={() => updateStatus(item.id, 'resolved')}
                              className="px-5 py-2.5 bg-emerald-50 text-emerald-600 text-xs font-black rounded-xl hover:bg-emerald-100 transition-all active:scale-[0.98]"
                            >
                              Quick Resolve
                            </button>
                          )}
                          <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

