// backend/routes/trainingSources.js
// Auto-sync source management

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { chatbotId } = req.query;
    if (!chatbotId) return res.status(400).json({ error: 'chatbotId is required.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found.' });

    const { data: sources, error } = await supabase
      .from('training_sources')
      .select('id, source_type, source_url, source_label, settings, sync_interval_hours, is_active, last_synced_at, next_sync_at, created_at')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch sources.' });

    return res.json({ sources: sources || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sources.' });
  }
});

router.patch('/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const { isActive, syncIntervalHours, sourceLabel } = req.body;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: source } = await supabase
      .from('training_sources')
      .select('id, chatbot_id')
      .eq('id', sourceId)
      .maybeSingle();

    if (!source) return res.status(404).json({ error: 'Source not found.' });

    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', source.chatbot_id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!chatbot) return res.status(403).json({ error: 'Not authorized.' });

    const { data: updated, error } = await supabase
      .from('training_sources')
      .update({
        is_active: typeof isActive === 'boolean' ? isActive : undefined,
        sync_interval_hours: syncIntervalHours,
        source_label: sourceLabel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId)
      .select('id, is_active, sync_interval_hours, source_label, next_sync_at')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update source.' });

    return res.json({ source: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update source.' });
  }
});

router.get('/:sourceId/logs', async (req, res) => {
  try {
    const { sourceId } = req.params;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: source } = await supabase
      .from('training_sources')
      .select('id, chatbot_id')
      .eq('id', sourceId)
      .maybeSingle();

    if (!source) return res.status(404).json({ error: 'Source not found.' });

    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', source.chatbot_id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!chatbot) return res.status(403).json({ error: 'Not authorized.' });

    const { data: logs, error } = await supabase
      .from('trained_content')
      .select('id, status, chunk_count, error_message, synced_at, created_at')
      .eq('training_source_id', sourceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: 'Failed to fetch logs.' });

    return res.json({ logs: logs || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

module.exports = router;
