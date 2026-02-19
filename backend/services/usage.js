// backend/services/usage.js
// Usage metering helpers for plan enforcement

const { supabase } = require('../config/database');

function getCurrentPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function getPlanLimits(planCode) {
  if (!supabase || !planCode) return null;

  const { data: plan } = await supabase
    .from('billing_plans')
    .select('plan_code, limits')
    .eq('plan_code', planCode)
    .maybeSingle();

  return plan?.limits || null;
}

async function getOrCreateUsageCounter(workspaceId) {
  if (!supabase || !workspaceId) return null;

  const period = getCurrentPeriod();

  const { data: existing } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('period_start', period.start)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from('usage_counters')
    .insert({
      workspace_id: workspaceId,
      period_start: period.start,
      period_end: period.end,
      messages_count: 0,
      chatbots_count: 0,
      pages_count: 0,
    })
    .select('*')
    .single();

  return created;
}

async function canConsumeMessages(workspaceId, planCode, incrementBy = 1) {
  const limits = await getPlanLimits(planCode);
  if (!limits || !limits.messages_per_month) {
    return { allowed: true };
  }

  const counter = await getOrCreateUsageCounter(workspaceId);
  if (!counter) return { allowed: true };

  const nextCount = Number(counter.messages_count || 0) + Number(incrementBy || 0);
  if (nextCount > Number(limits.messages_per_month)) {
    return { allowed: false, limit: limits.messages_per_month, current: counter.messages_count };
  }

  return { allowed: true, counter };
}

async function incrementMessages(workspaceId, incrementBy = 1) {
  if (!supabase || !workspaceId) return null;

  const counter = await getOrCreateUsageCounter(workspaceId);
  if (!counter) return null;

  const nextCount = Number(counter.messages_count || 0) + Number(incrementBy || 0);

  const { data: updated } = await supabase
    .from('usage_counters')
    .update({ messages_count: nextCount, updated_at: new Date().toISOString() })
    .eq('id', counter.id)
    .select('*')
    .single();

  return updated;
}

module.exports = {
  canConsumeMessages,
  incrementMessages,
  getPlanLimits,
  getCurrentPeriod,
};
