// backend/routes/apiKeys.js
// API key management endpoints

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { logAuditEvent } = require('../services/audit');

router.use(authMiddleware);

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

router.get('/', async (req, res) => {
  try {
    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, last_used_at, revoked_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch API keys.' });

    return res.json({ keys: keys || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch API keys.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const rawKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = hashKey(rawKey);

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: record, error } = await supabase
      .from('api_keys')
      .insert({
        workspace_id: workspaceId,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name: name || 'Default',
      })
      .select('id, key_prefix, name, created_at')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to create API key.' });

    await logAuditEvent({
      workspaceId,
      actorUserId: req.user.id,
      action: 'api_key.created',
      targetType: 'api_keys',
      targetId: record.id,
    });

    return res.status(201).json({ key: rawKey, record });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create API key.' });
  }
});

router.delete('/:keyId', async (req, res) => {
  try {
    const { keyId } = req.params;
    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: updated, error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('workspace_id', workspaceId)
      .select('id')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to revoke API key.' });

    await logAuditEvent({
      workspaceId,
      actorUserId: req.user.id,
      action: 'api_key.revoked',
      targetType: 'api_keys',
      targetId: updated.id,
    });

    return res.json({ message: 'API key revoked.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to revoke API key.' });
  }
});

module.exports = router;
