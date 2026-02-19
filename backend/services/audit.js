// backend/services/audit.js
// Audit log helper

const { supabase } = require('../config/database');

async function logAuditEvent({
  workspaceId,
  actorUserId,
  action,
  targetType,
  targetId,
  metadata = {},
}) {
  if (!supabase || !workspaceId || !action) return null;

  const { data } = await supabase
    .from('audit_logs')
    .insert({
      workspace_id: workspaceId,
      actor_user_id: actorUserId || null,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      metadata,
    })
    .select('id')
    .single();

  return data?.id || null;
}

module.exports = {
  logAuditEvent,
};
