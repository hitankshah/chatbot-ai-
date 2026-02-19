// backend/services/paypal.js
// PayPal API client helpers (subscriptions + webhooks)

const logger = require('../config/logger');

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry - 30000) {
    return cachedToken;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal token error: ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (Number(data.expires_in || 0) * 1000);

  return cachedToken;
}

async function paypalRequest(path, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`PayPal API error: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function createSubscription({ planId, subscriber, returnUrl, cancelUrl, customId }) {
  return paypalRequest('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      subscriber,
      custom_id: customId,
      application_context: {
        brand_name: 'SupportMate',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
}

async function getSubscription(subscriptionId) {
  return paypalRequest(`/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
  });
}

async function cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
  return paypalRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

async function verifyWebhookSignature(headers, body) {
  if (!PAYPAL_WEBHOOK_ID) {
    throw new Error('PayPal webhook ID not configured');
  }

  const payload = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: body,
  };

  try {
    const response = await paypalRequest('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response?.verification_status === 'SUCCESS';
  } catch (err) {
    logger.error('PayPal webhook verification failed', { error: err.message });
    return false;
  }
}

module.exports = {
  createSubscription,
  getSubscription,
  cancelSubscription,
  verifyWebhookSignature,
};
