// backend/routes/analytics.js
// Analytics + chat history review endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

async function assertChatbotOwnership(chatbotId, userId) {
  const { supabase } = require('../config/database');
  if (!supabase) return null;

  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('id', chatbotId)
    .eq('user_id', userId)
    .maybeSingle();

  return chatbot || null;
}

function normalizeQuestion(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

router.get('/summary', async (req, res) => {
  try {
    const { chatbotId, from, to } = req.query;
    if (!chatbotId) return res.status(400).json({ error: 'chatbotId is required.' });

    const chatbot = await assertChatbotOwnership(chatbotId, req.user.id);
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = to || new Date().toISOString();

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, created_at')
      .eq('chatbot_id', chatbotId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    const conversationIds = (conversations || []).map((item) => item.id);

    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds.length ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    const { count: totalLeads } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    const { count: totalEscalations } = await supabase
      .from('handoff_events')
      .select('*', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    const { data: recentUserMessages } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('sender', 'user')
      .in('conversation_id', conversationIds.length ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .limit(400);

    const counts = {};
    for (const message of recentUserMessages || []) {
      const normalized = normalizeQuestion(message.content);
      if (!normalized || normalized.length < 8) continue;
      counts[normalized] = (counts[normalized] || 0) + 1;
    }

    const topUserQuestions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([question, count]) => ({ question, count }));

    const dailyMap = {};
    for (const convo of conversations || []) {
      const day = String(convo.created_at).slice(0, 10);
      dailyMap[day] = dailyMap[day] || { date: day, conversations: 0, leads: 0, escalations: 0 };
      dailyMap[day].conversations += 1;
    }

    const { data: leads } = await supabase
      .from('lead_captures')
      .select('created_at')
      .eq('chatbot_id', chatbotId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    for (const lead of leads || []) {
      const day = String(lead.created_at).slice(0, 10);
      dailyMap[day] = dailyMap[day] || { date: day, conversations: 0, leads: 0, escalations: 0 };
      dailyMap[day].leads += 1;
    }

    const { data: escalations } = await supabase
      .from('handoff_events')
      .select('created_at')
      .eq('chatbot_id', chatbotId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    for (const item of escalations || []) {
      const day = String(item.created_at).slice(0, 10);
      dailyMap[day] = dailyMap[day] || { date: day, conversations: 0, leads: 0, escalations: 0 };
      dailyMap[day].escalations += 1;
    }

    const timeline = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      summary: {
        total_conversations: conversations?.length || 0,
        total_messages: totalMessages || 0,
        total_leads: totalLeads || 0,
        total_escalations: totalEscalations || 0,
        top_user_questions: topUserQuestions,
      },
      timeline,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate analytics summary.' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const { chatbotId, page = 1, limit = 20 } = req.query;
    if (!chatbotId) return res.status(400).json({ error: 'chatbotId is required.' });

    const chatbot = await assertChatbotOwnership(chatbotId, req.user.id);
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const offset = (Number(page) - 1) * Number(limit);

    const { data: conversations, count } = await supabase
      .from('conversations')
      .select('id, session_id, status, created_at, started_at', { count: 'exact' })
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const conversationIds = (conversations || []).map((item) => item.id);

    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, created_at, sender, content')
      .in('conversation_id', conversationIds.length ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .limit(500);

    const messageMap = {};
    for (const message of messages || []) {
      if (!messageMap[message.conversation_id]) {
        messageMap[message.conversation_id] = {
          last_message_at: message.created_at,
          last_message_preview: message.content?.slice(0, 120) || '',
          message_count: 0,
        };
      }
      messageMap[message.conversation_id].message_count += 1;
    }

    const enriched = (conversations || []).map((conversation) => ({
      ...conversation,
      ...(messageMap[conversation.id] || { message_count: 0 }),
    }));

    return res.json({
      conversations: enriched,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, chatbot_id, session_id, status, started_at, created_at')
      .eq('id', conversationId)
      .single();

    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

    const chatbot = await assertChatbotOwnership(conversation.chatbot_id, req.user.id);
    if (!chatbot) return res.status(403).json({ error: 'Not authorized.' });

    const { data: messages } = await supabase
      .from('messages')
      .select('id, sender, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const { data: feedback } = await supabase
      .from('conversation_feedback')
      .select('id, rating, notes, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.json({ conversation, messages: messages || [], feedback: feedback || null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

router.post('/conversations/:conversationId/feedback', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { rating, notes } = req.body;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, chatbot_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

    const chatbot = await assertChatbotOwnership(conversation.chatbot_id, req.user.id);
    if (!chatbot) return res.status(403).json({ error: 'Not authorized.' });

    const { data: feedback, error } = await supabase
      .from('conversation_feedback')
      .insert({
        conversation_id: conversationId,
        chatbot_id: conversation.chatbot_id,
        rating: rating || null,
        notes: notes || null,
        created_by: req.user.id,
      })
      .select('id, rating, notes, created_at')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to save feedback.' });

    return res.status(201).json({ feedback });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

module.exports = router;
