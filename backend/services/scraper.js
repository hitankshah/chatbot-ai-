// backend/services/scraper.js
// Website Scraper Service
// Scrapes URLs, cleans content, chunks text, stores embeddings in Supabase vectors

const puppeteer = require('puppeteer');
const robotsParser = require('robots-parser');
const { storeEmbeddings } = require('./rag');

/**
 * Main scraping pipeline: Scrape URL → Clean → Chunk → Embed → Store
 * @param {string} chatbotId - Chatbot to associate content with
 * @param {string} url - URL to scrape
 * @param {string} contentId - trained_content record ID for tracking
 * @returns {Object} - { title, rawText, chunkCount }
 */
async function scrapeAndStore(chatbotId, url, contentId) {
  let browser;

  try {
    console.log(`🔍 Starting scrape: ${url}`);

    // Step 1: Check robots.txt
    const canScrape = await checkRobotsTxt(url);
    if (!canScrape) {
      throw new Error('Scraping blocked by robots.txt');
    }

    // Step 2: Launch browser and scrape
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; ChatbotTrainer/1.0; +https://yourdomain.com/bot)'
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to URL with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Extract clean text content
    const pageData = await page.evaluate(() => {
      // Remove unwanted elements
      const removeSelectors = [
        'script', 'style', 'nav', 'header', 'footer',
        'iframe', 'noscript', '.cookie-banner', '.popup',
        '.modal', '.advertisement', '.ad', '#cookie-consent',
        '.social-share', '.sidebar', 'aside',
      ];

      removeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });

      // Get page title
      const title = document.title || '';

      // Get main content text
      const body = document.body;
      const text = body ? body.innerText : '';

      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc ? metaDesc.getAttribute('content') : '';

      return { title, text, description };
    });

    // Step 4: Clean the extracted text
    const cleanedText = cleanText(pageData.text);

    if (cleanedText.length < 50) {
      throw new Error('Insufficient content extracted from page');
    }

    console.log(`📄 Extracted ${cleanedText.length} characters from ${url}`);

    // Step 5: Chunk text into segments
    const chunks = chunkText(cleanedText, 500);
    console.log(`📦 Created ${chunks.length} chunks`);

    // Step 6: Store embeddings
    const chunkObjects = chunks.map(text => ({
      text,
      url,
      title: pageData.title,
    }));

    await storeEmbeddings(chatbotId, chunkObjects, contentId);

    return {
      title: pageData.title,
      rawText: cleanedText,
      chunkCount: chunks.length,
    };
  } catch (err) {
    console.error(`Scraper error for ${url}:`, err.message);
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Check if we're allowed to scrape a URL (robots.txt)
 * @param {string} url - URL to check
 * @returns {boolean}
 */
async function checkRobotsTxt(url) {
  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(robotsUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return true; // No robots.txt = assume allowed
    }

    const robotsTxt = await response.text();
    const robots = robotsParser(robotsUrl, robotsTxt);

    return robots.isAllowed(url, 'ChatbotTrainer');
  } catch {
    return true; // If robots.txt check fails, proceed
  }
}

/**
 * Clean raw extracted text
 * @param {string} text - Raw text from page
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')                 // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')             // Max 2 newlines
    .replace(/[^\S\n]+/g, ' ')               // Normalize spaces
    .replace(/\t/g, ' ')                      // Remove tabs
    .replace(/(\w)\1{4,}/g, '$1$1$1')         // Remove repeated chars (aaaa → aaa)
    .replace(/https?:\/\/[^\s]+/g, '')        // Remove URLs
    .replace(/[^\w\s.,!?;:'"()\-\n]/g, '')   // Remove special chars
    .replace(/\n +/g, '\n')                  // Remove spaces after newlines
    .trim();
}

/**
 * Split text into chunks with overlap
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Max characters per chunk (default: 500)
 * @param {number} overlap - Overlap between chunks (default: 50)
 * @returns {Array<string>} - Array of text chunks
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = '';

  for (const sentence of sentences) {
    // If adding this sentence exceeds chunk size, save current and start new
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from previous
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.ceil(overlap / 5)).join(' ');
      currentChunk = overlapWords + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Scrape multiple pages from a sitemap
 * @param {string} sitemapUrl - URL of sitemap.xml
 * @param {string} chatbotId - Chatbot ID
 * @param {number} maxPages - Max URLs to scrape from sitemap
 * @returns {Array} - Results for each page
 */
async function scrapeFromSitemap(sitemapUrl, chatbotId, maxPages = 50, contentId = null) {
  try {
    const response = await fetch(sitemapUrl);
    const xml = await response.text();

    // Extract URLs from sitemap XML
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls = [];
    let match;

    while ((match = urlRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }

    console.log(`Found ${urls.length} URLs in sitemap`);

    // Scrape each URL with delay (rate limiting)
    const results = [];
    for (const url of urls.slice(0, maxPages)) {
      try {
        const result = await scrapeAndStore(chatbotId, url, contentId);
        results.push({ url, status: 'success', ...result });
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message });
      }

      // Rate limiting: wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  } catch (err) {
    console.error('Sitemap scrape error:', err.message);
    throw err;
  }
}

async function processTextContent(chatbotId, text, source = {}, contentId = null) {
  const cleanedText = cleanText(text || '');

  if (cleanedText.length < 50) {
    throw new Error('Provided text is too short. Add at least 50 characters.');
  }

  const chunks = chunkText(cleanedText, 500);
  const chunkObjects = chunks.map((chunkTextValue) => ({
    text: chunkTextValue,
    url: source.url || '',
    title: source.title || 'Manual Training Content',
  }));

  await storeEmbeddings(chatbotId, chunkObjects, contentId);

  return {
    title: source.title || 'Manual Training Content',
    rawText: cleanedText,
    chunkCount: chunks.length,
  };
}

module.exports = {
  scrapeAndStore,
  scrapeFromSitemap,
  processTextContent,
  chunkText,
  cleanText,
};
