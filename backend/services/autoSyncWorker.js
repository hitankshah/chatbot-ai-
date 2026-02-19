// backend/services/autoSyncWorker.js
// Polls job_queue for auto-sync tasks

const logger = require('../config/logger');
const { supabase } = require('../config/database');
const { processAutoSyncJob } = require('./autoSync');

const AUTO_SYNC_POLL_INTERVAL_MS = Number(process.env.AUTO_SYNC_POLL_INTERVAL_MS || 60000);
const AUTO_SYNC_WORKER_BATCH = Number(process.env.AUTO_SYNC_WORKER_BATCH || 5);

let isRunning = false;

async function pollAutoSyncJobs() {
  if (isRunning || !supabase) {
    return;
  }

  isRunning = true;

  try {
    const nowIso = new Date().toISOString();
    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('job_type', 'auto_sync')
      .eq('status', 'pending')
      .lte('run_after', nowIso)
      .order('created_at', { ascending: true })
      .limit(AUTO_SYNC_WORKER_BATCH);

    if (error) {
      logger.error('Auto-sync job fetch failed', { error: error.message });
      return;
    }

    for (const job of jobs || []) {
      const { data: claimed } = await supabase
        .from('job_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (!claimed?.id) {
        continue;
      }

      try {
        await processAutoSyncJob(job);
        await supabase
          .from('job_queue')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', job.id);
      } catch (err) {
        const nextRetryCount = Number(job.retry_count || 0) + 1;
        const maxRetries = Number(job.max_retries || 3);
        const retryDelayMs = Math.min(nextRetryCount * 5 * 60 * 1000, 60 * 60 * 1000);

        if (nextRetryCount >= maxRetries) {
          await supabase
            .from('job_queue')
            .update({
              status: 'failed',
              retry_count: nextRetryCount,
              last_error: err.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
        } else {
          await supabase
            .from('job_queue')
            .update({
              status: 'pending',
              retry_count: nextRetryCount,
              last_error: err.message,
              run_after: new Date(Date.now() + retryDelayMs).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
        }
      }
    }
  } finally {
    isRunning = false;
  }
}

function startAutoSyncWorker() {
  const enabled = process.env.ENABLE_AUTO_SYNC_WORKER === 'true';
  if (!enabled) {
    logger.info('Auto-sync worker disabled');
    return;
  }

  logger.info('Auto-sync worker started');
  pollAutoSyncJobs();
  setInterval(pollAutoSyncJobs, AUTO_SYNC_POLL_INTERVAL_MS);
}

module.exports = {
  startAutoSyncWorker,
  pollAutoSyncJobs,
};
