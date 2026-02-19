// backend/routes/scrape.js
// Web Scraping Routes - Train chatbot on website content

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { scrapeAndStore, scrapeFromSitemap, processTextContent } = require('../services/scraper');
const { upsertTrainingSource, markSourceSynced } = require('../services/trainingSources');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// All scrape routes require authentication
router.use(authMiddleware);

async function assertOwnership(chatbotId, userId) {
  const { supabase } = require('../config/database');
  if (!supabase) return null;

  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('id')
    .eq('id', chatbotId)
    .eq('user_id', userId)
    .single();

  return chatbot || null;
}

async function createTrainingRecord(chatbotId, sourceUrl, trainingSourceId = null) {
  const { supabase } = require('../config/database');
  return supabase
    .from('trained_content')
    .insert({ chatbot_id: chatbotId, url: sourceUrl, status: 'processing', training_source_id: trainingSourceId })
    .select('id')
    .single();
}

const CONTENT_TEXT_MAX_CHARS = Number(process.env.CONTENT_TEXT_MAX_CHARS || 200000);

function trimContentText(text) {
  if (!text) return '';
  if (!CONTENT_TEXT_MAX_CHARS || Number.isNaN(CONTENT_TEXT_MAX_CHARS)) return text;
  return text.substring(0, CONTENT_TEXT_MAX_CHARS);
}

// ============================================
// POST /api/scrape
// Start scraping a URL for a chatbot
// Body: { chatbotId, url }
// ============================================
router.post('/', async (req, res) => {
  try {
    const { chatbotId, url } = req.body;

    // --- Validation ---
    if (!chatbotId || !url) {
      return res.status(400).json({
        error: 'chatbotId and url are required.',
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const chatbot = await assertOwnership(chatbotId, req.user.id);

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found.' });
    }

    const sourceId = await upsertTrainingSource({
      chatbotId,
      sourceType: 'url',
      sourceUrl: url,
      sourceLabel: 'Website URL',
    });

    // --- Create trained_content record (status: processing) ---
    const { data: contentRecord, error: insertErr } = await createTrainingRecord(chatbotId, url, sourceId);

    if (insertErr) {
      return res.status(500).json({ error: 'Failed to start scraping.' });
    }

    // Update chatbot status to training
    await supabase
      .from('chatbots')
      .update({ status: 'training' })
      .eq('id', chatbotId);

    // --- Start scraping in background ---
    // Don't await - let it run asynchronously
    scrapeAndStore(chatbotId, url, contentRecord.id)
      .then(async (result) => {
        // Update trained_content record on success
        await supabase
          .from('trained_content')
          .update({
            page_title: result.title,
            content_text: trimContentText(result.rawText),
            chunk_count: result.chunkCount,
            status: 'completed',
            synced_at: new Date().toISOString(),
          })
          .eq('id', contentRecord.id);

        if (sourceId) {
          await markSourceSynced(sourceId);
        }

        // Update chatbot status back to active
        await supabase
          .from('chatbots')
          .update({ status: 'active' })
          .eq('id', chatbotId);

        console.log(`✅ Scraping completed for ${url} (${result.chunkCount} chunks)`);
      })
      .catch(async (err) => {
        console.error(`❌ Scraping failed for ${url}:`, err.message);

        await supabase
          .from('trained_content')
          .update({
            status: 'failed',
            error_message: err.message,
          })
          .eq('id', contentRecord.id);

        await supabase
          .from('chatbots')
          .update({ status: 'active' })
          .eq('id', chatbotId);
      });

    // Respond immediately (scraping continues in background)
    res.status(202).json({
      message: 'Scraping started! This may take a few minutes.',
      contentId: contentRecord.id,
      status: 'processing',
    });
  } catch (err) {
    console.error('Scrape route error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/scrape/raw-text
// Train chatbot from pasted text
// Body: { chatbotId, text, title }
// ============================================
router.post('/raw-text', async (req, res) => {
  try {
    const { chatbotId, text, title } = req.body;
    if (!chatbotId || !text) {
      return res.status(400).json({ error: 'chatbotId and text are required.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found.' });

    const sourceUrl = `raw-text://${Date.now()}`;
    const sourceId = await upsertTrainingSource({
      chatbotId,
      sourceType: 'raw_text',
      sourceUrl,
      sourceLabel: title || 'Raw Text Input',
      settings: {
        rawText: trimContentText(text),
      },
    });

    const { data: contentRecord, error: insertErr } = await createTrainingRecord(chatbotId, sourceUrl, sourceId);
    if (insertErr) return res.status(500).json({ error: 'Failed to create training record.' });

    processTextContent(chatbotId, text, { title: title || 'Raw Text Input', url: sourceUrl }, contentRecord.id)
      .then(async (result) => {
        await supabase
          .from('trained_content')
          .update({
            page_title: result.title,
            content_text: trimContentText(result.rawText),
            chunk_count: result.chunkCount,
            status: 'completed',
            synced_at: new Date().toISOString(),
          })
          .eq('id', contentRecord.id);

        if (sourceId) {
          await markSourceSynced(sourceId);
        }
      })
      .catch(async (err) => {
        await supabase
          .from('trained_content')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', contentRecord.id);
      });

    return res.status(202).json({
      message: 'Raw text training started.',
      contentId: contentRecord.id,
      status: 'processing',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to process raw text training.' });
  }
});

// ============================================
// POST /api/scrape/sitemap
// Train chatbot from a sitemap
// Body: { chatbotId, sitemapUrl, maxPages }
// ============================================
router.post('/sitemap', async (req, res) => {
  try {
    const { chatbotId, sitemapUrl, maxPages = 30 } = req.body;
    if (!chatbotId || !sitemapUrl) {
      return res.status(400).json({ error: 'chatbotId and sitemapUrl are required.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found.' });

    const sourceId = await upsertTrainingSource({
      chatbotId,
      sourceType: 'sitemap',
      sourceUrl: sitemapUrl,
      sourceLabel: 'Sitemap',
      settings: {
        maxPages: Number(maxPages),
      },
    });

    const { data: contentRecord, error: insertErr } = await createTrainingRecord(chatbotId, sitemapUrl, sourceId);
    if (insertErr) return res.status(500).json({ error: 'Failed to create sitemap training record.' });

    scrapeFromSitemap(sitemapUrl, chatbotId, Number(maxPages), contentRecord.id)
      .then(async (results) => {
        const successCount = results.filter((item) => item.status === 'success').length;
        await supabase
          .from('trained_content')
          .update({
            page_title: 'Sitemap Training Batch',
            content_text: `Processed ${results.length} pages from sitemap.`,
            chunk_count: successCount,
            status: 'completed',
            synced_at: new Date().toISOString(),
          })
          .eq('id', contentRecord.id);

        if (sourceId) {
          await markSourceSynced(sourceId);
        }
      })
      .catch(async (err) => {
        await supabase
          .from('trained_content')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', contentRecord.id);
      });

    return res.status(202).json({
      message: 'Sitemap training started.',
      contentId: contentRecord.id,
      status: 'processing',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to start sitemap training.' });
  }
});

// ============================================
// POST /api/scrape/upload
// Train chatbot from uploaded document (base64)
// Body: { chatbotId, fileName, mimeType, base64Data }
// ============================================
router.post('/upload', async (req, res) => {
  try {
    const { chatbotId, fileName, mimeType, base64Data } = req.body;
    if (!chatbotId || !fileName || !base64Data) {
      return res.status(400).json({ error: 'chatbotId, fileName and base64Data are required.' });
    }

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const chatbot = await assertOwnership(chatbotId, req.user.id);
    if (!chatbot) return res.status(404).json({ error: 'Chatbot not found.' });

    const sourceUrl = `file://${fileName}`;
    const sourceId = await upsertTrainingSource({
      chatbotId,
      sourceType: 'file',
      sourceUrl,
      sourceLabel: fileName,
      settings: {
        fileName,
        mimeType,
      },
    });

    const { data: contentRecord, error: insertErr } = await createTrainingRecord(chatbotId, sourceUrl, sourceId);
    if (insertErr) return res.status(500).json({ error: 'Failed to create file training record.' });

    const buffer = Buffer.from(base64Data, 'base64');
    const ext = (fileName.split('.').pop() || '').toLowerCase();

    let textContent = '';
    if (ext === 'txt' || mimeType === 'text/plain') {
      textContent = buffer.toString('utf-8');
    } else if (ext === 'pdf' || mimeType === 'application/pdf') {
      const parsed = await pdfParse(buffer);
      textContent = parsed.text;
    } else if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const extracted = await mammoth.extractRawText({ buffer });
      textContent = extracted.value;
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Allowed: PDF, DOCX, TXT.' });
    }

    if (sourceId) {
      await supabase
        .from('training_sources')
        .update({ settings: { fileName, mimeType, extractedText: trimContentText(textContent) } })
        .eq('id', sourceId);
    }

    processTextContent(chatbotId, textContent, { title: `File Upload: ${fileName}`, url: sourceUrl }, contentRecord.id)
      .then(async (result) => {
        await supabase
          .from('trained_content')
          .update({
            page_title: result.title,
            content_text: trimContentText(result.rawText),
            chunk_count: result.chunkCount,
            status: 'completed',
            synced_at: new Date().toISOString(),
          })
          .eq('id', contentRecord.id);

        if (sourceId) {
          await markSourceSynced(sourceId);
        }
      })
      .catch(async (err) => {
        await supabase
          .from('trained_content')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', contentRecord.id);
      });

    return res.status(202).json({
      message: 'File training started.',
      contentId: contentRecord.id,
      status: 'processing',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to process file training.' });
  }
});

// ============================================
// GET /api/scrape/status/:contentId
// Check scraping progress
// ============================================
router.get('/status/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    const { supabase } = require('../config/database');
    if (!supabase) return res.status(503).json({ error: 'Database not configured.' });

    const { data: content, error } = await supabase
      .from('trained_content')
      .select('id, url, page_title, status, chunk_count, error_message, synced_at')
      .eq('id', contentId)
      .single();

    if (error || !content) {
      return res.status(404).json({ error: 'Content record not found.' });
    }

    res.json({ content });
  } catch (err) {
    console.error('Scrape status error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
