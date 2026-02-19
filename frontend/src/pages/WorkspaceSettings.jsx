import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Settings, UserPlus, Shield, KeyRound, CheckCircle2 } from 'lucide-react';

export default function WorkspaceSettings() {
  const [inviteEmail, setInviteEmail] = useState('');

  const team = [
    { name: 'Neha Patel', role: 'Owner', email: 'neha@supportmate.ai' },
    { name: 'Ravi Singh', role: 'Admin', email: 'ravi@supportmate.ai' },
    { name: 'Mira Chen', role: 'Agent', email: 'mira@supportmate.ai' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
          <Settings className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Workspace Settings</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Manage your organization profile, team access, and security policies.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm"
        >
          <h2 className="text-lg font-black text-slate-900 mb-6">Organization</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Workspace Name</label>
              <input
                className="mt-2 w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium"
                defaultValue="SupportMate Labs"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Primary Domain</label>
              <input
                className="mt-2 w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium"
                defaultValue="supportmate.ai"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Support Email</label>
            <input
              className="mt-2 w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium"
              defaultValue="support@supportmate.ai"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              Save Changes
            </button>
            <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 transition-all">
              Cancel
            </button>
          </div>
        </motion.div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-slate-600" />
              <h3 className="font-black text-slate-900">Team Access</h3>
            </div>
            <div className="space-y-3">
              {team.map((member) => (
                <div key={member.email} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="text-slate-600" />
              <h3 className="font-black text-slate-900">Invite Member</h3>
            </div>
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium"
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className="mt-4 w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all">
              Send Invite
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-10">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-slate-600" />
            <h3 className="font-black text-slate-900">Security Policies</h3>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-slate-700">Require 2FA for all members</p>
              <p className="text-xs text-slate-400">Enforce multi-factor authentication at login.</p>
            </div>
            <input type="checkbox" className="h-5 w-5 rounded border-slate-300" defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl mt-3">
            <div>
              <p className="text-sm font-bold text-slate-700">Single Sign-On</p>
              <p className="text-xs text-slate-400">Available on Enterprise plans.</p>
            </div>
            <button className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
              Request Access
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="text-slate-600" />
            <h3 className="font-black text-slate-900">API Keys</h3>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-700">Primary Key</p>
            <p className="text-xs text-slate-400 mt-1">sk_live_************************</p>
          </div>
          <button className="mt-4 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all">
            Rotate Keys
          </button>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <CheckCircle2 size={14} />
            Keys stored securely and masked.
          </div>
        </div>
      </div>
    </div>
  );
}
