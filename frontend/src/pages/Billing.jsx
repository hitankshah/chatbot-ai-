import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Receipt, ShieldCheck, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function Billing() {
  const invoices = [
    { id: 'INV-1092', date: 'Feb 01, 2026', amount: '$149.00', status: 'Paid' },
    { id: 'INV-1081', date: 'Jan 01, 2026', amount: '$149.00', status: 'Paid' },
    { id: 'INV-1070', date: 'Dec 01, 2025', amount: '$149.00', status: 'Paid' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
          <CreditCard className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing & Invoices</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Manage plan, payment method, and invoice history.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-900">Current Plan</h2>
            <span className="text-[11px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">
              Active
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan</p>
              <div className="flex items-end gap-3 mt-3">
                <h3 className="text-2xl font-black text-slate-900">Growth</h3>
                <span className="text-slate-500 font-medium">$149/mo</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold">
                <CheckCircle2 size={16} />
                Includes lead capture + integrations
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Usage</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                  <span>Messages</span>
                  <span>31,200 / 50,000</span>
                </div>
                <div className="mt-3 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full w-[62%] bg-emerald-500 rounded-full" />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">Resets on Mar 01, 2026</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              Upgrade Plan
            </button>
            <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 transition-all">
              Change Billing Cycle
            </button>
          </div>
        </motion.div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <CreditCard className="text-slate-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Method</p>
                <p className="text-sm font-bold text-slate-700">Visa ending 4242</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-4">Next charge: Feb 28, 2026</p>
            <button className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all">
              Update Payment Method
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-emerald-600" size={20} />
              <div>
                <p className="text-emerald-900 font-black">Billing security</p>
                <p className="text-xs text-emerald-700/70 font-medium mt-1">
                  PCI-compliant processing with automatic tax calculation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="text-slate-600" />
            <h3 className="text-lg font-black text-slate-900">Invoice History</h3>
          </div>
          <button className="text-sm font-black text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1">
            Download all
            <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400">
                <th className="py-3">Invoice</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-4 font-bold text-slate-900">{invoice.id}</td>
                  <td className="text-slate-500 font-medium">{invoice.date}</td>
                  <td className="text-slate-700 font-bold">{invoice.amount}</td>
                  <td>
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="text-xs font-black text-slate-600 hover:text-slate-900">Download PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
