// backend/routes/integrations.js
// Human handoff, lead management, webhook integrations, daily summaries

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { sendWebhookEvent } = require('../services/integrations');
const { generateDailySummaryForChatbot } = require('../services/summaries');

router.use(authMiddleware);

async function assertOwnership(chatbotId, userId) {
  const { supabase } = require('../config/database');
  if (!supabase) throw new Error('Database not configured.');

  const { data: chatbot, error } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('id', chatbotId)
    .eq('user_id', userId)
    .single();

  if (error || !chatbot) {
    return null;
  }

  return chatbot;
}

router.get('/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const { supabase } = require('../config/database');

    const { data: integration } = await supabase
      .from('chatbot_integrations')
      .select('provider, webhook_url, is_active, metadata, updated_at')
      .eq('chatbot_id', chatbotId)
      .maybeSingle();

    const { count: leadsCount } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId);

    const { count: pendingHandoffs } = await supabase
      .from('handoff_events')
      .select('*', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId)
      .eq('status', 'pending');

    return res.json({
      chatbot,
      integration: integration || null,
      stats: {
        leads: leadsCount || 0,
        pendingHandoffs: pendingHandoffs || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch integration settings.' });
  }
});

router.put('/:chatbotId/webhook', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { provider = 'custom-webhook', webhookUrl, webhookSecret, isActive = true, metadata = {} } = req.body;

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    if (isActive && (!webhookUrl || !/^https?:\/\//i.test(webhookUrl))) {
      return res.status(400).json({ error: 'A valid webhookUrl is required when enabling integration.' });
    }

    const { supabase } = require('../config/database');

    const payload = {
      chatbot_id: chatbotId,
      provider,
      webhook_url: webhookUrl || null,
      webhook_secret: webhookSecret || null,
      is_active: Boolean(isActive),
      metadata,
    };

    const { data, error } = await supabase
      .from('chatbot_integrations')
      .upsert(payload, { onConflict: 'chatbot_id' })
      .select('provider, webhook_url, is_active, metadata, updated_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update webhook integration.' });
    }

    return res.json({
      message: 'Integration updated successfully.',
      integration: data,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update integration.' });
  }
});

router.post('/:chatbotId/test-handoff', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { reason = 'Manual escalation test', context = {} } = req.body;

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const { supabase } = require('../config/database');

    const { data: integration } = await supabase
      .from('chatbot_integrations')
      .select('provider, webhook_url, webhook_secret, is_active')
      .eq('chatbot_id', chatbotId)
      .maybeSingle();

    if (!integration || !integration.is_active || !integration.webhook_url) {
      return res.status(400).json({ error: 'No active webhook integration configured for this chatbot.' });
    }

    const delivery = await sendWebhookEvent({
      webhookUrl: integration.webhook_url,
      webhookSecret: integration.webhook_secret,
      eventType: 'handoff.test',
      payload: {
        chatbotId,
        chatbotName: chatbot.name,
        reason,
        context,
      },
    });

    return res.json({
      message: delivery.delivered ? 'Test handoff delivered.' : 'Test handoff failed.',
      delivery,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send test handoff.' });
  }
});

router.get('/:chatbotId/leads', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const { supabase } = require('../config/database');

    const { data: leads, count, error } = await supabase
      .from('lead_captures')
      .select('id, name, email, phone, message, status, source, created_at', { count: 'exact' })
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leads.' });
    }

    return res.json({
      leads: leads || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leads.' });
  }
});

router.get('/:chatbotId/leads/export.csv', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const { supabase } = require('../config/database');
    const { data: leads } = await supabase
      .from('lead_captures')
      .select('name,email,phone,message,status,source,created_at')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });

    const header = 'name,email,phone,message,status,source,created_at';
    const rows = (leads || []).map((lead) => [
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      (lead.message || '').replace(/\n/g, ' ').replace(/,/g, ';'),
      lead.status || '',
      lead.source || '',
      lead.created_at || '',
    ].join(','));

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${chatbotId}.csv"`);
    return res.send(csv);
  } catch {
    return res.status(500).json({ error: 'Failed to export leads.' });
  }
});

router.get('/:chatbotId/handoffs', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const status = req.query.status;

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const { supabase } = require('../config/database');
    let query = supabase
      .from('handoff_events')
      .select('id, conversation_id, reason, status, external_ticket_id, created_at, resolved_at')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch handoffs.' });
    }

    return res.json({ handoffs: data || [] });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch handoffs.' });
  }
});

router.patch('/:chatbotId/handoffs/:handoffId', async (req, res) => {
  try {
    const { chatbotId, handoffId } = req.params;
    const { status, externalTicketId } = req.body;

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const { supabase } = require('../config/database');
    const updatePayload = {};
    if (status) updatePayload.status = status;
    if (externalTicketId !== undefined) updatePayload.external_ticket_id = externalTicketId;
    if (status === 'resolved') updatePayload.resolved_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('handoff_events')
      .update(updatePayload)
      .eq('id', handoffId)
      .eq('chatbot_id', chatbotId)
      .select('id, status, external_ticket_id, resolved_at')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Handoff not found.' });
    }

    return res.json({ message: 'Handoff updated.', handoff: data });
  } catch {
    return res.status(500).json({ error: 'Failed to update handoff.' });
  }
});

router.get('/:chatbotId/daily-summary', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const { supabase } = require('../config/database');

    const summaryPayload = await generateDailySummaryForChatbot(chatbotId, date);

    await supabase
      .from('daily_summaries')
      .upsert(summaryPayload, { onConflict: 'chatbot_id,summary_date' });

    return res.json({
      summary: {
        date,
        chatbotId,
        ...summaryPayload,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate daily summary.' });
  }
});

router.post('/inbound/:provider/:chatbotId', async (req, res) => {
  try {
    const { provider, chatbotId } = req.params;
    const { message, sessionId, externalThreadId, metadata } = req.body;

    const { supabase } = require('../config/database');
    const { data: integration } = await supabase
      .from('chatbot_integrations')
      .select('is_active, metadata')
      .eq('chatbot_id', chatbotId)
      .eq('provider', provider)
      .maybeSingle();

    if (!integration || !integration.is_active) {
      return res.status(404).json({ error: 'Integration not active.' });
    }

    const inboundSecret = integration.metadata?.inboundSecret;
    const providedSecret = req.headers['x-inbound-secret'];
    if (inboundSecret && inboundSecret !== providedSecret) {
      return res.status(403).json({ error: 'Invalid inbound secret.' });
    }

    const finalSessionId = sessionId || externalThreadId || `inbound_${Date.now()}`;

    let conversation = await supabase
      .from('conversations')
      .select('id')
      .eq('chatbot_id', chatbotId)
      .eq('session_id', finalSessionId)
      .single();

    if (!conversation.data) {
      conversation = await supabase
        .from('conversations')
        .insert({ chatbot_id: chatbotId, session_id: finalSessionId, status: 'active' })
        .select('id')
        .single();
    }

    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.data.id,
        sender: 'user',
        content: message || 'Inbound integration message',
        metadata: { provider, externalThreadId, ...metadata },
      });

    return res.json({ message: 'Inbound message synced.' });
  } catch {
    return res.status(500).json({ error: 'Failed to sync inbound message.' });
  }
});

module.exports = router;
