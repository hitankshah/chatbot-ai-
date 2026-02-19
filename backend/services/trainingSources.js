// backend/services/trainingSources.js
// Training source registration and scheduling helpers

const { supabase } = require('../config/database');

function getDefaultIntervalHours(sourceType) {
  const defaultHours = Number(process.env.AUTO_SYNC_DEFAULT_INTERVAL_HOURS || 168);
  const map = {
    sitemap: Number(process.env.AUTO_SYNC_SITEMAP_INTERVAL_HOURS || defaultHours),
    url: Number(process.env.AUTO_SYNC_URL_INTERVAL_HOURS || defaultHours),
    help_center: Number(process.env.AUTO_SYNC_HELP_CENTER_INTERVAL_HOURS || defaultHours),
    raw_text: Number(process.env.AUTO_SYNC_RAW_TEXT_INTERVAL_HOURS || 720),
    file: Number(process.env.AUTO_SYNC_FILE_INTERVAL_HOURS || 720),
  };

  return map[sourceType] || defaultHours;
}

function computeNextSync(intervalHours) {
  const hours = Number(intervalHours || 0);
  if (!hours || Number.isNaN(hours)) {
    return null;
  }

  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function upsertTrainingSource({
  chatbotId,
  sourceType,
  sourceUrl,
  sourceLabel,
  settings = {},
  syncIntervalHours,
  forceActivate = true,
}) {
  if (!supabase) {
    return null;
  }

  const interval = Number(syncIntervalHours || getDefaultIntervalHours(sourceType));
  const nextSyncAt = computeNextSync(interval);

  const { data: existing } = await supabase
    .from('training_sources')
    .select('id')
    .eq('chatbot_id', chatbotId)
    .eq('source_type', sourceType)
    .eq('source_url', sourceUrl)
    .maybeSingle();

  if (existing?.id) {
    const { data } = await supabase
      .from('training_sources')
      .update({
        source_label: sourceLabel,
        settings,
        sync_interval_hours: interval,
        next_sync_at: nextSyncAt,
        is_active: forceActivate ? true : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    return data?.id || existing.id;
  }

  const { data } = await supabase
    .from('training_sources')
    .insert({
      chatbot_id: chatbotId,
      source_type: sourceType,
      source_url: sourceUrl,
      source_label: sourceLabel,
      settings,
      sync_interval_hours: interval,
      next_sync_at: nextSyncAt,
      is_active: true,
    })
    .select('id')
    .single();

  return data?.id || null;
}

async function markSourceSynced(sourceId) {
  if (!supabase || !sourceId) {
    return;
  }

  await supabase
    .from('training_sources')
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId);
}

module.exports = {
  upsertTrainingSource,
  computeNextSync,
  getDefaultIntervalHours,
  markSourceSynced,
};
