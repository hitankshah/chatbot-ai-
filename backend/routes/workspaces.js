// backend/routes/workspaces.js
// Workspace management routes (teams, invites)

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { logAuditEvent } = require('../services/audit');

router.use(authMiddleware);

async function getWorkspaceRole(workspaceId, userId) {
  const { supabase } = require('../config/database');
  if (!supabase) return null;

  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role || null;
}

async function requireAdmin(workspaceId, userId, res) {
  const role = await getWorkspaceRole(workspaceId, userId);
  if (!role || !['owner', 'admin'].includes(role)) {
    res.status(403).json({ error: 'Insufficient permissions.' });
    return false;
  }
  return true;
}

router.get('/current', async (req, res) => {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, plan_code, status, created_at')
      .eq('id', workspaceId)
      .single();

    const { data: members } = await supabase
      .from('workspace_members')
      .select('id, role, status, user_id')
      .eq('workspace_id', workspaceId);

    const { data: invites } = await supabase
      .from('workspace_invites')
      .select('id, email, role, status, created_at, expires_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return res.json({ workspace, members: members || [], invites: invites || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch workspace.' });
  }
});

router.post('/invites', async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const allowed = await requireAdmin(workspaceId, req.user.id, res);
    if (!allowed) return;

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase().trim(),
        role,
        invite_token: token,
        expires_at: expiresAt,
      })
      .select('id, email, role, status, created_at, expires_at')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to create invite.' });

    await logAuditEvent({
      workspaceId,
      actorUserId: req.user.id,
      action: 'workspace.invite_created',
      targetType: 'workspace_invites',
      targetId: invite.id,
      metadata: { email: invite.email, role: invite.role },
    });

    return res.status(201).json({ invite });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create invite.' });
  }
});

router.patch('/members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const allowed = await requireAdmin(workspaceId, req.user.id, res);
    if (!allowed) return;

    const { data: updated, error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId)
      .select('id, role, status')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update member.' });

    await logAuditEvent({
      workspaceId,
      actorUserId: req.user.id,
      action: 'workspace.member_role_updated',
      targetType: 'workspace_members',
      targetId: updated.id,
      metadata: { role },
    });

    return res.json({ member: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update member.' });
  }
});

router.delete('/invites/:inviteId', async (req, res) => {
  try {
    const { inviteId } = req.params;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const allowed = await requireAdmin(workspaceId, req.user.id, res);
    if (!allowed) return;

    const { error } = await supabase
      .from('workspace_invites')
      .delete()
      .eq('id', inviteId);

    if (error) return res.status(500).json({ error: 'Failed to revoke invite.' });

    await logAuditEvent({
      workspaceId,
      actorUserId: req.user.id,
      action: 'workspace.invite_revoked',
      targetType: 'workspace_invites',
      targetId: inviteId,
    });

    return res.json({ message: 'Invite revoked.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to revoke invite.' });
  }
});

router.post('/invites/accept', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Invite token is required.' });

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: invite } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (!invite) return res.status(404).json({ error: 'Invite not found.' });

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invite expired.' });
    }

    if (invite.email !== req.user.email) {
      return res.status(403).json({ error: 'Invite does not match your account.' });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!membership) {
      await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invite.workspace_id,
          user_id: req.user.id,
          role: invite.role || 'member',
        });
    }

    await supabase
      .from('workspace_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    if (!req.user.primary_workspace_id) {
      await supabase
        .from('users')
        .update({ primary_workspace_id: invite.workspace_id })
        .eq('id', req.user.id);
    }

    await logAuditEvent({
      workspaceId: invite.workspace_id,
      actorUserId: req.user.id,
      action: 'workspace.invite_accepted',
      targetType: 'workspace_invites',
      targetId: invite.id,
    });

    return res.json({ message: 'Invite accepted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to accept invite.' });
  }
});

router.patch('/security', async (req, res) => {
  try {
    const { require2fa, ssoEnabled, ssoProvider } = req.body;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const workspaceId = req.user.primary_workspace_id;
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const allowed = await requireAdmin(workspaceId, req.user.id, res);
    if (!allowed) return;

    const { data: updated, error } = await supabase
      .from('workspaces')
      .update({
        require_2fa: require2fa,
        sso_enabled: ssoEnabled,
        sso_provider: ssoProvider || null,
      })
      .eq('id', workspaceId)
      .select('id, require_2fa, sso_enabled, sso_provider')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update security settings.' });

    await logAuditEvent({
      workspaceId,
      actorUserId: req.user.id,
      action: 'workspace.security_updated',
      targetType: 'workspaces',
      targetId: workspaceId,
      metadata: { require2fa, ssoEnabled, ssoProvider },
    });

    return res.json({ workspace: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update security settings.' });
  }
});

module.exports = router;
