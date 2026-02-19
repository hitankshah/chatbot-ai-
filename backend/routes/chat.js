// backend/routes/chat.js
// Chat Route - Handles incoming messages from the widget
// Architecture: Widget → Backend → Claude API → Response

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { sendWebhookEvent } = require('../services/integrations');
const { canConsumeMessages, incrementMessages } = require('../services/usage');

// Rate limit for chat (30 messages per minute per IP)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many messages. Please slow down.' },
});

// ============================================
// POST /api/chat
// Send a message and get AI response
// Body: { chatbotId, sessionId, message }
// ============================================
router.post('/', chatLimiter, async (req, res) => {
  try {
    const { chatbotId, sessionId, message } = req.body;

    // --- Validation ---
    if (!chatbotId) {
      return res.status(400).json({ error: 'chatbotId is required.' });
    }
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars).' });
    }

    const finalSessionId = sessionId || uuidv4();

    // --- Verify chatbot exists and is active ---
    const { supabase } = require('../config/database');
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const { data: chatbot, error: botError } = await supabase
      .from('chatbots')
      .select('id, name, welcome_message, status, model, max_tokens, user_id, workspace_id')
      .eq('id', chatbotId)
      .single();

    if (botError || !chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    if (chatbot.status !== 'active') {
      return res.status(403).json({ error: 'This chatbot is currently paused.' });
    }

    let workspaceId = chatbot.workspace_id;
    if (!workspaceId) {
      const { data: owner } = await supabase
        .from('users')
        .select('primary_workspace_id')
        .eq('id', chatbot.user_id)
        .single();
      workspaceId = owner?.primary_workspace_id || null;
    }

    if (workspaceId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('plan_code')
        .eq('id', workspaceId)
        .maybeSingle();

      const planCode = workspace?.plan_code || 'starter';
      const usageCheck = await canConsumeMessages(workspaceId, planCode, 1);
      if (!usageCheck.allowed) {
        return res.status(402).json({
          error: 'Message limit reached for this plan.',
          limit: usageCheck.limit,
          current: usageCheck.current,
        });
      }
    }

    // --- Get or create conversation ---
    let conversation = await getOrCreateConversation(chatbot.id, finalSessionId);

    // --- Save user message ---
    await saveMessage(conversation.id, 'user', message);

    // --- Get AI response ---
    // Step 1: Search trained content via RAG (if available)
    let context = '';
    try {
      const { ragSearch } = require('../services/rag');
      const ragResults = await ragSearch(chatbot.id, message);
      if (ragResults && ragResults.length > 0) {
        context = ragResults.map(r => r.text).join('\n\n');
      }
    } catch (ragErr) {
      console.warn('RAG search skipped:', ragErr.message);
    }

    // Step 2: Call Claude API for response
    const aiResponse = await getClaudeResponse(message, context, chatbot);

    // --- Save bot response ---
    await saveMessage(conversation.id, 'bot', aiResponse);

    if (workspaceId) {
      await incrementMessages(workspaceId, 1);
    }

    // --- Return response ---
    res.json({
      response: aiResponse,
      sessionId: finalSessionId,
      conversationId: conversation.id,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: 'Sorry, something went wrong. Please try again.',
    });
  }
});

// ============================================
// GET /api/chat/history
// Get chat history for a session
// ============================================
router.get('/history', async (req, res) => {
  try {
    const { chatbotId, sessionId } = req.query;

    if (!chatbotId || !sessionId) {
      return res.status(400).json({ error: 'chatbotId and sessionId are required.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) {
      return res.json({ messages: [] });
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('chatbot_id', chatbotId)
      .eq('session_id', sessionId)
      .single();

    if (!conversation) {
      return res.json({ messages: [] });
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('id, sender, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    res.json({ messages: messages || [] });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

// ============================================
// POST /api/chat/lead
// Capture a lead from widget conversation
// Body: { chatbotId, sessionId, name, email, phone, message }
// ============================================
router.post('/lead', async (req, res) => {
  try {
    const { chatbotId, sessionId, name, email, phone, message } = req.body;

    if (!chatbotId || !email) {
      return res.status(400).json({ error: 'chatbotId and email are required.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('id, name')
      .eq('id', chatbotId)
      .single();

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    let conversationId = null;
    if (sessionId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('chatbot_id', chatbotId)
        .eq('session_id', sessionId)
        .single();
      conversationId = conversation?.id || null;
    }

    const { data: lead, error } = await supabase
      .from('lead_captures')
      .insert({
        chatbot_id: chatbotId,
        conversation_id: conversationId,
        name: name || null,
        email,
        phone: phone || null,
        message: message || null,
        source: 'widget',
      })
      .select('id, email, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to capture lead.' });
    }

    return res.status(201).json({
      message: 'Lead captured successfully.',
      lead,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to capture lead.' });
  }
});

// ============================================
// POST /api/chat/escalate
// Escalate conversation to human support
// Body: { chatbotId, sessionId, reason, transcript }
// ============================================
router.post('/escalate', async (req, res) => {
  try {
    const { chatbotId, sessionId, reason, transcript } = req.body;

    if (!chatbotId || !sessionId) {
      return res.status(400).json({ error: 'chatbotId and sessionId are required.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('id, name')
      .eq('id', chatbotId)
      .single();

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const conversation = await getOrCreateConversation(chatbotId, sessionId);

    const { data: handoff, error } = await supabase
      .from('handoff_events')
      .insert({
        chatbot_id: chatbotId,
        conversation_id: conversation.id,
        reason: reason || 'User requested human support',
        transcript: transcript || null,
        status: 'pending',
      })
      .select('id, status, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to escalate conversation.' });
    }

    const { data: integration } = await supabase
      .from('chatbot_integrations')
      .select('provider, webhook_url, webhook_secret, is_active')
      .eq('chatbot_id', chatbotId)
      .maybeSingle();

    let webhookDelivery = null;
    if (integration?.is_active && integration?.webhook_url) {
      webhookDelivery = await sendWebhookEvent({
        webhookUrl: integration.webhook_url,
        webhookSecret: integration.webhook_secret,
        eventType: 'handoff.requested',
        payload: {
          chatbotId,
          chatbotName: chatbot.name,
          sessionId,
          handoffId: handoff.id,
          reason: reason || 'User requested human support',
        },
      });
    }

    return res.status(201).json({
      message: 'Escalation created successfully.',
      handoff,
      webhookDelivery,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to escalate conversation.' });
  }
});

// ============================================
// HELPERS
// ============================================

/**
 * Get existing conversation or create new one
 */
async function getOrCreateConversation(chatbotId, sessionId) {
  const { supabase } = require('../config/database');
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('chatbot_id', chatbotId)
    .eq('session_id', sessionId)
    .eq('status', 'active')
    .single();

  if (existing) return existing;

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      chatbot_id: chatbotId,
      session_id: sessionId,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) throw new Error('Failed to create conversation');
  return newConv;
}

/**
 * Save a message to the database
 */
async function saveMessage(conversationId, sender, content) {
  const { supabase } = require('../config/database');
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender,
      content,
    });

  if (error) {
    console.error('Save message error:', error);
  }
}

/**
 * Get response from Claude API
 */
async function getClaudeResponse(userMessage, context, chatbot) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your-key')) {
    return `Demo response: I received your message: "${userMessage}". Add a valid ANTHROPIC_API_KEY in backend/.env for real AI responses.`;
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build system prompt
  let systemPrompt = `You are a helpful customer support assistant for "${chatbot.name}". 
Be friendly, concise, and helpful. Answer questions based on the provided context.
If you don't know the answer, say so honestly and suggest contacting human support.
Keep responses under 300 words.`;

  if (context) {
    systemPrompt += `\n\nUse the following information from the company's website to answer questions:\n\n${context}`;
  }

  try {
    const response = await client.messages.create({
      model: chatbot.model || 'claude-sonnet-4-20250514',
      max_tokens: chatbot.max_tokens || 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    });

    if (response.content && response.content[0] && response.content[0].text) {
      return response.content[0].text;
    }
    return "I'm sorry, I couldn't generate a response this time.";
  } catch (err) {
    console.error('Claude API error:', err);

    // Fallback response
    if (err.status === 429) {
      return "I'm receiving a lot of questions right now. Please try again in a moment.";
    }
    return "I'm sorry, I'm having trouble responding right now. Please try again or contact support directly.";
  }
}

module.exports = router;
