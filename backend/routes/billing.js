// backend/routes/billing.js
// PayPal billing routes

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { createSubscription, cancelSubscription, getSubscription, verifyWebhookSignature } = require('../services/paypal');

router.get('/plans', authMiddleware, async (req, res) => {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: plans, error } = await supabase
      .from('billing_plans')
      .select('id, plan_code, name, description, price_cents, currency, interval_unit, limits')
      .order('price_cents', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch plans.' });
    return res.json({ plans: plans || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch plans.' });
  }
});

router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: subscription } = await supabase
      .from('billing_subscriptions')
      .select('id, status, plan_id, paypal_subscription_id, current_period_start, current_period_end, cancel_at_period_end')
      .eq('workspace_id', req.user.primary_workspace_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.json({ subscription: subscription || null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch subscription.' });
  }
});

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { planCode, returnUrl, cancelUrl } = req.body;
    if (!planCode || !returnUrl || !cancelUrl) {
      return res.status(400).json({ error: 'planCode, returnUrl, cancelUrl are required.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: plan } = await supabase
      .from('billing_plans')
      .select('id, plan_code, paypal_plan_id, name')
      .eq('plan_code', planCode)
      .maybeSingle();

    if (!plan?.paypal_plan_id) {
      return res.status(400).json({ error: 'Plan not available for PayPal.' });
    }

    const subscription = await createSubscription({
      planId: plan.paypal_plan_id,
      subscriber: {
        name: {
          given_name: req.user.full_name || 'Customer',
          surname: ' ',
        },
        email_address: req.user.email,
      },
      returnUrl,
      cancelUrl,
      customId: req.user.primary_workspace_id,
    });

    await supabase
      .from('billing_subscriptions')
      .insert({
        workspace_id: req.user.primary_workspace_id,
        plan_id: plan.id,
        paypal_subscription_id: subscription.id,
        status: subscription.status || 'pending',
        current_period_start: subscription.start_time || null,
      });

    const approvalLink = (subscription.links || []).find((link) => link.rel === 'approve');

    return res.json({
      subscriptionId: subscription.id,
      approvalUrl: approvalLink?.href || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create subscription.' });
  }
});

router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required.' });
    }

    await cancelSubscription(subscriptionId, 'User requested cancellation');

    const { supabase } = require('../config/database');
    if (supabase) {
      await supabase
        .from('billing_subscriptions')
        .update({ status: 'cancelled', cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('paypal_subscription_id', subscriptionId);
    }

    return res.json({ message: 'Subscription cancelled.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
});

router.post('/webhook', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const isValid = await verifyWebhookSignature(req.headers, req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body;
    const eventType = event.event_type;
    const subscriptionId = event.resource?.id || event.resource?.billing_agreement_id;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      await supabase
        .from('billing_subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('paypal_subscription_id', subscriptionId);
    }

    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      await supabase
        .from('billing_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('paypal_subscription_id', subscriptionId);
    }

    if (eventType === 'PAYMENT.SALE.COMPLETED') {
      await supabase
        .from('billing_invoices')
        .insert({
          workspace_id: event.resource?.custom_id || null,
          paypal_invoice_id: event.resource?.id,
          amount_cents: Math.round(Number(event.resource?.amount?.total || 0) * 100),
          currency: event.resource?.amount?.currency || 'USD',
          status: 'paid',
          issued_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        });
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process webhook.' });
  }
});

module.exports = router;
