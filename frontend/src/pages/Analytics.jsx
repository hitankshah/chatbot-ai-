import React, { useEffect, useState } from 'react';
import { BarChart3, MessageCircle, Users, AlertTriangle, Star } from 'lucide-react';
import { analyticsAPI, chatbotsAPI } from '../services/api';

export default function Analytics() {
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const limit = 10;

  useEffect(() => {
    chatbotsAPI.list().then((data) => {
      const items = data.chatbots || [];
      setChatbots(items);
      if (items[0]) setSelectedChatbotId(items[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedChatbotId) return;
    setSummaryLoading(true);
    setSummaryError('');
    analyticsAPI.summary(selectedChatbotId)
      .then((data) => {
        setSummary(data.summary);
        setTimeline(data.timeline || []);
      })
      .catch((err) => setSummaryError(err.message || 'Failed to load summary.'))
      .finally(() => setSummaryLoading(false));
  }, [selectedChatbotId, page]);

  useEffect(() => {
    if (!selectedChatbotId) return;
    setConversationsLoading(true);
    setConversationsError('');
    analyticsAPI.conversations(selectedChatbotId, page, limit)
      .then((data) => {
        setConversations(data.conversations || []);
        setPage(data.pagination?.page || page);
        setTotal(data.pagination?.total || 0);
      })
      .catch((err) => setConversationsError(err.message || 'Failed to load conversations.'))
      .finally(() => setConversationsLoading(false));
  }, [selectedChatbotId]);

  const openConversation = async (conversationId) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const detail = await analyticsAPI.conversationDetail(conversationId);
      setSelectedConversation(detail);
      setFeedbackNotes(detail.feedback?.notes || '');
      setRating(detail.feedback?.rating || 0);
    } catch (err) {
      setDetailError(err.message || 'Failed to load conversation.');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!selectedConversation?.conversation?.id) return;
    const optimisticFeedback = { rating, notes: feedbackNotes };
    setSelectedConversation((prev) => prev ? { ...prev, feedback: optimisticFeedback } : prev);
    setToast({ type: 'success', message: 'Feedback saved.' });
    try {
      await analyticsAPI.feedback(selectedConversation.conversation.id, rating, feedbackNotes);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save feedback.' });
    } finally {
      setTimeout(() => setToast(null), 2500);
    }
  };

  useEffect(() => {
    setPage(1);
    setSelectedConversation(null);
  }, [selectedChatbotId]);

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
          <BarChart3 className="text-white w-5 h-5" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics Dashboard</h1>
      </div>
      <p className="text-slate-500 font-medium mb-8">Performance, conversation quality, and conversion analytics.</p>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-4 mb-6 max-w-md">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Chatbot</label>
        <select
          className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2"
          value={selectedChatbotId}
          onChange={(e) => setSelectedChatbotId(e.target.value)}
        >
          {chatbots.map((bot) => (
            <option key={bot.id} value={bot.id}>{bot.name}</option>
          ))}
        </select>
      </div>

      {summaryLoading ? (
        <p className="text-sm text-slate-500">Loading summary...</p>
      ) : summaryError ? (
        <p className="text-sm text-rose-500">{summaryError}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Conversations</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{summary.total_conversations}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Messages</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{summary.total_messages}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Leads</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{summary.total_leads}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Escalations</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{summary.total_escalations}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6">
            <h3 className="text-lg font-black text-slate-900 mb-4">Conversation review</h3>
            <div className="space-y-3">
              {conversationsLoading && (
                <p className="text-sm text-slate-400">Loading conversations...</p>
              )}
              {conversationsError && (
                <p className="text-sm text-rose-500">{conversationsError}</p>
              )}
              {!conversationsLoading && !conversationsError && conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => openConversation(conversation.id)}
                  className="w-full text-left p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Session {conversation.session_id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-400">{new Date(conversation.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-xs font-black bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                      {conversation.message_count || 0} msgs
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {conversation.last_message_preview || 'No messages yet.'}
                  </p>
                </button>
              ))}
              {!conversationsLoading && !conversationsError && conversations.length === 0 && (
                <p className="text-sm text-slate-400">No conversations yet.</p>
              )}
            </div>

            {total > limit && (
              <div className="mt-6 flex items-center gap-3">
                <button
                  className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-black"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </button>
                <button
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black"
                  disabled={page * limit >= total}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </button>
                <span className="text-xs text-slate-400">{page} / {Math.max(1, Math.ceil(total / limit))}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={18} className="text-slate-500" />
              <h4 className="font-black text-slate-900">Conversation detail</h4>
            </div>
            {!selectedConversation ? (
              <p className="text-sm text-slate-400">Select a conversation to inspect.</p>
            ) : detailLoading ? (
              <p className="text-sm text-slate-400">Loading conversation...</p>
            ) : detailError ? (
              <p className="text-sm text-rose-500">{detailError}</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {selectedConversation.messages.map((msg) => (
                    <div key={msg.id} className="text-xs text-slate-600">
                      <span className="font-bold text-slate-800">{msg.sender}</span>: {msg.content}
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Feedback</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => setRating(value)}
                        className={`p-1 rounded ${rating >= value ? 'text-amber-500' : 'text-slate-300'}`}
                      >
                        <Star size={16} fill={rating >= value ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="Add feedback notes..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                  />
                  <button
                    onClick={submitFeedback}
                    className="mt-3 w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black"
                  >
                    Save feedback
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-white/70" />
              <h4 className="font-black">Top user questions</h4>
            </div>
            {!summary?.top_user_questions?.length ? (
              <p className="text-xs text-white/50">No questions yet.</p>
            ) : (
              <ul className="text-xs text-white/70 space-y-2">
                {summary.top_user_questions.map((item, idx) => (
                  <li key={idx}>
                    {item.question} ({item.count})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <p className="text-sm font-bold text-amber-900">Escalation trend</p>
            </div>
            <p className="text-xs text-amber-700/70 mt-2">
              Total escalations: {summary?.total_escalations || 0} in the current period.
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-bold shadow-lg ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
