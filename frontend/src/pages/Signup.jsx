// frontend/src/pages/Signup.jsx
// Registration page

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import LanguageSelector from '../components/LanguageSelector';
import { authAPI } from '../services/api';

export default function Signup() {
  const { t } = useI18n();
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError(t('password_too_short'));
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.signup(form.email, form.password, form.fullName);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-blue-100 relative overflow-hidden">
      {/* Visual background details */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-blue-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-indigo-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse delay-700" />

      <div className="absolute top-6 right-6 z-10">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-[900px] z-10 grid lg:grid-cols-2 bg-white rounded-[3rem] border shadow-2xl shadow-slate-200/50 overflow-hidden">
        {/* Left Side: Information */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600 opacity-10" />
          
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter">SupportMate</span>
            </Link>

            <h2 className="text-4xl font-black leading-tight tracking-tight mb-8">
              Join the future of <span className="text-blue-400">customer support</span> orchestration.
            </h2>

            <div className="space-y-6">
              {[
                { title: "No-code Training", desc: "Build bots from URLs in seconds.", icon: <Globe size={18} /> },
                { title: "Privacy First", desc: "Your data stays in your Supabase instance.", icon: <ShieldCheck size={18} /> },
                { title: "Enterprise Ready", desc: "Built with RAG and Claude Sonnet.", icon: <Sparkles size={18} /> }
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  key={i} 
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                    <div className="text-blue-400">{item.icon}</div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">{item.title}</h4>
                    <p className="text-white/50 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 p-6 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Platform status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold">V1.0 Production Stable</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-10 lg:p-12">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{t('sign_up')}</h1>
            <p className="text-slate-500 font-medium whitespace-nowrap">Start your 14-day free trial today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            <div>
              <label className="flex items-center gap-2 text-[13px] font-black text-slate-700 uppercase tracking-widest mb-2 px-1">
                <User size={14} className="text-blue-500" />
                {t('full_name')}
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-slate-50 border-slate-200 rounded-[1.2rem] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-300"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[13px] font-black text-slate-700 uppercase tracking-widest mb-2 px-1">
                <Mail size={14} className="text-indigo-500" />
                {t('email')}
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-slate-50 border-slate-200 rounded-[1.2rem] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-300"
                placeholder="name@company.com"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[13px] font-black text-slate-700 uppercase tracking-widest mb-2 px-1">
                <Lock size={14} className="text-rose-500" />
                {t('password')}
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-slate-50 border-slate-200 rounded-[1.2rem] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-300"
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-[1.2rem] font-black hover:bg-slate-800 disabled:opacity-50 transition active:scale-[0.98] shadow-xl shadow-slate-900/10 mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm font-bold text-slate-400 mt-8">
            {t('already_have_account')}{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 transition-colors ml-1">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

