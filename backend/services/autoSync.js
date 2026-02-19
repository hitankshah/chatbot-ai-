// backend/services/autoSync.js
// Auto-sync training sources on a schedule

const logger = require('../config/logger');
const { supabase } = require('../config/database');
const { scrapeAndStore, scrapeFromSitemap, processTextContent } = require('./scraper');
const { computeNextSync, getDefaultIntervalHours, markSourceSynced } = require('./trainingSources');

const AUTO_SYNC_BATCH_LIMIT = Number(process.env.AUTO_SYNC_BATCH_LIMIT || 10);
const CONTENT_TEXT_MAX_CHARS = Number(process.env.CONTENT_TEXT_MAX_CHARS || 200000);

function trimContentText(text) {
  if (!text) return '';
  if (!CONTENT_TEXT_MAX_CHARS || Number.isNaN(CONTENT_TEXT_MAX_CHARS)) return text;
  return text.substring(0, CONTENT_TEXT_MAX_CHARS);
}

async function enqueueDueAutoSyncJobs(limit = AUTO_SYNC_BATCH_LIMIT) {
  if (!supabase) {
    return { queued: 0 };
  }

  const nowIso = new Date().toISOString();

  const { data: sources, error } = await supabase
    .from('training_sources')
    .select('id, chatbot_id, source_type, source_url, sync_interval_hours, settings, next_sync_at, is_active')
    .eq('is_active', true)
    .or(`next_sync_at.is.null,next_sync_at.lte.${nowIso}`)
    .order('next_sync_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error('Auto-sync source fetch failed', { error: error.message });
    return { queued: 0, error: error.message };
  }

  let queued = 0;
  for (const source of sources || []) {
    const intervalHours = Number(source.sync_interval_hours || getDefaultIntervalHours(source.source_type));
    const nextSyncAt = computeNextSync(intervalHours);

    const { error: insertError } = await supabase
      .from('job_queue')
      .insert({
        chatbot_id: source.chatbot_id,
        job_type: 'auto_sync',
        payload: { sourceId: source.id },
        status: 'pending',
        run_after: new Date().toISOString(),
      });

    if (insertError) {
      logger.error('Failed to enqueue auto-sync job', {
        sourceId: source.id,
        error: insertError.message,
      });
      continue;
    }

    await supabase
      .from('training_sources')
      .update({
        next_sync_at: nextSyncAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', source.id);

    queued += 1;
  }

  return { queued };
}

async function cleanupOldChunks(chatbotId, sourceId) {
  if (!supabase) return;

  const { data: contentRows } = await supabase
    .from('trained_content')
    .select('id')
    .eq('chatbot_id', chatbotId)
    .eq('training_source_id', sourceId);

  const ids = (contentRows || []).map((row) => row.id);
  if (ids.length === 0) return;

  await supabase
    .from('document_chunks')
    .delete()
    .in('trained_content_id', ids);
}

async function processAutoSyncJob(job) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const sourceId = job.payload?.sourceId;
  if (!sourceId) {
    throw new Error('Missing sourceId in job payload');
  }

  const { data: source, error } = await supabase
    .from('training_sources')
    .select('id, chatbot_id, source_type, source_url, settings')
    .eq('id', sourceId)
    .maybeSingle();

  if (error || !source) {
    throw new Error('Training source not found');
  }

  await cleanupOldChunks(source.chatbot_id, sourceId);

  const { data: contentRecord } = await supabase
    .from('trained_content')
    .insert({
      chatbot_id: source.chatbot_id,
      url: source.source_url,
      status: 'processing',
      training_source_id: sourceId,
    })
    .select('id')
    .single();

  const contentId = contentRecord?.id;
  if (!contentId) {
    throw new Error('Failed to create trained_content record');
  }

  await supabase
    .from('chatbots')
    .update({ status: 'training' })
    .eq('id', source.chatbot_id);

  try {
    if (source.source_type === 'sitemap') {
      const maxPages = Number(source.settings?.maxPages || 30);
      const results = await scrapeFromSitemap(source.source_url, source.chatbot_id, maxPages, contentId);
      const successCount = results.filter((item) => item.status === 'success').length;

      await supabase
        .from('trained_content')
        .update({
          page_title: 'Sitemap Auto Sync',
          content_text: `Auto-synced ${results.length} pages from sitemap.`,
          chunk_count: successCount,
          status: 'completed',
          synced_at: new Date().toISOString(),
        })
        .eq('id', contentId);
    } else if (source.source_type === 'raw_text' || source.source_type === 'file') {
      const rawText = source.settings?.rawText || source.settings?.extractedText;
      if (!rawText) {
        throw new Error('Missing stored text content for auto-sync');
      }

      const result = await processTextContent(
        source.chatbot_id,
        rawText,
        { title: source.settings?.title || 'Auto Sync Content', url: source.source_url },
        contentId
      );

      await supabase
        .from('trained_content')
        .update({
          page_title: result.title,
          content_text: trimContentText(result.rawText),
          chunk_count: result.chunkCount,
          status: 'completed',
          synced_at: new Date().toISOString(),
        })
        .eq('id', contentId);
    } else {
      const result = await scrapeAndStore(source.chatbot_id, source.source_url, contentId);

      await supabase
        .from('trained_content')
        .update({
          page_title: result.title,
          content_text: trimContentText(result.rawText),
          chunk_count: result.chunkCount,
          status: 'completed',
          synced_at: new Date().toISOString(),
        })
        .eq('id', contentId);
    }

    await markSourceSynced(sourceId);

    await supabase
      .from('chatbots')
      .update({ status: 'active' })
      .eq('id', source.chatbot_id);
  } catch (err) {
    await supabase
      .from('trained_content')
      .update({
        status: 'failed',
        error_message: err.message,
      })
      .eq('id', contentId);

    await supabase
      .from('chatbots')
      .update({ status: 'active' })
      .eq('id', source.chatbot_id);

    throw err;
  }
}

module.exports = {
  enqueueDueAutoSyncJobs,
  processAutoSyncJob,
};
