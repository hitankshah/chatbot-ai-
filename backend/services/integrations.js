// backend/services/integrations.js
// Outbound integration helpers (webhook/human handoff)

const crypto = require('crypto');

async function sendWebhookEvent({ webhookUrl, webhookSecret, eventType, payload }) {
  if (!webhookUrl) {
    return { delivered: false, reason: 'webhook_url_missing' };
  }

  const maxAttempts = Number(process.env.WEBHOOK_RETRY_ATTEMPTS || 3);
  let lastResult = { delivered: false, reason: 'unknown' };

  const body = JSON.stringify({
    type: eventType,
    timestamp: new Date().toISOString(),
    payload,
  });

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'ai-chatbot-platform/1.0',
  };

  if (webhookSecret) {
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body,
      });

      const text = await response.text();

      lastResult = {
        delivered: response.ok,
        statusCode: response.status,
        responseBody: text.substring(0, 1000),
        attempts: attempt,
      };

      if (response.ok) break;
    } catch (err) {
      lastResult = {
        delivered: false,
        reason: err.message,
        attempts: attempt,
      };
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  await logDelivery({ webhookUrl, eventType, payload, result: lastResult });

  if (!lastResult.delivered) {
    await enqueueDeadLetter({
      jobType: 'webhook_delivery',
      payload: { webhookUrl, eventType, payload },
      errorMessage: lastResult.reason || `HTTP ${lastResult.statusCode}`,
      source: 'integrations.sendWebhookEvent',
    });
  }

  return lastResult;
}

async function logDelivery({ webhookUrl, eventType, payload, result }) {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return;

    await supabase
      .from('webhook_delivery_logs')
      .insert({
        chatbot_id: payload?.chatbotId || null,
        provider: payload?.provider || 'custom-webhook',
        webhook_url: webhookUrl,
        event_type: eventType,
        status: result.delivered ? 'delivered' : 'failed',
        status_code: result.statusCode || null,
        attempt_count: result.attempts || 1,
        error_message: result.reason || null,
      });
  } catch {
    // non-blocking
  }
}

async function enqueueDeadLetter({ jobType, payload, errorMessage, source }) {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return;

    await supabase
      .from('dead_letter_jobs')
      .insert({
        job_type: jobType,
        payload,
        error_message: errorMessage,
        source,
      });
  } catch {
    // non-blocking
  }
}

module.exports = {
  sendWebhookEvent,
};
