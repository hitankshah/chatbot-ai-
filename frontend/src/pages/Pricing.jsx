import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: 'Starter',
      priceMonthly: 49,
      priceAnnual: 39,
      description: 'For early-stage teams launching their first bot.',
      items: ['1 chatbot', '5k messages/mo', 'Email support', 'Basic analytics'],
      cta: 'Start Trial',
    },
    {
      name: 'Growth',
      priceMonthly: 149,
      priceAnnual: 119,
      description: 'Scale support operations with integrations + lead capture.',
      items: ['5 chatbots', '50k messages/mo', 'CRM integrations', 'Human handoff'],
      cta: 'Upgrade to Growth',
      highlight: true,
    },
    {
      name: 'Enterprise',
      priceMonthly: null,
      priceAnnual: null,
      description: 'Security, SSO, SLAs, and custom deployment options.',
      items: ['Unlimited chatbots', 'SSO + audit logs', 'Dedicated success', 'Priority support'],
      cta: 'Talk to Sales',
    },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <Sparkles className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pricing & Plans</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Simple plans that scale with support volume.</p>

      <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Billing</span>
          <div className="bg-slate-100 rounded-full p-1 flex items-center">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                !isAnnual ? 'bg-white shadow text-slate-900' : 'text-slate-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                isAnnual ? 'bg-white shadow text-slate-900' : 'text-slate-400'
              }`}
            >
              Annual
            </button>
          </div>
          <span className="text-xs font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">
            Save 20%
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <ShieldCheck size={16} className="text-emerald-500" />
          PCI-compliant billing and invoices
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[2rem] p-8 border shadow-sm relative overflow-hidden ${
              plan.highlight
                ? 'bg-slate-900 text-white border-slate-800 shadow-xl'
                : 'bg-white border-slate-200'
            }`}
          >
            {plan.highlight && (
              <div className="absolute top-5 right-5 text-[10px] font-black uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full">
                Most popular
              </div>
            )}
            <h3 className="text-xl font-black mb-2">{plan.name}</h3>
            <p className={`text-sm font-medium ${plan.highlight ? 'text-slate-300' : 'text-slate-500'}`}>
              {plan.description}
            </p>
            <div className="mt-6">
              {plan.priceMonthly ? (
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black">
                    ${isAnnual ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className={`text-sm font-bold ${plan.highlight ? 'text-slate-300' : 'text-slate-400'}`}>
                    /mo
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-black">Custom</span>
              )}
            </div>

            <ul className={`mt-6 space-y-3 text-sm ${plan.highlight ? 'text-slate-200' : 'text-slate-600'}`}>
              {plan.items.map((item) => (
                <li key={item} className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className={plan.highlight ? 'text-emerald-400' : 'text-emerald-500'} />
                  {item}
                </li>
              ))}
            </ul>

            <button
              className={`mt-8 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black transition-all ${
                plan.highlight
                  ? 'bg-white text-slate-900 hover:bg-slate-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {plan.cta}
              <ArrowRight size={16} />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 bg-white border border-slate-200 rounded-[2rem] p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Zap className="text-indigo-600" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900">Need a custom rollout?</h4>
            <p className="text-sm text-slate-500 font-medium mt-1">
              We help enterprise teams deploy SupportMate across multiple brands with SOC2 reporting.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 text-indigo-600 font-black">
              Book an architecture call
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
