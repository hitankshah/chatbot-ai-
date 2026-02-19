import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Download, 
  RefreshCcw, 
  Mail, 
  Phone, 
  User, 
  Calendar,
  MoreVertical,
  Filter,
  Search,
  ChevronRight,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { chatbotsAPI, integrationsAPI } from '../services/api';

export default function Leads() {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    chatbotsAPI.list().then((data) => {
      const items = data.chatbots || [];
      setChatbots(items);
      if (items[0]) setSelectedChatbotId(items[0].id);
    }).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedChatbotId) return;
    loadLeads();
  }, [selectedChatbotId]);

  const loadLeads = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await integrationsAPI.listLeads(selectedChatbotId);
      setLeads(data.leads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!selectedChatbotId) return;
    window.open(integrationsAPI.exportLeadsUrl(selectedChatbotId), '_blank');
  };

  const filteredLeads = leads.filter(lead => 
    (lead.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-[1240px] mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Users className="text-white w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lead Management</h1>
          </div>
          <p className="text-slate-500 font-medium">Capture, export and nurture potential customers from your chatbots.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadLeads}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
            title="Refresh"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={exportCsv}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Leads', val: leads.length, icon: <Users className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'New This Week', val: leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length, icon: <TrendingUp className="text-emerald-600" />, bg: 'bg-emerald-50' },
          { label: 'Conversion Rate', val: '12.4%', icon: <RefreshCcw className="text-amber-600" />, bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-[2rem] flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter/Search Bar */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-4 mb-8 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search leads by name or email..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <select 
               value={selectedChatbotId} 
               onChange={(e) => setSelectedChatbotId(e.target.value)} 
               className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none"
             >
               {chatbots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
             </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 font-bold">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-5 px-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Customer info</th>
                <th className="py-5 px-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Contact details</th>
                <th className="py-5 px-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-5 px-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Captured on</th>
                <th className="py-5 px-8 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest pr-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode='popLayout'>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <RefreshCcw className="mx-auto h-8 w-8 text-indigo-500 animate-spin mb-3" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing lead database...</p>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-black">No matching leads found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      key={lead.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                            {lead.name ? lead.name[0] : <User size={16} />}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{lead.name || 'Anonymous'}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">ID: #{lead.id.slice(0,6)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                              <Mail size={14} className="text-slate-300" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                              <Phone size={14} className="text-slate-300" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          lead.status === 'new' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <div className={`w-1 h-1 rounded-full ${lead.status === 'new' ? 'bg-indigo-600' : 'bg-slate-500'}`} />
                          {lead.status || 'captured'}
                        </span>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-bold">{new Date(lead.created_at).toLocaleDateString()}</span>
                          <span className="text-[11px] text-slate-400 font-medium mt-0.5">{new Date(lead.created_at).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right pr-10">
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

