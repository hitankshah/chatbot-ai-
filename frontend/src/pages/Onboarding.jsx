import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Bot, Globe, Cable, ShieldCheck, Sparkles } from 'lucide-react';

export default function Onboarding() {
  const steps = [
    { title: 'Create your first chatbot', desc: 'Set brand voice, tone, and profile details.', icon: <Bot size={18} /> },
    { title: 'Train from your knowledge base', desc: 'Connect URLs, docs, and product guides.', icon: <Globe size={18} /> },
    { title: 'Connect escalation tools', desc: 'Enable Zendesk, Intercom, or custom webhooks.', icon: <Cable size={18} /> },
    { title: 'Go live with the widget', desc: 'Install script and run quality checks.', icon: <Sparkles size={18} /> },
    { title: 'Secure your workspace', desc: 'Invite team and enable 2FA policies.', icon: <ShieldCheck size={18} /> },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
          <CheckCircle2 className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Onboarding Wizard</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Launch checklist for new teams to go live fast.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {steps.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                {step.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">{step.desc}</p>
              </div>
              <button className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all">
                Start
              </button>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/60">Progress</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Setup completion</span>
                <span>2 / 5</span>
              </div>
              <div className="mt-3 h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[40%] bg-emerald-400 rounded-full" />
              </div>
            </div>
            <button className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-900 rounded-xl font-black">
              Resume setup
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6">
            <h4 className="text-blue-900 font-black mb-2">Need help?</h4>
            <p className="text-sm text-blue-700/70 font-medium">
              Book a 15-minute onboarding call and we will set up your first chatbot.
            </p>
            <button className="mt-4 text-blue-600 font-black text-sm inline-flex items-center gap-2">
              Schedule onboarding
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
