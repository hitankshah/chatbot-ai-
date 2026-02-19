// backend/routes/chatbots.js
// Chatbot CRUD Routes - Create, Read, Update, Delete chatbots

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getPlanLimits } = require('../services/usage');

// All chatbot routes require authentication
router.use(authMiddleware);

// ============================================
// GET /api/chatbots
// List all chatbots for the authenticated user
// ============================================
router.get('/', async (req, res) => {
  try {
    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const workspaceId = req.user.primary_workspace_id || null;
    if (workspaceId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('plan_code')
        .eq('id', workspaceId)
        .maybeSingle();

      const planCode = workspace?.plan_code || 'starter';
      const limits = await getPlanLimits(planCode);
      if (limits?.chatbots) {
        const { count } = await supabase
          .from('chatbots')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);

        if ((count || 0) >= Number(limits.chatbots)) {
          return res.status(402).json({
            error: 'Chatbot limit reached for this plan.',
            limit: limits.chatbots,
            current: count || 0,
          });
        }
      }
    }

    const { data: chatbots, error } = await supabase
      .from('chatbots')
      .select(`
        id, name, website_url, description, welcome_message,
        primary_color, status, created_at, updated_at
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch chatbots error:', error);
      return res.status(500).json({ error: 'Failed to fetch chatbots.' });
    }

    // Get conversation count for each chatbot
    const chatbotsWithStats = await Promise.all(
      chatbots.map(async (bot) => {
        const { count } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('chatbot_id', bot.id);

        return {
          ...bot,
          totalConversations: count || 0,
        };
      })
    );

    res.json({ chatbots: chatbotsWithStats });
  } catch (err) {
    console.error('List chatbots error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/chatbots/:id
// Get a single chatbot with details
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: chatbot, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    // Get trained content for this chatbot
    const { data: trainedContent } = await supabase
      .from('trained_content')
      .select('id, url, page_title, status, chunk_count, synced_at')
      .eq('chatbot_id', id)
      .order('created_at', { ascending: false });

    // Get recent conversations
    const { data: conversations, count } = await supabase
      .from('conversations')
      .select('id, session_id, status, started_at, created_at', { count: 'exact' })
      .eq('chatbot_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Generate embed code
    const embedCode = generateEmbedCode(chatbot);

    res.json({
      chatbot,
      trainedContent: trainedContent || [],
      recentConversations: conversations || [],
      totalConversations: count || 0,
      embedCode,
    });
  } catch (err) {
    console.error('Get chatbot error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/chatbots
// Create a new chatbot
// ============================================
router.post('/', async (req, res) => {
  try {
    const { name, websiteUrl, description, welcomeMessage, primaryColor } = req.body;

    // --- Validation ---
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Chatbot name is required.',
      });
    }

    if (name.length > 255) {
      return res.status(400).json({
        error: 'Chatbot name must be less than 255 characters.',
      });
    }

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    // --- Create chatbot ---
    const { data: chatbot, error } = await supabase
      .from('chatbots')
      .insert({
        user_id: req.user.id,
        workspace_id: req.user.primary_workspace_id || null,
        name: name.trim(),
        website_url: websiteUrl || null,
        description: description || null,
        welcome_message: welcomeMessage || 'Hi! How can I help you today?',
        primary_color: primaryColor || '#007bff',
        status: 'active',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Create chatbot DB error:', error);
      return res.status(500).json({ error: 'Failed to create chatbot.' });
    }

    // Generate embed code
    const embedCode = generateEmbedCode(chatbot);

    res.status(201).json({
      message: 'Chatbot created successfully!',
      chatbot,
      embedCode,
    });
  } catch (err) {
    console.error('Create chatbot error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// PUT /api/chatbots/:id
// Update a chatbot
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, websiteUrl, description, welcomeMessage, primaryColor, status } = req.body;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    // Verify ownership
    const { data: existing } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    // Build update object (only include provided fields)
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (websiteUrl !== undefined) updates.website_url = websiteUrl;
    if (description !== undefined) updates.description = description;
    if (welcomeMessage !== undefined) updates.welcome_message = welcomeMessage;
    if (primaryColor !== undefined) updates.primary_color = primaryColor;
    if (status !== undefined) updates.status = status;

    const { data: chatbot, error } = await supabase
      .from('chatbots')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update chatbot.' });
    }

    res.json({
      message: 'Chatbot updated!',
      chatbot,
    });
  } catch (err) {
    console.error('Update chatbot error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// DELETE /api/chatbots/:id
// Delete a chatbot and all related data
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    // Verify ownership
    const { data: existing } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    // Delete chatbot (CASCADE will remove conversations, messages, trained_content)
    const { error } = await supabase
      .from('chatbots')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete chatbot.' });
    }

    res.json({ message: 'Chatbot deleted successfully.' });
  } catch (err) {
    console.error('Delete chatbot error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/chatbots/:id/conversations
// Get conversations for a chatbot with messages
// ============================================
router.get('/:id/conversations', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    // Verify ownership
    const { data: existing } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const offset = (page - 1) * limit;

    const { data: conversations, count, error } = await supabase
      .from('conversations')
      .select('*, messages(id, sender, content, created_at)', { count: 'exact' })
      .eq('chatbot_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch conversations.' });
    }

    res.json({
      conversations: conversations || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// HELPER: Generate embed code snippet
// ============================================
function generateEmbedCode(chatbot) {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

  const safe = (value) => JSON.stringify(value ?? '').slice(1, -1);

  return `<!-- AI Chatbot Widget -->
<script>
  window.CHATBOT_CONFIG = {
    id: '${safe(chatbot.id)}',
    primaryColor: '${safe(chatbot.primary_color || '#007bff')}',
    welcomeMessage: '${safe(chatbot.welcome_message || 'Hi! How can I help you?')}',
    apiUrl: '${safe(`${backendUrl}/api`)}',
    position: 'bottom-right'
  };
</script>
<script src="${backendUrl}/widget.js" defer></script>`;
}

module.exports = router;
