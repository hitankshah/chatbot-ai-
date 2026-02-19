// backend/routes/system.js
// Operational monitoring APIs for queue/reliability visibility

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { enqueueDueAutoSyncJobs } = require('../services/autoSync');

router.post('/auto-sync', async (req, res) => {
  try {
    const secret = process.env.AUTO_SYNC_CRON_SECRET;
    if (!secret) {
      return res.status(503).json({ error: 'Auto-sync is not configured.' });
    }

    const provided = req.get('x-cron-secret') || req.get('authorization')?.replace('Bearer ', '');
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await enqueueDueAutoSyncJobs();
    return res.json({ message: 'Auto-sync jobs queued', ...result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to enqueue auto-sync jobs.' });
  }
});

router.use(authMiddleware);

router.get('/monitor', async (req, res) => {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { count: failedTraining } = await supabase
      .from('trained_content')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: pendingHandoffs } = await supabase
      .from('handoff_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: deadLetterCount } = await supabase
      .from('dead_letter_jobs')
      .select('*', { count: 'exact', head: true });

    const { count: failedWebhooks } = await supabase
      .from('webhook_delivery_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    return res.json({
      monitoring: {
        failedTrainingJobs: failedTraining || 0,
        pendingHandoffs: pendingHandoffs || 0,
        deadLetterJobs: deadLetterCount || 0,
        failedWebhookDeliveries: failedWebhooks || 0,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch monitoring metrics.' });
  }
});

router.get('/auto-sync/jobs', async (req, res) => {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('id, job_type, status, retry_count, last_error, run_after, created_at')
      .eq('job_type', 'auto_sync')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: 'Failed to fetch auto-sync jobs.' });

    return res.json({ jobs: jobs || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch auto-sync jobs.' });
  }
});

router.post('/auto-sync/jobs/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: job, error } = await supabase
      .from('job_queue')
      .update({
        status: 'pending',
        run_after: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select('id, status')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to retry job.' });

    return res.json({ job });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retry job.' });
  }
});

module.exports = router;
