// frontend/src/components/Layout.jsx
// Main layout with sidebar navigation

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Globe, 
  ShieldCheck, 
  CreditCard, 
  BarChart3, 
  Mail, 
  Users, 
  Cable,
  KeyRound,
  FileText,
  RefreshCcw,
  BookOpen,
  ChevronDown,
  Menu,
  X,
  Bot,
  User
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import LanguageSelector from './LanguageSelector';
import { authAPI } from '../services/api';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    authAPI.getProfile()
      .then(data => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login');
      });
  }, [navigate]);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { path: '/app/dashboard', label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
    { path: '/app/create', label: t('create_chatbot'), icon: <PlusCircle size={18} /> },
    { path: '/app/integrations', label: 'Integrations', icon: <Cable size={18} /> },
    { path: '/app/inbox', label: 'Agent Inbox', icon: <Mail size={18} /> },
    { path: '/app/leads', label: 'Leads CRM', icon: <Users size={18} /> },
    { path: '/app/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { path: '/app/auto-sync', label: 'Auto-Sync Ops', icon: <RefreshCcw size={18} /> },
    { path: '/app/api-keys', label: 'API Keys', icon: <KeyRound size={18} /> },
    { path: '/app/audit', label: 'Audit Logs', icon: <FileText size={18} /> },
    { path: '/app/onboarding', label: 'Onboarding', icon: <Bot size={18} /> },
    { path: '/app/pricing', label: 'Pricing', icon: <CreditCard size={18} /> },
    { path: '/app/billing', label: 'Billing', icon: <CreditCard size={18} /> },
    { path: '/app/workspace', label: 'Workspace', icon: <Settings size={18} /> },
    { path: '/app/security', label: 'Trust & Security', icon: <ShieldCheck size={18} /> },
    { path: '/app/distribution', label: 'Distribution', icon: <Globe size={18} /> },
    { path: '/docs', label: 'Docs', icon: <BookOpen size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 256 : 80 }}
        className="bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0"
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold text-white tracking-tight truncate"
            >
              SupportMate
            </motion.h1>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`}>
                  {item.icon}
                </span>
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1.5 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User context */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {isSidebarOpen && <LanguageSelector />}
          
          <div className={`p-2 rounded-lg bg-slate-800/50 flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate px-0">{user?.fullName || user?.email}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.plan || 'Free'}</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors ${!isSidebarOpen && 'justify-center'}`}
            title={t('logout')}
          >
            <LogOut size={16} />
            {isSidebarOpen && <span>{t('logout')}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trial</span>
              <span className="text-xs font-bold text-slate-700">12 days left</span>
              <Link
                to="/app/pricing"
                className="text-xs font-black text-white bg-slate-900 px-3 py-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                Upgrade
              </Link>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Status</span>
              <span className="text-xs text-green-600 font-medium">Production Ready</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-bold text-slate-800 leading-none">
                    {user?.fullName || user?.email || 'Account'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                    {user?.plan || 'Free'} plan
                  </span>
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden z-50">
                  <Link
                    to="/app/workspace"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <User size={16} className="text-slate-400" />
                    Workspace settings
                  </Link>
                  <Link
                    to="/app/billing"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <CreditCard size={16} className="text-slate-400" />
                    Billing
                  </Link>
                  <Link
                    to="/app/security"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ShieldCheck size={16} className="text-slate-400" />
                    Security
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50/50">
          <motion.div 
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-6 md:p-8 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

