// frontend/src/pages/CreateChatbot.jsx
// Create a new chatbot form

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Zap,
  Bot, 
  Globe, 
  MessageSquare, 
  Palette, 
  FileText,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { chatbotsAPI } from '../services/api';

export default function CreateChatbot() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: '',
    websiteUrl: '',
    description: '',
    welcomeMessage: t('welcome_message_default'),
    primaryColor: '#3b82f6',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError(t('chatbot_name_required'));
      return;
    }

    setLoading(true);

    try {
      const data = await chatbotsAPI.create(form);
      navigate(`/app/chatbots/${data.chatbot.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate('/app/dashboard')}
          className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200 shadow-sm transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('create_chatbot')}</h1>
          <p className="text-slate-500 mt-1">{t('setup_bot_minutes')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border shadow-sm p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Bot size={16} className="text-blue-500" />
                    {t('chatbot_name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="e.g., Customer Support Hub"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Globe size={16} className="text-indigo-500" />
                    {t('website_url')}
                  </label>
                  <input
                    type="url"
                    name="websiteUrl"
                    value={form.websiteUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="https://docs.yourcompany.com"
                  />
                  <p className="text-[11px] text-slate-500 mt-2 font-medium px-1">
                    {t('scrape_content_info')}
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <FileText size={16} className="text-emerald-500" />
                    {t('description')}
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none placeholder:text-slate-400"
                    placeholder={t('description_placeholder')}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <MessageSquare size={16} className="text-purple-500" />
                    {t('welcome_message')}
                  </label>
                  <input
                    type="text"
                    name="welcomeMessage"
                    value={form.welcomeMessage}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder={t('welcome_message_default')}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Palette size={16} className="text-rose-500" />
                    {t('brand_color')}
                  </label>
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border">
                    <div className="relative w-12 h-10 shrink-0 overflow-hidden rounded-xl border border-white shadow-sm">
                      <input
                        type="color"
                        name="primaryColor"
                        value={form.primaryColor}
                        onChange={handleChange}
                        className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1 bg-transparent text-sm font-mono font-bold text-slate-700 outline-none"
                      placeholder="#007bff"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-2xl font-black hover:bg-blue-700 disabled:opacity-50 transition active:scale-[0.98] shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <Sparkles size={18} />
                      {t('create_button')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/dashboard')}
                  className="flex-1 px-6 py-3.5 border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition active:scale-[0.98]"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Live Preview Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Widget Preview</h3>
            
            <motion.div 
              layout
              className="bg-white rounded-[2rem] border shadow-xl shadow-slate-200/50 overflow-hidden"
            >
              <div 
                className="h-24 p-6 flex flex-col justify-center gap-1 transition-colors duration-500"
                style={{ backgroundColor: form.primaryColor }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-black text-lg truncate leading-tight">{form.name || t('your_chatbot')}</h4>
                  <div className="flex gap-2 text-white/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Always Active</span>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50/50 h-[300px] flex flex-col">
                <div className="flex-1 space-y-4">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full shadow-sm bg-white border border-slate-200 flex flex-center items-center justify-center shrink-0">
                      <Bot size={16} style={{ color: form.primaryColor }} />
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border shadow-sm max-w-[85%]">
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {form.welcomeMessage || t('welcome_message_default')}
                      </p>
                      <span className="text-[10px] text-slate-400 font-bold mt-2 block uppercase tracking-tighter">Just now</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-12 bg-white border rounded-2xl shadow-inner px-4 flex items-center">
                    <span className="text-sm text-slate-300">Message...</span>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    <Sparkles size={18} />
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <Zap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed font-semibold">
                Tip: Use a primary color that matches your brand website for better customer trust.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

