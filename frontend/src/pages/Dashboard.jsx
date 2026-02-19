// frontend/src/pages/Dashboard.jsx
// Main dashboard - lists all chatbots

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  MessageSquare, 
  Calendar,
  Globe,
  Settings,
  Trash2,
  ExternalLink,
  Bot
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { chatbotsAPI } from '../services/api';

export default function Dashboard() {
  const { t } = useI18n();
  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChatbots();
  }, []);

  const fetchChatbots = async () => {
    try {
      const data = await chatbotsAPI.list();
      setChatbots(data.chatbots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${t('delete')} "${name}"? ${t('delete')} cannot be undone.`)) return;

    try {
      await chatbotsAPI.delete(id);
      setChatbots(chatbots.filter(b => b.id !== id));
    } catch (err) {
      alert(`Failed to ${t('delete')}: ` + err.message);
    }
  };

  const statusColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    paused: 'bg-amber-50 text-amber-700 border-amber-100',
    training: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  const filteredBots = chatbots.filter(bot => 
    bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bot.website_url && bot.website_url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading chatbots...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('my_chatbots')}</h1>
          <p className="text-slate-500 mt-1">{t('manage_your_ai')}</p>
        </div>
        <Link
          to="/app/create"
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} />
          <span>{t('create_chatbot')}</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <Trash2 size={16} />
          {error}
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search chatbots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none"
          />
        </div>
        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
        <div className="flex items-center gap-4 px-2 whitespace-nowrap">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total: <span className="text-slate-900">{chatbots.length}</span>
          </div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active: <span className="text-emerald-600">{chatbots.filter(b => b.status === 'active').length}</span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredBots.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-300 border border-slate-100">
            <Bot size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{searchQuery ? 'No results found' : t('no_chatbots')}</h3>
          <p className="text-slate-500 mt-2 mb-8 max-w-xs">{searchQuery ? `We couldn't find any bots matching "${searchQuery}"` : t('create_first_chatbot')}</p>
          {!searchQuery && (
            <Link
              to="/app/create"
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
            >
              {t('create_chatbot')}
            </Link>
          )}
        </motion.div>
      )}

      {/* Chatbot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBots.map((bot, index) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-inner overflow-hidden"
                style={{ backgroundColor: bot.primary_color || '#3b82f6' }}
              >
                {bot.name[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border ${statusColors[bot.status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                  {t(bot.status) || bot.status}
                </span>
                <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors mb-1 truncate">{bot.name}</h3>
              {bot.website_url && (
                <a 
                  href={bot.website_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 transition-colors truncate max-w-full mb-4"
                >
                  <Globe size={12} />
                  {bot.website_url.replace(/^https?:\/\//, '')}
                </a>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <MessageSquare size={12} />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Chats</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{bot.totalConversations || 0}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Calendar size={12} />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Created</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{new Date(bot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to={`/app/chatbots/${bot.id}`}
                className="flex-[2] flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition active:scale-95"
              >
                <Settings size={14} />
                {t('manage')}
              </Link>
              <button
                onClick={() => handleDelete(bot.id, bot.name)}
                className="flex-1 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 px-4 py-2.5 rounded-xl transition active:scale-95"
                title={t('delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

