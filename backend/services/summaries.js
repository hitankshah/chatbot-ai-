// backend/services/summaries.js

async function generateDailySummaryForChatbot(chatbotId, date) {
  const { supabase } = require('../config/database');
  if (!supabase) {
    throw new Error('Database not configured.');
  }

  const start = new Date(`${date}T00:00:00.000Z`).toISOString();
  const end = new Date(`${date}T23:59:59.999Z`).toISOString();

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, session_id, created_at')
    .eq('chatbot_id', chatbotId)
    .gte('created_at', start)
    .lte('created_at', end);

  const conversationIds = (conversations || []).map((conv) => conv.id);

  let totalMessages = 0;
  let topUserQuestions = [];

  if (conversationIds.length > 0) {
    const { data: messages } = await supabase
      .from('messages')
      .select('sender, content')
      .in('conversation_id', conversationIds);

    totalMessages = (messages || []).length;

    const questionCounts = {};
    (messages || [])
      .filter((msg) => msg.sender === 'user')
      .forEach((msg) => {
        const normalized = (msg.content || '').trim().toLowerCase();
        if (!normalized) return;
        questionCounts[normalized] = (questionCounts[normalized] || 0) + 1;
      });

    topUserQuestions = Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([question, count]) => ({ question, count }));
  }

  const { count: totalLeads } = await supabase
    .from('lead_captures')
    .select('*', { count: 'exact', head: true })
    .eq('chatbot_id', chatbotId)
    .gte('created_at', start)
    .lte('created_at', end);

  const { count: totalEscalations } = await supabase
    .from('handoff_events')
    .select('*', { count: 'exact', head: true })
    .eq('chatbot_id', chatbotId)
    .gte('created_at', start)
    .lte('created_at', end);

  const { count: unresolvedEscalations } = await supabase
    .from('handoff_events')
    .select('*', { count: 'exact', head: true })
    .eq('chatbot_id', chatbotId)
    .eq('status', 'pending');

  return {
    chatbot_id: chatbotId,
    summary_date: date,
    total_conversations: (conversations || []).length,
    total_messages: totalMessages,
    total_leads: totalLeads || 0,
    total_escalations: totalEscalations || 0,
    unresolved_escalations: unresolvedEscalations || 0,
    top_user_questions: topUserQuestions,
  };
}

module.exports = {
  generateDailySummaryForChatbot,
};
