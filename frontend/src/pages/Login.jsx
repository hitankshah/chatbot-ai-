// frontend/src/pages/Login.jsx
// Login page with form validation

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  ChevronLeft
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import LanguageSelector from '../components/LanguageSelector';
import { authAPI } from '../services/api';

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSuccess('');
    
    try {
      // Mocking API call for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResetSuccess('If an account exists for ' + resetEmail + ', you will receive a reset link shortly.');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-blue-100">
        <div className="absolute top-6 right-6">
          <LanguageSelector />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-white rounded-[2.5rem] border shadow-2xl shadow-slate-200/50 p-10">
            <button 
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
                setResetSuccess('');
              }}
              className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-8"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold tracking-tight">Back to login</span>
            </button>

            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Forgot password?</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              No worries, it happens to the best of us. Enter your email and we'll send you reset instructions.
            </p>

            {resetSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl text-sm font-bold flex items-start gap-3 mb-6"
              >
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                </div>
                {resetSuccess}
              </motion.div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 text-[13px] font-black text-slate-700 uppercase tracking-widest mb-2 px-1">
                    <Mail size={14} className="text-blue-500" />
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-slate-200 rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-300"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-[1.25rem] font-black hover:bg-slate-800 disabled:opacity-50 transition active:scale-[0.98] shadow-xl shadow-slate-900/10"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <span>Send Instructions</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-blue-100 relative overflow-hidden">
      {/* Visual background details */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse delay-700" />

      <div className="absolute top-6 right-6 z-10">
        <LanguageSelector />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[460px] z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-xl shadow-slate-900/10">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">SupportMate</span>
          </Link>
        </div>

        <div className="bg-white rounded-[2.5rem] border shadow-2xl shadow-slate-200/50 p-10">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">Welcome back</h1>
            <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                <Mail size={14} className="text-blue-500" />
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-slate-200 rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-300"
                placeholder="name@company.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <label className="flex items-center gap-2 text-[13px] font-black text-slate-700 uppercase tracking-widest">
                  <Lock size={14} className="text-indigo-500" />
                  {t('password')}
                </label>
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-slate-200 rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-300"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-[1.25rem] font-black hover:bg-slate-800 disabled:opacity-50 transition active:scale-[0.98] shadow-xl shadow-slate-900/10"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm font-bold text-slate-400 mt-10">
            {t('dont_have_account')}{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-800 transition-colors ml-1">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

