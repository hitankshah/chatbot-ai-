import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { workspacesAPI } from '../services/api';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        await workspacesAPI.acceptInvite(token);
        setStatus('success');
        setMessage('Invite accepted. Redirecting to dashboard...');
        setTimeout(() => navigate('/app/dashboard'), 1500);
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Failed to accept invite.');
      }
    };

    acceptInvite();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-10 shadow-xl max-w-md w-full text-center">
        {status === 'success' && (
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
        )}
        {status === 'error' && (
          <XCircle className="w-10 h-10 text-rose-600 mx-auto mb-4" />
        )}
        <h1 className="text-xl font-black text-slate-900 mb-2">Workspace Invite</h1>
        <p className="text-sm text-slate-500">{message || 'Processing invite...'}</p>
      </div>
    </div>
  );
}
