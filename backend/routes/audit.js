// backend/routes/audit.js
// Audit logs endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const offset = (Number(page) - 1) * Number(limit);

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: logs, count, error } = await supabase
      .from('audit_logs')
      .select('id, action, target_type, target_id, metadata, created_at, actor_user_id', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) return res.status(500).json({ error: 'Failed to fetch audit logs.' });

    return res.json({
      logs: logs || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

router.get('/export.csv', async (req, res) => {
  try {
    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('action,target_type,target_id,metadata,created_at,actor_user_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const header = 'action,target_type,target_id,metadata,created_at,actor_user_id';
    const rows = (logs || []).map((log) => [
      log.action || '',
      log.target_type || '',
      log.target_id || '',
      JSON.stringify(log.metadata || {}).replace(/\n/g, ' ').replace(/,/g, ';'),
      log.created_at || '',
      log.actor_user_id || '',
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return res.send([header, ...rows].join('\n'));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to export audit logs.' });
  }
});

module.exports = router;
